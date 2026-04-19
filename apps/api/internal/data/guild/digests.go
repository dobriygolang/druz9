package guild

import (
	"context"
	"fmt"
)

type DigestGuild struct {
	ID        string
	Name      string
	Count     int
	MemberIDs []string
}

func (r *Repo) ListDigestGuilds(ctx context.Context, limit int32) ([]DigestGuild, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT c.id, c.name, c.member_count, cm.user_id::text
		FROM guilds c
		JOIN guild_members cm ON cm.guild_id = c.id
		WHERE c.member_count >= 2
		ORDER BY c.id
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("guild digest query: %w", err)
	}
	defer rows.Close()

	byID := make(map[string]*DigestGuild)
	order := make([]string, 0)
	for rows.Next() {
		var guildID, name, memberID string
		var memberCount int
		if err := rows.Scan(&guildID, &name, &memberCount, &memberID); err != nil {
			return nil, fmt.Errorf("scan guild digest row: %w", err)
		}
		row, ok := byID[guildID]
		if !ok {
			row = &DigestGuild{ID: guildID, Name: name, Count: memberCount}
			byID[guildID] = row
			order = append(order, guildID)
		}
		row.MemberIDs = append(row.MemberIDs, memberID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate guild digest rows: %w", err)
	}

	out := make([]DigestGuild, 0, len(order))
	for _, id := range order {
		out = append(out, *byID[id])
	}
	return out, nil
}
