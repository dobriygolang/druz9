package profile

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var (
	errInvalidDensity = errors.New("preferences upsert: invalid density")
	errInvalidLocale  = errors.New("preferences upsert: invalid locale")
)

// Preferences mirrors the user_preferences row (ADR-005). The shape is
// duplicated in api/profile.PreferencesRow so the API package can declare
// its repository contract without importing data/.
type Preferences struct {
	UserID        uuid.UUID
	LayoutDensity string // "comfortable" | "compact"
	Locale        string // "ru" | "en"
}

// GetOrInitPreferences returns the user's preferences, creating a default
// row on first call. Defaults match the migration ('comfortable', 'ru').
func (r *Repo) GetOrInitPreferences(ctx context.Context, userID uuid.UUID) (*Preferences, error) {
	row := r.data.DB.QueryRow(ctx, `
        INSERT INTO user_preferences (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING user_id, layout_density, locale
    `, userID)
	p := &Preferences{}
	if err := row.Scan(&p.UserID, &p.LayoutDensity, &p.Locale); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &Preferences{UserID: userID, LayoutDensity: "comfortable", Locale: "ru"}, nil
		}
		return nil, fmt.Errorf("preferences get: %w", err)
	}
	return p, nil
}

// UpsertPreferences sets density+locale; pass empty strings to skip a field.
func (r *Repo) UpsertPreferences(ctx context.Context, userID uuid.UUID, density, locale string) (*Preferences, error) {
	if density == "" && locale == "" {
		return r.GetOrInitPreferences(ctx, userID)
	}
	if density != "" && density != "comfortable" && density != "compact" {
		return nil, fmt.Errorf("preferences upsert: invalid density %q: %w", density, errInvalidDensity)
	}
	if locale != "" && locale != "ru" && locale != "en" {
		return nil, fmt.Errorf("preferences upsert: invalid locale %q: %w", locale, errInvalidLocale)
	}

	// COALESCE keeps existing values when caller passes empty strings.
	row := r.data.DB.QueryRow(ctx, `
        INSERT INTO user_preferences (user_id, layout_density, locale)
        VALUES ($1, COALESCE(NULLIF($2, ''), 'comfortable'), COALESCE(NULLIF($3, ''), 'ru'))
        ON CONFLICT (user_id) DO UPDATE
            SET layout_density = COALESCE(NULLIF(EXCLUDED.layout_density, ''), user_preferences.layout_density),
                locale         = COALESCE(NULLIF(EXCLUDED.locale, ''),         user_preferences.locale),
                updated_at     = NOW()
        RETURNING user_id, layout_density, locale
    `, userID, density, locale)

	p := &Preferences{}
	if err := row.Scan(&p.UserID, &p.LayoutDensity, &p.Locale); err != nil {
		return nil, fmt.Errorf("preferences upsert: %w", err)
	}
	return p, nil
}
