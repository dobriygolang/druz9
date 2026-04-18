package season_pass

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/model"
	"api/internal/storage/postgres"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(store *postgres.Store, logger log.Logger) *Repo {
	return &Repo{data: store, log: log.NewHelper(logger)}
}

func (r *Repo) GetActive(ctx context.Context, at time.Time) (*model.SeasonPass, error) {
	var p model.SeasonPass
	err := r.data.DB.QueryRow(ctx, `
        SELECT id, season_number, title, subtitle, starts_at, ends_at,
               max_tier, xp_per_tier, premium_price_gems
        FROM season_passes
        WHERE starts_at <= $1 AND ends_at > $1
        ORDER BY starts_at DESC
        LIMIT 1
    `, at).Scan(
		&p.ID, &p.SeasonNumber, &p.Title, &p.Subtitle,
		&p.StartsAt, &p.EndsAt, &p.MaxTier, &p.XPPerTier, &p.PremiumPriceGems,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get active pass: %w", err)
	}
	return &p, nil
}

func (r *Repo) ListTiers(ctx context.Context, seasonPassID uuid.UUID) ([]*model.SeasonPassTier, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT tier, free_reward_kind, free_reward_amount, free_reward_label,
               premium_reward_kind, premium_reward_amount, premium_reward_label
        FROM season_pass_tiers
        WHERE season_pass_id = $1
        ORDER BY tier ASC
    `, seasonPassID)
	if err != nil {
		return nil, fmt.Errorf("list tiers: %w", err)
	}
	defer rows.Close()

	tiers := make([]*model.SeasonPassTier, 0, 40)
	for rows.Next() {
		var t model.SeasonPassTier
		var freeKind, premKind int16
		if err := rows.Scan(
			&t.Tier, &freeKind, &t.FreeRewardAmount, &t.FreeRewardLabel,
			&premKind, &t.PremiumRewardAmount, &t.PremiumRewardLabel,
		); err != nil {
			return nil, fmt.Errorf("scan tier: %w", err)
		}
		t.FreeRewardKind = model.RewardKind(freeKind)
		t.PremiumRewardKind = model.RewardKind(premKind)
		tiers = append(tiers, &t)
	}
	return tiers, rows.Err()
}

func (r *Repo) GetTier(ctx context.Context, seasonPassID uuid.UUID, tier int32) (*model.SeasonPassTier, error) {
	var t model.SeasonPassTier
	var freeKind, premKind int16
	err := r.data.DB.QueryRow(ctx, `
        SELECT tier, free_reward_kind, free_reward_amount, free_reward_label,
               premium_reward_kind, premium_reward_amount, premium_reward_label
        FROM season_pass_tiers
        WHERE season_pass_id = $1 AND tier = $2
    `, seasonPassID, tier).Scan(
		&t.Tier, &freeKind, &t.FreeRewardAmount, &t.FreeRewardLabel,
		&premKind, &t.PremiumRewardAmount, &t.PremiumRewardLabel,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get tier: %w", err)
	}
	t.FreeRewardKind = model.RewardKind(freeKind)
	t.PremiumRewardKind = model.RewardKind(premKind)
	return &t, nil
}

func (r *Repo) GetOrCreateProgress(ctx context.Context, userID, seasonPassID uuid.UUID) (*model.SeasonPassProgress, error) {
	// UPSERT with DO NOTHING, then SELECT — keeps the write simple even if
	// two concurrent requests race on first access.
	if _, err := r.data.DB.Exec(ctx, `
        INSERT INTO user_season_pass_progress (user_id, season_pass_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, season_pass_id) DO NOTHING
    `, userID, seasonPassID); err != nil {
		return nil, fmt.Errorf("upsert progress: %w", err)
	}

	var p model.SeasonPassProgress
	err := r.data.DB.QueryRow(ctx, `
        SELECT xp, has_premium, claimed_free, claimed_premium
        FROM user_season_pass_progress
        WHERE user_id = $1 AND season_pass_id = $2
    `, userID, seasonPassID).Scan(&p.XP, &p.HasPremium, &p.ClaimedFree, &p.ClaimedPremium)
	if err != nil {
		return nil, fmt.Errorf("load progress: %w", err)
	}
	if p.ClaimedFree == nil {
		p.ClaimedFree = []int32{}
	}
	if p.ClaimedPremium == nil {
		p.ClaimedPremium = []int32{}
	}
	return &p, nil
}

func (r *Repo) MarkClaimed(ctx context.Context, userID, seasonPassID uuid.UUID, tier int32, track model.RewardTrack) error {
	col := "claimed_free"
	if track == model.RewardTrackPremium {
		col = "claimed_premium"
	}
	// array_append is safe; we check idempotency at the domain layer before
	// calling this.
	query := `
        UPDATE user_season_pass_progress
        SET ` + col + ` = array_append(` + col + `, $3),
            updated_at  = NOW()
        WHERE user_id = $1 AND season_pass_id = $2
    `
	_, err := r.data.DB.Exec(ctx, query, userID, seasonPassID, tier)
	if err != nil {
		return fmt.Errorf("mark claimed: %w", err)
	}
	return nil
}

func (r *Repo) SetPremium(ctx context.Context, userID, seasonPassID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
        UPDATE user_season_pass_progress
        SET has_premium = TRUE, updated_at = NOW()
        WHERE user_id = $1 AND season_pass_id = $2
    `, userID, seasonPassID)
	if err != nil {
		return fmt.Errorf("set premium: %w", err)
	}
	return nil
}

func (r *Repo) AddXP(ctx context.Context, userID, seasonPassID uuid.UUID, delta int32) error {
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO user_season_pass_progress (user_id, season_pass_id, xp)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, season_pass_id) DO UPDATE
        SET xp = user_season_pass_progress.xp + EXCLUDED.xp,
            updated_at = NOW()
    `, userID, seasonPassID, delta)
	if err != nil {
		return fmt.Errorf("add xp: %w", err)
	}
	return nil
}
