package profile

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
)

var (
	errYandexUserinfoStatus = errors.New("yandex userinfo status error")
	errYandexTokenStatus    = errors.New("yandex token status error")
)

const (
	yandexAuthorizeURL = "https://oauth.yandex.ru/authorize"
	yandexTokenURL     = "https://oauth.yandex.ru/token" //nolint:gosec // OAuth endpoint URL, not a credential
	yandexUserInfoURL  = "https://login.yandex.ru/info"
)

type yandexTokenResponse struct {
	AccessToken string `json:"access_token"`
}

type yandexUserInfoResponse struct {
	ID            string `json:"id"`
	Login         string `json:"login"`
	DefaultEmail  string `json:"default_email"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	DefaultAvatar string `json:"default_avatar_id"`
	IsAvatarEmpty bool   `json:"is_avatar_empty"`
}

func (s *Service) StartYandexAuth(_ context.Context) (*model.YandexAuthStart, error) {
	if strings.TrimSpace(s.settings.YandexClientID) == "" || strings.TrimSpace(s.settings.YandexRedirectURL) == "" {
		return nil, profileerrors.ErrInvalidPayload
	}

	state, err := generateOpaqueToken(24)
	if err != nil {
		return nil, fmt.Errorf("generate yandex auth state: %w", err)
	}

	expiresAt := s.Now().Add(10 * time.Minute)
	s.yandexAuth.mu.Lock()
	s.yandexAuth.byState[state] = expiresAt
	s.yandexAuth.mu.Unlock()

	q := url.Values{}
	q.Set("response_type", "code")
	q.Set("client_id", s.settings.YandexClientID)
	q.Set("redirect_uri", s.settings.YandexRedirectURL)
	q.Set("state", state)
	q.Set("force_confirm", "no")

	return &model.YandexAuthStart{
		State:     state,
		AuthURL:   yandexAuthorizeURL + "?" + q.Encode(),
		ExpiresAt: expiresAt,
	}, nil
}

func (s *Service) YandexAuth(ctx context.Context, state, code string) (*model.ProfileResponse, string, time.Time, error) {
	state = strings.TrimSpace(state)
	code = strings.TrimSpace(code)
	if state == "" || code == "" {
		return nil, "", time.Time{}, profileerrors.ErrUnauthorized
	}
	if !s.consumeYandexState(state) {
		return nil, "", time.Time{}, profileerrors.ErrUnauthorized
	}

	userInfo, err := s.fetchYandexUser(ctx, code)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	user, err := s.repo.UpsertUserByIdentity(ctx, model.IdentityAuthPayload{
		Provider:       model.AuthProviderYandex,
		ProviderUserID: userInfo.ID,
		Username:       userInfo.Login,
		Email:          userInfo.Email,
		FirstName:      userInfo.FirstName,
		LastName:       userInfo.LastName,
		AvatarURL:      userInfo.AvatarURL,
	})
	if err != nil {
		return nil, "", time.Time{}, fmt.Errorf("upsert user by identity: %w", err)
	}

	rawToken, session, err := s.NewSession(ctx, user.ID)
	if err != nil {
		return nil, "", time.Time{}, fmt.Errorf("create session: %w", err)
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: user.Status == model.UserStatusPendingProfile,
	}, rawToken, session.ExpiresAt, nil
}

func (s *Service) consumeYandexState(state string) bool {
	now := s.Now()
	s.yandexAuth.mu.Lock()
	defer s.yandexAuth.mu.Unlock()

	expiresAt, ok := s.yandexAuth.byState[state]
	if !ok {
		return false
	}
	delete(s.yandexAuth.byState, state)
	return expiresAt.After(now)
}

func (s *Service) fetchYandexUser(ctx context.Context, code string) (*model.YandexAuthUser, error) {
	accessToken, err := s.exchangeYandexCode(ctx, code)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, yandexUserInfoURL+"?format=json", http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("create yandex userinfo request: %w", err)
	}
	req.Header.Set("Authorization", "OAuth "+accessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request yandex userinfo: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, fmt.Errorf("%w: %d %s", errYandexUserinfoStatus, resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload yandexUserInfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode yandex userinfo: %w", err)
	}
	if strings.TrimSpace(payload.ID) == "" {
		return nil, profileerrors.ErrUnauthorized
	}

	avatarURL := ""
	if !payload.IsAvatarEmpty && strings.TrimSpace(payload.DefaultAvatar) != "" {
		avatarURL = "https://avatars.yandex.net/get-yapic/" + payload.DefaultAvatar + "/islands-200"
	}

	return &model.YandexAuthUser{
		ID:        payload.ID,
		Login:     payload.Login,
		Email:     payload.DefaultEmail,
		FirstName: payload.FirstName,
		LastName:  payload.LastName,
		AvatarURL: avatarURL,
	}, nil
}

func (s *Service) exchangeYandexCode(ctx context.Context, code string) (string, error) {
	if strings.TrimSpace(s.settings.YandexClientID) == "" || strings.TrimSpace(s.settings.YandexClientSecret) == "" || strings.TrimSpace(s.settings.YandexRedirectURL) == "" {
		return "", profileerrors.ErrInvalidPayload
	}

	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("client_id", s.settings.YandexClientID)
	form.Set("client_secret", s.settings.YandexClientSecret)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, yandexTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("create yandex token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request yandex token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return "", fmt.Errorf("%w: %d %s", errYandexTokenStatus, resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var payload yandexTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", fmt.Errorf("decode yandex token response: %w", err)
	}
	if strings.TrimSpace(payload.AccessToken) == "" {
		return "", profileerrors.ErrUnauthorized
	}
	return payload.AccessToken, nil
}

func generateOpaqueToken(size int) (string, error) {
	bytes := make([]byte, size)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate opaque token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}
