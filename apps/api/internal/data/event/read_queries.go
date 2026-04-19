package event

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/model"
)

const (
	defaultEventsLimit = 20
	maxEventsLimit     = 100
	maxEventsWindow    = 365 * 24 * time.Hour
)

func (r *Repo) ListEvents(
	ctx context.Context,
	currentUserID uuid.UUID,
	opts model.ListEventsOptions,
) (*model.ListEventsResponse, error) {
	if opts.Limit <= 0 || opts.Limit > maxEventsLimit {
		opts.Limit = defaultEventsLimit
	}

	baseQuery, countQuery, args, err := r.buildListEventsQueries(opts)
	if err != nil {
		return nil, err
	}

	var totalCount int32
	if err := r.data.DB.QueryRow(ctx, countQuery, args...).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("count events: %w", err)
	}

	paginatedQuery := baseQuery + fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, opts.Limit, opts.Offset)

	events, err := r.fetchEvents(ctx, paginatedQuery, args, currentUserID)
	if err != nil {
		return nil, err
	}

	if len(events) > 0 {
		if err := r.fetchParticipants(ctx, events, currentUserID); err != nil {
			return nil, err
		}
	}

	hasNextPage := opts.Offset+opts.Limit < totalCount

	return &model.ListEventsResponse{
		Events:      events,
		Limit:       opts.Limit,
		Offset:      opts.Offset,
		TotalCount:  totalCount,
		HasNextPage: hasNextPage,
	}, nil
}

func (r *Repo) buildListEventsQueries(opts model.ListEventsOptions) (string, string, []any, error) {
	hasExplicitWindow := opts.From != nil || opts.To != nil
	opts = normalizeListEventsWindow(opts, time.Now())

	var args []any
	argNum := 1
	conditions := []string{}

	if opts.From != nil && opts.To != nil && !hasExplicitWindow && opts.Status != "past" {
		conditions = append(conditions, fmt.Sprintf("(e.scheduled_at IS NULL OR (e.scheduled_at >= $%d AND e.scheduled_at <= $%d))", argNum, argNum+1))
		args = append(args, *opts.From, *opts.To)
		argNum += 2
	} else {
		if opts.From != nil {
			conditions = append(conditions, fmt.Sprintf("e.scheduled_at >= $%d", argNum))
			args = append(args, *opts.From)
			argNum++
		}
		if opts.To != nil {
			conditions = append(conditions, fmt.Sprintf("e.scheduled_at <= $%d", argNum))
			args = append(args, *opts.To)
			argNum++
		}
	}

	if opts.From == nil && opts.To == nil {
		if opts.Status == "past" {
			conditions = append(conditions, "e.scheduled_at < NOW() - INTERVAL '12 hours'")
		} else {
			conditions = append(conditions, "e.scheduled_at >= NOW() - INTERVAL '12 hours'")
		}
	}

	if opts.CreatorID != nil {
		conditions = append(conditions, fmt.Sprintf("e.creator_id = $%d", argNum))
		args = append(args, *opts.CreatorID)
		argNum++
	}
	if opts.GuildID != nil {
		conditions = append(conditions, fmt.Sprintf("e.guild_id = $%d", argNum))
		args = append(args, *opts.GuildID)
		argNum++
	}

	// Approval status filter: only show approved events unless admin or creator.
	if !opts.IncludeAllStatuses {
		if opts.ViewerID != nil {
			conditions = append(conditions, fmt.Sprintf("(COALESCE(e.status, 'approved') = 'approved' OR e.creator_id = $%d)", argNum))
			args = append(args, *opts.ViewerID)
			argNum++
		} else {
			conditions = append(conditions, "COALESCE(e.status, 'approved') = 'approved'")
		}
	}

	// ADR-004 — system_kind events (e.g. "guild_war_started") are surfaced
	// in the dedicated guild feed, not the public events list. Hide them
	// here unconditionally; legacy rows have system_kind IS NULL so the
	// filter is identity for existing data.
	conditions = append(conditions, "e.system_kind IS NULL")

	_ = argNum

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	listQuery := fmt.Sprintf(`
SELECT
  e.id,
  e.title,
  e.place_label,
  COALESCE(e.description, ''),
  COALESCE(e.meeting_link, ''),
  COALESCE(e.region, ''),
  COALESCE(e.country, ''),
  COALESCE(e.city, ''),
  e.latitude,
  e.longitude,
  e.scheduled_at,
  e.created_at,
  e.creator_id::text,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.last_name)), ''), NULLIF(cu.username, ''), ''),
  e.guild_id,
  COALESCE(e.repeat_rule, 'none'),
  e.is_public,
  COALESCE(e.status, 'approved')
FROM events e
JOIN users cu ON cu.id = e.creator_id
%s
ORDER BY e.scheduled_at IS NULL ASC, e.scheduled_at ASC, e.created_at DESC
`, whereClause)

	countQuery := fmt.Sprintf(`
SELECT COUNT(*)
FROM events e
JOIN users cu ON cu.id = e.creator_id
%s
`, whereClause)

	return listQuery, strings.TrimSpace(countQuery), args, nil
}

