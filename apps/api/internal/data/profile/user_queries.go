package profile

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
)

const userSelectColumns = `
  u.id,
  COALESCE(u.telegram_id, 0),
  COALESCE(NULLIF(u.username, ''), ''),
  NULLIF(u.telegram_username, ''),
  NULLIF(u.first_name, ''),
  NULLIF(u.last_name, ''),
  COALESCE(NULLIF(u.yandex_avatar_url, ''), ''),
  COALESCE(NULLIF(u.yandex_avatar_url, ''), CASE WHEN u.telegram_id IS NOT NULL THEN '/api/v1/profile/avatar/' || u.id::text END, ''),
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

func buildUserSelectQuery(whereClause string) string {
	return fmt.Sprintf(`
SELECT `+userSelectColumns+`
FROM users u
LEFT JOIN geo g ON g.user_id = u.id
WHERE `+whereClause+`
`, "u.is_trusted")
}

func (r *Repo) selectUserByIDTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID) (*model.User, error) {
	return scanUser(tx.QueryRow(ctx, buildUserSelectQuery("u.id = $1"), userID))
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
		return scanUser(r.data.DB.QueryRow(ctx, buildUserSelectQuery("u.telegram_id = $1"), telegramID))
	case model.AuthProviderYandex:
		return scanUser(r.data.DB.QueryRow(ctx, buildUserSelectQuery("u.yandex_id = $1"), providerUserID))
	default:
		return nil, profileerrors.ErrInvalidPayload
	}
}

func (r *Repo) FindUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	return scanUser(r.data.DB.QueryRow(ctx, buildUserSelectQuery("u.id = $1"), id))
}

// FindUserByUsername looks up a user by their case-insensitive username.
// Returns nil, nil when no user matches so callers can translate to their
// own domain's "not found" error cleanly.
func (r *Repo) FindUserByUsername(ctx context.Context, username string) (*model.User, error) {
	user, err := scanUser(r.data.DB.QueryRow(ctx, buildUserSelectQuery("LOWER(u.username) = LOWER($1)"), username))
	if err != nil {
		// scanUser wraps pgx.ErrNoRows as profileerrors.ErrUserNotFound.
		if errors.Is(err, profileerrors.ErrUserNotFound) {
			return nil, nil //nolint:nilnil
		}
		return nil, err
	}
	return user, nil
}
