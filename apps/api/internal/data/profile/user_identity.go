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

func (r *Repo) upsertTelegramUserTx(ctx context.Context, tx pgx.Tx, payload model.IdentityAuthPayload) (*model.User, error) {
	telegramID, err := parseTelegramProviderID(payload.ProviderUserID)
	if err != nil {
		return nil, err
	}

	query := `
INSERT INTO users (
  id,
  username,
  first_name,
  last_name,
  telegram_id,
  telegram_username,
  telegram_avatar_url,
  primary_provider,
  current_workplace,
  status,
  last_active_at,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  COALESCE(NULLIF($2, ''), ''),
  COALESCE(NULLIF($3, ''), ''),
  COALESCE(NULLIF($4, ''), ''),
  $1,
  COALESCE(NULLIF($2, ''), ''),
  COALESCE(NULLIF($5, ''), ''),
  'telegram',
  '',
  $6,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (telegram_id)
WHERE telegram_id IS NOT NULL
DO UPDATE
SET
  username = COALESCE(NULLIF(users.username, ''), NULLIF(EXCLUDED.username, ''), ''),
  first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
  telegram_username = COALESCE(NULLIF(EXCLUDED.telegram_username, ''), users.telegram_username, ''),
  telegram_avatar_url = COALESCE(NULLIF(EXCLUDED.telegram_avatar_url, ''), users.telegram_avatar_url, ''),
  primary_provider = COALESCE(NULLIF(users.primary_provider, ''), 'telegram'),
  last_active_at = NOW(),
  updated_at = NOW()
RETURNING id
`

	var userID uuid.UUID
	if err := tx.QueryRow(
		ctx,
		query,
		telegramID,
		payload.Username,
		payload.FirstName,
		payload.LastName,
		payload.AvatarURL,
		model.UserStatusPendingProfile,
	).Scan(&userID); err != nil {
		return nil, fmt.Errorf("upsert telegram user: %w", err)
	}

	return r.selectUserByIDTx(ctx, tx, userID)
}

func (r *Repo) upsertYandexUserTx(ctx context.Context, tx pgx.Tx, payload model.IdentityAuthPayload) (*model.User, error) {
	query := `
INSERT INTO users (
  id,
  username,
  first_name,
  last_name,
  yandex_id,
  yandex_login,
  yandex_email,
  yandex_avatar_url,
  primary_provider,
  current_workplace,
  status,
  last_active_at,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  COALESCE(NULLIF($2, ''), ''),
  COALESCE(NULLIF($3, ''), ''),
  COALESCE(NULLIF($4, ''), ''),
  $1,
  COALESCE(NULLIF($2, ''), ''),
  COALESCE(NULLIF($6, ''), ''),
  COALESCE(NULLIF($5, ''), ''),
  'yandex',
  '',
  $7,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (yandex_id)
WHERE yandex_id IS NOT NULL AND yandex_id <> ''
DO UPDATE
SET
  username = COALESCE(NULLIF(users.username, ''), NULLIF(EXCLUDED.username, ''), ''),
  first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
  last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
  yandex_login = COALESCE(NULLIF(EXCLUDED.yandex_login, ''), users.yandex_login, ''),
  yandex_email = COALESCE(NULLIF(EXCLUDED.yandex_email, ''), users.yandex_email, ''),
  yandex_avatar_url = COALESCE(NULLIF(EXCLUDED.yandex_avatar_url, ''), users.yandex_avatar_url, ''),
  primary_provider = COALESCE(NULLIF(users.primary_provider, ''), 'yandex'),
  last_active_at = NOW(),
  updated_at = NOW()
RETURNING id
`

	var userID uuid.UUID
	if err := tx.QueryRow(
		ctx,
		query,
		payload.ProviderUserID,
		payload.Username,
		payload.FirstName,
		payload.LastName,
		payload.AvatarURL,
		payload.Email,
		model.UserStatusPendingProfile,
	).Scan(&userID); err != nil {
		return nil, fmt.Errorf("upsert yandex user: %w", err)
	}

	return r.selectUserByIDTx(ctx, tx, userID)
}

