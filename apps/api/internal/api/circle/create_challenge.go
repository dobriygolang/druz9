package circle

import (
	"context"
	"fmt"

	"api/internal/model"
	v1 "api/pkg/api/circle/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) CreateCircleChallenge(ctx context.Context, req *v1.CreateCircleChallengeRequest) (*v1.CreateCircleChallengeResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_CIRCLE_ID", "invalid circle_id")
	}

	challenge, err := i.service.CreateChallenge(ctx, circleID, user.ID, req.TemplateKey, req.TargetValue)
	if err != nil {
		return nil, err
	}

	// Notify: circle_event_created — notify all circle members about the new challenge.
	if i.notif != nil {
		go func() {
			members, mErr := i.service.ListCircleMembers(ctx, circleID, 200)
			if mErr != nil {
				return
			}
			userIDs := make([]string, 0, len(members))
			for _, m := range members {
				if m.UserID != user.ID {
					userIDs = append(userIDs, m.UserID.String())
				}
			}
			if len(userIDs) == 0 {
				return
			}
			body := fmt.Sprintf("Новый challenge: %s (цель: %d)\nСтарт сейчас, 7 дней", req.TemplateKey, req.TargetValue)
			i.notif.SendBatch(ctx, userIDs, "circle_event_created", "Challenge в круге", body, map[string]any{
				"circle_id":    circleID.String(),
				"challenge_id": challenge.ID.String(),
				"template_key": req.TemplateKey,
				"target_value": req.TargetValue,
			})
		}()
	}

	return &v1.CreateCircleChallengeResponse{
		Challenge: mapChallenge(challenge),
	}, nil
}
