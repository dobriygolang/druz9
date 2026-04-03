package sandbox

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type RemoteConfig struct {
	BaseURL string
	Timeout time.Duration
	Client  *http.Client
}

type RemoteClient struct {
	baseURL string
	timeout time.Duration
	client  *http.Client
}

func NewRemote(cfg RemoteConfig) *RemoteClient {
	client := cfg.Client
	if client == nil {
		client = &http.Client{}
	}
	return &RemoteClient{
		baseURL: strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/"),
		timeout: cfg.Timeout,
		client:  client,
	}
}

func (c *RemoteClient) Execute(ctx context.Context, req ExecutionRequest) (ExecutionResult, error) {
	if c == nil || c.baseURL == "" {
		return ExecutionResult{}, fmt.Errorf("sandbox remote base URL is not configured")
	}

	payload, err := json.Marshal(ExecuteEnvelope{Request: req})
	if err != nil {
		return ExecutionResult{}, fmt.Errorf("marshal sandbox request: %w", err)
	}

	if c.timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, c.timeout)
		defer cancel()
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/execute", bytes.NewReader(payload))
	if err != nil {
		return ExecutionResult{}, fmt.Errorf("build sandbox request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return ExecutionResult{}, fmt.Errorf("call sandbox runner: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if err != nil {
		return ExecutionResult{}, fmt.Errorf("read sandbox runner response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		message := strings.TrimSpace(string(body))
		if message == "" {
			message = resp.Status
		}
		return ExecutionResult{}, fmt.Errorf("sandbox runner returned %s: %s", resp.Status, message)
	}

	var envelope ExecuteResponseEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		return ExecutionResult{}, fmt.Errorf("decode sandbox runner response: %w", err)
	}
	if strings.TrimSpace(envelope.Error) != "" {
		return ExecutionResult{}, fmt.Errorf("%s", strings.TrimSpace(envelope.Error))
	}
	if envelope.Result == nil {
		return ExecutionResult{}, fmt.Errorf("sandbox runner returned empty result")
	}
	return *envelope.Result, nil
}
