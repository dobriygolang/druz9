package arena

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// LobbyRow mirrors arena_lobbies + an aggregated member list. ADR-004.
type LobbyRow struct {
	ID         uuid.UUID
	Mode       string
	InviteCode string
	CreatedBy  uuid.UUID
	Status     string
	Members    []uuid.UUID
}

const lobbyMaxSize = 2 // team_2v2; loosen to 3 when team_3v3 ships

var (
	ErrLobbyNotFound = errors.New("lobby not found")
	ErrLobbyFull     = errors.New("lobby is full")
)

// CreateLobby inserts an open lobby with the creator as its first member.
// The invite_code is a short base32 string (8 chars, ~40 bits) — small
// enough to share verbally, big enough to be unguessable for the lifetime
// of the lobby (15min default).
func (r *Repo) CreateLobby(ctx context.Context, mode string, creator uuid.UUID) (*LobbyRow, error) {
	if mode == "" {
		mode = "team_2v2"
	}
	code, err := newInviteCode()
	if err != nil {
		return nil, err
	}

	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("create lobby begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var lobbyID uuid.UUID
	err = tx.QueryRow(ctx, `
        INSERT INTO arena_lobbies (mode, invite_code, created_by)
        VALUES ($1, $2, $3)
        RETURNING id
    `, mode, code, creator).Scan(&lobbyID)
	if err != nil {
		return nil, fmt.Errorf("create lobby: %w", err)
	}
	if _, err := tx.Exec(ctx, `
        INSERT INTO arena_lobby_members (lobby_id, user_id) VALUES ($1, $2)
    `, lobbyID, creator); err != nil {
		return nil, fmt.Errorf("create lobby member: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("create lobby commit: %w", err)
	}
	return &LobbyRow{ID: lobbyID, Mode: mode, InviteCode: code, CreatedBy: creator, Status: "open", Members: []uuid.UUID{creator}}, nil
}

// JoinLobby adds `userID` to the lobby identified by inviteCode. Returns
// ErrLobbyFull when the lobby already has lobbyMaxSize members.
func (r *Repo) JoinLobby(ctx context.Context, inviteCode string, userID uuid.UUID) (*LobbyRow, error) {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("join lobby begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	row := tx.QueryRow(ctx, `
        SELECT id, mode, status, created_by
        FROM arena_lobbies WHERE invite_code = $1 AND status = 'open' AND expires_at > NOW()
        FOR UPDATE
    `, strings.ToUpper(inviteCode))
	lobby := &LobbyRow{InviteCode: strings.ToUpper(inviteCode)}
	if err := row.Scan(&lobby.ID, &lobby.Mode, &lobby.Status, &lobby.CreatedBy); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLobbyNotFound
		}
		return nil, fmt.Errorf("join lobby lookup: %w", err)
	}

	var count int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM arena_lobby_members WHERE lobby_id = $1`, lobby.ID).Scan(&count); err != nil {
		return nil, fmt.Errorf("join lobby count: %w", err)
	}
	if count >= lobbyMaxSize {
		return nil, ErrLobbyFull
	}
	if _, err := tx.Exec(ctx, `
        INSERT INTO arena_lobby_members (lobby_id, user_id) VALUES ($1, $2)
        ON CONFLICT (lobby_id, user_id) DO NOTHING
    `, lobby.ID, userID); err != nil {
		return nil, fmt.Errorf("join lobby insert: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("join lobby commit: %w", err)
	}
	return r.GetLobby(ctx, lobby.ID)
}

func (r *Repo) GetLobby(ctx context.Context, lobbyID uuid.UUID) (*LobbyRow, error) {
	row := r.data.DB.QueryRow(ctx, `
        SELECT id, mode, invite_code, created_by, status FROM arena_lobbies WHERE id = $1
    `, lobbyID)
	l := &LobbyRow{}
	if err := row.Scan(&l.ID, &l.Mode, &l.InviteCode, &l.CreatedBy, &l.Status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLobbyNotFound
		}
		return nil, fmt.Errorf("get lobby: %w", err)
	}
	rows, err := r.data.DB.Query(ctx, `
        SELECT user_id FROM arena_lobby_members WHERE lobby_id = $1 ORDER BY joined_at
    `, lobbyID)
	if err != nil {
		return nil, fmt.Errorf("get lobby members: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var u uuid.UUID
		if err := rows.Scan(&u); err != nil {
			return nil, fmt.Errorf("scan lobby member: %w", err)
		}
		l.Members = append(l.Members, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate lobby members: %w", err)
	}
	return l, nil
}

// LeaveLobby removes a member. If the lobby is empty after removal, mark
// it 'expired' so the matchmaker skips it.
func (r *Repo) LeaveLobby(ctx context.Context, lobbyID, userID uuid.UUID) error {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("leave lobby begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
        DELETE FROM arena_lobby_members WHERE lobby_id = $1 AND user_id = $2
    `, lobbyID, userID); err != nil {
		return fmt.Errorf("leave lobby delete: %w", err)
	}
	var remaining int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM arena_lobby_members WHERE lobby_id = $1`, lobbyID).Scan(&remaining); err != nil {
		return fmt.Errorf("leave lobby count: %w", err)
	}
	if remaining == 0 {
		if _, err := tx.Exec(ctx, `UPDATE arena_lobbies SET status = 'expired' WHERE id = $1`, lobbyID); err != nil {
			return fmt.Errorf("leave lobby mark expired: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("leave lobby commit: %w", err)
	}
	return nil
}

// EnqueueLobby flips status to 'queued' so the matchmaker (when it gains
// 2v2 support) picks it up. Returns nil silently if already queued.
func (r *Repo) EnqueueLobby(ctx context.Context, lobbyID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
        UPDATE arena_lobbies SET status = 'queued'
        WHERE id = $1 AND status IN ('open','queued')
    `, lobbyID)
	if err != nil {
		return fmt.Errorf("enqueue lobby: %w", err)
	}
	return nil
}

// newInviteCode returns an 8-char base32 token. Excludes padding so the
// result reads cleanly when copied/pasted.
func newInviteCode() (string, error) {
	buf := make([]byte, 5) // 5 bytes → 8 base32 chars
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("invite code rand: %w", err)
	}
	enc := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(buf)
	return enc, nil
}
