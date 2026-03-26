package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"api/internal/rtc"

	"gopkg.in/yaml.v3"
)

func Load() (*Bootstrap, error) {
	cfg := defaultBootstrap()
	values, err := loadRealtimeValues()
	if err != nil {
		return nil, err
	}

	if v, err := valueOrEnv(values, rtc.ServerHttpAddr, "HTTP_ADDR"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Server.HTTP.Addr = v
	}
	if v, err := valueOrEnv(values, rtc.ServerGrpcAddr, "GRPC_ADDR"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Server.GRPC.Addr = v
	}

	if v, err := valueOrEnv(values, rtc.ServerHttpTimeout, "HTTP_TIMEOUT"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse HTTP_TIMEOUT: %w", parseErr)
		}
		cfg.Server.HTTP.Timeout = d
	}
	if v, err := valueOrEnv(values, rtc.ServerGrpcTimeout, "GRPC_TIMEOUT"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse GRPC_TIMEOUT: %w", parseErr)
		}
		cfg.Server.GRPC.Timeout = d
	}
	if v, err := valueOrEnv(values, rtc.ServerRateLimitMaxCalls, "RATE_LIMIT_MAX_CALLS"); err != nil {
		return nil, err
	} else if v != "" {
		parsed, parseErr := strconv.Atoi(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse RATE_LIMIT_MAX_CALLS: %w", parseErr)
		}
		if cfg.Server.RateLimit == nil {
			cfg.Server.RateLimit = &RateLimit{}
		}
		cfg.Server.RateLimit.MaxCalls = parsed
	}
	if v, err := valueOrEnv(values, rtc.ServerRateLimitWindow, "RATE_LIMIT_WINDOW"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse RATE_LIMIT_WINDOW: %w", parseErr)
		}
		if cfg.Server.RateLimit == nil {
			cfg.Server.RateLimit = &RateLimit{}
		}
		cfg.Server.RateLimit.Window = d
	}
	if v, err := valueOrEnv(values, rtc.ServerRateLimitBlockFor, "RATE_LIMIT_BLOCK_FOR"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse RATE_LIMIT_BLOCK_FOR: %w", parseErr)
		}
		if cfg.Server.RateLimit == nil {
			cfg.Server.RateLimit = &RateLimit{}
		}
		cfg.Server.RateLimit.BlockFor = d
	}
	if v, err := valueOrEnv(values, rtc.ServerRateLimitMaxWaitTime, "RATE_LIMIT_MAX_WAIT_TIME"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse RATE_LIMIT_MAX_WAIT_TIME: %w", parseErr)
		}
		if cfg.Server.RateLimit == nil {
			cfg.Server.RateLimit = &RateLimit{}
		}
		cfg.Server.RateLimit.MaxWaitTime = d
	}
	if v, err := valueOrEnv(values, rtc.ServerCircuitBreakerRequest, "CIRCUIT_BREAKER_REQUEST"); err != nil {
		return nil, err
	} else if v != "" {
		parsed, parseErr := strconv.ParseInt(v, 10, 64)
		if parseErr != nil {
			return nil, fmt.Errorf("parse CIRCUIT_BREAKER_REQUEST: %w", parseErr)
		}
		if cfg.Server.CircuitBreaker == nil {
			cfg.Server.CircuitBreaker = &CircuitBreaker{}
		}
		cfg.Server.CircuitBreaker.Request = parsed
	}
	if v, err := valueOrEnv(values, rtc.ServerCircuitBreakerSuccess, "CIRCUIT_BREAKER_SUCCESS"); err != nil {
		return nil, err
	} else if v != "" {
		parsed, parseErr := strconv.ParseFloat(v, 64)
		if parseErr != nil {
			return nil, fmt.Errorf("parse CIRCUIT_BREAKER_SUCCESS: %w", parseErr)
		}
		if cfg.Server.CircuitBreaker == nil {
			cfg.Server.CircuitBreaker = &CircuitBreaker{}
		}
		cfg.Server.CircuitBreaker.Success = parsed
	}
	if v, err := valueOrEnv(values, rtc.MetricsAddr, "METRICS_ADDR"); err != nil {
		return nil, err
	} else if v != "" {
		if cfg.Metrics == nil {
			cfg.Metrics = &Metrics{}
		}
		cfg.Metrics.Addr = v
	}

	if v, err := valueOrEnv(values, rtc.DatabaseUrl, "DATABASE_URL"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Data.Database.Source = v
	}
	if v, err := valueOrEnv(values, rtc.DataPoolMinConns, "POOL_MIN_CONNS"); err != nil {
		return nil, err
	} else if v != "" {
		parsed, parseErr := strconv.ParseInt(v, 10, 32)
		if parseErr != nil {
			return nil, fmt.Errorf("parse POOL_MIN_CONNS: %w", parseErr)
		}
		if cfg.Data.Pool == nil {
			cfg.Data.Pool = &PoolSettings{}
		}
		cfg.Data.Pool.MinConns = int32(parsed)
	}
	if v, err := valueOrEnv(values, rtc.DataPoolMaxConns, "POOL_MAX_CONNS"); err != nil {
		return nil, err
	} else if v != "" {
		parsed, parseErr := strconv.ParseInt(v, 10, 32)
		if parseErr != nil {
			return nil, fmt.Errorf("parse POOL_MAX_CONNS: %w", parseErr)
		}
		if cfg.Data.Pool == nil {
			cfg.Data.Pool = &PoolSettings{}
		}
		cfg.Data.Pool.MaxConns = int32(parsed)
	}
	if v, err := valueOrEnv(values, rtc.DataPoolMaxConnLifetime, "POOL_MAX_CONN_LIFETIME"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse POOL_MAX_CONN_LIFETIME: %w", parseErr)
		}
		if cfg.Data.Pool == nil {
			cfg.Data.Pool = &PoolSettings{}
		}
		cfg.Data.Pool.MaxConnLifetime = d
	}
	if v, err := valueOrEnv(values, rtc.DataPoolMaxConnIdleTime, "POOL_MAX_CONN_IDLE_TIME"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse POOL_MAX_CONN_IDLE_TIME: %w", parseErr)
		}
		if cfg.Data.Pool == nil {
			cfg.Data.Pool = &PoolSettings{}
		}
		cfg.Data.Pool.MaxConnIdleTime = d
	}
	if v, err := valueOrEnv(values, rtc.DataPoolHealthCheckPeriod, "POOL_HEALTH_CHECK_PERIOD"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse POOL_HEALTH_CHECK_PERIOD: %w", parseErr)
		}
		if cfg.Data.Pool == nil {
			cfg.Data.Pool = &PoolSettings{}
		}
		cfg.Data.Pool.HealthCheckPeriod = d
	}

	if v, err := valueOrEnv(values, rtc.SessionCookieName, "SESSION_COOKIE_NAME"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Auth.Session.CookieName = v
	}

	if v, err := valueOrEnv(values, rtc.CookieDomain, "COOKIE_DOMAIN"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Auth.Session.CookieDomain = v
	}

	if v, err := valueOrEnv(values, rtc.CookieSecure, "COOKIE_SECURE"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Auth.Session.CookieSecure = strings.EqualFold(v, "true") || v == "1"
	}

	if v, err := valueOrEnv(values, rtc.CookieSameSite, "COOKIE_SAMESITE"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Auth.Session.CookieSameSite = v
	}

	if v, err := valueOrEnv(values, rtc.SessionTtl, "SESSION_TTL"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse SESSION_TTL: %w", parseErr)
		}
		cfg.Auth.Session.TTL = d
	}

	if v, err := valueOrEnv(values, rtc.SessionRefreshAfter, "SESSION_REFRESH_AFTER"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse SESSION_REFRESH_AFTER: %w", parseErr)
		}
		cfg.Auth.Session.RefreshAfter = d
	}

	if v, err := valueOrEnv(values, rtc.TelegramAuthMaxAge, "TELEGRAM_AUTH_MAX_AGE"); err != nil {
		return nil, err
	} else if v != "" {
		d, parseErr := time.ParseDuration(v)
		if parseErr != nil {
			return nil, fmt.Errorf("parse TELEGRAM_AUTH_MAX_AGE: %w", parseErr)
		}
		cfg.Auth.Session.TelegramAuthMaxAge = d
	}

	if v, err := valueOrEnv(values, rtc.TelegramBotToken, "TELEGRAM_BOT_TOKEN"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.Telegram.BotToken = v
	}
	if v, err := valueOrEnv(values, rtc.GeocoderBaseUrl, "GEOCODER_BASE_URL"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.Geocoder.BaseURL = v
	}
	if v, err := valueOrEnv(values, rtc.GeocoderUserAgent, "GEOCODER_USER_AGENT"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.Geocoder.UserAgent = v
	}
	if v, err := valueOrEnv(values, rtc.GeocoderLanguage, "GEOCODER_LANGUAGE"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.Geocoder.Language = v
	}
	if v, err := valueOrEnv(values, rtc.S3Endpoint, "S3_ENDPOINT"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.S3.Endpoint = v
	}
	if v, err := valueOrEnv(values, rtc.S3PublicEndpoint, "S3_PUBLIC_ENDPOINT"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.S3.PublicEndpoint = v
	}
	if v, err := valueOrEnv(values, rtc.S3Bucket, "S3_BUCKET"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.S3.Bucket = v
	}
	if v, err := valueOrEnv(values, rtc.S3AccessKey, "S3_ACCESS_KEY"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.S3.AccessKey = v
	}
	if v, err := valueOrEnv(values, rtc.S3SecretKey, "S3_SECRET_KEY"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.S3.SecretKey = v
	}
	if v, err := valueOrEnv(values, rtc.LivekitUrl, "LIVEKIT_URL"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.LiveKit.URL = v
	}
	if v, err := valueOrEnv(values, rtc.LivekitPublicUrl, "LIVEKIT_PUBLIC_URL"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.LiveKit.PublicURL = v
	}
	if v, err := valueOrEnv(values, rtc.LivekitApiKey, "LIVEKIT_API_KEY"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.LiveKit.APIKey = v
	}
	if v, err := valueOrEnv(values, rtc.LivekitApiSecret, "LIVEKIT_API_SECRET"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.External.LiveKit.APISecret = v
	}
	if v, err := valueOrEnv(values, rtc.DevAuthBypass, "DEV_AUTH_BYPASS"); err != nil {
		return nil, err
	} else if v != "" {
		cfg.Dev.AuthBypass = strings.EqualFold(v, "true") || v == "1"
	}

	if cfg.Data.Database.Source == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.External.Telegram.BotToken == "" && !cfg.Dev.AuthBypass {
		return nil, fmt.Errorf("TELEGRAM_BOT_TOKEN is required")
	}
	if cfg.External.S3.Endpoint == "" || cfg.External.S3.Bucket == "" || cfg.External.S3.AccessKey == "" || cfg.External.S3.SecretKey == "" {
		return nil, fmt.Errorf("S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY and S3_SECRET_KEY are required")
	}

	return cfg, nil
}

