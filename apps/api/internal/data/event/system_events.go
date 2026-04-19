package event

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// SystemKind labels server-generated events that aren't visible in the
// public events list (the read query in read_queries.go filters them out
// with `WHERE system_kind IS NULL`). Surface these via the dedicated
// guild feed instead — see ADR-004.
type SystemKind string

const (
	SystemKindGuildWarStarted  SystemKind = "guild_war_started"
	SystemKindGuildWarPhase    SystemKind = "guild_war_phase"
	SystemKindGuildWarResolved SystemKind = "guild_war_resolved"
)

var errSystemEventFieldsRequired = errors.New("system event: guild_id/creator_id/kind/title required")

// InsertSystemEvent appends a server-generated event for `guildID`. The
// row is hidden from the public /events list (ListEvents filters with
// `system_kind IS NULL`) but visible to guild members through the guild
// feed. Use this from the guild war cron, league transitions, etc.
//
// `creatorID` must be a real user (events.creator_id FK). Cron callers
// should pass the guild's creator_id.
func (r *Repo) InsertSystemEvent(
	ctx context.Context,
	guildID, creatorID uuid.UUID,
	kind SystemKind,
	title string,
	scheduledAt time.Time,
) error {
	if guildID == uuid.Nil || creatorID == uuid.Nil || kind == "" || title == "" {
		return fmt.Errorf("system event: %w", errSystemEventFieldsRequired)
	}
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO events (
            id, title, place_label, scheduled_at, created_at,
            creator_id, guild_id, repeat_rule, is_public, status,
            visibility, system_kind
        )
        VALUES (
            gen_random_uuid(), $1, '', $2, NOW(),
            $3, $4, 'none', FALSE, 'approved',
            'guild_only', $5
        )
    `, title, scheduledAt, creatorID, guildID, string(kind))
	if err != nil {
		return fmt.Errorf("insert system event %q for guild %s: %w", kind, guildID, err)
	}
	return nil
}
