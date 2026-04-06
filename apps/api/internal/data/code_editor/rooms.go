package code_editor

import (
	"context"
	"errors"
	"fmt"
	"time"

	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) CreateRoom(ctx context.Context, room *codeeditordomain.Room) (*codeeditordomain.Room, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(
		ctx,
		`INSERT INTO code_rooms (id, mode, code, code_revision, status, creator_id, invite_code, task_id, duel_topic, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
		room.ID, room.Mode, room.Code, room.CodeRevision, room.Status, room.CreatorID, room.InviteCode, room.TaskID, room.DuelTopic,
	)
	if err != nil {
		return nil, fmt.Errorf("insert room: %w", err)
	}

	if len(room.Participants) > 0 {
		p := room.Participants[0]
		_, err = tx.Exec(
			ctx,
			`INSERT INTO code_participants (room_id, user_id, name, is_guest, is_ready, is_winner, joined_at)
			 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
			room.ID, p.UserID, p.Name, p.IsGuest, p.IsReady, p.IsWinner,
		)
		if err != nil {
			return nil, fmt.Errorf("insert participant: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return r.GetRoom(ctx, room.ID)
}

func (r *Repo) GetRoom(ctx context.Context, roomID uuid.UUID) (*codeeditordomain.Room, error) {
	row := r.data.DB.QueryRow(ctx, roomFullQuery+` WHERE cr.id = $1 GROUP BY cr.id, ct.id`, roomID)
	room, err := scanRoomFull(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, codeeditordomain.ErrRoomNotFound
		}
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, codeeditordomain.ErrRoomNotFound
		}
		return nil, fmt.Errorf("get room: %w", err)
	}
	return room, nil
}

func (r *Repo) GetRoomByInviteCode(ctx context.Context, inviteCode string) (*codeeditordomain.Room, error) {
	row := r.data.DB.QueryRow(ctx, roomFullQuery+` WHERE cr.invite_code = $1 GROUP BY cr.id, ct.id`, inviteCode)
	room, err := scanRoomFull(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, codeeditordomain.ErrRoomNotFound
		}
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, codeeditordomain.ErrRoomNotFound
		}
		return nil, fmt.Errorf("get room by invite code: %w", err)
	}
	return room, nil
}

func (r *Repo) SaveCodeSnapshot(ctx context.Context, roomID uuid.UUID, code string) error {
	_, err := r.data.DB.Exec(
		ctx,
		`UPDATE code_rooms
		 SET code = $2, code_revision = code_revision + 1, updated_at = NOW()
		 WHERE id = $1`,
		roomID, code,
	)
	if err != nil {
		return fmt.Errorf("save code snapshot: %w", err)
	}
	return nil
}

func (r *Repo) UpdateRoomStatus(ctx context.Context, roomID uuid.UUID, status model.RoomStatus) error {
	_, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET status = $2, updated_at = NOW() WHERE id = $1`, roomID, status)
	if err != nil {
		return fmt.Errorf("update room status: %w", err)
	}
	return nil
}

func (r *Repo) StartDuel(ctx context.Context, roomID uuid.UUID, startedAt time.Time) error {
	_, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET status = $2, started_at = $3, updated_at = NOW() WHERE id = $1`, roomID, codeeditordomain.RoomStatusActive, startedAt)
	if err != nil {
		return fmt.Errorf("start duel: %w", err)
	}
	return nil
}

func (r *Repo) FinishDuel(ctx context.Context, roomID uuid.UUID, winnerUserID *uuid.UUID, winnerGuestName string, finishedAt time.Time) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE code_rooms
		SET status = $2, winner_user_id = $3, winner_guest_name = $4, finished_at = $5, updated_at = NOW()
		WHERE id = $1
	`, roomID, codeeditordomain.RoomStatusFinished, winnerUserID, winnerGuestName, finishedAt)
	if err != nil {
		return fmt.Errorf("finish duel: %w", err)
	}
	return nil
}

func (r *Repo) CleanupInactiveRooms(ctx context.Context, idleFor time.Duration) (int64, error) {
	tag, err := r.data.DB.Exec(ctx, `
		DELETE FROM code_rooms cr
		WHERE cr.status IN ($1, $2)
		  AND cr.mode IN ($3, $4)
		  AND cr.updated_at < NOW() - $5::interval
	`, model.RoomStatusWaiting, model.RoomStatusFinished, model.RoomModeAll, model.RoomModeDuel, idleFor.String())
	if err != nil {
		return 0, fmt.Errorf("cleanup inactive rooms: %w", err)
	}
	return tag.RowsAffected(), nil
}

func (r *Repo) CountOpenRooms(ctx context.Context, activeSince time.Time) (int, error) {
	var count int
	err := r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM code_rooms
		WHERE status IN ($1, $2)
		  AND updated_at >= $3
	`, model.RoomStatusWaiting, model.RoomStatusActive, activeSince).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count open rooms: %w", err)
	}
	return count, nil
}

func (r *Repo) ListRoomsForUser(ctx context.Context, userID uuid.UUID) ([]*codeeditordomain.Room, error) {
	query := roomFullQuery + `
		WHERE (cr.creator_id = $1 OR cr.id IN (SELECT room_id FROM code_participants WHERE user_id = $1))
		GROUP BY cr.id, ct.id
		ORDER BY cr.updated_at DESC
		LIMIT 50`
	rows, err := r.data.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list rooms for user: %w", err)
	}
	defer rows.Close()
	var result []*codeeditordomain.Room
	for rows.Next() {
		room, err := scanRoomFull(rows)
		if err != nil {
			return nil, fmt.Errorf("scan room: %w", err)
		}
		result = append(result, room)
	}
	return result, rows.Err()
}
