package guild

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// WarRow is the persistent guild-war state. Fronts, contributions and
// territories live in sibling tables accessed via the helpers below.
type WarRow struct {
	ID             uuid.UUID
	WeekNumber     int32
	OurGuildID     uuid.UUID
	TheirGuildName string
	TheirGuildID   *uuid.UUID
	Status         string
	Phase          string // draft | active | champions_duel | resolved
	StartsAt       time.Time
	EndsAt         time.Time
	ResolvedWinner string
}

// WarPair holds the two sides of a matchup created by the weekly cron.
type WarPair struct {
	GuildAID   uuid.UUID
	GuildAName string
	GuildBID   *uuid.UUID // nil when no real opponent (odd guild out)
	GuildBName string
	WeekNumber int32
}

type FrontRow struct {
	ID          uuid.UUID
	WarID       uuid.UUID
	Name        string
	OurRounds   int32
	TheirRounds int32
	CapturedBy  string // "", "ours", "theirs"
	SortOrder   int32
}

type TerritoryRow struct {
	ID         uuid.UUID
	GuildID    uuid.UUID
	Name       string
	Buff       string
	CapturedAt time.Time
}

// GetActiveWarForGuild returns the in-progress war for this guild
// (status='active', phase in draft|active|champions_duel), or
// (nil, pgx.ErrNoRows) if there isn't one.
func (r *Repo) GetActiveWarForGuild(ctx context.Context, guildID uuid.UUID) (*WarRow, error) {
	var w WarRow
	err := r.data.DB.QueryRow(ctx, `
        SELECT id, week_number, our_guild_id, their_guild_name, their_guild_id,
               status, phase, starts_at, ends_at, resolved_winner
        FROM guild_wars
        WHERE our_guild_id = $1 AND status = 'active'
        LIMIT 1
    `, guildID).Scan(
		&w.ID, &w.WeekNumber, &w.OurGuildID, &w.TheirGuildName, &w.TheirGuildID,
		&w.Status, &w.Phase, &w.StartsAt, &w.EndsAt, &w.ResolvedWinner,
	)
	if err != nil {
		return nil, fmt.Errorf("get active war for guild: %w", err)
	}
	return &w, nil
}

// CreateWarWithFronts bootstraps a new active war for the given guild.
// Called lazily the first time the page is loaded so members always see
// something meaningful rather than an empty placeholder.
func (r *Repo) CreateWarWithFronts(
	ctx context.Context, guildID uuid.UUID, theirName string, frontNames []string, duration time.Duration,
) (*WarRow, []*FrontRow, error) {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	warID := uuid.New()
	starts := time.Now().UTC()
	ends := starts.Add(duration)
	if _, err := tx.Exec(ctx, `
        INSERT INTO guild_wars (id, our_guild_id, their_guild_name, status, phase, starts_at, ends_at)
        VALUES ($1, $2, $3, 'active', 'active', $4, $5)
    `, warID, guildID, theirName, starts, ends); err != nil {
		return nil, nil, fmt.Errorf("insert war: %w", err)
	}
	fronts := make([]*FrontRow, 0, len(frontNames))
	for idx, name := range frontNames {
		fr := &FrontRow{
			ID:        uuid.New(),
			WarID:     warID,
			Name:      name,
			SortOrder: int32(idx),
		}
		if _, err := tx.Exec(ctx, `
            INSERT INTO guild_war_fronts (id, war_id, name, sort_order)
            VALUES ($1, $2, $3, $4)
        `, fr.ID, fr.WarID, fr.Name, fr.SortOrder); err != nil {
			return nil, nil, fmt.Errorf("insert front: %w", err)
		}
		fronts = append(fronts, fr)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("commit war: %w", err)
	}
	return &WarRow{
		ID:             warID,
		OurGuildID:     guildID,
		TheirGuildName: theirName,
		Status:         "active",
		StartsAt:       starts,
		EndsAt:         ends,
	}, fronts, nil
}

