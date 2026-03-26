package profile

import (
	"context"
	"errors"
	"fmt"
	"time"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(dataLayer *postgres.Store, logger log.Logger) *Repo {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}

func (r *Repo) UpsertTelegramUser(ctx context.Context, payload model.TelegramAuthPayload) (*model.User, error) {
	const query = `
WITH upserted_user AS (
  INSERT INTO users (
    id,
    telegram_id,
    telegram_username,
    first_name,
    last_name,
    avatar_url,
    current_workplace,
    status,
    last_active_at,
    created_at,
    updated_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, '', $7, NOW(), NOW(), NOW())
  ON CONFLICT (telegram_id) DO UPDATE SET
    telegram_username = EXCLUDED.telegram_username,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    avatar_url = EXCLUDED.avatar_url,
    last_active_at = NOW(),
    updated_at = NOW()
  RETURNING
    id,
    telegram_id,
    telegram_username,
    first_name,
    last_name,
    avatar_url,
    current_workplace,
    status,
    is_admin,
    last_active_at,
    created_at,
    updated_at
)
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.last_active_at, u.created_at, u.updated_at
FROM upserted_user u
LEFT JOIN geo g ON g.user_id = u.id
`
	return scanUser(r.data.DB.QueryRow(
		ctx,
		query,
		uuid.New(),
		payload.ID,
		nullIfEmpty(payload.Username),
		nullIfEmpty(payload.FirstName),
		nullIfEmpty(payload.LastName),
		nullIfEmpty(payload.PhotoURL),
		model.UserStatusPendingProfile,
	))
}

func (r *Repo) FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	const query = `
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.last_active_at, u.created_at, u.updated_at
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE id = $1
`
	return scanUser(r.data.DB.QueryRow(ctx, query, id))
}

func (r *Repo) UpdateProfile(ctx context.Context, userID uuid.UUID, currentWorkplace string) (*model.User, error) {
	const query = `
WITH updated_user AS (
  UPDATE users
  SET current_workplace = $2,
      updated_at = NOW()
  WHERE id = $1
  RETURNING id, telegram_id, telegram_username, first_name, last_name, avatar_url, current_workplace, status, is_admin, last_active_at, created_at, updated_at
)
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.last_active_at, u.created_at, u.updated_at
FROM updated_user u
LEFT JOIN geo g ON g.user_id = u.id
`
	return scanUser(r.data.DB.QueryRow(ctx, query, userID, currentWorkplace))
}

func (r *Repo) CompleteRegistration(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.User, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(
		ctx,
		`
UPDATE users
SET status = $2,
    updated_at = NOW()
WHERE id = $1
`,
		userID,
		model.UserStatusActive,
	); err != nil {
		return nil, fmt.Errorf("update user registration: %w", err)
	}

	if _, err := tx.Exec(
		ctx,
		`
INSERT INTO geo (user_id, region, country, city, latitude, longitude)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id) DO UPDATE SET
  region = EXCLUDED.region,
  country = EXCLUDED.country,
  city = EXCLUDED.city,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude
`,
		userID,
		req.Region,
		nullIfEmpty(req.Country),
		nullIfEmpty(req.City),
		req.Latitude,
		req.Longitude,
	); err != nil {
		return nil, fmt.Errorf("upsert user geo: %w", err)
	}

	const query = `
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.last_active_at, u.created_at, u.updated_at
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.id = $1
`
	user, err := scanUser(tx.QueryRow(ctx, query, userID))
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return user, nil
}

func (r *Repo) UpdateLocation(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.User, error) {
	return r.CompleteRegistration(ctx, userID, req)
}

func (r *Repo) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	tag, err := r.data.DB.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUserNotFound
	}
	return nil
}

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
	const query = `
SELECT
  s.id, s.user_id, s.token_hash, s.last_seen_at, s.expires_at,
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.last_active_at, u.created_at, u.updated_at
FROM sessions s
JOIN users u ON u.id = s.user_id
LEFT JOIN geo g ON g.user_id = u.id
WHERE s.token_hash = $1
`

	var session model.Session
	var user model.User
	var username, firstName, lastName, avatarURL, currentWorkplace, region, country, city *string
	var latitude, longitude *float64

	err := r.data.DB.QueryRow(ctx, query, tokenHash).Scan(
		&session.ID, &session.UserID, &session.TokenHash, &session.LastSeenAt, &session.ExpiresAt,
		&user.ID, &user.TelegramID, &username, &firstName, &lastName, &avatarURL, &currentWorkplace, &region, &country, &city, &latitude, &longitude, &user.Status, &user.IsAdmin, &user.LastActiveAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, profileerrors.ErrUnauthorized
		}
		return nil, fmt.Errorf("find session by hash: %w", err)
	}

	user.TelegramUsername = valueOrEmpty(username)
	user.FirstName = valueOrEmpty(firstName)
	user.LastName = valueOrEmpty(lastName)
	user.AvatarURL = valueOrEmpty(avatarURL)
	user.CurrentWorkplace = valueOrEmpty(currentWorkplace)
	user.Region = valueOrEmpty(region)
	user.Geo = scanGeo(region, country, city, latitude, longitude)
	user.ActivityStatus = model.ResolveActivityStatus(user.LastActiveAt, time.Now().UTC())

	return &model.AuthState{User: &user, Session: &session}, nil
}

func (r *Repo) TouchSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID, expiresAt time.Time, lastActive time.Time) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	tag, err := tx.Exec(ctx, `
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
	if _, err := tx.Exec(ctx, `
UPDATE users
SET last_active_at = GREATEST(last_active_at, $2)
WHERE id = $1
`, userID, lastActive); err != nil {
		return fmt.Errorf("touch user activity: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit touch session: %w", err)
	}
	return nil
}

type userScanner interface {
	Scan(dest ...any) error
}

func scanUser(scanner userScanner) (*model.User, error) {
	var user model.User
	var username, firstName, lastName, avatarURL, currentWorkplace, region, country, city *string
	var latitude, longitude *float64

	if err := scanner.Scan(
		&user.ID, &user.TelegramID, &username, &firstName, &lastName, &avatarURL, &currentWorkplace, &region, &country, &city, &latitude, &longitude, &user.Status, &user.IsAdmin, &user.LastActiveAt, &user.CreatedAt, &user.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, profileerrors.ErrUserNotFound
		}
		return nil, fmt.Errorf("scan user: %w", err)
	}

	user.TelegramUsername = valueOrEmpty(username)
	user.FirstName = valueOrEmpty(firstName)
	user.LastName = valueOrEmpty(lastName)
	user.AvatarURL = valueOrEmpty(avatarURL)
	user.CurrentWorkplace = valueOrEmpty(currentWorkplace)
	user.Region = valueOrEmpty(region)
	user.Geo = scanGeo(region, country, city, latitude, longitude)
	user.ActivityStatus = model.ResolveActivityStatus(user.LastActiveAt, time.Now().UTC())
	return &user, nil
}

func scanGeo(region, country, city *string, latitude, longitude *float64) model.UserGeo {
	geo := model.UserGeo{
		Region:  valueOrEmpty(region),
		Country: valueOrEmpty(country),
		City:    valueOrEmpty(city),
	}
	if latitude != nil {
		geo.Latitude = *latitude
	}
	if longitude != nil {
		geo.Longitude = *longitude
	}
	return geo
}

func nullIfEmpty(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
