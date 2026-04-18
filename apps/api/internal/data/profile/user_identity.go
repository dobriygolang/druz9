package profile

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
)

func (r *Repo) upsertTelegramUserTx(ctx context.Context, tx pgx.Tx, payload model.IdentityAuthPayload) (*model.User, error) {
	telegramID, err := parseTelegramProviderID(payload.ProviderUserID)
	if err != nil {
		return nil, err
	}

	query := "\nINSERT INTO users (\n  id,\n  username,\n  first_name,\n  last_name,\n  telegram_id,\n  telegram_username,\n  telegram_avatar_url,\n  primary_provider,\n  current_workplace,\n  status,\n  last_active_at,\n  created_at,\n  updated_at\n)\nVALUES (\n  gen_random_uuid(),\n  COALESCE(NULLIF($2, ''),\n  COALESCE(NULLIF($3, ''),\n  COALESCE(NULLIF($4, ''),\n  $1,\n  COALESCE(NULLIF($2, ''),\n  COALESCE(NULLIF($5, ''),\n  'telegram',\n  '',\n  $6,\n  NOW(),\n  NOW()\n)\nON CONFLICT (telegram_id)\nWHERE telegram_id IS NOT NULL\nDO UPDATE\nSET\n  username = COALESCE(NULLIF(users.username, ''), NULLIF(EXCLUDED.username, ''),\n  first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),\n  last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),\n  telegram_username = COALESCE(NULLIF(EXCLUDED.telegram_username, ''), users.telegram_username, ''),\n  telegram_avatar_url = COALESCE(NULLIF(EXCLUDED.telegram_avatar_url, ''), users.telegram_avatar_url, ''),\n  primary_provider = COALESCE(NULLIF(users.primary_provider, ''), 'telegram'),\n  last_active_at = NOW(),\n  updated_at = NOW()\nRETURNING"

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
	query := "\nINSERT INTO users (\n  id,\n  username,\n  first_name,\n  last_name,\n  yandex_id,\n  yandex_avatar_url,\n  primary_provider,\n  current_workplace,\n  status,\n  last_active_at,\n  created_at,\n  updated_at\n)\nVALUES (\n  gen_random_uuid(),\n  COALESCE(NULLIF($2, ''),\n  COALESCE(NULLIF($3, ''),\n  COALESCE(NULLIF($4, ''),\n  $1,\n  COALESCE(NULLIF($5, ''),\n  'yandex',\n  '',\n  $6,\n  NOW(),\n  NOW()\n)\nON CONFLICT (yandex_id)\nWHERE yandex_id IS NOT NULL AND yandex_id <> ''\nDO UPDATE\nSET\n  username = COALESCE(NULLIF(users.username, ''), NULLIF(EXCLUDED.username, ''),\n  first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),\n  last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),\n  yandex_avatar_url = COALESCE(NULLIF(EXCLUDED.yandex_avatar_url, ''), users.yandex_avatar_url, ''),\n  primary_provider = COALESCE(NULLIF(users.primary_provider, ''), 'yandex'),\n  last_active_at = NOW(),\n  updated_at = NOW()\nRETURNING"

	var userID uuid.UUID
	if err := tx.QueryRow(
		ctx,
		query,
		payload.ProviderUserID,
		payload.Username,
		payload.FirstName,
		payload.LastName,
		payload.AvatarURL,
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
    yandex_avatar_url = COALESCE(NULLIF($5, ''), yandex_avatar_url, ''),
    updated_at = NOW()
WHERE id = $1
`, userID, payload.Username, payload.FirstName, payload.LastName, payload.AvatarURL, payload.ProviderUserID)
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
