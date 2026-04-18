package season_pass

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

type fakeRepo struct {
	pass      *model.SeasonPass
	tiers     map[int32]*model.SeasonPassTier
	progress  map[uuid.UUID]*model.SeasonPassProgress
	claimLog  []string
	setPremiumCalled bool
	xpDeltas  []int32
}

func newFakeRepo(pass *model.SeasonPass) *fakeRepo {
	return &fakeRepo{
		pass:     pass,
		tiers:    map[int32]*model.SeasonPassTier{},
		progress: map[uuid.UUID]*model.SeasonPassProgress{},
	}
}

func (f *fakeRepo) GetActive(context.Context, time.Time) (*model.SeasonPass, error) { return f.pass, nil }
func (f *fakeRepo) ListTiers(context.Context, uuid.UUID) ([]*model.SeasonPassTier, error) {
	out := make([]*model.SeasonPassTier, 0, len(f.tiers))
	for _, t := range f.tiers {
		out = append(out, t)
	}
	return out, nil
}
func (f *fakeRepo) GetTier(_ context.Context, _ uuid.UUID, tier int32) (*model.SeasonPassTier, error) {
	t, ok := f.tiers[tier]
	if !ok {
		return nil, nil
	}
	return t, nil
}
func (f *fakeRepo) GetOrCreateProgress(_ context.Context, userID, _ uuid.UUID) (*model.SeasonPassProgress, error) {
	if p, ok := f.progress[userID]; ok {
		// return a copy so caller mutations don't leak into storage
		cp := *p
		cp.ClaimedFree = append([]int32{}, p.ClaimedFree...)
		cp.ClaimedPremium = append([]int32{}, p.ClaimedPremium...)
		return &cp, nil
	}
	p := &model.SeasonPassProgress{ClaimedFree: []int32{}, ClaimedPremium: []int32{}}
	f.progress[userID] = p
	return p, nil
}
func (f *fakeRepo) MarkClaimed(_ context.Context, userID, _ uuid.UUID, tier int32, track model.RewardTrack) error {
	p := f.progress[userID]
	if track == model.RewardTrackPremium {
		p.ClaimedPremium = append(p.ClaimedPremium, tier)
	} else {
		p.ClaimedFree = append(p.ClaimedFree, tier)
	}
	f.claimLog = append(f.claimLog, "ok")
	return nil
}
func (f *fakeRepo) SetPremium(_ context.Context, userID, _ uuid.UUID) error {
	f.setPremiumCalled = true
	p := f.progress[userID]
	p.HasPremium = true
	return nil
}
func (f *fakeRepo) AddXP(_ context.Context, userID, _ uuid.UUID, delta int32) error {
	p, ok := f.progress[userID]
	if !ok {
		p = &model.SeasonPassProgress{ClaimedFree: []int32{}, ClaimedPremium: []int32{}}
		f.progress[userID] = p
	}
	p.XP += delta
	f.xpDeltas = append(f.xpDeltas, delta)
	return nil
}

type fakeWallet struct {
	debited     []int32
	failWithErr error
}

func (w *fakeWallet) DebitGems(_ context.Context, _ uuid.UUID, amount int32) error {
	if w.failWithErr != nil {
		return w.failWithErr
	}
	w.debited = append(w.debited, amount)
	return nil
}

type fixedClock struct{ t time.Time }

func (c fixedClock) Now() time.Time { return c.t }

func activePass() *model.SeasonPass {
	return &model.SeasonPass{
		ID: uuid.New(), SeasonNumber: 3, Title: "Ember Pact",
		StartsAt: time.Now().Add(-24 * time.Hour),
		EndsAt:   time.Now().Add(24 * time.Hour),
		MaxTier:  40, XPPerTier: 500, PremiumPriceGems: 400,
	}
}

// ---------- currentTierFor ----------

func TestCurrentTierFor(t *testing.T) {
	t.Parallel()
	cases := []struct {
		xp, per, max, want int32
	}{
		{0, 500, 40, 0},
		{499, 500, 40, 0},
		{500, 500, 40, 1},
		{1999, 500, 40, 3},
		{2000, 500, 40, 4},
		{50000, 500, 40, 40}, // capped
	}
	for _, c := range cases {
		got := currentTierFor(c.xp, c.per, c.max)
		if got != c.want {
			t.Errorf("currentTierFor(%d,%d,%d)=%d, want %d", c.xp, c.per, c.max, got, c.want)
		}
	}
}

// ---------- GetActive ----------

func TestGetActive_NoActive(t *testing.T) {
	t.Parallel()
	svc := NewService(Config{Repository: newFakeRepo(nil)})
	_, err := svc.GetActive(context.Background(), uuid.New())
	if !errors.Is(err, ErrNoActivePass) {
		t.Fatalf("expected ErrNoActivePass, got %v", err)
	}
}

func TestGetActive_PopulatesProgress(t *testing.T) {
	t.Parallel()
	pass := activePass()
	repo := newFakeRepo(pass)
	userID := uuid.New()
	repo.progress[userID] = &model.SeasonPassProgress{XP: 1400, ClaimedFree: []int32{}, ClaimedPremium: []int32{}}

	svc := NewService(Config{Repository: repo})
	snap, err := svc.GetActive(context.Background(), userID)
	if err != nil {
		t.Fatal(err)
	}
	if snap.Progress.CurrentTier != 2 { // 1400 / 500 = 2
		t.Fatalf("expected tier 2, got %d", snap.Progress.CurrentTier)
	}
}

// ---------- ClaimTierReward ----------

