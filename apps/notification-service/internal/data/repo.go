package data

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Notification struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Kind         string
	Channel      string
	Title        string
	Body         string
	Payload      []byte // JSON
	Status       string
	ScheduledAt  *time.Time
	SentAt       *time.Time
	ErrorMessage string
	CreatedAt    time.Time
}

type UserSettings struct {
	UserID                 uuid.UUID
	TelegramChatID         int64
	DuelsEnabled           bool
	ProgressEnabled        bool
	CirclesEnabled         bool
	DailyChallengeEnabled  bool
	QuietHoursStart        int
	QuietHoursEnd          int
	Timezone               string
	EngagementPaused       bool
	LastEngagementSentAt   *time.Time
	ConsecutiveIgnored     int
}

type CircleSettings struct {
	UserID          uuid.UUID
	CircleID        uuid.UUID
	EventsEnabled   bool
	ActivityEnabled bool
	DigestEnabled   bool
	Muted           bool
}

type Repo struct {
	db *Data
}

func NewRepo(db *Data) *Repo {
	return &Repo{db: db}
}

// InsertNotification creates a pending notification.
func (r *Repo) InsertNotification(ctx context.Context, n *Notification) error {
	_, err := r.db.DB.Exec(ctx, `
		INSERT INTO notifications (id, user_id, kind, channel, title, body, payload, status, scheduled_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
		n.ID, n.UserID, n.Kind, n.Channel, n.Title, n.Body, n.Payload, "pending", n.ScheduledAt,
	)
	return err
}

// InsertBatch creates pending notifications for multiple users.
func (r *Repo) InsertBatch(ctx context.Context, notifications []*Notification) (int, error) {
	if len(notifications) == 0 {
		return 0, nil
	}

	batch := &pgx.Batch{}
	for _, n := range notifications {
		batch.Queue(`
			INSERT INTO notifications (id, user_id, kind, channel, title, body, payload, status, scheduled_at, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
			n.ID, n.UserID, n.Kind, n.Channel, n.Title, n.Body, n.Payload, "pending", n.ScheduledAt,
		)
	}

	results := r.db.DB.SendBatch(ctx, batch)
	defer results.Close()

	count := 0
	for range notifications {
		if _, err := results.Exec(); err != nil {
			return count, fmt.Errorf("batch insert notification: %w", err)
		}
		count++
	}
	return count, nil
}

