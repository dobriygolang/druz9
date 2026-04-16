package config

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"api/internal/rtc"
)

func Load(manager *rtc.Manager) (*Bootstrap, error) {
	cfg := defaultBootstrap()
	ctx := context.Background()

	if v := manager.GetValue(ctx, rtc.ServerHttpAddr); v.String() != "" {
		cfg.Server.HTTP.Addr = v.String()
	}
	if v := manager.GetValue(ctx, rtc.ServerGrpcAddr); v.String() != "" {
		cfg.Server.GRPC.Addr = v.String()
	}

	if v := manager.GetValue(ctx, rtc.ServerHttpTimeout); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse HTTP_TIMEOUT: %w", parseErr)
		}
		cfg.Server.HTTP.Timeout = d
	}
	if v := manager.GetValue(ctx, rtc.ServerGrpcTimeout); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse GRPC_TIMEOUT: %w", parseErr)
		}
		cfg.Server.GRPC.Timeout = d
	}
	if v := manager.GetValue(ctx, rtc.ServerRateLimitMaxCalls); v.String() != "" {
		parsed, parseErr := strconv.Atoi(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse RATE_LIMIT_MAX_CALLS: %w", parseErr)
		}
		if cfg.Server.RateLimit == nil {
			cfg.Server.RateLimit = &RateLimit{}
		}
		cfg.Server.RateLimit.MaxCalls = parsed
	}
	if v := manager.GetValue(ctx, rtc.ServerRateLimitWindow); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse RATE_LIMIT_WINDOW: %w", parseErr)
		}
		if cfg.Server.RateLimit == nil {
			cfg.Server.RateLimit = &RateLimit{}
		}
		cfg.Server.RateLimit.Window = d
	}
	if v := manager.GetValue(ctx, rtc.ServerRateLimitBlockFor); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse RATE_LIMIT_BLOCK_FOR: %w", parseErr)
		}
		if cfg.Server.RateLimit == nil {
			cfg.Server.RateLimit = &RateLimit{}
		}
		cfg.Server.RateLimit.BlockFor = d
	}
	if v := manager.GetValue(ctx, rtc.ServerAllowedOrigins); v.String() != "" {
		cfg.Server.AllowedOrigins = splitTrimmed(v.String(), ",")
	}
	if v := manager.GetValue(ctx, rtc.ServerCircuitBreakerRequest); v.String() != "" {
		parsed, parseErr := strconv.ParseInt(v.String(), 10, 64)
		if parseErr != nil {
			return nil, fmt.Errorf("parse CIRCUIT_BREAKER_REQUEST: %w", parseErr)
		}
		if cfg.Server.CircuitBreaker == nil {
			cfg.Server.CircuitBreaker = &CircuitBreaker{}
		}
		cfg.Server.CircuitBreaker.Request = parsed
	}
	if v := manager.GetValue(ctx, rtc.ServerCircuitBreakerSuccess); v.String() != "" {
		parsed, parseErr := strconv.ParseFloat(v.String(), 64)
		if parseErr != nil {
			return nil, fmt.Errorf("parse CIRCUIT_BREAKER_SUCCESS: %w", parseErr)
		}
		if cfg.Server.CircuitBreaker == nil {
			cfg.Server.CircuitBreaker = &CircuitBreaker{}
		}
		cfg.Server.CircuitBreaker.Success = parsed
	}
	if v := manager.GetValue(ctx, rtc.MetricsAddr); v.String() != "" {
		if cfg.Metrics == nil {
			cfg.Metrics = &Metrics{}
		}
		cfg.Metrics.Addr = v.String()
	}
	if v := manager.GetValue(ctx, rtc.DataPoolMinConns); v.String() != "" {
		parsed, parseErr := strconv.ParseInt(v.String(), 10, 32)
		if parseErr != nil {
			return nil, fmt.Errorf("parse POOL_MIN_CONNS: %w", parseErr)
		}
		if cfg.Data.Pool == nil {
			cfg.Data.Pool = &PoolSettings{}
		}
		cfg.Data.Pool.MinConns = int32(parsed)
	}
	if v := manager.GetValue(ctx, rtc.DataPoolMaxConns); v.String() != "" {
		parsed, parseErr := strconv.ParseInt(v.String(), 10, 32)
		if parseErr != nil {
			return nil, fmt.Errorf("parse POOL_MAX_CONNS: %w", parseErr)
		}
		if cfg.Data.Pool == nil {
			cfg.Data.Pool = &PoolSettings{}
		}
		cfg.Data.Pool.MaxConns = int32(parsed)
	}
	if v := manager.GetValue(ctx, rtc.DataPoolMaxConnLifetime); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse POOL_MAX_CONN_LIFETIME: %w", parseErr)
		}
		if cfg.Data.Pool == nil {
			cfg.Data.Pool = &PoolSettings{}
		}
		cfg.Data.Pool.MaxConnLifetime = d
	}
	if v := manager.GetValue(ctx, rtc.DataPoolMaxConnIdleTime); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse POOL_MAX_CONN_IDLE_TIME: %w", parseErr)
		}
		if cfg.Data.Pool == nil {
			cfg.Data.Pool = &PoolSettings{}
		}
		cfg.Data.Pool.MaxConnIdleTime = d
	}
	if v := manager.GetValue(ctx, rtc.DataPoolHealthCheckPeriod); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse POOL_HEALTH_CHECK_PERIOD: %w", parseErr)
		}
		if cfg.Data.Pool == nil {
			cfg.Data.Pool = &PoolSettings{}
		}
		cfg.Data.Pool.HealthCheckPeriod = d
	}

	if v := manager.GetValue(ctx, rtc.SessionCookieName); v.String() != "" {
		cfg.Auth.Session.CookieName = v.String()
	}

	if v := manager.GetValue(ctx, rtc.CookieDomain); v.String() != "" {
		cfg.Auth.Session.CookieDomain = v.String()
	}

	if v := manager.GetValue(ctx, rtc.CookieSecure); v.String() != "" {
		cfg.Auth.Session.CookieSecure = strings.EqualFold(v.String(), "true") || v.String() == "1"
	}

	if v := manager.GetValue(ctx, rtc.CookieSameSite); v.String() != "" {
		cfg.Auth.Session.CookieSameSite = v.String()
	}

	if v := manager.GetValue(ctx, rtc.SessionTtl); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse SESSION_TTL: %w", parseErr)
		}
		cfg.Auth.Session.TTL = d
	}

	if v := manager.GetValue(ctx, rtc.SessionRefreshAfter); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse SESSION_REFRESH_AFTER: %w", parseErr)
		}
		cfg.Auth.Session.RefreshAfter = d
	}

	if v := manager.GetValue(ctx, rtc.TelegramAuthMaxAge); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse TELEGRAM_AUTH_MAX_AGE: %w", parseErr)
		}
		cfg.Auth.Session.TelegramAuthMaxAge = d
	}
	if v := manager.GetValue(ctx, rtc.YandexOauthClientId); v.String() != "" {
		cfg.External.Yandex.ClientID = v.String()
	}
	if v := manager.GetValue(ctx, rtc.YandexOauthRedirectUrl); v.String() != "" {
		cfg.External.Yandex.RedirectURL = v.String()
	}
	if v := manager.GetValue(ctx, rtc.GeocoderBaseUrl); v.String() != "" {
		cfg.External.Geocoder.BaseURL = v.String()
	}
	if v := manager.GetValue(ctx, rtc.GeocoderUserAgent); v.String() != "" {
		cfg.External.Geocoder.UserAgent = v.String()
	}
	if v := manager.GetValue(ctx, rtc.GeocoderLanguage); v.String() != "" {
		cfg.External.Geocoder.Language = v.String()
	}
	if v := manager.GetValue(ctx, rtc.S3Endpoint); v.String() != "" {
		cfg.External.S3.Endpoint = v.String()
	}
	if v := manager.GetValue(ctx, rtc.S3PublicEndpoint); v.String() != "" {
		cfg.External.S3.PublicEndpoint = v.String()
	}
	if v := manager.GetValue(ctx, rtc.S3Bucket); v.String() != "" {
		cfg.External.S3.Bucket = v.String()
	}
	if v := manager.GetValue(ctx, rtc.AiReviewProvider); v.String() != "" {
		cfg.External.AIReview.Provider = v.String()
	}
	if v := manager.GetValue(ctx, rtc.AiReviewBaseUrl); v.String() != "" {
		cfg.External.AIReview.BaseURL = v.String()
	}
	if v := manager.GetValue(ctx, rtc.AiReviewModel); v.String() != "" {
		cfg.External.AIReview.Model = v.String()
	}
	if v := manager.GetValue(ctx, rtc.AiReviewModelCode); v.String() != "" {
		cfg.External.AIReview.ModelCode = v.String()
	}
	if v := manager.GetValue(ctx, rtc.AiReviewModelArchitecture); v.String() != "" {
		cfg.External.AIReview.ModelArchitecture = v.String()
	}
	if v := manager.GetValue(ctx, rtc.AiReviewModelFollowup); v.String() != "" {
		cfg.External.AIReview.ModelFollowup = v.String()
	}
	if v := manager.GetValue(ctx, rtc.AiReviewModelSystemDesign); v.String() != "" {
		cfg.External.AIReview.ModelSystemDesign = v.String()
	}
	if v := manager.GetValue(ctx, rtc.AiReviewTimeout); v.String() != "" {
		d, parseErr := time.ParseDuration(v.String())
		if parseErr != nil {
			return nil, fmt.Errorf("parse AI_REVIEW_TIMEOUT: %w", parseErr)
		}
		cfg.External.AIReview.Timeout = d
	}
	if v := manager.GetValue(ctx, rtc.AiReviewMaxImageBytes); v.String() != "" {
		parsed, parseErr := strconv.ParseInt(v.String(), 10, 64)
		if parseErr != nil {
			return nil, fmt.Errorf("parse AI_REVIEW_MAX_IMAGE_BYTES: %w", parseErr)
		}
		cfg.External.AIReview.MaxImageBytes = parsed
	}
	if v := manager.GetValue(ctx, rtc.DevAuthBypass); v.String() != "" {
		cfg.Dev.AuthBypass = strings.EqualFold(v.String(), "true") || v.String() == "1"
	}
	if v := manager.GetValue(ctx, rtc.AppRequireAuth); v.String() != "" {
		cfg.Auth.RequireAuth = strings.EqualFold(v.String(), "true") || v.String() == "1"
	}
	if v := manager.GetValue(ctx, rtc.DevUserId); v.String() != "" {
		cfg.Dev.DevUserID = v.String()
	}
	if v := manager.GetValue(ctx, rtc.Key("arena_require_auth")); v.String() != "" {
		if cfg.Arena == nil {
			cfg.Arena = &Arena{}
		}
		cfg.Arena.RequireAuth = strings.EqualFold(v.String(), "true") || v.String() == "1"
	}

	overrideSecretConfigFromEnv(cfg)

	// Allow env override for CORS origins.
	if value, ok := lookupEnvValue("ALLOWED_ORIGINS"); ok && value != "" {
		cfg.Server.AllowedOrigins = splitTrimmed(value, ",")
	}

	if cfg.Data.Database.Source == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	// Telegram token is optional - bot will not start if empty
	if cfg.External.S3.Endpoint == "" || cfg.External.S3.Bucket == "" || cfg.External.S3.AccessKey == "" || cfg.External.S3.SecretKey == "" {
		return nil, fmt.Errorf("S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY and S3_SECRET_KEY are required")
	}

	// Register watchers for config changes
	if err := registerConfigWatchers(manager, cfg); err != nil {
		return nil, fmt.Errorf("register config watchers: %w", err)
	}

	return cfg, nil
}

