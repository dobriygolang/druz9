package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
)

const apiBase = "https://api.telegram.org"

type Client struct {
	httpClient *http.Client
	token      string
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
	if resp.StatusCode >= http.StatusBadRequest {
		klog.Errorf("telegram api %s status: %s", method, resp.Status)
		return fmt.Errorf("telegram api status: %s", resp.Status)
	}

	return nil
}
