package server

import (
	"net"
	"sync"
	"time"

	"api/internal/config"

	aegisratelimit "github.com/go-kratos/aegis/ratelimit"
)

type ipBucket struct {
	calls       int
	windowStart time.Time
}

type perIPLimiter struct {
	mu       sync.Mutex
	maxCalls int
	window   time.Duration
	buckets  map[string]*ipBucket
	lastGC   time.Time
}

func newPerIPLimiter(cfg *config.RateLimit) *perIPLimiter {
	window := time.Second
	maxCalls := 100

	if cfg != nil {
		if cfg.MaxCalls > 0 {
			maxCalls = cfg.MaxCalls
		}
		if cfg.Window > 0 {
			window = cfg.Window
		}
	}

	return &perIPLimiter{
		maxCalls: maxCalls,
		window:   window,
		buckets:  make(map[string]*ipBucket),
	}
}

func (l *perIPLimiter) Allow(ip string) (aegisratelimit.DoneFunc, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()

	// GC expired buckets every 30 seconds to prevent memory growth.
	if now.Sub(l.lastGC) > 30*time.Second {
		for key, b := range l.buckets {
			if now.Sub(b.windowStart) >= 2*l.window {
				delete(l.buckets, key)
			}
		}
		l.lastGC = now
	}

	b := l.buckets[ip]
	if b == nil {
		b = &ipBucket{windowStart: now}
		l.buckets[ip] = b
	}

	// Reset window if expired.
	if now.Sub(b.windowStart) >= l.window {
		b.windowStart = now
		b.calls = 0
	}

	if b.calls >= l.maxCalls {
		return nil, aegisratelimit.ErrLimitExceed
	}

	b.calls++
	return func(aegisratelimit.DoneInfo) {}, nil
}

// extractIP returns the client IP from addr (host:port format).
func extractIP(addr string) string {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return addr
	}
	return host
}