// FetchPending returns pending notifications ready for delivery.
// Uses FOR UPDATE SKIP LOCKED for concurrent workers.
func (r *Repo) FetchPending(ctx context.Context, limit int) ([]*Notification, error) {
	rows, err := r.db.DB.Query(ctx, `
		SELECT id, user_id, kind, channel, title, body, payload, status, scheduled_at, created_at
		FROM notifications
		WHERE status = 'pending'
		  AND (scheduled_at IS NULL OR scheduled_at <= NOW())
		ORDER BY created_at
		LIMIT $1
		FOR UPDATE SKIP LOCKED`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []*Notification
	for rows.Next() {
		n := &Notification{}
		if err := rows.Scan(&n.ID, &n.UserID, &n.Kind, &n.Channel, &n.Title, &n.Body, &n.Payload, &n.Status, &n.ScheduledAt, &n.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, n)
	}
	return result, rows.Err()
}

// MarkSent updates notification status to sent.
func (r *Repo) MarkSent(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.DB.Exec(ctx, `
		UPDATE notifications SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1`, id)
	return err
}

// MarkFailed updates notification status to failed with error message.
func (r *Repo) MarkFailed(ctx context.Context, id uuid.UUID, errMsg string) error {
	_, err := r.db.DB.Exec(ctx, `
		UPDATE notifications SET status = 'failed', error_message = $2, updated_at = NOW() WHERE id = $1`, id, errMsg)
	return err
}

// Reschedule sets a new scheduled_at time for a notification.
func (r *Repo) Reschedule(ctx context.Context, id uuid.UUID, at time.Time) error {
	_, err := r.db.DB.Exec(ctx, `
		UPDATE notifications SET scheduled_at = $2, updated_at = NOW() WHERE id = $1`, id, at)
	return err
}

// DailyCountForUser returns the number of notifications sent to a user today.
func (r *Repo) DailyCountForUser(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.DB.QueryRow(ctx, `
		SELECT COUNT(*) FROM notifications
		WHERE user_id = $1 AND sent_at >= CURRENT_DATE AND status = 'sent'`, userID).Scan(&count)
	return count, err
}

// ── User Settings ─────────────────────────────────────────────

// GetUserSettings returns settings for a user, or defaults if none exist.
func (r *Repo) GetUserSettings(ctx context.Context, userID uuid.UUID) (*UserSettings, error) {
	s := &UserSettings{
		UserID:          userID,
		DuelsEnabled:    true,
		ProgressEnabled: true,
		CirclesEnabled:  true,
		QuietHoursStart: 23,
		QuietHoursEnd:   8,
		Timezone:        "Europe/Moscow",
	}

	err := r.db.DB.QueryRow(ctx, `
		SELECT telegram_chat_id, duels_enabled, progress_enabled, circles_enabled, daily_challenge_enabled,
		       quiet_hours_start, quiet_hours_end, timezone, engagement_paused, last_engagement_sent_at, consecutive_ignored
		FROM user_notification_settings WHERE user_id = $1`, userID).Scan(
		&s.TelegramChatID, &s.DuelsEnabled, &s.ProgressEnabled, &s.CirclesEnabled, &s.DailyChallengeEnabled,
		&s.QuietHoursStart, &s.QuietHoursEnd, &s.Timezone, &s.EngagementPaused, &s.LastEngagementSentAt, &s.ConsecutiveIgnored,
	)
	if err == pgx.ErrNoRows {
		return s, nil
	}
	return s, err
}

// UpsertUserSettings creates or updates user notification settings.
func (r *Repo) UpsertUserSettings(ctx context.Context, s *UserSettings) error {
	_, err := r.db.DB.Exec(ctx, `
		INSERT INTO user_notification_settings (user_id, telegram_chat_id, duels_enabled, progress_enabled, circles_enabled, daily_challenge_enabled, quiet_hours_start, quiet_hours_end, timezone)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (user_id) DO UPDATE SET
			telegram_chat_id = EXCLUDED.telegram_chat_id,
			duels_enabled = EXCLUDED.duels_enabled,
			progress_enabled = EXCLUDED.progress_enabled,
			circles_enabled = EXCLUDED.circles_enabled,
			daily_challenge_enabled = EXCLUDED.daily_challenge_enabled,
			quiet_hours_start = EXCLUDED.quiet_hours_start,
			quiet_hours_end = EXCLUDED.quiet_hours_end,
			timezone = EXCLUDED.timezone,
			updated_at = NOW()`,
		s.UserID, s.TelegramChatID, s.DuelsEnabled, s.ProgressEnabled, s.CirclesEnabled, s.DailyChallengeEnabled,
		s.QuietHoursStart, s.QuietHoursEnd, s.Timezone,
	)
	return err
}

// RegisterChat sets the telegram_chat_id for a user.
func (r *Repo) RegisterChat(ctx context.Context, userID uuid.UUID, chatID int64) error {
	_, err := r.db.DB.Exec(ctx, `
		INSERT INTO user_notification_settings (user_id, telegram_chat_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET telegram_chat_id = $2, updated_at = NOW()`,
		userID, chatID,
	)
	return err
}

// RegisterChatByTelegramID upserts a row by telegram_id with the chat_id.
// The user_id is a placeholder (null UUID) until login completes.
func (r *Repo) RegisterChatByTelegramID(ctx context.Context, telegramID, chatID int64) error {
	_, err := r.db.DB.Exec(ctx, `
		INSERT INTO user_notification_settings (user_id, telegram_id, telegram_chat_id)
		VALUES (gen_random_uuid(), $1, $2)
		ON CONFLICT (telegram_id) WHERE telegram_id IS NOT NULL
		DO UPDATE SET telegram_chat_id = $2, updated_at = NOW()`,
		telegramID, chatID,
	)
	return err
}

// LinkTelegramToUser updates the row's user_id once we know the real app user UUID.
// If no row exists for this telegram_id, creates one using telegram_id as the chat_id
// (for private chats, telegram user id == chat id).
func (r *Repo) LinkTelegramToUser(ctx context.Context, userID uuid.UUID, telegramID int64) error {
	_, err := r.db.DB.Exec(ctx, `
		INSERT INTO user_notification_settings (user_id, telegram_id, telegram_chat_id)
		VALUES ($1, $2, $2)
		ON CONFLICT (telegram_id) WHERE telegram_id IS NOT NULL
		DO UPDATE SET user_id = $1, telegram_chat_id = COALESCE(NULLIF(user_notification_settings.telegram_chat_id, 0), $2), updated_at = NOW()`,
		userID, telegramID,
	)
	if err != nil {
		return err
	}
	// Also update by user_id in case there's an existing row without telegram_id.
	_, err = r.db.DB.Exec(ctx, `
		UPDATE user_notification_settings
		SET telegram_chat_id = COALESCE(NULLIF(telegram_chat_id, 0), $2), telegram_id = $2, updated_at = NOW()
		WHERE user_id = $1 AND (telegram_id IS NULL OR telegram_id = 0)`,
		userID, telegramID,
	)
	return err
}

// ── Circle Settings ───────────────────────────────────────────

// GetCircleSettings returns per-circle settings, or defaults if none exist.
func (r *Repo) GetCircleSettings(ctx context.Context, userID, circleID uuid.UUID) (*CircleSettings, error) {
	s := &CircleSettings{
		UserID:          userID,
		CircleID:        circleID,
		EventsEnabled:   true,
		ActivityEnabled: true,
		DigestEnabled:   true,
	}

	err := r.db.DB.QueryRow(ctx, `
		SELECT events_enabled, activity_enabled, digest_enabled, muted
		FROM circle_notification_settings WHERE user_id = $1 AND circle_id = $2`, userID, circleID).Scan(
		&s.EventsEnabled, &s.ActivityEnabled, &s.DigestEnabled, &s.Muted,
	)
	if err == pgx.ErrNoRows {
		return s, nil
	}
	return s, err
}

// UpsertCircleSettings creates or updates per-circle notification settings.
func (r *Repo) UpsertCircleSettings(ctx context.Context, s *CircleSettings) error {
	_, err := r.db.DB.Exec(ctx, `
		INSERT INTO circle_notification_settings (user_id, circle_id, events_enabled, activity_enabled, digest_enabled, muted)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id, circle_id) DO UPDATE SET
			events_enabled = EXCLUDED.events_enabled,
			activity_enabled = EXCLUDED.activity_enabled,
			digest_enabled = EXCLUDED.digest_enabled,
			muted = EXCLUDED.muted,
			updated_at = NOW()`,
		s.UserID, s.CircleID, s.EventsEnabled, s.ActivityEnabled, s.DigestEnabled, s.Muted,
	)
	return err
}