func (r *Repo) UpsertUserByIdentity(ctx context.Context, payload model.IdentityAuthPayload) (*model.User, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var user *model.User
	switch payload.Provider {
	case model.AuthProviderTelegram:
		user, err = r.upsertTelegramUserTx(ctx, tx, payload)
	case model.AuthProviderYandex:
		user, err = r.upsertYandexUserTx(ctx, tx, payload)
	default:
		return nil, profileerrors.ErrInvalidPayload
	}
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return user, nil
}

func (r *Repo) bindTelegramToUserTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, payload model.IdentityAuthPayload) error {
	telegramID, err := parseTelegramProviderID(payload.ProviderUserID)
	if err != nil {
		return err
	}

	tag, err := tx.Exec(ctx, `
UPDATE users
SET username = COALESCE(NULLIF(username, ''), NULLIF($2, ''), ''),
    first_name = COALESCE(NULLIF($3, ''), first_name),
    last_name = COALESCE(NULLIF($4, ''), last_name),
    telegram_id = $6,
    telegram_username = COALESCE(NULLIF($2, ''), telegram_username, ''),
    telegram_avatar_url = COALESCE(NULLIF($5, ''), telegram_avatar_url, ''),
    updated_at = NOW()
WHERE id = $1
`, userID, payload.Username, payload.FirstName, payload.LastName, payload.AvatarURL, telegramID)
	if err != nil {
		return fmt.Errorf("bind telegram user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUserNotFound
	}
	return nil
}

func (r *Repo) bindYandexToUserTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, payload model.IdentityAuthPayload) error {
	tag, err := tx.Exec(ctx, `
UPDATE users
SET username = COALESCE(NULLIF(username, ''), NULLIF($2, ''), ''),
    first_name = COALESCE(NULLIF($3, ''), first_name),
    last_name = COALESCE(NULLIF($4, ''), last_name),
    yandex_id = $6,
    yandex_login = COALESCE(NULLIF($2, ''), yandex_login, ''),
    yandex_email = COALESCE(NULLIF($7, ''), yandex_email, ''),
    yandex_avatar_url = COALESCE(NULLIF($5, ''), yandex_avatar_url, ''),
    updated_at = NOW()
WHERE id = $1
`, userID, payload.Username, payload.FirstName, payload.LastName, payload.AvatarURL, payload.ProviderUserID, payload.Email)
	if err != nil {
		return fmt.Errorf("bind yandex user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return profileerrors.ErrUserNotFound
	}
	return nil
}

func (r *Repo) bindProviderToUserTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, payload model.IdentityAuthPayload) error {
	switch payload.Provider {
	case model.AuthProviderTelegram:
		return r.bindTelegramToUserTx(ctx, tx, userID, payload)
	case model.AuthProviderYandex:
		return r.bindYandexToUserTx(ctx, tx, userID, payload)
	default:
		return profileerrors.ErrInvalidPayload
	}
}

func (r *Repo) BindIdentity(ctx context.Context, userID uuid.UUID, payload model.IdentityAuthPayload) (*model.User, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := r.selectUserByIDTx(ctx, tx, userID); err != nil {
		return nil, err
	}

	existingUser, err := r.FindUserByProviderIdentity(ctx, payload.Provider, payload.ProviderUserID)
	if err != nil && !errors.Is(err, profileerrors.ErrUserNotFound) {
		return nil, err
	}

	if existingUser != nil && existingUser.ID != userID {
		if err := r.mergeUsersTx(ctx, tx, userID, existingUser.ID); err != nil {
			return nil, err
		}
	}

	if err := r.bindProviderToUserTx(ctx, tx, userID, payload); err != nil {
		return nil, err
	}

	user, err := r.selectUserByIDTx(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}
	return user, nil
}
