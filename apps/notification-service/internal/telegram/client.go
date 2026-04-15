package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
)

const apiBase = "https://api.telegram.org"

type Client struct {
	httpClient *http.Client
	token      string
}

type sendMessageAPIResponse struct {
	OK          bool   `json:"ok"`
	Description string `json:"description"`
}

func NewClient(token string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		token:      token,
	}
}

func (c *Client) SendMessage(ctx context.Context, chatID int64, text string) error {
	body := map[string]any{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "HTML",
	}
	return c.call(ctx, "sendMessage", body)
}

func (c *Client) SendMessageWithKeyboard(ctx context.Context, chatID int64, text string, keyboard InlineKeyboardMarkup) error {
	body := map[string]any{
		"chat_id":      chatID,
		"text":         text,
		"parse_mode":   "HTML",
		"reply_markup": keyboard,
	}
	return c.call(ctx, "sendMessage", body)
}

func (c *Client) call(ctx context.Context, method string, requestBody any) error {
	data, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("marshal telegram request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/bot%s/%s", apiBase, c.token, method),
		bytes.NewReader(data),
	)
	if err != nil {
		return fmt.Errorf("build telegram request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("telegram request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return fmt.Errorf("telegram rate limited (429)")
	}
	body, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		return fmt.Errorf("read telegram response: %w", readErr)
	}
	if resp.StatusCode >= http.StatusBadRequest {
		klog.Errorf("telegram api %s status: %s body=%s", method, resp.Status, string(body))
		return fmt.Errorf("telegram api status: %s", resp.Status)
	}

	var apiResp sendMessageAPIResponse
	if len(body) > 0 {
		if err := json.Unmarshal(body, &apiResp); err != nil {
			return fmt.Errorf("decode telegram response: %w", err)
		}
		if !apiResp.OK {
			klog.Errorf("telegram api %s failed: %s", method, apiResp.Description)
			return fmt.Errorf("telegram api error: %s", apiResp.Description)
		}
	}

	return nil
}
