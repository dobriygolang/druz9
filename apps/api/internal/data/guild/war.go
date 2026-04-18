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
	StartsAt       time.Time
	EndsAt         time.Time
	ResolvedWinner string
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

// GetActiveWarForGuild returns the "active" war row (status='active') for
// this guild, or (nil, pgx.ErrNoRows) if there isn't one yet.
func (r *Repo) GetActiveWarForGuild(ctx context.Context, guildID uuid.UUID) (*WarRow, error) {
	var w WarRow
	err := r.data.DB.QueryRow(ctx, `
        SELECT id, week_number, our_guild_id, their_guild_name, their_guild_id,
               status, starts_at, ends_at, resolved_winner
        FROM guild_wars
        WHERE our_guild_id = $1 AND status = 'active'
        LIMIT 1
    `, guildID).Scan(
		&w.ID, &w.WeekNumber, &w.OurGuildID, &w.TheirGuildName, &w.TheirGuildID,
		&w.Status, &w.StartsAt, &w.EndsAt, &w.ResolvedWinner,
	)
	if err != nil {
		return nil, err
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
        INSERT INTO guild_wars (id, our_guild_id, their_guild_name, status, starts_at, ends_at)
        VALUES ($1, $2, $3, 'active', $4, $5)
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
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
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
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// noRows is a small helper: callers frequently want to know "is this
// pgx.ErrNoRows, i.e. no active war?" — this keeps them from needing to
// import pgx themselves.
func IsNoRows(err error) bool { return errors.Is(err, pgx.ErrNoRows) }
