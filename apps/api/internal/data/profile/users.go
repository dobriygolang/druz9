package profile

import (
	"context"
	"errors"
	"fmt"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) UpsertTelegramUser(ctx context.Context, payload model.TelegramAuthPayload) (*model.User, error) {
	const query = `
WITH upserted_user AS (
  INSERT INTO users (
    id,
    telegram_id,
    telegram_username,
    first_name,
    last_name,
    telegram_avatar_url,
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
    telegram_avatar_url = EXCLUDED.telegram_avatar_url,
    last_active_at = NOW(),
    updated_at = NOW()
  RETURNING
    id,
    telegram_id,
    telegram_username,
    first_name,
    last_name,
    avatar_url,
    telegram_avatar_url,
    current_workplace,
    status,
    is_admin,
    last_active_at,
    created_at,
    updated_at
)
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.telegram_avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.is_trusted, u.last_active_at, u.created_at, u.updated_at
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

func (r *Repo) CreatePasswordUser(ctx context.Context, req model.PasswordRegistrationRequest, passwordHash string) (*model.User, error) {
	const query = `
WITH created_user AS (
  INSERT INTO users (
    id,
    telegram_id,
    telegram_username,
    first_name,
    last_name,
    avatar_url,
    current_workplace,
    status,
    login,
    password_hash,
    last_active_at,
    created_at,
    updated_at
  )
  VALUES ($1, NULL, NULL, $2, $3, '', '', $4, $5, $6, NOW(), NOW(), NOW())
  RETURNING
    id,
    telegram_id,
    telegram_username,
    first_name,
    last_name,
    avatar_url,
    telegram_avatar_url,
    current_workplace,
    status,
    is_admin,
    last_active_at,
    created_at,
    updated_at
)
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.telegram_avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.is_trusted, u.last_active_at, u.created_at, u.updated_at
FROM created_user u
LEFT JOIN geo g ON g.user_id = u.id
`
	return scanUser(r.data.DB.QueryRow(
		ctx,
		query,
		uuid.New(),
		req.FirstName,
		nullIfEmpty(req.LastName),
		model.UserStatusPendingProfile,
		req.Login,
		passwordHash,
	))
}

func (r *Repo) FindPasswordUserByLogin(ctx context.Context, login string) (*model.User, string, error) {
	const query = `
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.telegram_avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.is_trusted, u.last_active_at, u.created_at, u.updated_at,
  COALESCE(u.password_hash, '')
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE LOWER(u.login) = LOWER($1)
`

	var (
		user              model.User
		passwordHash      string
		username          *string
		firstName         *string
		lastName          *string
		avatarURL         *string
		telegramAvatarURL *string
		currentWorkplace  *string
		region            *string
		country           *string
		city              *string
		latitude          *float64
		longitude         *float64
		telegramID        *int64
	)

	err := r.data.DB.QueryRow(ctx, query, login).Scan(
		&user.ID, &telegramID, &username, &firstName, &lastName, &avatarURL, &telegramAvatarURL, &currentWorkplace,
		&region, &country, &city, &latitude, &longitude,
		&user.Status, &user.IsAdmin, &user.IsTrusted, &user.LastActiveAt, &user.CreatedAt, &user.UpdatedAt,
		&passwordHash,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", profileerrors.ErrUnauthorized
		}
		return nil, "", fmt.Errorf("find user by login: %w", err)
	}

	fillUserFields(&user, telegramID, username, firstName, lastName, avatarURL, telegramAvatarURL, currentWorkplace, region, country, city, latitude, longitude)
	return &user, passwordHash, nil
}

func (r *Repo) FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	const query = `
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.telegram_avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.is_trusted, u.last_active_at, u.created_at, u.updated_at
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE id = $1
`
	return scanUser(r.data.DB.QueryRow(ctx, query, id))
}

func (r *Repo) FindUserByTelegramID(ctx context.Context, telegramID int64) (*model.User, error) {
	const query = `
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.telegram_avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.is_trusted, u.last_active_at, u.created_at, u.updated_at
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE telegram_id = $1
`
	return scanUser(r.data.DB.QueryRow(ctx, query, telegramID))
}

func (r *Repo) UpdateProfile(ctx context.Context, userID uuid.UUID, currentWorkplace string) (*model.User, error) {
	const query = `
WITH updated_user AS (
  UPDATE users
  SET current_workplace = $2,
      updated_at = NOW()
  WHERE id = $1
  RETURNING id, telegram_id, telegram_username, first_name, last_name, avatar_url, telegram_avatar_url, current_workplace, status, is_admin, is_trusted, last_active_at, created_at, updated_at
)
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.telegram_avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.is_trusted, u.last_active_at, u.created_at, u.updated_at
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
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.telegram_avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.is_trusted, u.last_active_at, u.created_at, u.updated_at
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

func (r *Repo) UpdateAvatarURL(ctx context.Context, userID uuid.UUID, avatarURL string) (*model.User, error) {
	const query = `
WITH updated_user AS (
  UPDATE users
  SET avatar_url = $2,
      updated_at = NOW()
  WHERE id = $1
  RETURNING id, telegram_id, telegram_username, first_name, last_name, avatar_url, telegram_avatar_url, current_workplace, status, is_admin, is_trusted, last_active_at, created_at, updated_at
)
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.telegram_avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.is_trusted, u.last_active_at, u.created_at, u.updated_at
FROM updated_user u
LEFT JOIN geo g ON g.user_id = u.id
`
	return scanUser(r.data.DB.QueryRow(ctx, query, userID, nullIfEmpty(avatarURL)))
}

func (r *Repo) BindTelegram(ctx context.Context, userID uuid.UUID, payload model.TelegramAuthPayload) (*model.User, error) {
	const query = `
WITH updated_user AS (
  UPDATE users
  SET telegram_id = $2,
      telegram_username = $3,
      avatar_url = COALESCE(NULLIF($4, ''), avatar_url),
      first_name = COALESCE(NULLIF($5, ''), first_name),
      last_name = COALESCE(NULLIF($6, ''), last_name),
      updated_at = NOW()
  WHERE id = $1 AND telegram_id IS NULL
  RETURNING id, telegram_id, telegram_username, first_name, last_name, avatar_url, telegram_avatar_url, current_workplace, status, is_admin, is_trusted, last_active_at, created_at, updated_at
)
SELECT
  u.id, u.telegram_id, u.telegram_username, u.first_name, u.last_name, u.avatar_url, u.telegram_avatar_url, u.current_workplace,
  g.region, g.country, g.city, g.latitude, g.longitude,
  u.status, u.is_admin, u.is_trusted, u.last_active_at, u.created_at, u.updated_at
FROM updated_user u
LEFT JOIN geo g ON g.user_id = u.id
`
	return scanUser(r.data.DB.QueryRow(ctx, query, userID, payload.ID, nullIfEmpty(payload.Username), nullIfEmpty(payload.PhotoURL), nullIfEmpty(payload.FirstName), nullIfEmpty(payload.LastName)))
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

func (r *Repo) UpdateUserTrusted(ctx context.Context, userID uuid.UUID, isTrusted bool) error {
	tag, err := r.data.DB.Exec(ctx, `
		UPDATE users
		SET is_trusted = $2,
		    updated_at = NOW()
		WHERE id = $1
	`, userID, isTrusted)
	if err != nil {
		return fmt.Errorf("update user trusted: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUserNotFound
	}
	return nil
}
