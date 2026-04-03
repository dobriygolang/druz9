package arena

import (
	"context"
	"time"

	arenadomain "api/internal/domain/arena"
	v1 "api/pkg/api/arena/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) JoinQueue(ctx context.Context, req *v1.JoinQueueRequest) (*v1.ArenaQueueStateResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	state, err := i.service.EnqueueMatchmaking(ctx, user, req.Topic, req.Difficulty, req.ObfuscateOpponent)
	if err != nil {
		switch {
		case errors.Is(err, arenadomain.ErrNoAvailableTasks):
			return nil, errors.BadRequest("NO_AVAILABLE_TASKS", "no available arena tasks for this filter")
		case errors.Is(err, arenadomain.ErrGuestsNotSupported):
			return nil, errors.Forbidden("ARENA_REQUIRES_AUTH", "arena is available only for registered users")
		default:
			return nil, errors.BadRequest("QUEUE_JOIN_FAILED", err.Error())
		}
	}

	return mapQueueState(state), nil
}

func (i *Implementation) LeaveQueue(ctx context.Context, req *v1.LeaveQueueRequest) (*v1.ArenaQueueStateResponse, error) {
	_ = req

	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	if err := i.service.LeaveQueue(ctx, user); err != nil {
		return nil, errors.BadRequest("QUEUE_LEAVE_FAILED", err.Error())
	}

	state, err := i.service.GetQueueStatus(ctx, nil)
	if err != nil {
		return &v1.ArenaQueueStateResponse{Status: "idle"}, nil
	}

	return mapQueueState(state), nil
}

func (i *Implementation) GetQueueStatus(ctx context.Context, req *v1.GetQueueStatusRequest) (*v1.ArenaQueueStateResponse, error) {
	_ = req

	user, _ := resolveArenaActor(ctx, false)
	state, err := i.service.GetQueueStatus(ctx, user)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	return mapQueueState(state), nil
}

func (i *Implementation) GetPlayerStats(ctx context.Context, req *v1.GetPlayerStatsRequest) (*v1.ArenaPlayerStatsResponse, error) {
	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}

	stats, err := i.service.GetPlayerStats(ctx, userID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	return &v1.ArenaPlayerStatsResponse{Stats: mapPlayerStats(stats)}, nil
}

func (i *Implementation) GetPlayerStatsBatch(ctx context.Context, req *v1.GetPlayerStatsBatchRequest) (*v1.ArenaPlayerStatsBatchResponse, error) {
	if len(req.UserIds) == 0 || len(req.UserIds) > 100 {
		return nil, errors.BadRequest("INVALID_USER_IDS", "userIds must contain 1-100 items")
	}

	userIDs := make([]uuid.UUID, 0, len(req.UserIds))
	for _, rawID := range req.UserIds {
		userID, err := uuid.Parse(rawID)
		if err == nil {
			userIDs = append(userIDs, userID)
		}
	}

	statsMap, err := i.service.GetPlayerStatsBatch(ctx, userIDs)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	result := make(map[string]*v1.ArenaPlayerStats, len(statsMap))
	for userID, stats := range statsMap {
		result[userID.String()] = mapPlayerStats(stats)
	}

	return &v1.ArenaPlayerStatsBatchResponse{Stats: result}, nil
}

func (i *Implementation) ReportAntiCheatEvent(ctx context.Context, req *v1.ReportAntiCheatEventRequest) (*v1.ArenaStatusResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	matchID, err := parseArenaMatchID(req.MatchId)
	if err != nil {
		return nil, err
	}

	if err := i.service.ReportPlayerSuspicion(ctx, matchID, user, req.Reason); err != nil {
		return nil, errors.BadRequest("ANTI_CHEAT_REPORT_FAILED", err.Error())
	}

	return &v1.ArenaStatusResponse{Status: "ok"}, nil
}

func (i *Implementation) ListOpenMatches(ctx context.Context, req *v1.ListOpenMatchesRequest) (*v1.ListOpenMatchesResponse, error) {
	limit := req.Limit
	if limit <= 0 {
		limit = 8
	}
	if limit > 20 {
		limit = 20
	}

	matches, err := i.service.ListOpenMatches(ctx, limit)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL_ERROR", "failed to list open matches")
	}

	items := make([]*v1.ArenaMatch, 0, len(matches))
	for _, match := range matches {
		if match == nil {
			continue
		}
		items = append(items, mapArenaMatch(match))
	}

	return &v1.ListOpenMatchesResponse{Matches: items}, nil
}

func mapQueueState(state *arenadomain.QueueState) *v1.ArenaQueueStateResponse {
	if state == nil {
		return &v1.ArenaQueueStateResponse{Status: "idle", QueueSize: 0}
	}

	resp := &v1.ArenaQueueStateResponse{
		Status:     queueStatusValue(state),
		Topic:      state.Topic,
		Difficulty: state.Difficulty.String(),
		QueueSize:  state.QueueSize,
	}
	if state.QueuedAt != nil && !state.QueuedAt.IsZero() {
		resp.QueuedAt = state.QueuedAt.UTC().Format(time.RFC3339Nano)
	}
	if state.Match != nil {
		resp.Match = mapArenaMatch(state.Match)
	}
	return resp
}

func mapPlayerStats(stats *arenadomain.PlayerStats) *v1.ArenaPlayerStats {
	if stats == nil {
		return &v1.ArenaPlayerStats{}
	}

	return &v1.ArenaPlayerStats{
		UserId:      stats.UserID,
		DisplayName: stats.DisplayName,
		Rating:      stats.Rating,
		League:      stats.League.String(),
		Wins:        stats.Wins,
		Losses:      stats.Losses,
		Matches:     stats.Matches,
		WinRate:     stats.WinRate,
		BestRuntime: stats.BestRuntime,
	}
}

func queueStatusValue(state *arenadomain.QueueState) string {
	if state == nil {
		return "idle"
	}
	if state.Match != nil || state.Status == arenadomain.MatchStatusActive {
		return "matched"
	}
	if state.Status == arenadomain.MatchStatusWaiting {
		return "queued"
	}
	return "idle"
}
