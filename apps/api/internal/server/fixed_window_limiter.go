package server

import (
	"sync"
	"time"

	"api/internal/config"

	aegisratelimit "github.com/go-kratos/aegis/ratelimit"
)

type fixedWindowLimiter struct {
	mu           sync.Mutex
	maxCalls     int
	window       time.Duration
	blockFor     time.Duration
	blockedUntil time.Time
	windowStart  time.Time
	calls        int
}

func newFixedWindowLimiter(cfg *config.RateLimit) aegisratelimit.Limiter {
	window := time.Second
	blockFor := time.Duration(0)
	maxCalls := 100

	if cfg != nil {
		if cfg.MaxCalls > 0 {
			maxCalls = cfg.MaxCalls
		}
		if cfg.Window > 0 {
			window = cfg.Window
		}
		if cfg.BlockFor > 0 {
			blockFor = cfg.BlockFor
		}
	}

	return &fixedWindowLimiter{
		maxCalls: maxCalls,
		window:   window,
		blockFor: blockFor,
	}
}

func (l *fixedWindowLimiter) Allow() (aegisratelimit.DoneFunc, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()

	// If globally blocked, reject immediately.
	if !l.blockedUntil.IsZero() && now.Before(l.blockedUntil) {
		return nil, aegisratelimit.ErrLimitExceed
	}
	l.blockedUntil = time.Time{}

	// Reset window if expired.
	if l.windowStart.IsZero() || now.Sub(l.windowStart) >= l.window {
		l.windowStart = now
		l.calls = 0
	}

	// If over limit, apply block and reject.
	if l.calls >= l.maxCalls {
		if l.blockFor > 0 {
			l.blockedUntil = now.Add(l.blockFor)
		}
		return nil, aegisratelimit.ErrLimitExceed
	}

	l.calls++
	return func(aegisratelimit.DoneInfo) {}, nil
}
