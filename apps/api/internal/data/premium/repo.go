package premium

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("premium: record not found")

type Row struct {
	ID          uuid.UUID
	UserID      uuid.UUID
	Source      string
	BoostyEmail string
	Active      bool
	StartsAt    time.Time
	ExpiresAt   time.Time
	SyncedAt    time.Time
}

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo {
	return &Repo{db: db}
}

// Get returns the premium row for a user. Returns ErrNotFound when absent.
func (r *Repo) Get(ctx context.Context, userID uuid.UUID) (*Row, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, user_id, source, COALESCE(boosty_email,''), active,
		       starts_at, expires_at, synced_at
		  FROM user_premium
		 WHERE user_id = $1`, userID)
	return scanRow(row)
}

// IsPremium returns true when the user has an active, non-expired premium row.
func (r *Repo) IsPremium(ctx context.Context, userID uuid.UUID) (bool, error) {
	var active bool
	err := r.db.QueryRow(ctx, `
		SELECT active FROM user_premium
		 WHERE user_id = $1
		   AND active = TRUE
		   AND expires_at > NOW()`, userID).Scan(&active)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return active, fmt.Errorf("check premium: %w", err)
}

// Upsert creates or updates the premium row for a user.
func (r *Repo) Upsert(ctx context.Context, row Row) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_premium (user_id, source, boosty_email, active, starts_at, expires_at, synced_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
		    source       = EXCLUDED.source,
		    boosty_email = EXCLUDED.boosty_email,
		    active       = EXCLUDED.active,
		    expires_at   = EXCLUDED.expires_at,
		    synced_at    = NOW()`,
		row.UserID, row.Source, row.BoostyEmail, row.Active, row.StartsAt, row.ExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("upsert premium: %w", err)
	}
	return nil
}

// Deactivate marks the user's premium row as inactive (subscription lapsed).
func (r *Repo) Deactivate(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE user_premium SET active = FALSE, synced_at = NOW()
		 WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("deactivate premium: %w", err)
	}
	return nil
}

// Delete removes the premium row entirely (user unlinks Boosty).
func (r *Repo) Delete(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM user_premium WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete premium: %w", err)
	}
	return nil
}

// ListExpiringSoon returns active rows expiring within the given duration.
// Used by the background worker to re-check subscriptions before they lapse.
func (r *Repo) ListExpiringSoon(ctx context.Context, within time.Duration) ([]*Row, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, source, COALESCE(boosty_email,''), active,
		       starts_at, expires_at, synced_at
		  FROM user_premium
		 WHERE active = TRUE
		   AND expires_at BETWEEN NOW() AND NOW() + $1::interval
		 ORDER BY expires_at ASC`,
		fmt.Sprintf("%.0f seconds", within.Seconds()),
	)
	if err != nil {
		return nil, fmt.Errorf("query expiring premium: %w", err)
	}
	defer rows.Close()

	var out []*Row
	for rows.Next() {
		row, err := scanRow(rows)
		if err != nil {
			return nil, fmt.Errorf("scan premium row: %w", err)
		}
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate premium rows: %w", err)
	}
	return out, nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanRow(s scanner) (*Row, error) {
	var row Row
	err := s.Scan(
		&row.ID, &row.UserID, &row.Source, &row.BoostyEmail,
		&row.Active, &row.StartsAt, &row.ExpiresAt, &row.SyncedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("premium: scan: %w", err)
	}
	return &row, nil
}