func overrideSecretConfigFromEnv(cfg *Bootstrap) {
	if cfg == nil {
		return
	}

	if value, ok := lookupEnvValue("DATABASE_URL"); ok {
		cfg.Data.Database.Source = value
	}
	if value, ok := lookupEnvValue("TELEGRAM_BOT_TOKEN"); ok {
		cfg.External.Telegram.BotToken = value
	}
	if value, ok := lookupEnvValue("TELEGRAM_BOT_USERNAME"); ok {
		cfg.External.Telegram.BotUsername = strings.TrimPrefix(value, "@")
	}
	if value, ok := lookupEnvValue("YANDEX_OAUTH_CLIENT_ID"); ok {
		cfg.External.Yandex.ClientID = value
	}
	if value, ok := lookupEnvValue("YANDEX_OAUTH_CLIENT_SECRET"); ok {
		cfg.External.Yandex.ClientSecret = value
	}
	if value, ok := lookupEnvValue("YANDEX_OAUTH_REDIRECT_URL"); ok {
		cfg.External.Yandex.RedirectURL = value
	}
	if value, ok := lookupEnvValue("S3_ENDPOINT"); ok {
		cfg.External.S3.Endpoint = value
	}
	if value, ok := lookupEnvValue("S3_PUBLIC_ENDPOINT"); ok {
		cfg.External.S3.PublicEndpoint = value
	}
	if value, ok := lookupEnvValue("S3_BUCKET"); ok {
		cfg.External.S3.Bucket = value
	}
	if value, ok := lookupEnvValue("S3_ACCESS_KEY"); ok {
		cfg.External.S3.AccessKey = value
	}
	if value, ok := lookupEnvValue("S3_SECRET_KEY"); ok {
		cfg.External.S3.SecretKey = value
	}
	if value, ok := lookupEnvValue("AI_REVIEW_PROVIDER"); ok {
		cfg.External.AIReview.Provider = value
	}
	if value, ok := lookupEnvValue("AI_REVIEW_BASE_URL"); ok {
		cfg.External.AIReview.BaseURL = value
	}
	if value, ok := lookupEnvValue("AI_REVIEW_API_KEY"); ok {
		cfg.External.AIReview.APIKey = value
	}
	if value, ok := lookupEnvValue("AI_REVIEW_MODEL"); ok {
		cfg.External.AIReview.Model = value
	}
	if value, ok := lookupEnvValue("AI_REVIEW_MODEL_CODE"); ok {
		cfg.External.AIReview.ModelCode = value
	}
	if value, ok := lookupEnvValue("AI_REVIEW_MODEL_ARCHITECTURE"); ok {
		cfg.External.AIReview.ModelArchitecture = value
	}
	if value, ok := lookupEnvValue("AI_REVIEW_MODEL_FOLLOWUP"); ok {
		cfg.External.AIReview.ModelFollowup = value
	}
	if value, ok := lookupEnvValue("AI_REVIEW_MODEL_SYSTEM_DESIGN"); ok {
		cfg.External.AIReview.ModelSystemDesign = value
	}
	if value, ok := lookupEnvValue("AI_REVIEW_TIMEOUT"); ok {
		if parsed, err := time.ParseDuration(value); err == nil {
			cfg.External.AIReview.Timeout = parsed
		}
	}
	if value, ok := lookupEnvValue("AI_REVIEW_MAX_IMAGE_BYTES"); ok {
		if parsed, err := strconv.ParseInt(value, 10, 64); err == nil {
			cfg.External.AIReview.MaxImageBytes = parsed
		}
	}
	if value, ok := lookupEnvValue("SANDBOX_MODE"); ok {
		cfg.Sandbox.Mode = strings.TrimSpace(value)
	}
	if value, ok := lookupEnvValue("SANDBOX_RUNNER_URL"); ok {
		cfg.Sandbox.RunnerURL = strings.TrimSpace(value)
	}
	if value, ok := lookupEnvValue("SANDBOX_RUNNER_TIMEOUT"); ok {
		if parsed, err := time.ParseDuration(value); err == nil {
			cfg.Sandbox.Timeout = parsed
		}
	}

	if value, ok := lookupEnvValue("NOTIFICATION_SERVICE_ADDR"); ok {
		if cfg.External.NotificationService == nil {
			cfg.External.NotificationService = &NotificationService{}
		}
		cfg.External.NotificationService.Addr = strings.TrimSpace(value)
	}
}