func (r *Repo) ListFronts(ctx context.Context, warID uuid.UUID) ([]*FrontRow, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT id, war_id, name, our_rounds, their_rounds, captured_by, sort_order
        FROM guild_war_fronts WHERE war_id = $1 ORDER BY sort_order ASC
    `, warID)
	if err != nil {
		return nil, fmt.Errorf("list fronts: %w", err)
	}
	defer rows.Close()
	out := []*FrontRow{}
	for rows.Next() {
		f := &FrontRow{}
		if err := rows.Scan(&f.ID, &f.WarID, &f.Name, &f.OurRounds, &f.TheirRounds, &f.CapturedBy, &f.SortOrder); err != nil {
			return nil, fmt.Errorf("scan front: %w", err)
		}
		out = append(out, f)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list fronts rows: %w", err)
	}
	return out, nil
}

// Front threshold that flips captured_by to "ours" — chosen small (10)
// so one engaged user can tip a front in a single session; easy to
// raise via server config later.
const frontCaptureThreshold int32 = 10

// ErrFrontAlreadyCaptured is returned when a user tries to contribute to
// a front that's already been won by someone.
var ErrFrontAlreadyCaptured = errors.New("guild_war: front already captured")

// ErrDailyLimitExceeded is returned when a user tries to contribute more
// times than the daily limit allows.
var ErrDailyLimitExceeded = errors.New("guild_war: daily contribution limit reached")

// DailyContributionLimit is the max number of front contributions a single
// member can make per calendar day (UTC). Small enough to prevent spam,
// large enough to let engaged players matter.
const DailyContributionLimit int32 = 3

// CountUserTodayContributions returns how many times the user has
// contributed to any front in this war since midnight UTC today.
func (r *Repo) CountUserTodayContributions(ctx context.Context, userID, warID uuid.UUID) (int32, error) {
	var count int32
	err := r.data.DB.QueryRow(ctx, `
        SELECT COUNT(*)
        FROM guild_war_contributions
        WHERE user_id = $1 AND war_id = $2
          AND contributed_at >= CURRENT_DATE
    `, userID, warID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count today contributions: %w", err)
	}
	return count, nil
}

// ContributeRounds atomically adds rounds to a front's our_rounds, logs
// the contribution, and captures the front when it crosses the
// threshold. Returns the updated row and a flag indicating whether
// this call captured the front.
func (r *Repo) ContributeRounds(
	ctx context.Context, frontID, warID, userID, guildID uuid.UUID, rounds int32,
) (*FrontRow, bool, error) {
	if rounds <= 0 {
		rounds = 1
	}
	if rounds > 5 {
		rounds = 5
	}
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	var f FrontRow
	err = tx.QueryRow(ctx, `
        SELECT id, war_id, name, our_rounds, their_rounds, captured_by, sort_order
        FROM guild_war_fronts WHERE id = $1 FOR UPDATE
    `, frontID).Scan(&f.ID, &f.WarID, &f.Name, &f.OurRounds, &f.TheirRounds, &f.CapturedBy, &f.SortOrder)
	if err != nil {
		return nil, false, fmt.Errorf("scan front: %w", err)
	}
	if f.CapturedBy != "" {
		return &f, false, ErrFrontAlreadyCaptured
	}

	// Enforce daily contribution limit inside the same transaction so the
	// check and the insert are atomic (no TOCTOU race).
	var todayCount int32
	if err := tx.QueryRow(ctx, `
        SELECT COUNT(*) FROM guild_war_contributions
        WHERE user_id = $1 AND war_id = $2 AND contributed_at >= CURRENT_DATE
    `, userID, warID).Scan(&todayCount); err != nil {
		return nil, false, fmt.Errorf("count today contributions: %w", err)
	}
	if todayCount >= DailyContributionLimit {
		return &f, false, ErrDailyLimitExceeded
	}

	f.OurRounds += rounds
	captured := false
	if f.OurRounds >= frontCaptureThreshold {
		f.CapturedBy = "ours"
		captured = true
	}
	if _, err := tx.Exec(ctx, `
        UPDATE guild_war_fronts SET our_rounds = $1, captured_by = $2 WHERE id = $3
    `, f.OurRounds, f.CapturedBy, f.ID); err != nil {
		return nil, false, fmt.Errorf("update front: %w", err)
	}
	if _, err := tx.Exec(ctx, `
        INSERT INTO guild_war_contributions (id, war_id, front_id, user_id, guild_id, rounds)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, uuid.New(), warID, frontID, userID, guildID, rounds); err != nil {
		return nil, false, fmt.Errorf("insert contribution: %w", err)
	}
	if captured {
		if _, err := tx.Exec(ctx, `
            INSERT INTO guild_territories (id, guild_id, name, buff)
            VALUES ($1, $2, $3, '')
        `, uuid.New(), guildID, f.Name); err != nil {
			return nil, false, fmt.Errorf("insert territory: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, false, fmt.Errorf("commit contribution: %w", err)
	}
	return &f, captured, nil
}

func (r *Repo) ListTerritories(ctx context.Context, guildID uuid.UUID) ([]*TerritoryRow, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT id, guild_id, name, buff, captured_at
        FROM guild_territories WHERE guild_id = $1 ORDER BY captured_at DESC
    `, guildID)
	if err != nil {
		return nil, fmt.Errorf("list territories: %w", err)
	}
	defer rows.Close()
	out := []*TerritoryRow{}
	for rows.Next() {
		t := &TerritoryRow{}
		if err := rows.Scan(&t.ID, &t.GuildID, &t.Name, &t.Buff, &t.CapturedAt); err != nil {
			return nil, fmt.Errorf("scan territory: %w", err)
		}
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list territories rows: %w", err)
	}
	return out, nil
}

// noRows is a small helper: callers frequently want to know "is this
// pgx.ErrNoRows, i.e. no active war?" — this keeps them from needing to
// import pgx themselves.
func IsNoRows(err error) bool { return errors.Is(err, pgx.ErrNoRows) }

// ── War declaration ────────────────────────────────────────────────────────

type ChallengeRow struct {
	ID           uuid.UUID
	FromGuildID  uuid.UUID
	FromName     string
	ToGuildID    uuid.UUID
	Status       string // pending | accepted | declined | expired
	CreatedAt    time.Time
	ExpiresAt    time.Time
}

var ErrChallengeNotFound = errors.New("guild_war: challenge not found")
var ErrAlreadyAtWar      = errors.New("guild_war: guild already has an active war")

// SendChallenge inserts a new pending challenge from fromGuildID to toGuildID.
// Returns ErrAlreadyAtWar if either guild is already in an active war.
func (r *Repo) SendChallenge(ctx context.Context, fromGuildID uuid.UUID, fromName string, toGuildID uuid.UUID) (*ChallengeRow, error) {
	// Guard: neither side should already be in a war.
	for _, id := range []uuid.UUID{fromGuildID, toGuildID} {
		if _, err := r.GetActiveWarForGuild(ctx, id); err == nil {
			return nil, ErrAlreadyAtWar
		}
	}
	row := &ChallengeRow{
		ID:          uuid.New(),
		FromGuildID: fromGuildID,
		FromName:    fromName,
		ToGuildID:   toGuildID,
		Status:      "pending",
	}
	if _, err := r.data.DB.Exec(ctx, `
        INSERT INTO guild_war_challenges (id, from_guild_id, from_name, to_guild_id)
        VALUES ($1, $2, $3, $4)
    `, row.ID, row.FromGuildID, row.FromName, row.ToGuildID); err != nil {
		return nil, fmt.Errorf("insert challenge: %w", err)
	}
	return row, nil
}

// ListIncomingChallenges returns pending (non-expired) challenges directed at toGuildID.
func (r *Repo) ListIncomingChallenges(ctx context.Context, toGuildID uuid.UUID) ([]*ChallengeRow, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT id, from_guild_id, from_name, to_guild_id, status, created_at, expires_at
        FROM guild_war_challenges
        WHERE to_guild_id = $1 AND status = 'pending' AND expires_at > NOW()
        ORDER BY created_at DESC
    `, toGuildID)
	if err != nil {
		return nil, fmt.Errorf("list incoming challenges: %w", err)
	}
	defer rows.Close()
	var out []*ChallengeRow
	for rows.Next() {
		c := &ChallengeRow{}
		if err := rows.Scan(&c.ID, &c.FromGuildID, &c.FromName, &c.ToGuildID, &c.Status, &c.CreatedAt, &c.ExpiresAt); err != nil {
			return nil, fmt.Errorf("scan challenge: %w", err)
		}
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate challenges: %w", err)
	}
	return out, nil
}

