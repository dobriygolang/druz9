package arena

import (
	"context"

	"api/internal/clients/notification/notiftext"
	"api/internal/metrics"
	v1 "api/pkg/api/arena/v1"
)

func (i *Implementation) CreateMatch(ctx context.Context, req *v1.CreateMatchRequest) (*v1.ArenaMatchResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	match, err := i.service.CreateMatch(ctx, user, req.GetTopic(), unmapDifficulty(req.GetDifficulty()), req.GetObfuscateOpponent())
	if err != nil {
		return nil, mapErr(err)
	}

	i.realtime.PublishMatch(mapArenaRealtimeMatch(match), mapArenaRealtimeCodes(match))
	metrics.IncMatchesStarted()

	// Notify: duel_invite — send to the opponent (invite-based matches).
	if i.notif != nil {
		go func() {
			for _, p := range match.Players {
				if p.UserID != user.ID {
					i.notif.Send(ctx, p.UserID.String(), "duel_invite",
						notiftext.DuelInviteTitle(),
						notiftext.DuelInviteBody(user.FirstName, match.Topic),
						map[string]any{"match_id": match.ID.String(), "topic": match.Topic})
				}
			}
		}()
	}

	return &v1.ArenaMatchResponse{Match: mapArenaMatchForViewer(match, user.ID.String(), false)}, nil
}
