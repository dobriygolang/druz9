package friend_challenge

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

type fakeRepo struct {
	stored map[uuid.UUID]*model.FriendChallenge
	insertErr error
	updateErr error
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{stored: make(map[uuid.UUID]*model.FriendChallenge)}
}

func (f *fakeRepo) Insert(_ context.Context, ch *model.FriendChallenge) error {
	if f.insertErr != nil {
		return f.insertErr
	}
	cp := *ch
	f.stored[ch.ID] = &cp
	return nil
}
func (f *fakeRepo) GetByID(_ context.Context, id uuid.UUID) (*model.FriendChallenge, error) {
	ch, ok := f.stored[id]
	if !ok {
		return nil, nil
	}
	cp := *ch
	return &cp, nil
}
func (f *fakeRepo) Update(_ context.Context, ch *model.FriendChallenge) error {
	if f.updateErr != nil {
		return f.updateErr
	}
	cp := *ch
	f.stored[ch.ID] = &cp
	return nil
}
func (f *fakeRepo) ListIncoming(context.Context, uuid.UUID, int32, int32) ([]*model.FriendChallenge, int32, error) {
	return nil, 0, nil
}
func (f *fakeRepo) ListSent(context.Context, uuid.UUID, int32, int32) ([]*model.FriendChallenge, int32, error) {
	return nil, 0, nil
}
func (f *fakeRepo) ListHistory(context.Context, uuid.UUID, int32, int32) ([]*model.FriendChallenge, int32, error) {
	return nil, 0, nil
}
func (f *fakeRepo) SweepExpired(context.Context, time.Time) (int, error) { return 0, nil }

type fakeUsers struct {
	byName map[string]struct {
		id   uuid.UUID
		name string
	}
	byID map[uuid.UUID]string
}

func newFakeUsers() *fakeUsers {
	return &fakeUsers{
		byName: make(map[string]struct {
			id   uuid.UUID
			name string
		}),
		byID: make(map[uuid.UUID]string),
	}
}

func (f *fakeUsers) add(name string) uuid.UUID {
	id := uuid.New()
	f.byName[name] = struct {
		id   uuid.UUID
		name string
	}{id: id, name: name}
	f.byID[id] = name
	return id
}

func (f *fakeUsers) FindUserIDByUsername(_ context.Context, u string) (uuid.UUID, string, error) {
	entry, ok := f.byName[u]
	if !ok {
		return uuid.Nil, "", ErrOpponentNotFound
	}
	return entry.id, entry.name, nil
}

func (f *fakeUsers) FindUsernameByID(_ context.Context, id uuid.UUID) (string, error) {
	return f.byID[id], nil
}

type frozenClock struct {
	t time.Time
}

func (c *frozenClock) Now() time.Time { return c.t }

// ---------- SendChallenge ----------

func TestSendChallenge_HappyPath(t *testing.T) {
	t.Parallel()
	users := newFakeUsers()
	challengerID := users.add("thornmoss")
	users.add("lunarfox")

	repo := newFakeRepo()
	clock := &frozenClock{t: time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)}
	svc := NewService(Config{Repository: repo, Users: users, Clock: clock})

	ch, err := svc.SendChallenge(
		context.Background(), challengerID,
		"lunarfox", "Reverse an array", "arrays", "training:graph-dfs", "bring it on",
		model.ChallengeDifficultyMedium,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ch.Status != model.ChallengeStatusPending {
		t.Fatalf("expected PENDING, got %d", ch.Status)
	}
	if ch.ChallengerID != challengerID {
		t.Fatal("wrong challenger id")
	}
	if ch.OpponentUsername != "lunarfox" {
		t.Fatalf("wrong opponent name: %q", ch.OpponentUsername)
	}
	if !ch.DeadlineAt.Equal(clock.t.Add(DefaultDeadline)) {
		t.Fatalf("deadline %v, want %v", ch.DeadlineAt, clock.t.Add(DefaultDeadline))
	}
	if _, ok := repo.stored[ch.ID]; !ok {
		t.Fatal("challenge not persisted")
	}
}

func TestSendChallenge_RejectsSelf(t *testing.T) {
	t.Parallel()
	users := newFakeUsers()
	id := users.add("thornmoss")
	svc := NewService(Config{Repository: newFakeRepo(), Users: users, Clock: &frozenClock{}})

	_, err := svc.SendChallenge(context.Background(), id, "thornmoss", "task", "topic", "", "", 1)
	if !errors.Is(err, ErrCannotChallengeSelf) {
		t.Fatalf("expected ErrCannotChallengeSelf, got %v", err)
	}
}

