// Package inbox (data layer) is the pgx-backed implementation of the inbox
// Repository interface defined in internal/domain/inbox.
package inbox

import (
	"context"
	"errors"
	"fmt"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/model"
	"api/internal/storage/postgres"
)

// Repo implements domain.inbox.Repository.
type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

// NewRepo creates a new inbox repository.
func NewRepo(store *postgres.Store, logger log.Logger) *Repo {
	return &Repo{data: store, log: log.NewHelper(logger)}
}

// ListThreads returns a paginated slice of a user's threads ordered by
// last_message_at DESC, plus the total row count and the unread-total across
// every thread of the user (not just the page).
func (r *Repo) ListThreads(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.InboxThread, int32, int32, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, user_id, kind, subject, avatar, preview, unread_count,
		       last_message_at, external_id, interactive, created_at
		FROM inbox_threads
		WHERE user_id = $1
		ORDER BY last_message_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("list threads: %w", err)
	}
	defer rows.Close()

	threads := make([]*model.InboxThread, 0, limit)
	for rows.Next() {
		t, err := scanThread(rows)
		if err != nil {
			return nil, 0, 0, err
		}
		threads = append(threads, t)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, 0, err
	}

	var total int32
	if err := r.data.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM inbox_threads WHERE user_id = $1`, userID,
	).Scan(&total); err != nil {
		return nil, 0, 0, fmt.Errorf("count threads: %w", err)
	}

	unreadTotal, err := r.GetUnreadTotal(ctx, userID)
	if err != nil {
		return nil, 0, 0, err
	}
	return threads, total, unreadTotal, nil
}

// GetThread returns one thread without its messages. Returns nil,nil when
// not found (so the domain layer can return a clean ErrThreadNotFound).
func (r *Repo) GetThread(ctx context.Context, userID, threadID uuid.UUID) (*model.InboxThread, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT id, user_id, kind, subject, avatar, preview, unread_count,
		       last_message_at, external_id, interactive, created_at
		FROM inbox_threads
		WHERE id = $1
	`, threadID)

	t, err := scanThread(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			//nolint:nilnil // Missing thread is represented as nil for service-level not-found handling.
			return nil, nil
		}
		return nil, fmt.Errorf("get thread: %w", err)
	}
	// Caller-scoped ownership check stays at the domain layer;
	// we return the record either way so the domain layer can distinguish
	// "not found" from "not yours".
	_ = userID
	return t, nil
}

// ListMessages returns every message in a thread ordered chronologically.
func (r *Repo) ListMessages(ctx context.Context, threadID uuid.UUID) ([]*model.InboxMessage, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, thread_id, sender_kind, sender_id, sender_name, body, read, created_at
		FROM inbox_messages
		WHERE thread_id = $1
		ORDER BY created_at ASC
	`, threadID)
	if err != nil {
		return nil, fmt.Errorf("list messages: %w", err)
	}
	defer rows.Close()

	messages := make([]*model.InboxMessage, 0, 32)
	for rows.Next() {
		var m model.InboxMessage
		var senderID *uuid.UUID
		if err := rows.Scan(
			&m.ID, &m.ThreadID, &m.SenderKind, &senderID,
			&m.SenderName, &m.Body, &m.Read, &m.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		m.SenderID = senderID
		messages = append(messages, &m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate messages: %w", err)
	}
	return messages, nil
}

// InsertMessage persists a new message. Caller is responsible for also
// calling BumpThread afterwards (the two are a deliberate two-step so tests
// can exercise failure scenarios independently).
func (r *Repo) InsertMessage(ctx context.Context, msg *model.InboxMessage) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO inbox_messages (id, thread_id, sender_kind, sender_id, sender_name, body, read, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`, msg.ID, msg.ThreadID, msg.SenderKind, msg.SenderID, msg.SenderName, msg.Body, msg.Read)
	if err != nil {
		return fmt.Errorf("insert message: %w", err)
	}
	return nil
}

// MarkThreadRead zeroes the thread's unread counter and flags every unread
// message as read. Runs as a single transaction so the counts stay coherent.
func (r *Repo) MarkThreadRead(ctx context.Context, userID, threadID uuid.UUID) error {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		UPDATE inbox_messages SET read = TRUE
		WHERE thread_id = $1 AND read = FALSE
	`, threadID); err != nil {
		return fmt.Errorf("mark messages read: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE inbox_threads SET unread_count = 0
		WHERE id = $1 AND user_id = $2
	`, threadID, userID); err != nil {
		return fmt.Errorf("mark thread read: %w", err)
	}
	return tx.Commit(ctx)
}