// AcceptChallenge marks the challenge as accepted and creates an active war
// for both guilds. Returns ErrChallengeNotFound if the challenge doesn't
// belong to toGuildID or is no longer pending.
func (r *Repo) AcceptChallenge(ctx context.Context, challengeID, toGuildID uuid.UUID, frontNames []string) (*WarRow, error) {
	var c ChallengeRow
	err := r.data.DB.QueryRow(ctx, `
        SELECT id, from_guild_id, from_name, to_guild_id
        FROM guild_war_challenges
        WHERE id = $1 AND to_guild_id = $2 AND status = 'pending' AND expires_at > NOW()
    `, challengeID, toGuildID).Scan(&c.ID, &c.FromGuildID, &c.FromName, &c.ToGuildID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrChallengeNotFound
		}
		return nil, fmt.Errorf("get challenge: %w", err)
	}

	war, _, err := r.CreateWarWithFronts(ctx, c.ToGuildID, c.FromName, frontNames, 7*24*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("create war on accept: %w", err)
	}

	if _, err := r.data.DB.Exec(ctx, `
        UPDATE guild_war_challenges SET status = 'accepted' WHERE id = $1
    `, c.ID); err != nil {
		return nil, fmt.Errorf("mark challenge accepted: %w", err)
	}
	// Clean up any stale matchmaking entries for both guilds.
	_, _ = r.data.DB.Exec(ctx, `DELETE FROM guild_war_matchmaking WHERE guild_id IN ($1, $2)`, c.FromGuildID, c.ToGuildID)
	return war, nil
}

