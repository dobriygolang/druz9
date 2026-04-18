// Package season_pass implements the season reward-ladder domain: active
// pass lookup, XP-to-tier computation, and claim bookkeeping.
package season_pass

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"api/internal/model"
)

//go:generate mockery --case underscore --name Repository --with-expecter --output mocks

// Repository is the persistence boundary.
type Repository interface {
	// GetActive returns the single season pass whose [starts_at, ends_at)
	// window encloses the given time, or nil if none is active.
	GetActive(ctx context.Context, at time.Time) (*model.SeasonPass, error)
	// ListTiers returns the tier ladder ordered by tier ASC.
	ListTiers(ctx context.Context, seasonPassID uuid.UUID) ([]*model.SeasonPassTier, error)
	// GetTier returns one tier or nil.
	GetTier(ctx context.Context, seasonPassID uuid.UUID, tier int32) (*model.SeasonPassTier, error)
	// GetOrCreateProgress returns the user's progress row (creating a zero
	// row on first access).
	GetOrCreateProgress(ctx context.Context, userID, seasonPassID uuid.UUID) (*model.SeasonPassProgress, error)
	// MarkClaimed atomically appends the tier to claimed_free or
	// claimed_premium depending on the track.
	MarkClaimed(ctx context.Context, userID, seasonPassID uuid.UUID, tier int32, track model.RewardTrack) error
	// SetPremium flips the has_premium flag.
	SetPremium(ctx context.Context, userID, seasonPassID uuid.UUID) error
	// AddXP increments a user's xp.
	AddXP(ctx context.Context, userID, seasonPassID uuid.UUID, delta int32) error

	// --- Admin CRUD ----------------------------------------------------------
	AdminListPasses(ctx context.Context) ([]*model.SeasonPass, error)
	AdminCreatePass(ctx context.Context, p *model.SeasonPass) (*model.SeasonPass, error)
	AdminUpdatePass(ctx context.Context, p *model.SeasonPass) (*model.SeasonPass, error)
	AdminDeletePass(ctx context.Context, id uuid.UUID) error
	AdminUpsertTier(ctx context.Context, seasonPassID uuid.UUID, t *model.SeasonPassTier) (*model.SeasonPassTier, error)
	AdminDeleteTier(ctx context.Context, seasonPassID uuid.UUID, tier int32) error
}

//go:generate mockery --case underscore --name Wallet --with-expecter --output mocks

// Wallet abstracts gem spending for premium purchase. Profile repo satisfies
// this. Kept as a narrow interface so tests stay cheap.
type Wallet interface {
	DebitGems(ctx context.Context, userID uuid.UUID, amount int32) error
}

// Clock is mockable "now" for tests.
type (
	Clock       interface{ Now() time.Time }
	systemClock struct{}
)

func (systemClock) Now() time.Time { return time.Now().UTC() }

// Config holds dependencies.
type Config struct {
	Repository Repository
	Wallet     Wallet
	Clock      Clock
}

// Service exposes season pass domain operations.
type Service struct {
	repo   Repository
	wallet Wallet
	clock  Clock
}

// NewService constructs a Service.
func NewService(c Config) *Service {
	clock := c.Clock
	if clock == nil {
		clock = systemClock{}
	}
	return &Service{repo: c.Repository, wallet: c.Wallet, clock: clock}
}

// Domain errors.
var (
	ErrNoActivePass     = errors.New("season_pass: no active pass")
	ErrTierNotFound     = errors.New("season_pass: tier not found")
	ErrTierNotReached   = errors.New("season_pass: tier not yet reached")
	ErrAlreadyClaimed   = errors.New("season_pass: tier already claimed")
	ErrPremiumRequired  = errors.New("season_pass: premium track requires pass purchase")
	ErrNoRewardOnTrack  = errors.New("season_pass: no reward defined for this tier/track")
	ErrAlreadyPurchased = errors.New("season_pass: premium already purchased")
	ErrInsufficientGems = errors.New("season_pass: insufficient gems")
	ErrInvalidTrack     = errors.New("season_pass: invalid track")
)

