package guild

import (
	"context"
	"errors"
	"fmt"

	"api/internal/model"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) CreateGuild(ctx context.Context, creatorID uuid.UUID, name, description string, tags []string, isPublic bool) (*model.Guild, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	guildID := uuid.New()
	if _, err := tx.Exec(ctx, `
INSERT INTO guilds (id, name, description, creator_id, tags, member_count, is_public)
VALUES ($1, $2, $3, $4, $5, 1, $6)`,
		guildID, name, description, creatorID, tags, isPublic,
	); err != nil {
		return nil, fmt.Errorf("insert guild: %w", err)
	}

	if _, err := tx.Exec(ctx, `
INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1, $2, 'creator')`,
		guildID, creatorID,
	); err != nil {
		return nil, fmt.Errorf("insert guild creator member: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &model.Guild{
		ID:          guildID,
		Name:        name,
		Description: description,
		CreatorID:   creatorID,
		MemberCount: 1,
		Tags:        tags,
		IsPublic:    isPublic,
		IsJoined:    true,
	}, nil
}

func (r *Repo) GetGuild(ctx context.Context, guildID uuid.UUID) (*model.Guild, error) {
	var c model.Guild
	err := r.data.DB.QueryRow(ctx, `
SELECT id, name, description, creator_id, member_count, tags, is_public, created_at
FROM guilds WHERE id = $1`, guildID).Scan(
		&c.ID, &c.Name, &c.Description, &c.CreatorID,
		&c.MemberCount, &c.Tags, &c.IsPublic, &c.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, kratoserrors.NotFound("GUILD_NOT_FOUND", "guild not found")
		}
		return nil, fmt.Errorf("get guild: %w", err)
	}
	return &c, nil
}

func (r *Repo) InviteToGuild(ctx context.Context, guildID, inviterID, inviteeID uuid.UUID) error {
	// Only creator can invite
	guild, err := r.GetGuild(ctx, guildID)
	if err != nil {
		return err
	}
	if guild.CreatorID != inviterID {
		return kratoserrors.Forbidden("FORBIDDEN", "only the guild creator can invite members")
	}

	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	tag, err := tx.Exec(ctx, `
INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1, $2, 'member')
ON CONFLICT (guild_id, user_id) DO NOTHING`, guildID, inviteeID)
	if err != nil {
		return fmt.Errorf("invite to guild: %w", err)
	}
	if tag.RowsAffected() > 0 {
		if _, err := tx.Exec(ctx,
			`UPDATE guilds SET member_count = member_count + 1, updated_at = now() WHERE id = $1`,
			guildID,
		); err != nil {
			return fmt.Errorf("update member count: %w", err)
		}
	}
	return tx.Commit(ctx)
}

func (r *Repo) JoinGuild(ctx context.Context, guildID, userID uuid.UUID) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var isPublic bool
	err = tx.QueryRow(ctx, `SELECT is_public FROM guilds WHERE id = $1`, guildID).Scan(&isPublic)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return kratoserrors.NotFound("GUILD_NOT_FOUND", "guild not found")
		}
		return fmt.Errorf("check guild: %w", err)
	}
	if !isPublic {
		return kratoserrors.Forbidden("GUILD_PRIVATE", "this guild is private; you must be invited to join")
	}

	tag, err := tx.Exec(ctx, `
INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1, $2, 'member')
ON CONFLICT (guild_id, user_id) DO NOTHING`, guildID, userID)
	if err != nil {
		return fmt.Errorf("join guild: %w", err)
	}

	if tag.RowsAffected() > 0 {
		if _, err := tx.Exec(ctx, `UPDATE guilds SET member_count = member_count + 1, updated_at = now() WHERE id = $1`, guildID); err != nil {
			return fmt.Errorf("update member count: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repo) DeleteGuild(ctx context.Context, guildID uuid.UUID) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Cascade: remove members, then guild itself
	if _, err := tx.Exec(ctx, `DELETE FROM guild_members WHERE guild_id = $1`, guildID); err != nil {
		return fmt.Errorf("delete guild members: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM guilds WHERE id = $1`, guildID); err != nil {
		return fmt.Errorf("delete guild: %w", err)
	}
	return tx.Commit(ctx)
}

func (r *Repo) LeaveGuild(ctx context.Context, guildID, userID uuid.UUID) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var role string
	err = tx.QueryRow(ctx,
		`SELECT role FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
		guildID, userID,
	).Scan(&role)
	if err != nil {
		if err == pgx.ErrNoRows {
			return kratoserrors.NotFound("NOT_A_MEMBER", "not a member of this guild")
		}
		return fmt.Errorf("check membership: %w", err)
	}
	if role == "creator" {
		return kratoserrors.BadRequest("CREATOR_CANNOT_LEAVE", "creator cannot leave own guild")
	}

	if _, err := tx.Exec(ctx,
		`DELETE FROM guild_members WHERE guild_id = $1 AND user_id = $2`,
		guildID, userID,
	); err != nil {
		return fmt.Errorf("leave guild: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE guilds SET member_count = GREATEST(member_count - 1, 0), updated_at = now() WHERE id = $1`,
		guildID,
	); err != nil {
		return fmt.Errorf("update member count: %w", err)
	}

	return tx.Commit(ctx)
}
