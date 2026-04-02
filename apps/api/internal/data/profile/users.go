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

const userSelectColumns = `
  u.id,
  NULLIF(u.username, ''),
  NULLIF(u.first_name, ''),
  NULLIF(u.last_name, ''),
  COALESCE(
    NULLIF(u.avatar_url, ''),
    (
      SELECT NULLIF(ui.avatar_url, '')
      FROM user_identities ui
      WHERE ui.user_id = u.id
      ORDER BY CASE WHEN ui.is_primary THEN 0 ELSE 1 END, ui.created_at
      LIMIT 1
    ),
    ''
  ),
  NULLIF(u.current_workplace, ''),
  g.region,
  g.country,
  g.city,
  g.latitude,
  g.longitude,
  u.status,
  u.is_admin,
  %s,
  COALESCE((
    SELECT array_agg(ui.provider ORDER BY ui.provider)
    FROM user_identities ui
    WHERE ui.user_id = u.id
  ), ARRAY[]::text[]),
  COALESCE((
    SELECT ui.provider
    FROM user_identities ui
    WHERE ui.user_id = u.id
    ORDER BY CASE WHEN ui.is_primary THEN 0 ELSE 1 END, ui.created_at
    LIMIT 1
  ), ''),
  u.last_active_at,
  u.created_at,
  u.updated_at
`

func (r *Repo) upsertUserIdentityTx(ctx context.Context, tx pgx.Tx, payload model.IdentityAuthPayload) (*model.User, error) {
	query := fmt.Sprintf(`
WITH existing_identity AS (
  SELECT user_id
  FROM user_identities
  WHERE provider = $1 AND provider_user_id = $2
),
created_user AS (
  INSERT INTO users (
    id,
    username,
    first_name,
    last_name,
    avatar_url,
    current_workplace,
    status,
    last_active_at,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    COALESCE(NULLIF($3, ''), ''),
    COALESCE(NULLIF($4, ''), ''),
    COALESCE(NULLIF($5, ''), ''),
    COALESCE(NULLIF($6, ''), ''),
    '',
    $7,
    NOW(),
    NOW(),
    NOW()
  WHERE NOT EXISTS (SELECT 1 FROM existing_identity)
  RETURNING id
),
target_user AS (
  SELECT user_id AS id FROM existing_identity
  UNION ALL
  SELECT id FROM created_user
),
upserted_identity AS (
  INSERT INTO user_identities (
    id,
    user_id,
    provider,
    provider_user_id,
    username,
    email,
    avatar_url,
    is_primary,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    tu.id,
    $1,
    $2,
    COALESCE(NULLIF($3, ''), ''),
    COALESCE(NULLIF($8, ''), ''),
    COALESCE(NULLIF($6, ''), ''),
    TRUE,
    NOW(),
    NOW()
  FROM target_user tu
  ON CONFLICT (provider, provider_user_id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW()
  RETURNING user_id
),
updated_user AS (
  UPDATE users u
  SET
    username = COALESCE(NULLIF(u.username, ''), NULLIF($3, ''), ''),
    first_name = COALESCE(NULLIF($4, ''), u.first_name),
    last_name = COALESCE(NULLIF($5, ''), u.last_name),
    avatar_url = COALESCE(NULLIF(u.avatar_url, ''), NULLIF($6, ''), ''),
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE u.id = (SELECT user_id FROM upserted_identity LIMIT 1)
  RETURNING u.id
)
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.id = (SELECT id FROM updated_user LIMIT 1)
`, r.trustedSelect("u.is_trusted"))

	return scanUser(tx.QueryRow(
		ctx,
		query,
		string(payload.Provider),
		payload.ProviderUserID,
		payload.Username,
		payload.FirstName,
		payload.LastName,
		payload.AvatarURL,
		model.UserStatusPendingProfile,
		payload.Email,
	))
}

func (r *Repo) UpsertUserByIdentity(ctx context.Context, payload model.IdentityAuthPayload) (*model.User, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	user, err := r.upsertUserIdentityTx(ctx, tx, payload)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return user, nil
}

