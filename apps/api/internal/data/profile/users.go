package profile

import (
	"context"
	"fmt"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

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

	user, err := r.selectUserByIDTx(ctx, tx, userID)
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
