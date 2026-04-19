// Package premium provides HTTP handlers for Boosty premium subscription linking.
package premium

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"

	"api/internal/apihelpers"
	"api/internal/boosty"
	premiumdata "api/internal/data/premium"
)

// Handler serves premium subscription endpoints.
type Handler struct {
	repo   *premiumdata.Repo
	client *boosty.Client // nil when Boosty is not configured
}

func New(repo *premiumdata.Repo, client *boosty.Client) *Handler {
	return &Handler{repo: repo, client: client}
}

// BoostyClient exposes the underlying Boosty client for background workers.
func (h *Handler) BoostyClient() *boosty.Client {
	return h.client
}

func writeJSON(ctx kratoshttp.Context, status int, v any) {
	ctx.Response().Header().Set("Content-Type", "application/json")
	ctx.Response().WriteHeader(status)
	//nolint:errchkjson // encoding error after response started cannot be handled
	_ = json.NewEncoder(ctx.Response()).Encode(v)
}

func writeErr(ctx kratoshttp.Context, status int, code, msg string) {
	writeJSON(ctx, status, map[string]string{"code": code, "message": msg})
}

// GET /api/v1/premium/status
func (h *Handler) GetStatus(ctx kratoshttp.Context) error {
	user, err := apihelpers.RequireUser(ctx.Request().Context())
	if err != nil {
		writeErr(ctx, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil //nolint:nilerr // error written to response
	}

	row, err := h.repo.Get(ctx.Request().Context(), user.ID)
	if errors.Is(err, premiumdata.ErrNotFound) {
		writeJSON(ctx, http.StatusOK, map[string]any{
			"active":      false,
			"source":      nil,
			"boostyEmail": nil,
			"expiresAt":   nil,
		})
		return nil
	}
	if err != nil {
		writeErr(ctx, http.StatusInternalServerError, "INTERNAL", "failed to load status")
		return nil //nolint:nilerr // error written to response
	}

	writeJSON(ctx, http.StatusOK, map[string]any{
		"active":      row.Active && row.ExpiresAt.After(time.Now()),
		"source":      row.Source,
		"boostyEmail": row.BoostyEmail,
		"expiresAt":   row.ExpiresAt.UTC().Format(time.RFC3339),
	})
	return nil
}

// POST /api/v1/premium/boosty/link
// Body: { "email": "user@example.com" }
func (h *Handler) LinkBoosty(ctx kratoshttp.Context) error {
	user, err := apihelpers.RequireUser(ctx.Request().Context())
	if err != nil {
		writeErr(ctx, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil //nolint:nilerr // error written to response
	}

	if h.client == nil {
		writeErr(ctx, http.StatusServiceUnavailable, "NOT_CONFIGURED", "Boosty integration is not enabled")
		return nil
	}

	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(ctx.Request().Body).Decode(&body); err != nil || body.Email == "" {
		writeErr(ctx, http.StatusBadRequest, "BAD_REQUEST", "email required")
		return nil //nolint:nilerr // error written to response
	}

	info, err := h.client.CheckSubscriber(ctx.Request().Context(), body.Email)
	if errors.Is(err, boosty.ErrNotSubscribed) {
		writeErr(ctx, http.StatusPaymentRequired, "NOT_SUBSCRIBED",
			"this email is not found among active Boosty subscribers")
		return nil
	}
	if errors.Is(err, boosty.ErrTokenExpired) {
		klog.Errorf("premium: boosty token expired — update BOOSTY_ACCESS_TOKEN")
		writeErr(ctx, http.StatusServiceUnavailable, "BOOSTY_ERROR",
			"Boosty service is temporarily unavailable")
		return nil
	}
	if err != nil {
		klog.Errorf("premium: boosty check: %v", err)
		writeErr(ctx, http.StatusServiceUnavailable, "BOOSTY_ERROR",
			"could not verify subscription with Boosty")
		return nil
	}

	// Boosty returns next billing date; clamp to 31 days max to be safe.
	expiresAt := info.ExpiresAt
	maxExpiry := time.Now().Add(31 * 24 * time.Hour)
	if expiresAt.IsZero() || expiresAt.After(maxExpiry) {
		expiresAt = maxExpiry
	}

	if err := h.repo.Upsert(ctx.Request().Context(), premiumdata.Row{
		UserID:      user.ID,
		Source:      "boosty",
		BoostyEmail: body.Email,
		Active:      true,
		StartsAt:    time.Now(),
		ExpiresAt:   expiresAt,
	}); err != nil {
		klog.Errorf("premium: upsert: %v", err)
		writeErr(ctx, http.StatusInternalServerError, "INTERNAL", "failed to activate premium")
		return nil
	}

	writeJSON(ctx, http.StatusOK, map[string]any{
		"active":      true,
		"source":      "boosty",
		"boostyEmail": body.Email,
		"expiresAt":   expiresAt.UTC().Format(time.RFC3339),
	})
	return nil
}

// DELETE /api/v1/premium/boosty/link
func (h *Handler) UnlinkBoosty(ctx kratoshttp.Context) error {
	user, err := apihelpers.RequireUser(ctx.Request().Context())
	if err != nil {
		writeErr(ctx, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil //nolint:nilerr // error written to response
	}

	if err := h.repo.Delete(ctx.Request().Context(), user.ID); err != nil {
		klog.Errorf("premium: unlink: %v", err)
		writeErr(ctx, http.StatusInternalServerError, "INTERNAL", "failed to unlink")
		return nil //nolint:nilerr // error written to response
	}

	writeJSON(ctx, http.StatusOK, map[string]string{"status": "unlinked"})
	return nil
}