func normalizeListEventsWindow(opts model.ListEventsOptions, now time.Time) model.ListEventsOptions {
	defaultFrom := now.Add(-12 * time.Hour)
	defaultTo := now.Add(maxEventsWindow)
	if opts.Status == "past" {
		defaultFrom = now.Add(-maxEventsWindow)
		defaultTo = now.Add(12 * time.Hour)
	}

	switch {
	case opts.From == nil && opts.To == nil:
		opts.From = timePtr(defaultFrom)
		opts.To = timePtr(defaultTo)
	case opts.From != nil && opts.To == nil:
		upperBound := opts.From.Add(maxEventsWindow)
		if defaultTo.Before(upperBound) {
			upperBound = defaultTo
		}
		opts.To = timePtr(upperBound)
	case opts.From == nil && opts.To != nil:
		lowerBound := opts.To.Add(-maxEventsWindow)
		if defaultFrom.After(lowerBound) {
			lowerBound = defaultFrom
		}
		opts.From = timePtr(lowerBound)
	case opts.To.Sub(*opts.From) > maxEventsWindow:
		clampedTo := opts.From.Add(maxEventsWindow)
		if opts.Status == "past" && defaultTo.Before(clampedTo) {
			clampedTo = defaultTo
		}
		if opts.Status != "past" && defaultTo.Before(clampedTo) {
			clampedTo = defaultTo
		}
		opts.To = timePtr(clampedTo)
	}

	if opts.From != nil && opts.To != nil && opts.To.Before(*opts.From) {
		opts.To = timePtr(*opts.From)
	}

	return opts
}

func timePtr(value time.Time) *time.Time {
	return &value
}

func (r *Repo) fetchEvents(
	ctx context.Context,
	query string,
	args []any,
	currentUserID uuid.UUID,
) ([]*model.Event, error) {
	rows, err := r.data.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query events: %w", err)
	}
	defer rows.Close()

	events := make([]*model.Event, 0, 16)
	for rows.Next() {
		var event model.Event
		var scheduledAt *time.Time
		var createdAt time.Time

		if err := rows.Scan(
			&event.ID,
			&event.Title,
			&event.PlaceLabel,
			&event.Description,
			&event.MeetingLink,
			&event.Region,
			&event.Country,
			&event.City,
			&event.Latitude,
			&event.Longitude,
			&scheduledAt,
			&createdAt,
			&event.CreatorID,
			&event.CreatorName,
			&event.GuildID,
			&event.Repeat,
			&event.IsPublic,
			&event.Status,
		); err != nil {
			return nil, fmt.Errorf("scan event: %w", err)
		}

		event.ScheduledAt = scheduledAt
		event.CreatedAt = createdAt
		event.IsCreator = event.CreatorID == currentUserID.String()
		event.Participants = make([]*model.EventParticipant, 0, 4)
		events = append(events, &event)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate events: %w", err)
	}

	return events, nil
}

