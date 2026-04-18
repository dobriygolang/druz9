package guild

import (
	"context"
	"time"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	"api/internal/model"
	"api/internal/util/timeutil"
	guildv1 "api/pkg/api/guild/v1"
)

func (i *Implementation) CreateGuildEvent(ctx context.Context, req *guildv1.CreateGuildEventRequest) (*guildv1.CreateGuildEventResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, err
	}

	isMember, err := i.service.IsMember(ctx, guildID, user.ID)
	if err != nil || !isMember {
		return nil, kratosErrors.Forbidden("NOT_A_MEMBER", "must be a guild member")
	}

	if req.GetTitle() == "" {
		return nil, kratosErrors.BadRequest("INVALID_TITLE", "title is required")
	}
	var scheduledAt *time.Time
	if req.GetScheduledAt() != "" {
		value, err := timeutil.ParseMoscowDateTime(req.GetScheduledAt())
		if err != nil || !value.After(time.Now().UTC()) {
			return nil, kratosErrors.BadRequest("INVALID_SCHEDULED_AT", "scheduledAt must be a future Moscow timestamp")
		}
		scheduledAt = &value
	}

	event, err := i.eventSvc.CreateEvent(ctx, user.ID, user.IsAdmin, model.CreateEventRequest{
		Title:       req.GetTitle(),
		Description: req.GetDescription(),
		MeetingLink: req.GetMeetingLink(),
		PlaceLabel:  req.GetPlaceLabel(),
		ScheduledAt: scheduledAt,
		Repeat:      req.GetRepeat(),
		GuildID:     &guildID,
	})
	if err != nil {
		return nil, err
	}
	return &guildv1.CreateGuildEventResponse{Event: mapGuildEvent(event)}, nil
}
