package arena

import (
	"context"
	"fmt"

	"api/internal/metrics"
	v1 "api/pkg/api/arena/v1"
)

func (i *Implementation) CreateMatch(ctx context.Context, req *v1.CreateMatchRequest) (*v1.ArenaMatchResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	match, err := i.service.CreateMatch(ctx, user, req.Topic, unmapDifficulty(req.Difficulty), req.ObfuscateOpponent)
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
					displayName := user.FirstName
					if displayName == "" {
						displayName = "Кто-то"
					}
					topic := match.Topic
					if topic == "" {
						topic = "Алгоритмы"
					}
					body := fmt.Sprintf("%s вызвал тебя на дуэль!\nТема: %s | ~15 мин", displayName, topic)
					i.notif.Send(ctx, p.UserID.String(), "duel_invite", "Дуэль", body, map[string]any{
						"match_id": match.ID.String(),
						"topic":    topic,
					})
				}
			}
		}()
	}

	return &v1.ArenaMatchResponse{Match: mapArenaMatchForViewer(match, user.ID.String(), false)}, nil
}