// GetActivePass returns just the currently-live pass (or nil) — a thin
// accessor for callers that only need "what season is it" without the
// user-specific ladder/progress join.
func (s *Service) GetActivePass(ctx context.Context, at time.Time) (*model.SeasonPass, error) {
	return s.repo.GetActive(ctx, at)
}

// GetActive returns the active pass + ladder + user's progress.
func (s *Service) GetActive(ctx context.Context, userID uuid.UUID) (*model.SeasonPassSnapshot, error) {
	pass, err := s.repo.GetActive(ctx, s.clock.Now())
	if err != nil {
		return nil, err
	}
	if pass == nil {
		return nil, ErrNoActivePass
	}

	tiers, err := s.repo.ListTiers(ctx, pass.ID)
	if err != nil {
		return nil, err
	}
	progress, err := s.repo.GetOrCreateProgress(ctx, userID, pass.ID)
	if err != nil {
		return nil, err
	}
	// Derive current_tier from xp (truthful, so clients don't compute).
	progress.CurrentTier = currentTierFor(progress.XP, pass.XPPerTier, pass.MaxTier)

	return &model.SeasonPassSnapshot{Pass: pass, Tiers: tiers, Progress: progress}, nil
}

// ClaimTierReward handles a single claim. Rules:
//   - user must have reached the tier (xp / xp_per_tier ≥ tier),
//   - the (tier, track) pair must not already be in the claimed arrays,
//   - premium track requires has_premium.
//
// Domain does not actually grant the reward to the wallet yet — in this
// iteration we just bookkeep. A follow-up can wire wallets + cosmetics.
func (s *Service) ClaimTierReward(
	ctx context.Context, userID uuid.UUID, tier int32, track model.RewardTrack,
) (*model.ClaimOutcome, error) {
	if track != model.RewardTrackFree && track != model.RewardTrackPremium {
		return nil, ErrInvalidTrack
	}

	pass, err := s.repo.GetActive(ctx, s.clock.Now())
	if err != nil {
		return nil, err
	}
	if pass == nil {
		return nil, ErrNoActivePass
	}

	tierDef, err := s.repo.GetTier(ctx, pass.ID, tier)
	if err != nil {
		return nil, err
	}
	if tierDef == nil {
		return nil, ErrTierNotFound
	}

	progress, err := s.repo.GetOrCreateProgress(ctx, userID, pass.ID)
	if err != nil {
		return nil, err
	}
	progress.CurrentTier = currentTierFor(progress.XP, pass.XPPerTier, pass.MaxTier)

	if progress.CurrentTier < tier {
		return nil, ErrTierNotReached
	}
	if track == model.RewardTrackPremium && !progress.HasPremium {
		return nil, ErrPremiumRequired
	}
	if containsInt32(claimedArrayFor(progress, track), tier) {
		return nil, ErrAlreadyClaimed
	}

	kind, amount, label := rewardFor(tierDef, track)
	if kind == model.RewardKindUnspecified {
		return nil, ErrNoRewardOnTrack
	}

	if err := s.repo.MarkClaimed(ctx, userID, pass.ID, tier, track); err != nil {
		return nil, err
	}
	// Refresh progress after write.
	progress, err = s.repo.GetOrCreateProgress(ctx, userID, pass.ID)
	if err != nil {
		return nil, err
	}
	progress.CurrentTier = currentTierFor(progress.XP, pass.XPPerTier, pass.MaxTier)

	return &model.ClaimOutcome{
		Progress: progress,
		Kind:     kind,
		Amount:   amount,
		Label:    label,
	}, nil
}