// GetUnreadTotal sums unread_count across every thread of the user.
// (The column is maintained as a denormalised cache by InsertMessage callers
// via BumpThread, so we don't re-count messages every time.)
func (r *Repo) GetUnreadTotal(ctx context.Context, userID uuid.UUID) (int32, error) {
	var total int32
	err := r.data.DB.QueryRow(ctx, `
		SELECT COALESCE(SUM(unread_count), 0)::INT
		FROM inbox_threads
		WHERE user_id = $1
	`, userID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("sum unread: %w", err)
	}
	return total, nil
}

// BumpThread updates preview + last_message_at and optionally increments
// unread_count (for messages from someone other than the thread owner).
func (r *Repo) BumpThread(ctx context.Context, threadID uuid.UUID, preview string, incrementUnread bool) error {
	increment := 0
	if incrementUnread {
		increment = 1
	}
	_, err := r.data.DB.Exec(ctx, `
		UPDATE inbox_threads
		SET preview = $2,
		    last_message_at = NOW(),
		    unread_count = unread_count + $3
		WHERE id = $1
	`, threadID, preview, increment)
	if err != nil {
		return fmt.Errorf("bump thread: %w", err)
	}
	return nil
}

// scanThread is shared between QueryRow (single) and Query (list) results.
// pgx.Row and pgx.Rows both implement Scan with the same signature.
type scanner interface {
	Scan(dest ...any) error
}

func scanThread(s scanner) (*model.InboxThread, error) {
	var t model.InboxThread
	var externalID *uuid.UUID
	err := s.Scan(
		&t.ID, &t.UserID, &t.Kind, &t.Subject, &t.Avatar, &t.Preview,
		&t.UnreadCount, &t.LastMessageAt, &externalID, &t.Interactive, &t.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("scan thread: %w", err)
	}
	t.ExternalID = externalID
	return &t, nil
}

// CreateDirectThread opens a bidirectional friend mail thread between two users.
// Creates one inbox_threads row per participant. The shared external_id links
// the two sides so either participant can reply into each other's inbox.
// If a thread between the pair already exists, the existing sender-side thread
// is returned (idempotent).
func (r *Repo) CreateDirectThread(ctx context.Context, senderID, recipientID uuid.UUID, senderName, recipientName, subject string) (*model.InboxThread, error) {
	// Idempotency: return existing thread if one already exists for this pair.
	var existing model.InboxThread
	var extID *uuid.UUID
	err := r.data.DB.QueryRow(ctx, `
		SELECT id, user_id, kind, subject, avatar, preview, unread_count,
		       last_message_at, external_id, interactive, created_at
		FROM inbox_threads
		WHERE user_id = $1 AND kind = $2 AND external_id IN (
			SELECT external_id FROM inbox_threads
			WHERE user_id = $3 AND kind = $2 AND external_id IS NOT NULL
		) AND external_id IS NOT NULL
		LIMIT 1
	`, senderID, model.ThreadKindFriend, recipientID).Scan(
		&existing.ID, &existing.UserID, &existing.Kind, &existing.Subject, &existing.Avatar,
		&existing.Preview, &existing.UnreadCount, &existing.LastMessageAt, &extID,
		&existing.Interactive, &existing.CreatedAt,
	)
	if err == nil {
		existing.ExternalID = extID
		return &existing, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("check existing direct thread: %w", err)
	}

	conversationID := uuid.New()
	now := make([]interface{}, 0)
	_ = now

	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin direct thread tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	senderThreadID := uuid.New()
	if _, err := tx.Exec(ctx, `
		INSERT INTO inbox_threads (id, user_id, kind, subject, avatar, preview, unread_count,
		                           last_message_at, external_id, interactive, created_at)
		VALUES ($1, $2, $3, $4, '', '', 0, NOW(), $5, TRUE, NOW())
	`, senderThreadID, senderID, model.ThreadKindFriend, subject, conversationID); err != nil {
		return nil, fmt.Errorf("insert sender thread: %w", err)
	}

	recipientSubject := "📬 " + senderName
	if _, err := tx.Exec(ctx, `
		INSERT INTO inbox_threads (id, user_id, kind, subject, avatar, preview, unread_count,
		                           last_message_at, external_id, interactive, created_at)
		VALUES ($1, $2, $3, $4, '', '', 0, NOW(), $5, TRUE, NOW())
	`, uuid.New(), recipientID, model.ThreadKindFriend, recipientSubject, conversationID); err != nil {
		return nil, fmt.Errorf("insert recipient thread: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit direct thread tx: %w", err)
	}

	thread := &model.InboxThread{
		ID:          senderThreadID,
		UserID:      senderID,
		Kind:        model.ThreadKindFriend,
		Subject:     subject,
		Interactive: true,
		ExternalID:  &conversationID,
	}
	return thread, nil
}

