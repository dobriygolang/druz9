package server

import (
	"context"
	"strings"
	"sync"
	"time"

	kratoserrpkg "github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/middleware/selector"
	"github.com/go-kratos/kratos/v2/transport"

	"api/internal/model"
)

// mutateLimiter is a per-user, per-operation-family rate limiter for
// write-heavy endpoints. The global per-IP limiter already protects against
// raw traffic spikes; this one guards against authenticated spam
// (e.g. mass friend requests, rapid purchase attempts).
//
// Limits intentionally live in code rather than config — they're product
// decisions tied to specific operations, not an operational knob.
type mutateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*mutBucket
}

type mutBucket struct {
	windowStart time.Time
	calls       int
}

func newMutateLimiter() *mutateLimiter {
	return &mutateLimiter{buckets: make(map[string]*mutBucket, 512)}
}

// rule maps an operation prefix (proto service path) to (max calls per
// window, window duration). First matching rule wins.
type rule struct {
	prefix   string
	maxCalls int
	window   time.Duration
	// hint is surfaced to the client in the error so UX can show a
	// meaningful message ("too many friend requests").
	hint string
}

var mutateRules = []rule{
	// Social: friend requests — easy to spam without a limit.
	{prefix: "/social.v1.SocialService/SendFriendRequest", maxCalls: 20, window: time.Hour, hint: "слишком много приглашений в друзья"},
	{prefix: "/social.v1.SocialService/AcceptFriendRequest", maxCalls: 60, window: time.Minute, hint: "слишком частые действия с дружбой"},
	{prefix: "/social.v1.SocialService/DeclineFriendRequest", maxCalls: 60, window: time.Minute, hint: "слишком частые действия с дружбой"},
	// Shop: purchases — cheap per call but could drain a compromised wallet.
	{prefix: "/shop.v1.ShopService/Purchase", maxCalls: 30, window: time.Minute, hint: "слишком частые покупки"},
	// Friend challenges: outbound invites.
	{
		prefix:   "/friend_challenge.v1.FriendChallengeService/SendChallenge",
		maxCalls: 30, window: time.Hour, hint: "слишком много вызовов",
	},
	// Inbox: outbound messages.
	{prefix: "/inbox.v1.InboxService/SendMessage", maxCalls: 120, window: time.Minute, hint: "слишком частые сообщения"},
	// Season pass claims (just in case; cheap but worth capping).
	{
		prefix:   "/season_pass.v1.SeasonPassService/ClaimTierReward",
		maxCalls: 240, window: time.Minute, hint: "слишком частые клеймы",
	},
	// Streak shield use/purchase.
	{prefix: "/streak.v1.StreakService/UseShield", maxCalls: 10, window: time.Minute, hint: "слишком частое использование щита"},
	{prefix: "/streak.v1.StreakService/PurchaseShield", maxCalls: 20, window: time.Minute, hint: "слишком частые покупки щитов"},
	// Duel replays: record event during a match — moderately high ceiling.
	{
		prefix:   "/duel_replay.v1.DuelReplayService/RecordEvent",
		maxCalls: 600, window: time.Minute, hint: "запись реплея",
	},
}

// actorKey identifies the caller for bucketing. Prefers user ID (stable
// across sessions); falls back to IP for unauthenticated calls (though
// most mutate endpoints require auth, so the fallback is rarely hit).
func actorKey(ctx context.Context) string {
	if user, ok := model.UserFromContext(ctx); ok && user != nil {
		return "u:" + user.ID.String()
	}
	return "ip:" + clientIP(ctx)
}

func (l *mutateLimiter) allow(actor, key string, r rule, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	compound := actor + "|" + key
	b := l.buckets[compound]
	if b == nil {
		b = &mutBucket{windowStart: now}
		l.buckets[compound] = b
	}
	if now.Sub(b.windowStart) >= r.window {
		b.windowStart = now
		b.calls = 0
	}
	if b.calls >= r.maxCalls {
		return false
	}
	b.calls++
	// Cheap size-bounded GC: if the map gets too big, drop half the
	// oldest entries. Keeps memory predictable under adversarial load.
	if len(l.buckets) > 5000 {
		oldest := time.Now().Add(-time.Hour)
		for k, v := range l.buckets {
			if v.windowStart.Before(oldest) {
				delete(l.buckets, k)
			}
		}
	}
	return true
}

// newMutateRateLimiter returns a middleware that applies the rules above.
// Operations that don't match any rule are passed through unchanged.
func newMutateRateLimiter() middleware.Middleware {
	limiter := newMutateLimiter()
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req any) (any, error) {
			tr, ok := transport.FromServerContext(ctx)
			if !ok {
				return handler(ctx, req)
			}
			op := tr.Operation()
			for _, r := range mutateRules {
				if strings.HasPrefix(op, r.prefix) {
					if !limiter.allow(actorKey(ctx), r.prefix, r, time.Now()) {
						return nil, kratoserrpkg.New(429, "RATE_LIMITED", r.hint)
					}
					break
				}
			}
			return handler(ctx, req)
		}
	}
}

// NewHTTPMutateRateLimiter selects only operations matching any mutate
// rule so unrelated handlers pay zero overhead. Registered in http.go
// alongside the existing per-IP limiter.
func NewHTTPMutateRateLimiter() middleware.Middleware {
	return selector.Server(newMutateRateLimiter()).
		Match(func(_ context.Context, operation string) bool {
			for _, r := range mutateRules {
				if strings.HasPrefix(operation, r.prefix) {
					return true
				}
			}
			return false
		}).
		Build()
}
