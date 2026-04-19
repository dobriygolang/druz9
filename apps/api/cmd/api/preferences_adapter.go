package main

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	profileservice "api/internal/api/profile"
	profiledata "api/internal/data/profile"
)

// profilePreferencesAdapter bridges data/profile.Repo to the API-side
// PreferencesRepository contract (ADR-005). The data type and the API
// type intentionally don't share a struct so the data package stays free
// of API-shaped baggage.
type profilePreferencesAdapter struct {
	repo *profiledata.Repo
}

func (a profilePreferencesAdapter) GetOrInitPreferences(ctx context.Context, userID uuid.UUID) (*profileservice.PreferencesRow, error) {
	p, err := a.repo.GetOrInitPreferences(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get or init preferences: %w", err)
	}
	if p == nil {
		return nil, nil
	}
	return &profileservice.PreferencesRow{UserID: p.UserID, LayoutDensity: p.LayoutDensity, Locale: p.Locale}, nil
}

func (a profilePreferencesAdapter) UpsertPreferences(ctx context.Context, userID uuid.UUID, density, locale string) (*profileservice.PreferencesRow, error) {
	p, err := a.repo.UpsertPreferences(ctx, userID, density, locale)
	if err != nil {
		return nil, fmt.Errorf("upsert preferences: %w", err)
	}
	if p == nil {
		return nil, nil
	}
	return &profileservice.PreferencesRow{UserID: p.UserID, LayoutDensity: p.LayoutDensity, Locale: p.Locale}, nil
}

// Compile-time interface checks.
var _ profileservice.PreferencesRepository = profilePreferencesAdapter{}
var _ profileservice.ToursRepo = (*profiledata.Repo)(nil)