func loadRealtimeValues() (map[rtc.Key]rtc.Definition, error) {
	rtcPath := ResolveRTCValuesPath()

	content, err := os.ReadFile(rtcPath)
	if err != nil {
		if os.IsNotExist(err) {
			return map[rtc.Key]rtc.Definition{}, nil
		}
		return nil, fmt.Errorf("read realtime values: %w", err)
	}

	raw := make(map[string]rtc.Definition)
	if err := yaml.Unmarshal(content, &raw); err != nil {
		return nil, fmt.Errorf("unmarshal realtime values: %w", err)
	}

	values := make(map[rtc.Key]rtc.Definition, len(raw))
	for key, definition := range raw {
		values[rtc.Key(key)] = definition
	}

	return values, nil
}

func valueOrEnv(values map[rtc.Key]rtc.Definition, key rtc.Key, envKey string) (string, error) {
	if definition, ok := values[key]; ok {
		if value := strings.TrimSpace(definition.Value); value != "" {
			return value, nil
		}
	}
	return envOrFile(envKey)
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
		},
		Data: &Data{
			Database: &Database{},
		},
		Auth: &Auth{
			Session: &Session{
				CookieName:         "session_token",
				CookieSameSite:     "Lax",
				TTL:                30 * 24 * time.Hour,
				RefreshAfter:       12 * time.Hour,
				TelegramAuthMaxAge: 24 * time.Hour,
			},
		},
		Dev:     &Dev{},
		Metrics: &Metrics{},
		External: &External{
			Telegram: &Telegram{},
			Geocoder: &Geocoder{
				BaseURL:   "https://nominatim.openstreetmap.org/search",
				UserAgent: "druz9-api/1.0",
				Language:  "ru,en",
			},
			S3: &S3{},
			LiveKit: &LiveKit{
				URL:       "ws://localhost:7880",
				PublicURL: "",
				APIKey:    "devkey",
				APISecret: "secret",
			},
		},
	}
}

func envOrFile(key string) (string, error) {
	value := strings.TrimSpace(os.Getenv(key))
	filePath := strings.TrimSpace(os.Getenv(key + "_FILE"))
	if value != "" && filePath != "" {
		return "", fmt.Errorf("%s and %s_FILE are both set", key, key)
	}
	if value != "" {
		return value, nil
	}
	if filePath == "" {
		return "", nil
	}
	content, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("read %s_FILE: %w", key, err)
	}
	return strings.TrimSpace(string(content)), nil
}
