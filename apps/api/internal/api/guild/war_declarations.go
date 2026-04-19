package guild

import (
	"encoding/json"
	"errors"
	"net/http"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	guilddata "api/internal/data/guild"
	server "api/internal/server"
)

// ── helpers ────────────────────────────────────────────────────────────────

func writeJSON(ctx kratoshttp.Context, status int, v any) {
	ctx.Response().Header().Set("Content-Type", "application/json")
	ctx.Response().WriteHeader(status)
	_ = json.NewEncoder(ctx.Response()).Encode(v)
}

func writeWarErr(ctx kratoshttp.Context, status int, code, msg string) {
	writeJSON(ctx, status, map[string]string{"code": code, "message": msg})
}

// ── Challenge endpoints ────────────────────────────────────────────────────

// POST /api/v1/guilds/war/challenge
// Body: { "toGuildId": "uuid" }
func (i *Implementation) SendChallenge(ctx kratoshttp.Context) error {
	stdCtx := ctx.Request().Context()
	user, err := apihelpers.RequireUser(stdCtx)
	if err != nil {
		writeWarErr(ctx, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil //nolint:nilerr
	}
	if i.warRepo == nil {
		writeWarErr(ctx, http.StatusServiceUnavailable, "UNAVAILABLE", "war storage unavailable")
		return nil
	}

	var body struct {
		ToGuildID string `json:"toGuildId"`
	}
	if err := json.NewDecoder(ctx.Request().Body).Decode(&body); err != nil || body.ToGuildID == "" {
		writeWarErr(ctx, http.StatusBadRequest, "BAD_REQUEST", "toGuildId required")
		return nil //nolint:nilerr
	}
	toID, err := uuid.Parse(body.ToGuildID)
	if err != nil {
		writeWarErr(ctx, http.StatusBadRequest, "BAD_REQUEST", "invalid toGuildId")
		return nil //nolint:nilerr
	}

	ours, errGuild := i.myGuild(stdCtx, user.ID)
	if errGuild != nil || ours == nil {
		writeWarErr(ctx, http.StatusConflict, "NO_GUILD", "join a guild before declaring war")
		return nil //nolint:nilerr
	}
	if ours.ID == toID {
		writeWarErr(ctx, http.StatusBadRequest, "SAME_GUILD", "cannot challenge your own guild")
		return nil //nolint:nilerr
	}

	challenge, err := i.warRepo.SendChallenge(stdCtx, ours.ID, ours.Name, toID)
	if err != nil {
		if errors.Is(err, guilddata.ErrAlreadyAtWar) {
			writeWarErr(ctx, http.StatusConflict, "ALREADY_AT_WAR", "one of the guilds is already in a war")
			return nil
		}
		writeWarErr(ctx, http.StatusInternalServerError, "INTERNAL", "failed to send challenge")
		return nil
	}

	writeJSON(ctx, http.StatusOK, map[string]string{"id": challenge.ID.String(), "status": "pending"})
	return nil
}

// GET /api/v1/guilds/war/challenges/incoming
func (i *Implementation) ListIncomingChallenges(ctx kratoshttp.Context) error {
	stdCtx := ctx.Request().Context()
	user, err := apihelpers.RequireUser(stdCtx)
	if err != nil {
		writeWarErr(ctx, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil //nolint:nilerr
	}
	if i.warRepo == nil {
		writeJSON(ctx, http.StatusOK, map[string]any{"challenges": []any{}})
		return nil
	}

	ours, _ := i.myGuild(stdCtx, user.ID)
	if ours == nil {
		writeJSON(ctx, http.StatusOK, map[string]any{"challenges": []any{}})
		return nil
	}

	rows, err := i.warRepo.ListIncomingChallenges(stdCtx, ours.ID)
	if err != nil {
		writeWarErr(ctx, http.StatusInternalServerError, "INTERNAL", "failed to list challenges")
		return nil
	}

	type item struct {
		ID          string `json:"id"`
		FromGuildID string `json:"fromGuildId"`
		FromName    string `json:"fromName"`
		ExpiresAt   string `json:"expiresAt"`
	}
	out := make([]item, 0, len(rows))
	for _, r := range rows {
		out = append(out, item{
			ID:          r.ID.String(),
			FromGuildID: r.FromGuildID.String(),
			FromName:    r.FromName,
			ExpiresAt:   r.ExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
		})
	}
	writeJSON(ctx, http.StatusOK, map[string]any{"challenges": out})
	return nil
}

// POST /api/v1/guilds/war/challenge/{id}/accept
func (i *Implementation) AcceptChallenge(ctx kratoshttp.Context) error {
	stdCtx := ctx.Request().Context()
	user, err := apihelpers.RequireUser(stdCtx)
	if err != nil {
		writeWarErr(ctx, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil //nolint:nilerr
	}
	if i.warRepo == nil {
		writeWarErr(ctx, http.StatusServiceUnavailable, "UNAVAILABLE", "war storage unavailable")
		return nil
	}

	challengeID, err := uuid.Parse(server.PathSegment(ctx.Request().URL.Path, "challenge", 1))
	if err != nil {
		writeWarErr(ctx, http.StatusBadRequest, "BAD_REQUEST", "invalid challenge id")
		return nil
	}

	ours, _ := i.myGuild(stdCtx, user.ID)
	if ours == nil {
		writeWarErr(ctx, http.StatusConflict, "NO_GUILD", "join a guild first")
		return nil
	}

	war, err := i.warRepo.AcceptChallenge(stdCtx, challengeID, ours.ID, defaultFrontNames)
	if err != nil {
		if errors.Is(err, guilddata.ErrChallengeNotFound) {
			writeWarErr(ctx, http.StatusNotFound, "NOT_FOUND", "challenge not found or already resolved")
			return nil
		}
		if errors.Is(err, guilddata.ErrAlreadyAtWar) {
			writeWarErr(ctx, http.StatusConflict, "ALREADY_AT_WAR", "already in an active war")
			return nil
		}
		writeWarErr(ctx, http.StatusInternalServerError, "INTERNAL", "failed to accept challenge")
		return nil
	}

	writeJSON(ctx, http.StatusOK, map[string]string{"warId": war.ID.String(), "status": "war_started"})
	return nil
}

// POST /api/v1/guilds/war/challenge/{id}/decline
func (i *Implementation) DeclineChallenge(ctx kratoshttp.Context) error {
	stdCtx := ctx.Request().Context()
	user, err := apihelpers.RequireUser(stdCtx)
	if err != nil {
		writeWarErr(ctx, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil //nolint:nilerr
	}
	if i.warRepo == nil {
		writeWarErr(ctx, http.StatusServiceUnavailable, "UNAVAILABLE", "war storage unavailable")
		return nil
	}

	challengeID, err := uuid.Parse(server.PathSegment(ctx.Request().URL.Path, "challenge", 1))
	if err != nil {
		writeWarErr(ctx, http.StatusBadRequest, "BAD_REQUEST", "invalid challenge id")
		return nil
	}

	ours, _ := i.myGuild(stdCtx, user.ID)
	if ours == nil {
		writeWarErr(ctx, http.StatusConflict, "NO_GUILD", "join a guild first")
		return nil
	}

	if err := i.warRepo.DeclineChallenge(stdCtx, challengeID, ours.ID); err != nil {
		if errors.Is(err, guilddata.ErrChallengeNotFound) {
			writeWarErr(ctx, http.StatusNotFound, "NOT_FOUND", "challenge not found or already resolved")
			return nil
		}
		writeWarErr(ctx, http.StatusInternalServerError, "INTERNAL", "failed to decline challenge")
		return nil
	}

	writeJSON(ctx, http.StatusOK, map[string]string{"status": "declined"})
	return nil
}

// ── Matchmaking endpoints ──────────────────────────────────────────────────

// POST /api/v1/guilds/war/matchmaking
func (i *Implementation) JoinMatchmaking(ctx kratoshttp.Context) error {
	stdCtx := ctx.Request().Context()
	user, err := apihelpers.RequireUser(stdCtx)
	if err != nil {
		writeWarErr(ctx, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil //nolint:nilerr
	}
	if i.warRepo == nil {
		writeWarErr(ctx, http.StatusServiceUnavailable, "UNAVAILABLE", "war storage unavailable")
		return nil
	}

	ours, _ := i.myGuild(stdCtx, user.ID)
	if ours == nil {
		writeWarErr(ctx, http.StatusConflict, "NO_GUILD", "join a guild first")
		return nil
	}

	matched, war, _ := i.warRepo.JoinMatchmaking(stdCtx, ours.ID, ours.Name, int32(ours.MemberCount), defaultFrontNames)
	if matched && war != nil {
		writeJSON(ctx, http.StatusOK, map[string]string{"status": "matched", "warId": war.ID.String()})
	} else {
		writeJSON(ctx, http.StatusOK, map[string]string{"status": "queued"})
	}
	return nil
}

// DELETE /api/v1/guilds/war/matchmaking
func (i *Implementation) LeaveMatchmaking(ctx kratoshttp.Context) error {
	stdCtx := ctx.Request().Context()
	user, err := apihelpers.RequireUser(stdCtx)
	if err != nil {
		writeWarErr(ctx, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil //nolint:nilerr
	}
	if i.warRepo == nil {
		writeJSON(ctx, http.StatusOK, map[string]string{"status": "ok"})
		return nil
	}

	ours, _ := i.myGuild(stdCtx, user.ID)
	if ours != nil {
		_ = i.warRepo.LeaveMatchmaking(stdCtx, ours.ID)
	}
	writeJSON(ctx, http.StatusOK, map[string]string{"status": "left"})
	return nil
}

// GET /api/v1/guilds/war/matchmaking
func (i *Implementation) GetMatchmakingStatus(ctx kratoshttp.Context) error {
	stdCtx := ctx.Request().Context()
	user, err := apihelpers.RequireUser(stdCtx)
	if err != nil {
		writeWarErr(ctx, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return nil //nolint:nilerr
	}
	if i.warRepo == nil {
		writeJSON(ctx, http.StatusOK, map[string]any{"inQueue": false})
		return nil
	}

	ours, _ := i.myGuild(stdCtx, user.ID)
	if ours == nil {
		writeJSON(ctx, http.StatusOK, map[string]any{"inQueue": false})
		return nil
	}

	status, err := i.warRepo.GetMatchmakingStatus(stdCtx, ours.ID)
	if err != nil {
		writeWarErr(ctx, http.StatusInternalServerError, "INTERNAL", "failed to get status")
		return nil
	}

	writeJSON(ctx, http.StatusOK, map[string]any{
		"inQueue":  status.InQueue,
		"joinedAt": status.JoinedAt.UTC().Format("2006-01-02T15:04:05Z"),
	})
	return nil
}
