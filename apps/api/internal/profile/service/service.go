package service

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"slices"
	"strconv"
	"strings"
	"time"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
	slicestools "api/internal/tools/slices"

	"github.com/google/uuid"
)

// Config represents profile domain service configuration.
type Config struct {
	Repository     Repository
	SessionStorage SessionStorage
	Settings       Settings
}

// Settings holds profile service settings.
type Settings struct {
	BotToken            string
	DevBypass           bool
	CookieName          string
	SessionTTL          time.Duration
	SessionRefreshAfter time.Duration
	TelegramAuthMaxAge  time.Duration
}

// Service implements profile domain logic.
type Service struct {
	repo     Repository
	sessions SessionStorage
	settings Settings
}

// Repository is a data-layer interface for profile queries.
type Repository interface {
	UpsertTelegramUser(ctx context.Context, payload model.TelegramAuthPayload) (*model.User, error)
	FindUserByID(ctx context.Context, userID uuid.UUID) (*model.User, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, name string) (*model.User, error)
	CompleteRegistration(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.User, error)
	UpdateLocation(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.User, error)
	DeleteUser(ctx context.Context, userID uuid.UUID) error
}

// SessionStorage handles session management.
type SessionStorage interface {
	CreateSession(ctx context.Context, session *model.Session) error
	ReplaceSession(ctx context.Context, hash string, session *model.Session) error
	DeleteSessionByHash(ctx context.Context, hash string) error
	FindSessionByHash(ctx context.Context, hash string) (*model.AuthState, error)
	TouchSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID, expiresAt time.Time, lastActive time.Time) error
}

// NewProfileService creates new profile domain service.
func NewProfileService(c Config) *Service {
	return &Service{
		repo:     c.Repository,
		sessions: c.SessionStorage,
		settings: c.Settings,
	}
}

// CookieName returns the cookie name for sessions.
func (s *Service) CookieName() string {
	return s.settings.CookieName
}

// DevBypass returns whether dev bypass is enabled.
func (s *Service) DevBypass() bool {
	return s.settings.DevBypass
}

// BotToken returns the Telegram bot token.
func (s *Service) BotToken() string {
	return s.settings.BotToken
}

// TelegramAuthMaxAge returns max age for Telegram auth.
func (s *Service) TelegramAuthMaxAge() time.Duration {
	return s.settings.TelegramAuthMaxAge
}

// SessionTTL returns session time-to-live duration.
func (s *Service) SessionTTL() time.Duration {
	return s.settings.SessionTTL
}

// Now returns current time in UTC.
func (s *Service) Now() time.Time {
	return time.Now().UTC()
}

func (s *Service) validateTelegramPayload(payload model.TelegramAuthPayload) error {
	if s.settings.DevBypass {
		if payload.ID == 0 {
			return profileerrors.ErrUnauthorized
		}
		return nil
	}

	if payload.ID == 0 || payload.AuthDate == 0 || strings.TrimSpace(payload.Hash) == "" {
		return profileerrors.ErrUnauthorized
	}

	now := s.Now()
	authTime := time.Unix(payload.AuthDate, 0)
	if now.Sub(authTime) > s.settings.TelegramAuthMaxAge || authTime.After(now.Add(5*time.Minute)) {
		return profileerrors.ErrUnauthorized
	}

	checkString := buildTelegramCheckString(payload)
	secret := sha256.Sum256([]byte(s.settings.BotToken))
	mac := hmac.New(sha256.New, secret[:])
	mac.Write([]byte(checkString))
	expectedHash := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expectedHash), []byte(strings.ToLower(strings.TrimSpace(payload.Hash)))) {
		return profileerrors.ErrUnauthorized
	}

	return nil
}

func generateSessionToken() (string, string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", "", err
	}

	rawToken := base64.RawURLEncoding.EncodeToString(tokenBytes)
	return rawToken, hashToken(rawToken), nil
}

func hashToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}

func buildTelegramCheckString(payload model.TelegramAuthPayload) string {
	values := map[string]string{
		"auth_date":  strconv.FormatInt(payload.AuthDate, 10),
		"first_name": payload.FirstName,
		"id":         strconv.FormatInt(payload.ID, 10),
		"last_name":  payload.LastName,
		"photo_url":  payload.PhotoURL,
		"username":   payload.Username,
	}

	keys := make([]string, 0, len(values))
	for key, value := range values {
		if value != "" {
			keys = append(keys, key)
		}
	}
	slices.Sort(keys)

	lines := slicestools.Map(keys, func(key string) string {
		return key + "=" + values[key]
	})
	return strings.Join(lines, "\n")
}