func (r *Repo) fetchParticipants(
	ctx context.Context,
	events []*model.Event,
	currentUserID uuid.UUID,
) error {
	if len(events) == 0 {
		return nil
	}

	eventIDs := make([]any, len(events))
	for i, e := range events {
		eventIDs[i] = e.ID
	}

	query := `
SELECT
  ep.event_id::text,
  ep.user_id::text,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', pu.first_name, pu.last_name)), ''), NULLIF(pu.username, ''), ''),
  COALESCE(NULLIF(pu.yandex_avatar_url, ''), CASE WHEN pu.telegram_id IS NOT NULL THEN '/api/v1/profile/avatar/' || pu.id::text END, ''),
  COALESCE(pu.telegram_username, ''),
  COALESCE(pu.first_name, ''),
  COALESCE(pu.last_name, ''),
  ep.status
FROM event_participants ep
JOIN users pu ON pu.id = ep.user_id
WHERE ep.event_id = ANY($1)
ORDER BY ep.event_id, ep.created_at ASC
`
	rows, err := r.data.DB.Query(ctx, query, eventIDs)
	if err != nil {
		return fmt.Errorf("query participants: %w", err)
	}
	defer rows.Close()

	eventMap := make(map[uuid.UUID]*model.Event, len(events))
	for _, e := range events {
		eventMap[e.ID] = e
	}

	for rows.Next() {
		var eventIDStr string
		var participant model.EventParticipant
		var statusInt int

		if err := rows.Scan(
			&eventIDStr,
			&participant.UserID,
			&participant.Title,
			&participant.AvatarURL,
			&participant.TelegramUsername,
			&participant.FirstName,
			&participant.LastName,
			&statusInt,
		); err != nil {
			return fmt.Errorf("scan participant: %w", err)
		}
		participant.Status = model.EventParticipantStatus(statusInt)

		eventID, err := uuid.Parse(eventIDStr)
		if err != nil {
			continue
		}

		event, ok := eventMap[eventID]
		if !ok {
			continue
		}

		event.Participants = append(event.Participants, &participant)
		if participant.Status == model.EventParticipantStatusConfirmed {
			event.ParticipantCount++
			if participant.UserID == currentUserID.String() {
				event.IsJoined = true
			}
		}
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate rows: %w", err)
	}
	return nil
}

func (r *Repo) getEvent(
	ctx context.Context,
	queryer eventQueryer,
	eventID uuid.UUID,
	currentUserID uuid.UUID,
) (*model.Event, error) {
	query := `
SELECT
  e.id,
  e.title,
  e.place_label,
  COALESCE(e.description, ''),
  COALESCE(e.meeting_link, ''),
  COALESCE(e.region, ''),
  COALESCE(e.country, ''),
  COALESCE(e.city, ''),
  e.latitude,
  e.longitude,
  e.scheduled_at,
  e.created_at,
  e.creator_id::text,
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.last_name)), ''), NULLIF(cu.username, ''), ''),
  e.is_public
FROM events e
JOIN users cu ON cu.id = e.creator_id
WHERE e.id = $1
`

	rows, err := queryer.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("query event: %w", err)
	}
	defer rows.Close()

	var event model.Event
	var scheduledAt *time.Time
	var createdAt time.Time
	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("iterate event: %w", err)
		}
		//nolint:nilnil // Missing event is represented as nil for service-level not-found handling.
		return nil, nil
	}

	if err := rows.Scan(
		&event.ID,
		&event.Title,
		&event.PlaceLabel,
		&event.Description,
		&event.MeetingLink,
		&event.Region,
		&event.Country,
		&event.City,
		&event.Latitude,
		&event.Longitude,
		&scheduledAt,
		&createdAt,
		&event.CreatorID,
		&event.CreatorName,
		&event.IsPublic,
	); err != nil {
		return nil, fmt.Errorf("scan event: %w", err)
	}

	event.ScheduledAt = scheduledAt
	event.CreatedAt = createdAt
	event.IsCreator = event.CreatorID == currentUserID.String()
	event.Participants = make([]*model.EventParticipant, 0)

	rows.Close()
	if err := r.fetchParticipants(ctx, []*model.Event{&event}, currentUserID); err != nil {
		return nil, err
	}

	return &event, nil
}

type eventQueryer interface {
	Query(ctx context.Context, query string, args ...any) (pgx.Rows, error)
}
