// Package boosty provides a minimal client for the undocumented Boosty API.
// Only the subscriber-verification flow is implemented.
package boosty

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const baseURL = "https://api.boosty.to"

var (
	ErrNotSubscribed    = errors.New("boosty: email not found in active subscribers")
	ErrTokenExpired     = errors.New("boosty: access token expired or invalid")
	ErrNotConfigured    = errors.New("boosty: client not configured")
	ErrEmailRequired    = errors.New("boosty: email is required")
	ErrNoRefreshCreds   = errors.New("boosty: no refresh credentials configured")
	ErrEmptyRefreshToken = errors.New("boosty: refresh returned empty token")
)

// Config holds credentials extracted from the creator's browser session.
// AccessToken and BlogName are required; RefreshToken + DeviceID enable
// automatic token refresh when the access token expires.
type Config struct {
	AccessToken  string
	RefreshToken string
	DeviceID     string
	BlogName     string        // creator's Boosty blog slug, e.g. "druz9"
	Timeout      time.Duration // default 15s
}

// Client calls the Boosty API on behalf of the creator account.
type Client struct {
	cfg        Config
	httpClient *http.Client
	token      string // current (possibly refreshed) access token
}

// New returns a ready Client. Returns ErrNotConfigured if BlogName or
// AccessToken is empty.
func New(cfg Config) (*Client, error) {
	if cfg.BlogName == "" || cfg.AccessToken == "" {
		return nil, ErrNotConfigured
	}
	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = 15 * time.Second
	}
	return &Client{
		cfg:        cfg,
		httpClient: &http.Client{Timeout: timeout},
		token:      cfg.AccessToken,
	}, nil
}

// SubscriberInfo contains the data we care about from the subscribers list.
type SubscriberInfo struct {
	BoostyEmail string
	// ExpiresAt is the next payment date. We treat it as the subscription end.
	ExpiresAt time.Time
}

// CheckSubscriber scans the creator's subscriber list for the given email.
// Returns ErrNotSubscribed when not found or subscription is inactive.
// Paginates automatically (Boosty returns up to 200 per page).
func (c *Client) CheckSubscriber(ctx context.Context, email string) (*SubscriberInfo, error) {
	if c == nil {
		return nil, ErrNotConfigured
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, ErrEmailRequired
	}

	offset := 0
	for {
		subs, isLast, err := c.fetchSubscribers(ctx, offset, 200)
		if err != nil {
			return nil, err
		}
		for _, s := range subs {
			if strings.ToLower(strings.TrimSpace(s.email)) == email && s.onTime {
				return &SubscriberInfo{
					BoostyEmail: s.email,
					ExpiresAt:   s.nextPayAt,
				}, nil
			}
		}
		if isLast {
			break
		}
		offset += 200
	}
	return nil, ErrNotSubscribed
}

// boostySub is an internal DTO for one subscriber entry.
type boostySub struct {
	email     string
	onTime    bool
	nextPayAt time.Time
}

type subscribersResponse struct {
	Data []struct {
		Email         string `json:"email"`
		Subscriptions []struct {
			OnTime    bool   `json:"onTime"`
			NextPayAt string `json:"nextPayAt"`
		} `json:"subscriptions"`
	} `json:"data"`
	Extra struct {
		IsLast bool `json:"isLast"`
		Offset int  `json:"offset"`
	} `json:"extra"`
}

func (c *Client) fetchSubscribers(ctx context.Context, offset, limit int) ([]boostySub, bool, error) {
	u := fmt.Sprintf("%s/v1/blog/%s/subscribers?offset=%d&limit=%d",
		baseURL, url.PathEscape(c.cfg.BlogName), offset, limit)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, false, fmt.Errorf("boosty: build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, false, fmt.Errorf("boosty: http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		// Try token refresh once, then retry.
		if refreshErr := c.refresh(ctx); refreshErr != nil {
			return nil, false, ErrTokenExpired
		}
		// Retry with the new token.
		return c.fetchSubscribers(ctx, offset, limit)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, false, fmt.Errorf("boosty: unexpected status %d: %w", resp.StatusCode, ErrNotSubscribed)
	}

	var body subscribersResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, false, fmt.Errorf("boosty: decode: %w", err)
	}

	subs := make([]boostySub, 0, len(body.Data))
	for _, d := range body.Data {
		sub := boostySub{email: d.Email}
		for _, s := range d.Subscriptions {
			if s.OnTime {
				sub.onTime = true
				if t, err := time.Parse(time.RFC3339, s.NextPayAt); err == nil {
					sub.nextPayAt = t
				}
				break
			}
		}
		subs = append(subs, sub)
	}
	return subs, body.Extra.IsLast, nil
}

type refreshResponse struct {
	AccessToken string `json:"access_token"`
}

func (c *Client) refresh(ctx context.Context) error {
	if c.cfg.RefreshToken == "" || c.cfg.DeviceID == "" {
		return ErrNoRefreshCreds
	}

	body := fmt.Sprintf(
		`{"device_id":%q,"grant_type":"refresh_token","refresh_token":%q}`,
		c.cfg.DeviceID, c.cfg.RefreshToken,
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		baseURL+"/oauth/token", strings.NewReader(body))
	if err != nil {
		return fmt.Errorf("create refresh request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("do refresh request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("boosty: refresh failed status %d: %w", resp.StatusCode, ErrTokenExpired)
	}

	var r refreshResponse
	if err := json.NewDecoder(resp.Body).Decode(&r); err != nil {
		return fmt.Errorf("decode refresh response: %w", err)
	}
	if r.AccessToken == "" {
		return ErrEmptyRefreshToken
	}
	c.token = r.AccessToken
	return nil
}
