package server

import (
	"context"
	"net/http"
	"strings"
	"time"

	"api/internal/config"

	"github.com/go-kratos/kratos/v2/transport"
)

type SessionCookieManager struct {
	name     string
	domain   string
	secure   bool
	sameSite http.SameSite
}

func NewSessionCookieManager(cfg *config.Session) *SessionCookieManager {
	return &SessionCookieManager{
		name:     cfg.CookieName,
		domain:   cfg.CookieDomain,
		secure:   cfg.CookieSecure,
		sameSite: parseSameSite(cfg.CookieSameSite),
	}
}

func (m *SessionCookieManager) SetSessionCookie(ctx context.Context, rawToken string, expiresAt time.Time) {
	cookie := &http.Cookie{
		Name:     m.name,
		Value:    rawToken,
		Path:     "/",
		Domain:   m.domain,
		HttpOnly: true,
		Secure:   m.secure,
		SameSite: m.sameSite,
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
	}
	if tr, ok := transport.FromServerContext(ctx); ok {
		tr.ReplyHeader().Add("Set-Cookie", cookie.String())
	}
}

func (m *SessionCookieManager) ClearSessionCookie(ctx context.Context) {
	cookie := &http.Cookie{
		Name:     m.name,
		Value:    "",
		Path:     "/",
		Domain:   m.domain,
		HttpOnly: true,
		Secure:   m.secure,
		SameSite: m.sameSite,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	}
	if tr, ok := transport.FromServerContext(ctx); ok {
		tr.ReplyHeader().Add("Set-Cookie", cookie.String())
	}
}

func parseSameSite(value string) http.SameSite {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "strict":
		return http.SameSiteStrictMode
	case "none":
		return http.SameSiteNoneMode
	case "", "lax":
		return http.SameSiteLaxMode
	default:
		return http.SameSiteLaxMode
	}
}
