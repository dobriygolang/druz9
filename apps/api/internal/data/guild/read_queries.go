package guild

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

const (
	defaultGuildsLimit = 20
	maxGuildsLimit     = 100
)

func (r *Repo) ListGuilds(
	ctx context.Context,
	currentUserID uuid.UUID,
	opts model.ListGuildsOptions,
) (*model.ListGuildsResponse, error) {
	if opts.Limit <= 0 || opts.Limit > maxGuildsLimit {
		opts.Limit = defaultGuildsLimit
	}

	var totalCount int32
	if err := r.data.DB.QueryRow(ctx, `
SELECT COUNT(*) FROM guilds c
WHERE c.is_public = true
   OR EXISTS(SELECT 1 FROM guild_members cm WHERE cm.guild_id = c.id AND cm.user_id = $1)`,
		currentUserID,
	).Scan(&totalCount); err != nil {
		return nil, fmt.Errorf("count guilds: %w", err)
	}

	query := `
SELECT
  c.id,
  c.name,
  c.description,
  c.creator_id,
  c.member_count,
  c.tags,
  c.is_public,
  c.created_at,
  EXISTS(SELECT 1 FROM guild_members cm WHERE cm.guild_id = c.id AND cm.user_id = $1) AS is_joined
FROM guilds c
WHERE c.is_public = true
   OR EXISTS(SELECT 1 FROM guild_members cm WHERE cm.guild_id = c.id AND cm.user_id = $1)
ORDER BY c.created_at DESC
LIMIT $2 OFFSET $3
`
	rows, err := r.data.DB.Query(ctx, query, currentUserID, opts.Limit, opts.Offset)
	if err != nil {
		return nil, fmt.Errorf("query guilds: %w", err)
	}
	defer rows.Close()

	guilds := make([]*model.Guild, 0, opts.Limit)
	for rows.Next() {
		var c model.Guild
		if err := rows.Scan(
			&c.ID,
			&c.Name,
			&c.Description,
			&c.CreatorID,
			&c.MemberCount,
			&c.Tags,
			&c.IsPublic,
			&c.CreatedAt,
			&c.IsJoined,
		); err != nil {
			return nil, fmt.Errorf("scan guild: %w", err)
		}
		guilds = append(guilds, &c)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate guilds: %w", err)
	}

	return &model.ListGuildsResponse{
		Guilds:     guilds,
		TotalCount: totalCount,
	}, nil
}

func (r *Repo) ListGuildMembers(ctx context.Context, guildID uuid.UUID, limit int32) ([]*model.GuildMemberProfile, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	query := `
SELECT
  u.id,
  COALESCE(NULLIF(u.first_name, ''), '') AS first_name,
  COALESCE(NULLIF(u.last_name, ''), '') AS last_name,
  COALESCE(NULLIF(u.yandex_avatar_url, ''), CASE WHEN u.telegram_id IS NOT NULL THEN '/api/v1/profile/avatar/' || u.id::text END, '') AS avatar_url,
  cm.role,
  cm.joined_at
FROM guild_members cm
JOIN users u ON u.id = cm.user_id
WHERE cm.guild_id = $1
ORDER BY cm.joined_at ASC
LIMIT $2
`
	rows, err := r.data.DB.Query(ctx, query, guildID, limit)
	if err != nil {
		return nil, fmt.Errorf("query guild members: %w", err)
	}
	defer rows.Close()

	members := make([]*model.GuildMemberProfile, 0, limit)
	for rows.Next() {
		var m model.GuildMemberProfile
		if err := rows.Scan(&m.UserID, &m.FirstName, &m.LastName, &m.AvatarURL, &m.Role, &m.JoinedAt); err != nil {
			return nil, fmt.Errorf("scan guild member: %w", err)
		}
		members = append(members, &m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate guild members: %w", err)
	}
	return members, nil
}

func (r *Repo) IsMember(ctx context.Context, guildID, userID uuid.UUID) (bool, error) {
	var exists bool
	err := r.data.DB.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM guild_members WHERE guild_id = $1 AND user_id = $2)`,
		guildID, userID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check guild membership: %w", err)
	}
	return exists, nil
}
