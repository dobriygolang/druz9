package config

import "time"

type Bootstrap struct {
	Server   *Server   `json:"server"`
	Data     *Data     `json:"data"`
	Auth     *Auth     `json:"auth"`
	Dev      *Dev      `json:"dev"`
	Arena    *Arena    `json:"arena"`
	Sandbox  *Sandbox  `json:"sandbox"`
	External *External `json:"external"`
	Metrics  *Metrics  `json:"metrics"`
}

type Arena struct {
	RequireAuth bool `json:"require_auth"`
}

type Metrics struct {
	Addr string `json:"addr"`
}

type CircuitBreaker struct {
	Request int64   `json:"request"`
	Success float64 `json:"success"`
}

type RateLimit struct {
	MaxCalls    int           `json:"max_calls"`     // max requests per window (default: 1000)
	Window      time.Duration `json:"window"`        // time window (default: 1s)
	BlockFor    time.Duration `json:"block_for"`     // how long to reject requests when limit exceeded
	MaxWaitTime time.Duration `json:"max_wait_time"` // max time to wait for permit
}

type Server struct {
	HTTP           *HTTP           `json:"http"`
	GRPC           *GRPC           `json:"grpc"`
	SSE            *SSE            `json:"sse"`
	RateLimit      *RateLimit      `json:"rate_limit"`
	CircuitBreaker *CircuitBreaker `json:"circuit_breaker"`
}

type HTTP struct {
	Addr    string        `json:"addr"`
	Timeout time.Duration `json:"timeout"`
}

type GRPC struct {
	Addr    string        `json:"addr"`
	Timeout time.Duration `json:"timeout"`
}

type SSE struct {
	Addr string `json:"addr"`
}

type Data struct {
	Database *Database     `json:"database"`
	Pool     *PoolSettings `json:"pool"`
}

type Database struct {
	Source string `json:"source"`
}

type PoolSettings struct {
	MinConns          int32         `json:"min_conns"`
	MaxConns          int32         `json:"max_conns"`
	MaxConnLifetime   time.Duration `json:"max_conn_lifetime"`
	MaxConnIdleTime   time.Duration `json:"max_conn_idle_time"`
	HealthCheckPeriod time.Duration `json:"health_check_period"`
}

type Auth struct {
	RequireAuth bool     `json:"require_auth"`
	Session     *Session `json:"session"`
}

type Dev struct {
	AuthBypass bool   `json:"auth_bypass"`
	DevUserID  string `json:"dev_user_id"`
}

type Sandbox struct {
	Mode      string        `json:"mode"`
	RunnerURL string        `json:"runner_url"`
	Timeout   time.Duration `json:"timeout"`
}

type Session struct {
	CookieName         string        `json:"cookie_name"`
	CookieDomain       string        `json:"cookie_domain"`
	CookieSecure       bool          `json:"cookie_secure"`
	CookieSameSite     string        `json:"cookie_same_site"`
	TTL                time.Duration `json:"ttl"`
	RefreshAfter       time.Duration `json:"refresh_after"`
	TelegramAuthMaxAge time.Duration `json:"telegram_auth_max_age"`
}

type External struct {
	Telegram *Telegram `json:"telegram"`
	Yandex   *Yandex   `json:"yandex"`
	Geocoder *Geocoder `json:"geocoder"`
	S3       *S3       `json:"s3"`
	AIReview *AIReview `json:"ai_review"`
}

type Telegram struct {
	BotToken    string `json:"bot_token"`
	BotUsername string `json:"bot_username"`
}

type Yandex struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	RedirectURL  string `json:"redirect_url"`
}

type Geocoder struct {
	BaseURL   string `json:"base_url"`
	UserAgent string `json:"user_agent"`
	Language  string `json:"language"`
}

type S3 struct {
	Endpoint       string `json:"endpoint"`
	PublicEndpoint string `json:"public_endpoint"`
	Bucket         string `json:"bucket"`
	AccessKey      string `json:"access_key"`
	SecretKey      string `json:"secret_key"`
}

type AIReview struct {
	Provider          string        `json:"provider"`
	BaseURL           string        `json:"base_url"`
	APIKey            string        `json:"api_key"`
	Model             string        `json:"model"`
	ModelCode         string        `json:"model_code"`
	ModelArchitecture string        `json:"model_architecture"`
	ModelFollowup     string        `json:"model_followup"`
	ModelSystemDesign string        `json:"model_system_design"`
	Timeout           time.Duration `json:"timeout"`
	MaxImageBytes     int64         `json:"max_image_bytes"`
}