func (r *Repo) FindUserByProviderIdentity(ctx context.Context, provider model.AuthProvider, providerUserID string) (*model.User, error) {
	query := fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM user_identities ui
JOIN users u ON u.id = ui.user_id
LEFT JOIN geo g ON g.user_id = u.id
WHERE ui.provider = $1 AND ui.provider_user_id = $2
`, r.trustedSelect("u.is_trusted"))

	return scanUser(r.data.DB.QueryRow(ctx, query, string(provider), providerUserID))
}

func (r *Repo) FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	query := fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.id = $1
`, r.trustedSelect("u.is_trusted"))
	return scanUser(r.data.DB.QueryRow(ctx, query, id))
}

func (r *Repo) UpdateProfile(ctx context.Context, userID uuid.UUID, currentWorkplace string) (*model.User, error) {
	query := fmt.Sprintf(`
WITH updated_user AS (
  UPDATE users
  SET current_workplace = $2,
      updated_at = NOW()
  WHERE id = $1
  RETURNING id
)
SELECT `+userSelectColumns+`
FROM users u
JOIN updated_user uu ON uu.id = u.id
LEFT JOIN geo g ON g.user_id = u.id
`, r.trustedSelect("u.is_trusted"))
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

	query := fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.id = $1
`, r.trustedSelect("u.is_trusted"))
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
	query := fmt.Sprintf(`
WITH updated_user AS (
  UPDATE users
  SET avatar_url = $2,
      updated_at = NOW()
  WHERE id = $1
  RETURNING id
)
SELECT `+userSelectColumns+`
FROM users u
JOIN updated_user uu ON uu.id = u.id
LEFT JOIN geo g ON g.user_id = u.id
`, r.trustedSelect("u.is_trusted"))
	return scanUser(r.data.DB.QueryRow(ctx, query, userID, nullIfEmpty(avatarURL)))
}

func (r *Repo) BindIdentity(ctx context.Context, userID uuid.UUID, payload model.IdentityAuthPayload) (*model.User, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var existingUserID uuid.UUID
	err = tx.QueryRow(ctx, `
SELECT user_id
FROM user_identities
WHERE provider = $1 AND provider_user_id = $2
`, string(payload.Provider), payload.ProviderUserID).Scan(&existingUserID)
	if err == nil && existingUserID != userID {
		return nil, profileerrors.ErrTelegramAlreadyBound
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("find bound identity: %w", err)
	}

	_, err = tx.Exec(ctx, `
INSERT INTO user_identities (
  id,
  user_id,
  provider,
  provider_user_id,
  username,
  email,
  avatar_url,
  is_primary,
  created_at,
  updated_at
)
VALUES (gen_random_uuid(), $1, $2, $3, COALESCE(NULLIF($4, ''), ''), COALESCE(NULLIF($5, ''), ''), COALESCE(NULLIF($6, ''), ''), FALSE, NOW(), NOW())
ON CONFLICT (provider, provider_user_id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW()
`, userID, string(payload.Provider), payload.ProviderUserID, payload.Username, payload.Email, payload.AvatarURL)
	if err != nil {
		return nil, fmt.Errorf("upsert user identity: %w", err)
	}

	_, err = tx.Exec(ctx, `
UPDATE users
SET username = COALESCE(NULLIF(username, ''), NULLIF($2, ''), ''),
    first_name = COALESCE(NULLIF($3, ''), first_name),
    last_name = COALESCE(NULLIF($4, ''), last_name),
    avatar_url = COALESCE(NULLIF(avatar_url, ''), NULLIF($5, ''), ''),
    updated_at = NOW()
WHERE id = $1
`, userID, payload.Username, payload.FirstName, payload.LastName, payload.AvatarURL)
	if err != nil {
		return nil, fmt.Errorf("update user after identity bind: %w", err)
	}

	query := fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.id = $1
`, r.trustedSelect("u.is_trusted"))
	user, err := scanUser(tx.QueryRow(ctx, query, userID))
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return user, nil
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
	if r == nil || !r.hasTrustedFlag {
		return nil
	}

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

func (r *Repo) UpdateUserAdmin(ctx context.Context, userID uuid.UUID, isAdmin bool) error {
	tag, err := r.data.DB.Exec(ctx, `
		UPDATE users
		SET is_admin = $2,
		    updated_at = NOW()
		WHERE id = $1
	`, userID, isAdmin)
	if err != nil {
		return fmt.Errorf("update user admin: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUserNotFound
	}
	return nil
}