func TestSendChallenge_RejectsMissingTitle(t *testing.T) {
	t.Parallel()
	users := newFakeUsers()
	challengerID := users.add("a")
	users.add("b")
	svc := NewService(Config{Repository: newFakeRepo(), Users: users, Clock: &frozenClock{}})
	_, err := svc.SendChallenge(context.Background(), challengerID, "b", "   ", "topic", "", "", 1)
	if !errors.Is(err, ErrTaskTitleMissing) {
		t.Fatalf("expected ErrTaskTitleMissing, got %v", err)
	}
}

func TestSendChallenge_RejectsLongNote(t *testing.T) {
	t.Parallel()
	users := newFakeUsers()
	cid := users.add("a")
	users.add("b")
	long := make([]byte, MaxNoteLen+1)
	for i := range long {
		long[i] = 'x'
	}
	svc := NewService(Config{Repository: newFakeRepo(), Users: users, Clock: &frozenClock{}})
	_, err := svc.SendChallenge(context.Background(), cid, "b", "title", "topic", "", string(long), 1)
	if !errors.Is(err, ErrNoteTooLong) {
		t.Fatalf("expected ErrNoteTooLong, got %v", err)
	}
}

// ---------- SubmitSolution ----------

func seedChallenge(repo *fakeRepo, challenger, opponent uuid.UUID, clock *frozenClock) uuid.UUID {
	id := uuid.New()
	repo.stored[id] = &model.FriendChallenge{
		ID:             id,
		ChallengerID:   challenger,
		OpponentID:     opponent,
		TaskTitle:      "task",
		Status:         model.ChallengeStatusPending,
		DeadlineAt:     clock.t.Add(DefaultDeadline),
		CreatedAt:      clock.t,
		TaskDifficulty: model.ChallengeDifficultyMedium,
	}
	return id
}

func TestSubmitSolution_FirstMoverTransitionsToInProgress(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo()
	clock := &frozenClock{t: time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)}
	users := newFakeUsers()
	cID := users.add("a")
	oID := users.add("b")
	id := seedChallenge(repo, cID, oID, clock)

	svc := NewService(Config{Repository: repo, Users: users, Clock: clock})
	ch, err := svc.SubmitSolution(context.Background(), cID, id, 60_000, 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ch.Status != model.ChallengeStatusInProgress {
		t.Fatalf("expected IN_PROGRESS, got %d", ch.Status)
	}
	if ch.ChallengerSubmittedAt == nil {
		t.Fatal("challenger submit ts not set")
	}
	if ch.WinnerID != nil {
		t.Fatal("winner must be nil before opponent submits")
	}
}

func TestSubmitSolution_BothSubmittedPicksHigherScore(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo()
	clock := &frozenClock{t: time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)}
	users := newFakeUsers()
	cID := users.add("challenger")
	oID := users.add("opponent")
	id := seedChallenge(repo, cID, oID, clock)

	svc := NewService(Config{Repository: repo, Users: users, Clock: clock})

	// Challenger submits first with score 3.
	if _, err := svc.SubmitSolution(context.Background(), cID, id, 90_000, 3); err != nil {
		t.Fatal(err)
	}
	// Opponent submits with score 5 → they should win.
	ch, err := svc.SubmitSolution(context.Background(), oID, id, 120_000, 5)
	if err != nil {
		t.Fatal(err)
	}
	if ch.Status != model.ChallengeStatusCompleted {
		t.Fatalf("expected COMPLETED, got %d", ch.Status)
	}
	if ch.WinnerID == nil || *ch.WinnerID != oID {
		t.Fatalf("expected opponent as winner, got %v", ch.WinnerID)
	}
}

func TestSubmitSolution_TieBreakByTime(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo()
	clock := &frozenClock{t: time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)}
	users := newFakeUsers()
	cID := users.add("a")
	oID := users.add("b")
	id := seedChallenge(repo, cID, oID, clock)

	svc := NewService(Config{Repository: repo, Users: users, Clock: clock})
	if _, err := svc.SubmitSolution(context.Background(), cID, id, 50_000, 5); err != nil {
		t.Fatal(err)
	}
	ch, err := svc.SubmitSolution(context.Background(), oID, id, 90_000, 5)
	if err != nil {
		t.Fatal(err)
	}
	if ch.WinnerID == nil || *ch.WinnerID != cID {
		t.Fatalf("expected faster challenger to win on tie, got %v", ch.WinnerID)
	}
}

