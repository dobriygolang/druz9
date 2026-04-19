package profile

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
)

func (r *Repo) CreateSession(ctx context.Context, session *model.Session) error {
	const query = `
INSERT INTO sessions (id, user_id, token_hash, last_seen_at, expires_at)
VALUES ($1, $2, $3, $4, $5)
`
	_, err := r.data.DB.Exec(ctx, query, session.ID, session.UserID, session.TokenHash, session.LastSeenAt, session.ExpiresAt)
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

func (r *Repo) ReplaceSession(ctx context.Context, oldTokenHash string, next *model.Session) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	tag, err := tx.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, oldTokenHash)
	if err != nil {
		return fmt.Errorf("delete old session: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUnauthorized
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO sessions (id, user_id, token_hash, last_seen_at, expires_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		next.ID, next.UserID, next.TokenHash, next.LastSeenAt, next.ExpiresAt,
	); err != nil {
		return fmt.Errorf("insert new session: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

func (r *Repo) DeleteSessionByHash(ctx context.Context, tokenHash string) error {
	_, err := r.data.DB.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

func (r *Repo) FindSessionByHash(ctx context.Context, tokenHash string) (*model.AuthState, error) {
	query := fmt.Sprintf(`
SELECT
  s.id, s.user_id, s.token_hash, s.last_seen_at, s.expires_at,
  `+userSelectColumns+`
FROM sessions s
JOIN users u ON u.id = s.user_id
LEFT JOIN geo g ON g.user_id = u.id
WHERE s.token_hash = $1
`, "u.is_trusted")

	var session model.Session
	var user model.User
	var username, telegramUsername, firstName, lastName, avatarURL, currentWorkplace, region, country, city, primaryProvider *string
	var latitude, longitude *float64
	var connectedProviders []string

	err := r.data.DB.QueryRow(ctx, query, tokenHash).Scan(
		&session.ID, &session.UserID, &session.TokenHash, &session.LastSeenAt, &session.ExpiresAt,
		&user.ID, &user.TelegramID, &username, &telegramUsername, &firstName, &lastName, &user.YandexAvatarURL, &avatarURL, &currentWorkplace, &region, &country, &city, &latitude, &longitude, &user.Status, &user.IsAdmin, &user.IsTrusted, &connectedProviders, &primaryProvider, &user.LastActiveAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, profileerrors.ErrUnauthorized
		}
		return nil, fmt.Errorf("find session by hash: %w", err)
	}

	fillUserFields(&user, username, telegramUsername, firstName, lastName, avatarURL, currentWorkplace, region, country, city, latitude, longitude)
	user.ConnectedProviders = connectedProviders
	user.PrimaryProvider = valueOrEmpty(primaryProvider)
	user.ActivityStatus = model.ResolveActivityStatus(user.LastActiveAt, time.Now().UTC())

	return &model.AuthState{User: &user, Session: &session}, nil
}

func (r *Repo) TouchSession(ctx context.Context, userID, sessionID uuid.UUID, expiresAt, lastActive time.Time) error {
	tag, err := r.data.DB.Exec(ctx, `
UPDATE sessions
SET last_seen_at = GREATEST(last_seen_at, $2),
    expires_at = GREATEST(expires_at, $3)
WHERE id = $1
`, sessionID, lastActive, expiresAt)
	if err != nil {
		return fmt.Errorf("touch session: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUnauthorized
	}
	return nil
}

func (r *Repo) CountActiveUsers(ctx context.Context, activeSince time.Time) (int, error) {
	var count int
	err := r.data.DB.QueryRow(ctx, `
		SELECT COUNT(DISTINCT user_id)
		FROM sessions
		WHERE expires_at > NOW()
		  AND last_seen_at >= $1
	`, activeSince).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count active users: %w", err)
	}
	return count, nil
}

// ListActiveUserIDs enumerates users with a non-expired session that has
// been touched since `activeSince`. Used by background workers (insights
// refresh, etc.) so we don't burn LLM cycles on inactive accounts.
// `limit` caps the batch — pass 0 for "no limit" but prefer a chunked
// loop over an unbounded scan in production.
func (r *Repo) ListActiveUserIDs(ctx context.Context, activeSince time.Time, limit int) ([]uuid.UUID, error) {
	q := `
		SELECT DISTINCT user_id
		FROM sessions
		WHERE expires_at > NOW()
		  AND last_seen_at >= $1
		ORDER BY user_id
	`
	args := []any{activeSince}
	if limit > 0 {
		q += " LIMIT $2"
		args = append(args, limit)
	}
	rows, err := r.data.DB.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list active user ids: %w", err)
	}
	defer rows.Close()
	out := make([]uuid.UUID, 0, 64)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan active user id: %w", err)
		}
		out = append(out, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate active user ids: %w", err)
	}
	return out, nil
}
