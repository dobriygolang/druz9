package profile

import (
	"context"
	"fmt"
	"strconv"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const userSelectColumns = `
  u.id,
  COALESCE(NULLIF(u.username, ''), ''),
  NULLIF(u.telegram_username, ''),
  NULLIF(u.first_name, ''),
  NULLIF(u.last_name, ''),
  COALESCE(NULLIF(u.yandex_avatar_url, ''), NULLIF(u.telegram_avatar_url, ''), ''),
  NULLIF(u.current_workplace, ''),
  g.region,
  g.country,
  g.city,
  g.latitude,
  g.longitude,
  u.status,
  u.is_admin,
  %s,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN u.telegram_id IS NOT NULL THEN 'telegram' END,
    CASE WHEN NULLIF(u.yandex_id, '') IS NOT NULL THEN 'yandex' END
  ], NULL),
  NULLIF(u.primary_provider, ''),
  u.last_active_at,
  u.created_at,
  u.updated_at
`

func (r *Repo) userByIDQuery() string {
	return fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.id = $1
`, r.trustedSelect("u.is_trusted"))
}

func (r *Repo) selectUserByIDTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID) (*model.User, error) {
	return scanUser(tx.QueryRow(ctx, r.userByIDQuery(), userID))
}

func parseTelegramProviderID(value string) (int64, error) {
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse telegram provider id: %w", err)
	}
	return parsed, nil
}

func (r *Repo) FindUserByProviderIdentity(ctx context.Context, provider model.AuthProvider, providerUserID string) (*model.User, error) {
	switch provider {
	case model.AuthProviderTelegram:
		telegramID, err := parseTelegramProviderID(providerUserID)
		if err != nil {
			return nil, err
		}
		query := fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.telegram_id = $1
`, r.trustedSelect("u.is_trusted"))
		return scanUser(r.data.DB.QueryRow(ctx, query, telegramID))
	case model.AuthProviderYandex:
		query := fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE u.yandex_id = $1
`, r.trustedSelect("u.is_trusted"))
		return scanUser(r.data.DB.QueryRow(ctx, query, providerUserID))
	default:
		return nil, profileerrors.ErrInvalidPayload
	}
}

func (r *Repo) FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return scanUser(r.data.DB.QueryRow(ctx, r.userByIDQuery(), id))
}
