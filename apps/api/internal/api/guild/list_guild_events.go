package guild

import (
	"context"
	"math"

	"api/internal/model"
	eventv1 "api/pkg/api/event/v1"
	guildv1 "api/pkg/api/guild/v1"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// guildEventsFilterToString matches the domain string values the legacy
// data layer expects ("past" is the only special case — anything else
// is treated as "upcoming"). Centralised here so both event and guild
// handlers agree on the mapping.
func guildEventsFilterToString(f eventv1.EventListFilter) string {
	switch f {
	case eventv1.EventListFilter_EVENT_LIST_FILTER_PAST:
		return "past"
	case eventv1.EventListFilter_EVENT_LIST_FILTER_UPCOMING:
		return "upcoming"
	default:
		return ""
	}
}

func (i *Implementation) ListGuildEvents(ctx context.Context, req *guildv1.ListGuildEventsRequest) (*guildv1.ListGuildEventsResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, kratosErrors.Unauthorized("UNAUTHORIZED", "authentication required")
	}

	guildID, err := uuid.Parse(req.GuildId)
	if err != nil {
		return nil, kratosErrors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
	}

	resp, err := i.eventSvc.ListEvents(ctx, user.ID, model.ListEventsOptions{
		Limit:   20,
		GuildID: &guildID,
		Status:  guildEventsFilterToString(req.Status),
	})
	if err != nil {
		return nil, err
	}

	events := make([]*eventv1.Event, 0, len(resp.Events))
	for _, e := range resp.Events {
		if e == nil {
			continue
		}
		events = append(events, mapGuildEvent(e))
	}
	return &guildv1.ListGuildEventsResponse{Events: events}, nil
}

func mapGuildEvent(item *model.Event) *eventv1.Event {
	if item == nil {
		return nil
	}
	participantCount := uint32(0)
	if item.ParticipantCount > 0 && item.ParticipantCount <= math.MaxUint32 {
		participantCount = uint32(item.ParticipantCount)
	}
	event := &eventv1.Event{
		Id:               item.ID.String(),
		Title:            item.Title,
		Description:      item.Description,
		MeetingLink:      item.MeetingLink,
		PlaceLabel:       item.PlaceLabel,
		CreatedAt:        timestamppb.New(item.CreatedAt),
		CreatorId:        item.CreatorID,
		CreatorName:      item.CreatorName,
		IsCreator:        item.IsCreator,
		IsJoined:         item.IsJoined,
		IsPublic:         item.IsPublic,
		ParticipantCount: participantCount,
	}
	if item.ScheduledAt != nil {
		event.ScheduledAt = timestamppb.New(*item.ScheduledAt)
	}
	return event
}
