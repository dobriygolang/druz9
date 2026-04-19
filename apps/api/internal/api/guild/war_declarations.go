package guild

import (
	"context"
	"errors"

	kerrs "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	guilddata "api/internal/data/guild"
	v1 "api/pkg/api/guild/v1"
)

// SendWarChallenge declares war on another guild by guild ID.
func (i *Implementation) SendWarChallenge(ctx context.Context, req *v1.SendWarChallengeRequest) (*v1.SendWarChallengeResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, kerrs.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	if i.warRepo == nil {
		return nil, kerrs.ServiceUnavailable("UNAVAILABLE", "war storage unavailable")
	}

	toID, err := uuid.Parse(req.GetToGuildId())
	if err != nil {
		return nil, kerrs.BadRequest("BAD_REQUEST", "invalid toGuildId")
	}

	ours, err := i.myGuild(ctx, user.ID)
	if err != nil || ours == nil {
		return nil, kerrs.Conflict("NO_GUILD", "join a guild before declaring war")
	}
	if ours.ID == toID {
		return nil, kerrs.BadRequest("SAME_GUILD", "cannot challenge your own guild")
	}

	challenge, err := i.warRepo.SendChallenge(ctx, ours.ID, ours.Name, toID)
	if err != nil {
		if errors.Is(err, guilddata.ErrAlreadyAtWar) {
			return nil, kerrs.Conflict("ALREADY_AT_WAR", "one of the guilds is already in a war")
		}
		return nil, kerrs.InternalServer("INTERNAL", "failed to send challenge")
	}

	return &v1.SendWarChallengeResponse{Id: challenge.ID.String(), Status: "pending"}, nil
}

// ListIncomingWarChallenges returns pending war challenges directed at the caller's guild.
func (i *Implementation) ListIncomingWarChallenges(ctx context.Context, _ *v1.ListIncomingWarChallengesRequest) (*v1.ListIncomingWarChallengesResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, kerrs.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	if i.warRepo == nil {
		return &v1.ListIncomingWarChallengesResponse{}, nil
	}

	ours, _ := i.myGuild(ctx, user.ID)
	if ours == nil {
		return &v1.ListIncomingWarChallengesResponse{}, nil
	}

	rows, err := i.warRepo.ListIncomingChallenges(ctx, ours.ID)
	if err != nil {
		return nil, kerrs.InternalServer("INTERNAL", "failed to list challenges")
	}

	out := make([]*v1.WarChallengeItem, 0, len(rows))
	for _, r := range rows {
		out = append(out, &v1.WarChallengeItem{
			Id:          r.ID.String(),
			FromGuildId: r.FromGuildID.String(),
			FromName:    r.FromName,
			ExpiresAt:   r.ExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
		})
	}
	return &v1.ListIncomingWarChallengesResponse{Challenges: out}, nil
}

// AcceptWarChallenge starts a war by accepting a pending challenge.
func (i *Implementation) AcceptWarChallenge(ctx context.Context, req *v1.AcceptWarChallengeRequest) (*v1.AcceptWarChallengeResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, kerrs.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	if i.warRepo == nil {
		return nil, kerrs.ServiceUnavailable("UNAVAILABLE", "war storage unavailable")
	}

	challengeID, err := uuid.Parse(req.GetChallengeId())
	if err != nil {
		return nil, kerrs.BadRequest("BAD_REQUEST", "invalid challenge id")
	}

	ours, _ := i.myGuild(ctx, user.ID)
	if ours == nil {
		return nil, kerrs.Conflict("NO_GUILD", "join a guild first")
	}

	war, err := i.warRepo.AcceptChallenge(ctx, challengeID, ours.ID, defaultFrontNames)
	if err != nil {
		if errors.Is(err, guilddata.ErrChallengeNotFound) {
			return nil, kerrs.NotFound("NOT_FOUND", "challenge not found or already resolved")
		}
		if errors.Is(err, guilddata.ErrAlreadyAtWar) {
			return nil, kerrs.Conflict("ALREADY_AT_WAR", "already in an active war")
		}
		return nil, kerrs.InternalServer("INTERNAL", "failed to accept challenge")
	}

	return &v1.AcceptWarChallengeResponse{WarId: war.ID.String(), Status: "war_started"}, nil
}