// DeclineChallenge marks a pending challenge as declined.
func (r *Repo) DeclineChallenge(ctx context.Context, challengeID, toGuildID uuid.UUID) error {
	tag, err := r.data.DB.Exec(ctx, `
        UPDATE guild_war_challenges SET status = 'declined'
        WHERE id = $1 AND to_guild_id = $2 AND status = 'pending'
    `, challengeID, toGuildID)
	if err != nil {
		return fmt.Errorf("decline challenge: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrChallengeNotFound
	}
	return nil
}

// ── Matchmaking ────────────────────────────────────────────────────────────

type MatchmakingStatus struct {
	InQueue  bool
	JoinedAt time.Time
}

// JoinMatchmaking adds the guild to the queue. If another guild is already
// waiting, a war is created immediately and both are removed from the queue.
// Returns (matched=true, war) on immediate match; (false, nil) when queued.
func (r *Repo) JoinMatchmaking(ctx context.Context, guildID uuid.UUID, guildName string, memberCount int32, frontNames []string) (bool, *WarRow, error) {
	// Check already in queue.
	var existing uuid.UUID
	_ = r.data.DB.QueryRow(ctx, `SELECT guild_id FROM guild_war_matchmaking WHERE guild_id = $1`, guildID).Scan(&existing)
	if existing == guildID {
		return false, nil, nil // already in queue, idempotent
	}

	// Look for another guild waiting (not us, ordered by join time).
	var opponentID uuid.UUID
	var opponentName string
	err := r.data.DB.QueryRow(ctx, `
        SELECT guild_id, guild_name FROM guild_war_matchmaking
        WHERE guild_id != $1
        ORDER BY joined_at ASC
        LIMIT 1
    `, guildID).Scan(&opponentID, &opponentName)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return false, nil, fmt.Errorf("matchmaking lookup: %w", err)
	}

	if opponentID != uuid.Nil {
		// Immediate match — create war for us (vs opponent name) and remove both.
		war, _, err := r.CreateWarWithFronts(ctx, guildID, opponentName, frontNames, 7*24*time.Hour)
		if err != nil {
			return false, nil, fmt.Errorf("create war on match: %w", err)
		}
		_, _ = r.data.DB.Exec(ctx, `DELETE FROM guild_war_matchmaking WHERE guild_id IN ($1, $2)`, guildID, opponentID)
		return true, war, nil
	}

	// No opponent yet — join queue.
	if _, err := r.data.DB.Exec(ctx, `
        INSERT INTO guild_war_matchmaking (guild_id, guild_name, member_count)
        VALUES ($1, $2, $3)
        ON CONFLICT (guild_id) DO NOTHING
    `, guildID, guildName, memberCount); err != nil {
		return false, nil, fmt.Errorf("join matchmaking: %w", err)
	}
	return false, nil, nil
}

// LeaveMatchmaking removes the guild from the queue.
func (r *Repo) LeaveMatchmaking(ctx context.Context, guildID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `DELETE FROM guild_war_matchmaking WHERE guild_id = $1`, guildID)
	if err != nil {
		return fmt.Errorf("leave matchmaking: %w", err)
	}
	return nil
}

// GetMatchmakingStatus returns whether the guild is currently queued.
func (r *Repo) GetMatchmakingStatus(ctx context.Context, guildID uuid.UUID) (MatchmakingStatus, error) {
	var s MatchmakingStatus
	err := r.data.DB.QueryRow(ctx, `SELECT joined_at FROM guild_war_matchmaking WHERE guild_id = $1`, guildID).Scan(&s.JoinedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return s, nil
		}
		return s, fmt.Errorf("get matchmaking status: %w", err)
	}
	s.InQueue = true
	return s, nil
}