// PurchasePremium debits gems (when wallet is wired) and flips has_premium.
// Idempotent — calling twice returns ErrAlreadyPurchased on the second try.
func (s *Service) PurchasePremium(ctx context.Context, userID uuid.UUID) (*model.SeasonPassProgress, error) {
	pass, err := s.repo.GetActive(ctx, s.clock.Now())
	if err != nil {
		return nil, err
	}
	if pass == nil {
		return nil, ErrNoActivePass
	}

	progress, err := s.repo.GetOrCreateProgress(ctx, userID, pass.ID)
	if err != nil {
		return nil, err
	}
	if progress.HasPremium {
		return nil, ErrAlreadyPurchased
	}

	if s.wallet != nil && pass.PremiumPriceGems > 0 {
		if err := s.wallet.DebitGems(ctx, userID, pass.PremiumPriceGems); err != nil {
			return nil, err
		}
	}
	if err := s.repo.SetPremium(ctx, userID, pass.ID); err != nil {
		return nil, err
	}

	progress, err = s.repo.GetOrCreateProgress(ctx, userID, pass.ID)
	if err != nil {
		return nil, err
	}
	progress.CurrentTier = currentTierFor(progress.XP, pass.XPPerTier, pass.MaxTier)
	return progress, nil
}

// --- Admin methods --------------------------------------------------------

func (s *Service) AdminListPasses(ctx context.Context) ([]*model.SeasonPass, error) {
	return s.repo.AdminListPasses(ctx)
}

func (s *Service) AdminCreatePass(ctx context.Context, p *model.SeasonPass) (*model.SeasonPass, error) {
	return s.repo.AdminCreatePass(ctx, p)
}

func (s *Service) AdminUpdatePass(ctx context.Context, p *model.SeasonPass) (*model.SeasonPass, error) {
	return s.repo.AdminUpdatePass(ctx, p)
}

func (s *Service) AdminDeletePass(ctx context.Context, id uuid.UUID) error {
	return s.repo.AdminDeletePass(ctx, id)
}

func (s *Service) AdminUpsertTier(ctx context.Context, seasonPassID uuid.UUID, t *model.SeasonPassTier) (*model.SeasonPassTier, error) {
	return s.repo.AdminUpsertTier(ctx, seasonPassID, t)
}

func (s *Service) AdminDeleteTier(ctx context.Context, seasonPassID uuid.UUID, tier int32) error {
	return s.repo.AdminDeleteTier(ctx, seasonPassID, tier)
}

// AddXP is called by arena/interview/training when the user earns pass XP.
// Keeps logic centralised here so the various subsystems don't duplicate
// tier-uplift checks.
func (s *Service) AddXP(ctx context.Context, userID uuid.UUID, delta int32) error {
	if delta <= 0 {
		return nil
	}
	pass, err := s.repo.GetActive(ctx, s.clock.Now())
	if err != nil {
		return err
	}
	if pass == nil {
		return nil // no active pass → no-op, don't error out callers
	}
	return s.repo.AddXP(ctx, userID, pass.ID, delta)
}

// ---------- pure helpers ----------

// currentTierFor returns the highest tier reached given total xp. Tier 1
// unlocks at xpPerTier, tier 2 at 2*xpPerTier, etc. Capped at maxTier.
func currentTierFor(xp, xpPerTier, maxTier int32) int32 {
	if xpPerTier <= 0 {
		return 0
	}
	t := xp / xpPerTier
	if t > maxTier {
		t = maxTier
	}
	return t
}

func claimedArrayFor(p *model.SeasonPassProgress, track model.RewardTrack) []int32 {
	if track == model.RewardTrackPremium {
		return p.ClaimedPremium
	}
	return p.ClaimedFree
}

func rewardFor(t *model.SeasonPassTier, track model.RewardTrack) (model.RewardKind, int32, string) {
	if track == model.RewardTrackPremium {
		return t.PremiumRewardKind, t.PremiumRewardAmount, t.PremiumRewardLabel
	}
	return t.FreeRewardKind, t.FreeRewardAmount, t.FreeRewardLabel
}

func containsInt32(s []int32, v int32) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}