// DeclineWarChallenge rejects a pending challenge.
func (i *Implementation) DeclineWarChallenge(ctx context.Context, req *v1.DeclineWarChallengeRequest) (*v1.DeclineWarChallengeResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, kerrs.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	if i.warRepo == nil {
		return nil, kerrs.ServiceUnavailable("UNAVAILABLE", "war storage unavailable")
	}

	challengeID, err := uuid.Parse(req.GetChallengeId())
	if err != nil {
		return nil, kerrs.BadRequest("BAD_REQUEST", "invalid challenge id")
	}

	ours, _ := i.myGuild(ctx, user.ID)
	if ours == nil {
		return nil, kerrs.Conflict("NO_GUILD", "join a guild first")
	}

	if err := i.warRepo.DeclineChallenge(ctx, challengeID, ours.ID); err != nil {
		if errors.Is(err, guilddata.ErrChallengeNotFound) {
			return nil, kerrs.NotFound("NOT_FOUND", "challenge not found or already resolved")
		}
		return nil, kerrs.InternalServer("INTERNAL", "failed to decline challenge")
	}

	return &v1.DeclineWarChallengeResponse{Status: "declined"}, nil
}

// JoinWarMatchmaking enters the guild into the war matchmaking queue.
func (i *Implementation) JoinWarMatchmaking(ctx context.Context, _ *v1.JoinWarMatchmakingRequest) (*v1.JoinWarMatchmakingResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, kerrs.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	if i.warRepo == nil {
		return nil, kerrs.ServiceUnavailable("UNAVAILABLE", "war storage unavailable")
	}

	ours, _ := i.myGuild(ctx, user.ID)
	if ours == nil {
		return nil, kerrs.Conflict("NO_GUILD", "join a guild first")
	}

	matched, war, _ := i.warRepo.JoinMatchmaking(ctx, ours.ID, ours.Name, int32(ours.MemberCount), defaultFrontNames)
	if matched && war != nil {
		return &v1.JoinWarMatchmakingResponse{Status: "matched", WarId: war.ID.String()}, nil
	}
	return &v1.JoinWarMatchmakingResponse{Status: "queued"}, nil
}

// LeaveWarMatchmaking removes the guild from the matchmaking queue.
func (i *Implementation) LeaveWarMatchmaking(ctx context.Context, _ *v1.LeaveWarMatchmakingRequest) (*v1.LeaveWarMatchmakingResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, kerrs.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	if i.warRepo == nil {
		return &v1.LeaveWarMatchmakingResponse{Status: "left"}, nil
	}

	ours, _ := i.myGuild(ctx, user.ID)
	if ours != nil {
		_ = i.warRepo.LeaveMatchmaking(ctx, ours.ID)
	}
	return &v1.LeaveWarMatchmakingResponse{Status: "left"}, nil
}

// GetWarMatchmakingStatus reports whether the guild is currently in the matchmaking queue.
func (i *Implementation) GetWarMatchmakingStatus(ctx context.Context, _ *v1.GetWarMatchmakingStatusRequest) (*v1.GetWarMatchmakingStatusResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, kerrs.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	if i.warRepo == nil {
		return &v1.GetWarMatchmakingStatusResponse{InQueue: false}, nil
	}

	ours, _ := i.myGuild(ctx, user.ID)
	if ours == nil {
		return &v1.GetWarMatchmakingStatusResponse{InQueue: false}, nil
	}

	status, err := i.warRepo.GetMatchmakingStatus(ctx, ours.ID)
	if err != nil {
		return nil, kerrs.InternalServer("INTERNAL", "failed to get status")
	}

	return &v1.GetWarMatchmakingStatusResponse{
		InQueue:  status.InQueue,
		JoinedAt: status.JoinedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}, nil
}
