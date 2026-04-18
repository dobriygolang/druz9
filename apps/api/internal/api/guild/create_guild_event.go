package guild

import (
	"context"
	"time"

	"api/internal/model"
	"api/internal/util/timeutil"
	guildv1 "api/pkg/api/guild/v1"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) CreateGuildEvent(ctx context.Context, req *guildv1.CreateGuildEventRequest) (*guildv1.CreateGuildEventResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, kratosErrors.Unauthorized("UNAUTHORIZED", "authentication required")
	}

	guildID, err := uuid.Parse(req.GuildId)
	if err != nil {
		return nil, kratosErrors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
	}

	isMember, err := i.service.IsMember(ctx, guildID, user.ID)
	if err != nil || !isMember {
		return nil, kratosErrors.Forbidden("NOT_A_MEMBER", "must be a guild member")
	}

	if req.Title == "" {
		return nil, kratosErrors.BadRequest("INVALID_TITLE", "title is required")
	}
	var scheduledAt *time.Time
	if req.ScheduledAt != "" {
		value, err := timeutil.ParseMoscowDateTime(req.ScheduledAt)
		if err != nil || !value.After(time.Now().UTC()) {
			return nil, kratosErrors.BadRequest("INVALID_SCHEDULED_AT", "scheduledAt must be a future Moscow timestamp")
		}
		scheduledAt = &value
	}

	event, err := i.eventSvc.CreateEvent(ctx, user.ID, user.IsAdmin, model.CreateEventRequest{
		Title:       req.Title,
		Description: req.Description,
		MeetingLink: req.MeetingLink,
		PlaceLabel:  req.PlaceLabel,
		ScheduledAt: scheduledAt,
		Repeat:      req.Repeat,
		GuildID:    &guildID,
	})
	if err != nil {
		return nil, err
	}
	return &guildv1.CreateGuildEventResponse{Event: mapGuildEvent(event)}, nil
}