// GuildSeed is a lightweight struct used by the cron to pair guilds.
type GuildSeed struct {
	ID          uuid.UUID
	Name        string
	MemberCount int32
}

// ListGuildsForWarPairing returns all guilds with at least one member,
// sorted by member_count DESC so larger guilds face each other.
func (r *Repo) ListGuildsForWarPairing(ctx context.Context) ([]GuildSeed, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT id, name, member_count
        FROM guilds
        WHERE member_count > 0
        ORDER BY member_count DESC
    `)
	if err != nil {
		return nil, fmt.Errorf("list guilds for war pairing: %w", err)
	}
	defer rows.Close()
	var out []GuildSeed
	for rows.Next() {
		var g GuildSeed
		if err := rows.Scan(&g.ID, &g.Name, &g.MemberCount); err != nil {
			return nil, fmt.Errorf("scan guild seed: %w", err)
		}
		out = append(out, g)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list guilds for war pairing rows: %w", err)
	}
	return out, nil
}

// CreateDraftWar inserts a new guild war in 'draft' phase (not yet visible
// to players). Both sides of the pair get their own row because each guild
// sees "our war" from their POV.
func (r *Repo) CreateDraftWar(
	ctx context.Context, pair WarPair, frontNames []string, weekDuration time.Duration,
) error {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	starts := time.Now().UTC().Truncate(24 * time.Hour)
	ends := starts.Add(weekDuration)

	insertWar := func(guildID uuid.UUID, opponentName string, opponentID *uuid.UUID) error {
		warID := uuid.New()
		if _, err := tx.Exec(ctx, `
            INSERT INTO guild_wars (id, week_number, our_guild_id, their_guild_name, their_guild_id,
                                   status, phase, starts_at, ends_at)
            VALUES ($1, $2, $3, $4, $5, 'active', 'draft', $6, $7)
        `, warID, pair.WeekNumber, guildID, opponentName, opponentID, starts, ends); err != nil {
			return fmt.Errorf("insert war for guild %s: %w", guildID, err)
		}
		for idx, name := range frontNames {
			if _, err := tx.Exec(ctx, `
                INSERT INTO guild_war_fronts (id, war_id, name, sort_order)
                VALUES ($1, $2, $3, $4)
            `, uuid.New(), warID, name, idx); err != nil {
				return fmt.Errorf("insert front: %w", err)
			}
		}
		return nil
	}

	if err := insertWar(pair.GuildAID, pair.GuildBName, pair.GuildBID); err != nil {
		return err
	}
	// Only create the mirrored row when there's a real opponent guild in the DB.
	if pair.GuildBID != nil {
		if err := insertWar(*pair.GuildBID, pair.GuildAName, &pair.GuildAID); err != nil {
			return err
		}
	}

	return fmt.Errorf("commit draft war: %w", tx.Commit(ctx))
}

// TransitionWarPhase bulk-updates wars from one phase to the next.
// Returns the number of rows updated.
func (r *Repo) TransitionWarPhase(ctx context.Context, fromPhase, toPhase string) (int64, error) {
	tag, err := r.data.DB.Exec(ctx, `
        UPDATE guild_wars SET phase = $2
        WHERE status = 'active' AND phase = $1
    `, fromPhase, toPhase)
	if err != nil {
		return 0, fmt.Errorf("transition war phase %s→%s: %w", fromPhase, toPhase, err)
	}
	return tag.RowsAffected(), nil
}

// WarSummary identifies an active guild war for notification fan-out.
// Used by the cron worker to push system events to affected guilds after
// a phase transition (ADR-004).
type WarSummary struct {
	WarID        uuid.UUID
	OurGuildID   uuid.UUID
	TheirGuildID *uuid.UUID
	TheirName    string
	Phase        string
}

// ListWarsInPhase returns active wars currently in `phase` so the cron can
// fan out per-guild system events. Includes both sides' guild IDs (the
// "their" side may be nil for placeholder rivals).
func (r *Repo) ListWarsInPhase(ctx context.Context, phase string) ([]WarSummary, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT id, our_guild_id, their_guild_id, their_guild_name, phase
        FROM guild_wars
        WHERE status = 'active' AND phase = $1
    `, phase)
	if err != nil {
		return nil, fmt.Errorf("list wars in phase %s: %w", phase, err)
	}
	defer rows.Close()
	out := make([]WarSummary, 0, 16)
	for rows.Next() {
		var w WarSummary
		if err := rows.Scan(&w.WarID, &w.OurGuildID, &w.TheirGuildID, &w.TheirName, &w.Phase); err != nil {
			return nil, fmt.Errorf("scan war: %w", err)
		}
		out = append(out, w)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate war rows: %w", err)
	}
	return out, nil
}

