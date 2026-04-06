package event

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"api/internal/model"
	slicestools "api/internal/tools/slices"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func (r *Repo) CleanupExpiredEvents(ctx context.Context, olderThan time.Duration) (int64, error) {
	if olderThan <= 0 {
		return 0, nil
	}
	tag, err := r.data.DB.Exec(ctx, `
DELETE FROM events
WHERE scheduled_at < NOW() - $1::interval
`, olderThan.String())
	if err != nil {
		return 0, fmt.Errorf("cleanup expired events: %w", err)
	}
	return tag.RowsAffected(), nil
}

func (r *Repo) CreateEvent(ctx context.Context, creatorID uuid.UUID, req model.CreateEventRequest) (*model.Event, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	scheduledAtList := buildCreateEventScheduleTimes(req.ScheduledAt, req.Repeat)
	var seriesID *uuid.UUID
	if len(scheduledAtList) > 1 {
		value := uuid.New()
		seriesID = &value
	}
	firstEventID := uuid.Nil
	for _, scheduledAt := range scheduledAtList {
		eventID := uuid.New()
		if firstEventID == uuid.Nil {
			firstEventID = eventID
		}
		_, err = tx.Exec(
			ctx,
			`INSERT INTO events (id, creator_id, title, place_label, description, meeting_link, region, country, city, latitude, longitude, scheduled_at, series_id, repeat_rule, circle_id, created_at, updated_at)
			 VALUES ($1,$2,$3,$4,NULLIF($5,''),NULLIF($6,''),NULLIF($7,''),NULLIF($8,''),NULLIF($9,''),$10,$11,$12,$13,$14,$15,NOW(),NOW())`,
			eventID, creatorID, req.Title, req.PlaceLabel, req.Description, req.MeetingLink, req.Region, req.Country, req.City, req.Latitude, req.Longitude, scheduledAt, seriesID, normalizeRepeatRule(req.Repeat), req.CircleID,
		)
		if err != nil {
			return nil, fmt.Errorf("insert event: %w", err)
		}

		if _, err := tx.Exec(
			ctx,
			`INSERT INTO event_participants (event_id, user_id, status) VALUES ($1, $2, $3)`,
			eventID, creatorID, model.EventParticipantStatusConfirmed,
		); err != nil {
			return nil, fmt.Errorf("insert creator participant: %w", err)
		}

		if err := insertInvitedParticipants(
			ctx,
			tx,
			eventID,
			invitedUserIDStrings(req.InvitedUserIDs, creatorID),
		); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return r.getEvent(ctx, r.data.DB, firstEventID, creatorID)
}

func normalizeRepeatRule(repeat string) string {
	switch repeat {
	case model.EventRepeatDaily, model.EventRepeatWeekly, model.EventRepeatMonthly, model.EventRepeatYearly:
		return repeat
	default:
		return model.EventRepeatNone
	}
}

// buildCreateEventScheduleTimes generates occurrence timestamps.
// Horizons are intentionally short to avoid bloating the DB:
//   daily   → 14 occurrences (2 weeks)
//   weekly  → 8  occurrences (2 months)
//   monthly → 6  occurrences (6 months)
//   yearly  → 2  occurrences (2 years)
func buildCreateEventScheduleTimes(base time.Time, repeat string) []time.Time {
	switch repeat {
	case model.EventRepeatDaily:
		return buildRepeatedScheduleTimes(base, 14, func(value time.Time, step int) time.Time {
			return value.AddDate(0, 0, step)
		})
	case model.EventRepeatWeekly:
		return buildRepeatedScheduleTimes(base, 8, func(value time.Time, step int) time.Time {
			return value.AddDate(0, 0, 7*step)
		})
	case model.EventRepeatMonthly:
		return buildRepeatedScheduleTimes(base, 6, func(value time.Time, step int) time.Time {
			return value.AddDate(0, step, 0)
		})
	case model.EventRepeatYearly:
		return buildRepeatedScheduleTimes(base, 2, func(value time.Time, step int) time.Time {
			return value.AddDate(step, 0, 0)
		})
	default:
		return []time.Time{base}
	}
}

func buildRepeatedScheduleTimes(base time.Time, count int, next func(time.Time, int) time.Time) []time.Time {
	if count <= 1 {
		return []time.Time{base}
	}
	items := make([]time.Time, 0, count)
	for step := 0; step < count; step++ {
		items = append(items, next(base, step))
	}
	return items
}

func (r *Repo) JoinEvent(ctx context.Context, eventID, userID uuid.UUID) (*model.Event, error) {
	if _, err := r.data.DB.Exec(
		ctx,
		`INSERT INTO event_participants (event_id, user_id, status) VALUES ($1, $2, $3)
		 ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
		eventID, userID, model.EventParticipantStatusConfirmed,
	); err != nil {
		return nil, fmt.Errorf("join event: %w", err)
	}

	return r.getEvent(ctx, r.data.DB, eventID, userID)
}

func (r *Repo) LeaveEvent(ctx context.Context, eventID, userID uuid.UUID) error {
	var creatorID uuid.UUID
	if err := r.data.DB.QueryRow(ctx, `SELECT creator_id FROM events WHERE id = $1`, eventID).Scan(&creatorID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return kratoserrors.NotFound("EVENT_NOT_FOUND", "event not found")
		}
		return fmt.Errorf("load event creator: %w", err)
	}
	if creatorID == userID {
		return kratoserrors.BadRequest("CREATOR_CANNOT_LEAVE", "creator cannot leave own event")
	}
	if _, err := r.data.DB.Exec(ctx, `DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2`, eventID, userID); err != nil {
		return fmt.Errorf("leave event: %w", err)
	}
	return nil
}

func (r *Repo) UpdateEvent(ctx context.Context, eventID uuid.UUID, actor *model.User, req model.UpdateEventRequest) (*model.Event, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := ensureEventManager(ctx, tx, eventID, actor); err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
UPDATE events
SET title = $2,
    place_label = $3,
    description = NULLIF($4, ''),
    meeting_link = NULLIF($5, ''),
    region = NULLIF($6, ''),
    country = NULLIF($7, ''),
    city = NULLIF($8, ''),
    latitude = $9,
    longitude = $10,
    scheduled_at = $11,
    updated_at = NOW()
WHERE id = $1`,
		eventID,
		req.Title,
		req.PlaceLabel,
		req.Description,
		req.MeetingLink,
		req.Region,
		req.Country,
		req.City,
		req.Latitude,
		req.Longitude,
		req.ScheduledAt,
	); err != nil {
		return nil, fmt.Errorf("update event: %w", err)
	}

	if _, err := tx.Exec(ctx, `DELETE FROM event_participants WHERE event_id = $1 AND status = $2`, eventID, model.EventParticipantStatusPending); err != nil {
		return nil, fmt.Errorf("clear invited participants: %w", err)
	}

	if err := insertInvitedParticipants(
		ctx,
		tx,
		eventID,
		invitedUserIDStrings(req.InvitedUserIDs, actor.ID),
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return r.getEvent(ctx, r.data.DB, eventID, actor.ID)
}

func (r *Repo) DeleteEvent(ctx context.Context, eventID uuid.UUID, actor *model.User) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := ensureEventManager(ctx, tx, eventID, actor); err != nil {
		return err
	}

	var seriesID *uuid.UUID
	var scheduledAt time.Time
	if err := tx.QueryRow(ctx, `SELECT series_id, scheduled_at FROM events WHERE id = $1`, eventID).Scan(&seriesID, &scheduledAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return kratoserrors.NotFound("EVENT_NOT_FOUND", "event not found")
		}
		return fmt.Errorf("load event series: %w", err)
	}

	scope := model.EventDeleteScopeFromContext(ctx)
	tag, err := deleteEventByScope(ctx, tx, eventID, seriesID, scheduledAt, scope)
	if err != nil {
		return fmt.Errorf("delete event: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return kratoserrors.NotFound("EVENT_NOT_FOUND", "event not found")
	}
	return tx.Commit(ctx)
}

func deleteEventByScope(
	ctx context.Context,
	tx pgx.Tx,
	eventID uuid.UUID,
	seriesID *uuid.UUID,
	scheduledAt time.Time,
	scope string,
) (pgconn.CommandTag, error) {
	if seriesID == nil {
		return tx.Exec(ctx, `DELETE FROM events WHERE id = $1`, eventID)
	}

	switch scope {
	case "all":
		return tx.Exec(ctx, `DELETE FROM events WHERE series_id = $1`, *seriesID)
	case "future":
		return tx.Exec(ctx, `DELETE FROM events WHERE series_id = $1 AND scheduled_at >= $2`, *seriesID, scheduledAt)
	default:
		return tx.Exec(ctx, `DELETE FROM events WHERE id = $1`, eventID)
	}
}

func ensureEventManager(ctx context.Context, tx pgx.Tx, eventID uuid.UUID, actor *model.User) error {
	if actor == nil {
		return kratoserrors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	if actor.IsAdmin {
		_, err := lockEventCreator(ctx, tx, eventID)
		return err
	}

	creatorID, err := lockEventCreator(ctx, tx, eventID)
	if err != nil {
		return err
	}
	if creatorID != actor.ID {
		return kratoserrors.Forbidden("FORBIDDEN", "forbidden")
	}
	return nil
}

func lockEventCreator(ctx context.Context, tx pgx.Tx, eventID uuid.UUID) (uuid.UUID, error) {
	var creatorID uuid.UUID
	if err := tx.QueryRow(ctx, `SELECT creator_id FROM events WHERE id = $1 FOR UPDATE`, eventID).Scan(&creatorID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, kratoserrors.NotFound("EVENT_NOT_FOUND", "event not found")
		}
		return uuid.Nil, fmt.Errorf("load event creator: %w", err)
	}
	return creatorID, nil
}

func normalizeInvitedUserIDs(rawUserIDs []string, skip ...uuid.UUID) []uuid.UUID {
	uniqueRawIDs := slicestools.Unique(
		slicestools.Map(rawUserIDs, func(value string) string {
			return strings.TrimSpace(value)
		}),
	)
	skipSet := make(map[uuid.UUID]struct{}, len(skip))
	for _, userID := range skip {
		if userID != uuid.Nil {
			skipSet[userID] = struct{}{}
		}
	}

	result := make([]uuid.UUID, 0, len(uniqueRawIDs))
	for _, rawID := range uniqueRawIDs {
		if rawID == "" {
			continue
		}
		userID, err := uuid.Parse(rawID)
		if err != nil {
			continue
		}
		if _, exists := skipSet[userID]; exists {
			continue
		}
		result = append(result, userID)
	}
	return result
}

func invitedUserIDStrings(rawUserIDs []string, skip ...uuid.UUID) []string {
	return slicestools.Map(normalizeInvitedUserIDs(rawUserIDs, skip...), func(userID uuid.UUID) string {
		return userID.String()
	})
}

func insertInvitedParticipants(
	ctx context.Context,
	tx pgx.Tx,
	eventID uuid.UUID,
	invitedUserIDs []string,
) error {
	if len(invitedUserIDs) == 0 {
		return nil
	}

	if _, err := tx.Exec(ctx, `
INSERT INTO event_participants (event_id, user_id, status)
SELECT $1, invited_user_id::uuid, $3
FROM unnest($2::text[]) AS invited_user_id
ON CONFLICT (event_id, user_id) DO NOTHING
`, eventID, invitedUserIDs, model.EventParticipantStatusPending); err != nil {
		return fmt.Errorf("insert invited participants: %w", err)
	}
	return nil
}
