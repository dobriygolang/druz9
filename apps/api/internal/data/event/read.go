package event

import (
	"context"
	"fmt"
	"strings"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const (
	defaultEventsLimit = 20
	maxEventsLimit     = 100
)

func (r *Repo) ListEvents(
	ctx context.Context,
	currentUserID uuid.UUID,
	opts model.ListEventsOptions,
) (*model.ListEventsResponse, error) {
	// Apply defaults
	if opts.Limit <= 0 || opts.Limit > maxEventsLimit {
		opts.Limit = defaultEventsLimit
	}

	// Build base query with filters
	baseQuery, countQuery, args, err := r.buildListEventsQueries(opts)
	if err != nil {
		return nil, err
	}

	// Get total count
	var totalCount int32
	if err := r.data.DB.QueryRow(ctx, countQuery, args...).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("count events: %w", err)
	}

	// Add pagination to main query
	paginatedQuery := baseQuery + fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, opts.Limit, opts.Offset)

	// Fetch events
	events, err := r.fetchEvents(ctx, paginatedQuery, args, currentUserID)
	if err != nil {
		return nil, err
	}

	// Fetch participants for fetched events
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
	var args []any
	argNum := 1

	conditions := []string{}

	// Time filter
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

	// Default time range if no filters
	if opts.From == nil && opts.To == nil {
		if opts.Status == "past" {
			conditions = append(conditions, "e.scheduled_at < NOW() - INTERVAL '12 hours'")
		} else {
			conditions = append(conditions, "e.scheduled_at >= NOW() - INTERVAL '12 hours'")
		}
	}

	// Creator filter
	if opts.CreatorID != nil {
		conditions = append(conditions, fmt.Sprintf("e.creator_id = $%d", argNum))
		args = append(args, *opts.CreatorID)
	}

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
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.last_name)), ''), NULLIF(cu.telegram_username, ''), 'user')
FROM events e
JOIN users cu ON cu.id = e.creator_id
%s
ORDER BY e.scheduled_at ASC
`, whereClause)

	countQuery := fmt.Sprintf(`
SELECT COUNT(*)
FROM events e
JOIN users cu ON cu.id = e.creator_id
%s
`, whereClause)

	return listQuery, strings.TrimSpace(countQuery), args, nil
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
		var scheduledAt, createdAt time.Time

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
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', pu.first_name, pu.last_name)), ''), NULLIF(pu.telegram_username, ''), 'user'),
  COALESCE(pu.avatar_url, ''),
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

	return rows.Err()
}

// getEvent returns a single event by ID (unchanged)
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
  COALESCE(NULLIF(TRIM(CONCAT_WS(' ', cu.first_name, cu.last_name)), ''), NULLIF(cu.telegram_username, ''), 'user')
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
	var scheduledAt, createdAt time.Time
	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("iterate event: %w", err)
		}
		return nil, nil // Not found
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
	); err != nil {
		return nil, fmt.Errorf("scan event: %w", err)
	}

	event.ScheduledAt = scheduledAt
	event.CreatedAt = createdAt
	event.IsCreator = event.CreatorID == currentUserID.String()
	event.Participants = make([]*model.EventParticipant, 0)

	// Fetch participants separately
	rows.Close()
	if err := r.fetchParticipants(ctx, []*model.Event{&event}, currentUserID); err != nil {
		return nil, err
	}

	if len(event.Participants) == 0 {
		return nil, nil
	}

	return &event, nil
}

type eventQueryer interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}