// GetGuildCreator returns the user_id of a guild's creator. Used by the
// system-event helper to satisfy events.creator_id FK.
func (r *Repo) GetGuildCreator(ctx context.Context, guildID uuid.UUID) (uuid.UUID, error) {
	var creator uuid.UUID
	err := r.data.DB.QueryRow(ctx, `SELECT creator_id FROM guilds WHERE id = $1`, guildID).Scan(&creator)
	if err != nil {
		return uuid.Nil, fmt.Errorf("get guild creator %s: %w", guildID, err)
	}
	return creator, nil
}

// ResolveWarsAndAwardTerritories finalises all wars in the 'champions_duel'
// phase: counts fronts captured by each side, marks the war resolved, and
// upserts a guild_territories row for every front the winner captured.
func (r *Repo) ResolveWarsAndAwardTerritories(ctx context.Context) (int64, error) {
	// Load wars to resolve.
	rows, err := r.data.DB.Query(ctx, `
        SELECT id, our_guild_id FROM guild_wars
        WHERE status = 'active' AND phase = 'champions_duel'
    `)
	if err != nil {
		return 0, fmt.Errorf("list wars to resolve: %w", err)
	}
	type warEntry struct {
		id      uuid.UUID
		guildID uuid.UUID
	}
	var wars []warEntry
	for rows.Next() {
		var e warEntry
		if err := rows.Scan(&e.id, &e.guildID); err != nil {
			rows.Close()
			return 0, fmt.Errorf("scan war entry: %w", err)
		}
		wars = append(wars, e)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("iterate war entries: %w", err)
	}

	var resolved int64
	for _, w := range wars {
		tx, err := r.data.DB.Begin(ctx)
		if err != nil {
			return resolved, fmt.Errorf("begin resolve tx: %w", err)
		}

		// Count fronts captured per side.
		var ourCaptured, theirCaptured int32
		_ = tx.QueryRow(ctx, `
            SELECT
                COUNT(*) FILTER (WHERE captured_by = 'ours')  AS ours,
                COUNT(*) FILTER (WHERE captured_by = 'theirs') AS theirs
            FROM guild_war_fronts WHERE war_id = $1
        `, w.id).Scan(&ourCaptured, &theirCaptured)

		winner := "draw"
		if ourCaptured > theirCaptured {
			winner = "ours"
		} else if theirCaptured > ourCaptured {
			winner = "theirs"
		}

		// Resolve the war row.
		if _, err := tx.Exec(ctx, `
            UPDATE guild_wars
            SET status = 'resolved', phase = 'resolved', resolved_winner = $2
            WHERE id = $1
        `, w.id, winner); err != nil {
			tx.Rollback(ctx) //nolint:errcheck
			return resolved, fmt.Errorf("resolve war %s: %w", w.id, err)
		}

		// Award territories to the winning guild for every front they captured.
		if winner == "ours" {
			frontRows, err := tx.Query(ctx, `
                SELECT name FROM guild_war_fronts
                WHERE war_id = $1 AND captured_by = 'ours'
            `, w.id)
			if err == nil {
				for frontRows.Next() {
					var name string
					if err := frontRows.Scan(&name); err == nil {
						_, _ = tx.Exec(ctx, `
                            INSERT INTO guild_territories (id, guild_id, name, buff)
                            VALUES ($1, $2, $3, '')
                            ON CONFLICT DO NOTHING
                        `, uuid.New(), w.guildID, name)
					}
				}
				frontRows.Close()
			}
		}

		if err := tx.Commit(ctx); err != nil {
			return resolved, fmt.Errorf("commit resolve war %s: %w", w.id, err)
		}
		resolved++
	}
	return resolved, nil
}

// MarkStaleWarsResolved resolves any 'active' wars whose ends_at has passed
// without being formally resolved. Called at the start of the Monday cron
// as a safety net.
func (r *Repo) MarkStaleWarsResolved(ctx context.Context) (int64, error) {
	tag, err := r.data.DB.Exec(ctx, `
        UPDATE guild_wars
        SET status = 'resolved', phase = 'resolved', resolved_winner = 'expired'
        WHERE status = 'active' AND ends_at < NOW()
    `)
	if err != nil {
		return 0, fmt.Errorf("mark stale wars resolved: %w", err)
	}
	return tag.RowsAffected(), nil
}