func TestSubmitSolution_PerfectTieNoWinner(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo()
	clock := &frozenClock{t: time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)}
	users := newFakeUsers()
	cID := users.add("a")
	oID := users.add("b")
	id := seedChallenge(repo, cID, oID, clock)

	svc := NewService(Config{Repository: repo, Users: users, Clock: clock})
	_, _ = svc.SubmitSolution(context.Background(), cID, id, 60_000, 5)
	ch, err := svc.SubmitSolution(context.Background(), oID, id, 60_000, 5)
	if err != nil {
		t.Fatal(err)
	}
	if ch.Status != model.ChallengeStatusCompleted {
		t.Fatal("must still complete")
	}
	if ch.WinnerID != nil {
		t.Fatalf("perfect tie must leave winner nil, got %v", *ch.WinnerID)
	}
}

func TestSubmitSolution_DoubleSubmissionRejected(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo()
	clock := &frozenClock{t: time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)}
	users := newFakeUsers()
	cID := users.add("a")
	oID := users.add("b")
	id := seedChallenge(repo, cID, oID, clock)

	svc := NewService(Config{Repository: repo, Users: users, Clock: clock})
	_, _ = svc.SubmitSolution(context.Background(), cID, id, 60_000, 5)
	_, err := svc.SubmitSolution(context.Background(), cID, id, 10_000, 5)
	if !errors.Is(err, ErrAlreadySubmitted) {
		t.Fatalf("expected ErrAlreadySubmitted, got %v", err)
	}
}

func TestSubmitSolution_NonParticipantRejected(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo()
	clock := &frozenClock{t: time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)}
	users := newFakeUsers()
	cID := users.add("a")
	oID := users.add("b")
	id := seedChallenge(repo, cID, oID, clock)

	svc := NewService(Config{Repository: repo, Users: users, Clock: clock})
	_, err := svc.SubmitSolution(context.Background(), uuid.New(), id, 60_000, 5)
	if !errors.Is(err, ErrNotParticipant) {
		t.Fatalf("expected ErrNotParticipant, got %v", err)
	}
}

func TestSubmitSolution_PastDeadlineMarksExpired(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo()
	clock := &frozenClock{t: time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)}
	users := newFakeUsers()
	cID := users.add("a")
	oID := users.add("b")
	id := seedChallenge(repo, cID, oID, clock)

	svc := NewService(Config{Repository: repo, Users: users, Clock: clock})
	// fast-forward clock past deadline
	clock.t = clock.t.Add(DefaultDeadline + time.Second)

	_, err := svc.SubmitSolution(context.Background(), cID, id, 60_000, 5)
	if !errors.Is(err, ErrAlreadyExpired) {
		t.Fatalf("expected ErrAlreadyExpired, got %v", err)
	}
	stored := repo.stored[id]
	if stored.Status != model.ChallengeStatusExpired {
		t.Fatalf("stored status should be EXPIRED, got %d", stored.Status)
	}
}

func TestSubmitSolution_ValidatesScoreAndTime(t *testing.T) {
	t.Parallel()
	svc := NewService(Config{Repository: newFakeRepo(), Users: newFakeUsers(), Clock: &frozenClock{}})
	_, err := svc.SubmitSolution(context.Background(), uuid.New(), uuid.New(), -1, 3)
	if !errors.Is(err, ErrBadTime) {
		t.Fatalf("expected ErrBadTime, got %v", err)
	}
	_, err = svc.SubmitSolution(context.Background(), uuid.New(), uuid.New(), 1000, 99)
	if !errors.Is(err, ErrBadScore) {
		t.Fatalf("expected ErrBadScore, got %v", err)
	}
}

// ---------- Decline ----------

func TestDecline_OnlyOpponent(t *testing.T) {
	t.Parallel()
	repo := newFakeRepo()
	clock := &frozenClock{t: time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)}
	users := newFakeUsers()
	cID := users.add("a")
	oID := users.add("b")
	id := seedChallenge(repo, cID, oID, clock)

	svc := NewService(Config{Repository: repo, Users: users, Clock: clock})
	_, err := svc.Decline(context.Background(), cID, id)
	if !errors.Is(err, ErrOnlyOpponentCanDecline) {
		t.Fatalf("expected ErrOnlyOpponentCanDecline, got %v", err)
	}

	ch, err := svc.Decline(context.Background(), oID, id)
	if err != nil {
		t.Fatalf("opponent decline failed: %v", err)
	}
	if ch.Status != model.ChallengeStatusDeclined {
		t.Fatalf("expected DECLINED, got %d", ch.Status)
	}
	if ch.WinnerID == nil || *ch.WinnerID != cID {
		t.Fatal("challenger should win by forfeit")
	}
}
