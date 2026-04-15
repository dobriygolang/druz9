package telegrambot

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	klog "github.com/go-kratos/kratos/v2/log"
)

func (s *Service) getUpdates(ctx context.Context, offset int64) ([]telegramUpdate, error) {
	reqBody := map[string]any{
		"offset":          offset,
		"timeout":         50,
		"allowed_updates": []string{"message"},
	}

	var resp telegramAPIResponse[[]telegramUpdate]
	if err := s.call(ctx, "getUpdates", reqBody, &resp); err != nil {
		return nil, err
	}
	return resp.Result, nil
}

func (s *Service) sendMessage(ctx context.Context, chatID int64, text string) {
	reqBody := map[string]any{
		"chat_id": chatID,
		"text":    text,
	}
	if err := s.call(ctx, "sendMessage", reqBody, nil); err != nil {
		klog.Errorf("telegram bot sendMessage error: %v", err)
	}
}

func (s *Service) deleteWebhook(ctx context.Context) error {
	reqBody := map[string]any{
		"drop_pending_updates": false,
	}
	return s.call(ctx, "deleteWebhook", reqBody, nil)
}

func (s *Service) getUserPhotoURL(ctx context.Context, userID int64) string {
	var photosResp telegramAPIResponse[telegramUserProfilePhotos]
	if err := s.call(ctx, "getUserProfilePhotos", map[string]any{
		"user_id": userID,
		"limit":   1,
	}, &photosResp); err != nil {
		klog.Errorf("telegram bot getUserProfilePhotos error: %v", err)
		return ""
	}
	if len(photosResp.Result.Photos) == 0 {
		return ""
	}
	sizes := photosResp.Result.Photos[0]
	if len(sizes) == 0 {
		return ""
	}

	var fileResp telegramAPIResponse[telegramFile]
	if err := s.call(ctx, "getFile", map[string]any{
		"file_id": sizes[len(sizes)-1].FileID,
	}, &fileResp); err != nil {
		klog.Errorf("telegram bot getFile error: %v", err)
		return ""
	}
	if fileResp.Result.FilePath == "" {
		return ""
	}
	return fmt.Sprintf("%s/file/bot%s/%s", telegramAPIBase, s.token, fileResp.Result.FilePath)
}

func (s *Service) call(ctx context.Context, method string, requestBody any, out any) error {
	body, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("marshal telegram request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("%s/bot%s/%s", telegramAPIBase, s.token, method), bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build telegram request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("telegram request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		// Drain body so the TCP connection can be reused by the pool.
		_, _ = io.Copy(io.Discard, resp.Body)
		return fmt.Errorf("telegram api status: %s", resp.Status)
	}

	if out == nil {
		return nil
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("decode telegram response: %w", err)
	}
	return nil
}
