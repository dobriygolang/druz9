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
		return nil, false, err
	}
	if f.CapturedBy != "" {
		return &f, false, ErrFrontAlreadyCaptured
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