func splitTrimmed(s string, sep string) []string {
	parts := strings.Split(s, sep)
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func lookupEnvValue(key string) (string, bool) {
	if value, ok := os.LookupEnv(key); ok {
		return strings.TrimSpace(value), true
	}

	fileKey := key + "_FILE"
	path, ok := os.LookupEnv(fileKey)
	if !ok || strings.TrimSpace(path) == "" {
		return "", false
	}

	content, err := os.ReadFile(strings.TrimSpace(path))
	if err != nil {
		return "", false
	}
	return strings.TrimSpace(string(content)), true
}

func registerConfigWatchers(manager *rtc.Manager, cfg *Bootstrap) error {
	ctx := context.Background()

	// Watch Dev.AuthBypass for hot reloading
	if err := manager.WatchValue(ctx, rtc.DevAuthBypass, func(oldVar, newVar rtc.Variable) {
		cfg.Dev.AuthBypass = newVar.Value().Bool()
	}); err != nil {
		return err
	}
	if err := manager.WatchValue(ctx, rtc.AppRequireAuth, func(oldVar, newVar rtc.Variable) {
		cfg.Auth.RequireAuth = newVar.Value().Bool()
	}); err != nil {
		return err
	}
	if err := manager.WatchValue(ctx, rtc.Key("arena_require_auth"), func(oldVar, newVar rtc.Variable) {
		if cfg.Arena == nil {
			cfg.Arena = &Arena{}
		}
		cfg.Arena.RequireAuth = newVar.Value().Bool()
	}); err != nil {
		return err
	}
	return nil
}

func defaultBootstrap() *Bootstrap {
	return &Bootstrap{
		Server: &Server{
			HTTP: &HTTP{
				Addr:    ":8080",
				Timeout: 5 * time.Second,
			},
			GRPC: &GRPC{
				Addr:    ":9000",
				Timeout: 5 * time.Second,
			},
			SSE: &SSE{
				Addr: ":8081",
			},
		},
		Data: &Data{
			Database: &Database{},
		},
		Auth: &Auth{
			RequireAuth: true,
			Session: &Session{
				CookieName:         "session_token",
				CookieSameSite:     "Lax",
				TTL:                30 * 24 * time.Hour,
				RefreshAfter:       12 * time.Hour,
				TelegramAuthMaxAge: 24 * time.Hour,
			},
		},
		Dev:   &Dev{},
		Arena: &Arena{},
		Sandbox: &Sandbox{
			Mode:      "local",
			RunnerURL: "http://localhost:8098",
			Timeout:   20 * time.Second,
		},
		Metrics: &Metrics{},
		External: &External{
			Telegram: &Telegram{},
			Yandex:   &Yandex{},
			Geocoder: &Geocoder{
				BaseURL:   "https://nominatim.openstreetmap.org/search",
				UserAgent: "druz9-api/1.0",
				Language:  "ru,en",
			},
			S3: &S3{},
			AIReview: &AIReview{
				Timeout:       30 * time.Second,
				MaxImageBytes: 5 * 1024 * 1024,
			},
		},
	}
}
