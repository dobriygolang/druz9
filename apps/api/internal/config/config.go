package config

import "time"

type Bootstrap struct {
	Server   *Server   `json:"server"`
	Data     *Data     `json:"data"`
	Auth     *Auth     `json:"auth"`
	Dev      *Dev      `json:"dev"`
	External *External `json:"external"`
	Metrics  *Metrics  `json:"metrics"`
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
	Session *Session `json:"session"`
}

type Dev struct {
	AuthBypass bool `json:"auth_bypass"`
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
	Geocoder *Geocoder `json:"geocoder"`
	S3       *S3       `json:"s3"`
	LiveKit  *LiveKit  `json:"livekit"`
}

type Telegram struct {
	BotToken string `json:"bot_token"`
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

type LiveKit struct {
	URL       string `json:"url"`
	PublicURL string `json:"public_url"`
	APIKey    string `json:"api_key"`
	APISecret string `json:"api_secret"`
}
