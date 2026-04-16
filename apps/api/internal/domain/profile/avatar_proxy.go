package profile

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/google/uuid"
)

const telegramAPIBase = "https://api.telegram.org"

type telegramAPIResponse[T any] struct {
	OK          bool   `json:"ok"`
	Result      T      `json:"result"`
	Description string `json:"description"`
}

type telegramAPIMeta struct {
	OK          bool   `json:"ok"`
	Description string `json:"description"`
}

type telegramPhotoSize struct {
	FileID string `json:"file_id"`
}

type telegramUserProfilePhotos struct {
	Photos [][]telegramPhotoSize `json:"photos"`
}

type telegramFile struct {
	FilePath string `json:"file_path"`
}

func (s *Service) FetchTelegramAvatar(ctx context.Context, userID uuid.UUID) ([]byte, string, error) {
	fileURL, err := s.resolveTelegramAvatarFileURL(ctx, userID)
	if err != nil {
		return nil, "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fileURL, nil)
	if err != nil {
		return nil, "", fmt.Errorf("build telegram avatar request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("download telegram avatar: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("download telegram avatar status: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("read telegram avatar: %w", err)
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = http.DetectContentType(body)
	}

	return body, contentType, nil
}

func (s *Service) resolveTelegramAvatarFileURL(ctx context.Context, userID uuid.UUID) (string, error) {
	if s.settings.BotToken == "" {
		return "", fmt.Errorf("telegram bot token is empty")
	}

	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return "", err
	}
	if user == nil || user.TelegramID == 0 {
		return "", fmt.Errorf("telegram avatar is not available")
	}

	var photosResp telegramAPIResponse[telegramUserProfilePhotos]
	if err := s.callTelegram(ctx, "getUserProfilePhotos", map[string]any{
		"user_id": user.TelegramID,
		"limit":   1,
	}, &photosResp); err != nil {
		return "", err
	}
	if len(photosResp.Result.Photos) == 0 || len(photosResp.Result.Photos[0]) == 0 {
		return "", fmt.Errorf("telegram avatar is not available")
	}

	sizes := photosResp.Result.Photos[0]
	var fileResp telegramAPIResponse[telegramFile]
	if err := s.callTelegram(ctx, "getFile", map[string]any{
		"file_id": sizes[len(sizes)-1].FileID,
	}, &fileResp); err != nil {
		return "", err
	}
	if fileResp.Result.FilePath == "" {
		return "", fmt.Errorf("telegram file path is empty")
	}

	return fmt.Sprintf("%s/file/bot%s/%s", telegramAPIBase, s.settings.BotToken, fileResp.Result.FilePath), nil
}

func (s *Service) callTelegram(ctx context.Context, method string, requestBody any, out any) error {
	body, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("marshal telegram request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s/bot%s/%s", telegramAPIBase, s.settings.BotToken, method), bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build telegram request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("telegram request: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read telegram response: %w", err)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("telegram api status: %s", resp.Status)
	}

	var meta telegramAPIMeta
	if err := json.Unmarshal(responseBody, &meta); err != nil {
		return fmt.Errorf("decode telegram response: %w", err)
	}
	if !meta.OK {
		return fmt.Errorf("telegram api error: %s", meta.Description)
	}

	if out == nil {
		return nil
	}
	if err := json.Unmarshal(responseBody, out); err != nil {
		return fmt.Errorf("decode telegram response: %w", err)
	}
	return nil
}