func TestClaim_TierNotReached(t *testing.T) {
	t.Parallel()
	pass := activePass()
	repo := newFakeRepo(pass)
	repo.tiers[5] = &model.SeasonPassTier{Tier: 5, FreeRewardKind: model.RewardKindGold, FreeRewardAmount: 100}
	userID := uuid.New()
	repo.progress[userID] = &model.SeasonPassProgress{XP: 0}

	svc := NewService(Config{Repository: repo})
	_, err := svc.ClaimTierReward(context.Background(), userID, 5, model.RewardTrackFree)
	if !errors.Is(err, ErrTierNotReached) {
		t.Fatalf("expected ErrTierNotReached, got %v", err)
	}
}

func TestClaim_AlreadyClaimed(t *testing.T) {
	t.Parallel()
	pass := activePass()
	repo := newFakeRepo(pass)
	repo.tiers[1] = &model.SeasonPassTier{Tier: 1, FreeRewardKind: model.RewardKindGold, FreeRewardAmount: 100}
	userID := uuid.New()
	repo.progress[userID] = &model.SeasonPassProgress{
		XP: 500, ClaimedFree: []int32{1}, ClaimedPremium: []int32{},
	}

	svc := NewService(Config{Repository: repo})
	_, err := svc.ClaimTierReward(context.Background(), userID, 1, model.RewardTrackFree)
	if !errors.Is(err, ErrAlreadyClaimed) {
		t.Fatalf("expected ErrAlreadyClaimed, got %v", err)
	}
}

func TestClaim_PremiumRequiresPurchase(t *testing.T) {
	t.Parallel()
	pass := activePass()
	repo := newFakeRepo(pass)
	repo.tiers[1] = &model.SeasonPassTier{
		Tier: 1,
		FreeRewardKind: model.RewardKindGold, FreeRewardAmount: 100,
		PremiumRewardKind: model.RewardKindGems, PremiumRewardAmount: 50,
	}
	userID := uuid.New()
	repo.progress[userID] = &model.SeasonPassProgress{XP: 500, HasPremium: false}

	svc := NewService(Config{Repository: repo})
	_, err := svc.ClaimTierReward(context.Background(), userID, 1, model.RewardTrackPremium)
	if !errors.Is(err, ErrPremiumRequired) {
		t.Fatalf("expected ErrPremiumRequired, got %v", err)
	}
}

func TestClaim_HappyPath(t *testing.T) {
	t.Parallel()
	pass := activePass()
	repo := newFakeRepo(pass)
	repo.tiers[3] = &model.SeasonPassTier{
		Tier: 3, FreeRewardKind: model.RewardKindFrame, FreeRewardAmount: 1,
		FreeRewardLabel: "Oakleaf Frame",
	}
	userID := uuid.New()
	repo.progress[userID] = &model.SeasonPassProgress{XP: 2000, ClaimedFree: []int32{}, ClaimedPremium: []int32{}}

	svc := NewService(Config{Repository: repo})
	out, err := svc.ClaimTierReward(context.Background(), userID, 3, model.RewardTrackFree)
	if err != nil {
		t.Fatal(err)
	}
	if out.Kind != model.RewardKindFrame {
		t.Fatalf("wrong kind: %d", out.Kind)
	}
	if out.Label != "Oakleaf Frame" {
		t.Fatalf("wrong label: %q", out.Label)
	}
	if len(repo.claimLog) != 1 {
		t.Fatal("MarkClaimed not called")
	}
}

// ---------- PurchasePremium ----------

func TestPurchasePremium_DebitsGems(t *testing.T) {
	t.Parallel()
	pass := activePass()
	repo := newFakeRepo(pass)
	wallet := &fakeWallet{}
	userID := uuid.New()
	repo.progress[userID] = &model.SeasonPassProgress{}

	svc := NewService(Config{Repository: repo, Wallet: wallet})
	if _, err := svc.PurchasePremium(context.Background(), userID); err != nil {
		t.Fatal(err)
	}
	if !repo.setPremiumCalled {
		t.Fatal("SetPremium not called")
	}
	if len(wallet.debited) != 1 || wallet.debited[0] != 400 {
		t.Fatalf("wallet debit wrong: %v", wallet.debited)
	}
}

func TestPurchasePremium_AlreadyPurchased(t *testing.T) {
	t.Parallel()
	pass := activePass()
	repo := newFakeRepo(pass)
	userID := uuid.New()
	repo.progress[userID] = &model.SeasonPassProgress{HasPremium: true}
	svc := NewService(Config{Repository: repo})
	_, err := svc.PurchasePremium(context.Background(), userID)
	if !errors.Is(err, ErrAlreadyPurchased) {
		t.Fatalf("expected ErrAlreadyPurchased, got %v", err)
	}
}

// ---------- AddXP ----------

func TestAddXP_NoOpWithoutActivePass(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo(nil)
	svc := NewService(Config{Repository: repo})
	if err := svc.AddXP(context.Background(), uuid.New(), 100); err != nil {
		t.Fatal(err)
	}
	if len(repo.xpDeltas) != 0 {
		t.Fatalf("should not have recorded xp: %v", repo.xpDeltas)
	}
}

func TestAddXP_IgnoresNonPositive(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo(activePass())
	svc := NewService(Config{Repository: repo})
	if err := svc.AddXP(context.Background(), uuid.New(), 0); err != nil {
		t.Fatal(err)
	}
	if len(repo.xpDeltas) != 0 {
		t.Fatal("zero delta should be no-op")
	}
}

func TestAddXP_HappyPath(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo(activePass())
	svc := NewService(Config{Repository: repo})
	if err := svc.AddXP(context.Background(), uuid.New(), 250); err != nil {
		t.Fatal(err)
	}
	if len(repo.xpDeltas) != 1 || repo.xpDeltas[0] != 250 {
		t.Fatalf("expected xp delta 250, got %v", repo.xpDeltas)
	}
	// seed clock far-future works
	_ = fixedClock{t: time.Now()}
}
