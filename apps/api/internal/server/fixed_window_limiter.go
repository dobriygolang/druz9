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
	maxWaitTime  time.Duration
	blockedUntil time.Time
	windowStart  time.Time
	calls        int
}

func newFixedWindowLimiter(cfg *config.RateLimit) aegisratelimit.Limiter {
	window := time.Second
	blockFor := time.Duration(0)
	maxWaitTime := time.Duration(0)
	maxCalls := 100 // sensible default

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
		if cfg.MaxWaitTime > 0 {
			maxWaitTime = cfg.MaxWaitTime
		}
	}

	return &fixedWindowLimiter{
		maxCalls:    maxCalls,
		window:      window,
		blockFor:    blockFor,
		maxWaitTime: maxWaitTime,
	}
}

func (l *fixedWindowLimiter) Allow() (aegisratelimit.DoneFunc, error) {
	for {
		l.mu.Lock()

		now := time.Now()
		if !l.blockedUntil.IsZero() && now.Before(l.blockedUntil) {
			wait := time.Until(l.blockedUntil)
			if l.maxWaitTime > 0 && wait <= l.maxWaitTime {
				l.mu.Unlock()
				time.Sleep(wait)
				continue
			}
			l.mu.Unlock()
			return nil, aegisratelimit.ErrLimitExceed
		}

		if l.windowStart.IsZero() || now.Sub(l.windowStart) >= l.window {
			l.windowStart = now
			l.calls = 0
		}

		if l.calls >= l.maxCalls {
			if l.blockFor > 0 {
				l.blockedUntil = now.Add(l.blockFor)
				wait := time.Until(l.blockedUntil)
				if l.maxWaitTime > 0 && wait <= l.maxWaitTime {
					l.mu.Unlock()
					time.Sleep(wait)
					continue
				}
			} else {
				wait := l.window - now.Sub(l.windowStart)
				if l.maxWaitTime > 0 && wait > 0 && wait <= l.maxWaitTime {
					l.mu.Unlock()
					time.Sleep(wait)
					continue
				}
			}
			l.mu.Unlock()
			return nil, aegisratelimit.ErrLimitExceed
		}

		l.calls++
		l.mu.Unlock()
		return func(aegisratelimit.DoneInfo) {}, nil
	}
}
