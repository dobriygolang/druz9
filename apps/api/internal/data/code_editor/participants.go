package code_editor

import (
	"context"
	"fmt"

	codeeditordomain "api/internal/domain/codeeditor"

	"github.com/google/uuid"
)

func (r *Repo) getParticipants(ctx context.Context, roomID uuid.UUID) ([]*codeeditordomain.Participant, error) {
	rows, err := r.data.DB.Query(ctx, `SELECT user_id, name, is_guest, is_ready, is_winner, joined_at FROM code_participants WHERE room_id = $1`, roomID)
	if err != nil {
		return nil, fmt.Errorf("get participants: %w", err)
	}
	defer rows.Close()

	var participants []*codeeditordomain.Participant
	for rows.Next() {
		var p codeeditordomain.Participant
		if err := scanParticipant(rows, &p); err != nil {
			return nil, fmt.Errorf("scan participant: %w", err)
		}
		participants = append(participants, &p)
	}
	return participants, nil
}

func (r *Repo) AddParticipant(ctx context.Context, roomID uuid.UUID, participant *codeeditordomain.Participant) (*codeeditordomain.Room, error) {
	if participant.UserID != nil {
		// Single UPSERT: insert or update name/is_guest on conflict with existing user_id
		_, err := r.data.DB.Exec(
			ctx,
			`INSERT INTO code_participants (room_id, user_id, name, is_guest, is_ready, is_winner, joined_at)
			 VALUES ($1, $2, $3, $4, $5, $6, NOW())
			 ON CONFLICT (room_id, user_id) DO UPDATE
			   SET name = EXCLUDED.name, is_guest = EXCLUDED.is_guest`,
			roomID, participant.UserID, participant.Name, participant.IsGuest, participant.IsReady, participant.IsWinner,
		)
		if err != nil {
			return nil, fmt.Errorf("upsert participant: %w", err)
		}
	} else {
		_, err := r.data.DB.Exec(
			ctx,
			`INSERT INTO code_participants (room_id, user_id, name, is_guest, is_ready, is_winner, joined_at)
			 VALUES ($1, $2, $3, $4, $5, $6, NOW())
			 ON CONFLICT (room_id, name) WHERE is_guest = true DO UPDATE SET is_guest = EXCLUDED.is_guest`,
			roomID, participant.UserID, participant.Name, participant.IsGuest, participant.IsReady, participant.IsWinner,
		)
		if err != nil {
			return nil, fmt.Errorf("add guest participant: %w", err)
		}
	}

	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, roomID); err != nil {
		return nil, fmt.Errorf("touch room after add participant: %w", err)
	}

	return r.GetRoom(ctx, roomID)
}

func (r *Repo) RemoveParticipant(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) error {
	var err error
	if userID != nil {
		_, err = r.data.DB.Exec(ctx, `DELETE FROM code_participants WHERE room_id = $1 AND user_id = $2`, roomID, userID)
	} else {
		_, err = r.data.DB.Exec(ctx, `DELETE FROM code_participants WHERE room_id = $1 AND name = $2 AND is_guest = true`, roomID, guestName)
	}
	if err != nil {
		return fmt.Errorf("remove participant: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, roomID); err != nil {
		return fmt.Errorf("touch room after remove participant: %w", err)
	}
	return nil
}

func (r *Repo) SetParticipantReady(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, ready bool) error {
	var err error
	if userID != nil {
		_, err = r.data.DB.Exec(ctx, `UPDATE code_participants SET is_ready = $3 WHERE room_id = $1 AND user_id = $2`, roomID, userID, ready)
	} else {
		_, err = r.data.DB.Exec(ctx, `UPDATE code_participants SET is_ready = $3 WHERE room_id = $1 AND name = $2 AND is_guest = true`, roomID, guestName, ready)
	}
	if err != nil {
		return fmt.Errorf("set participant ready: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, roomID); err != nil {
		return fmt.Errorf("touch room after ready: %w", err)
	}
	return nil
}

func (r *Repo) SetWinner(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) error {
	_, err := r.data.DB.Exec(ctx, `UPDATE code_participants SET is_winner = false WHERE room_id = $1`, roomID)
	if err != nil {
		return fmt.Errorf("reset winners: %w", err)
	}

	if userID != nil {
		_, err = r.data.DB.Exec(ctx, `UPDATE code_participants SET is_winner = true WHERE room_id = $1 AND user_id = $2`, roomID, userID)
	} else {
		_, err = r.data.DB.Exec(ctx, `UPDATE code_participants SET is_winner = true WHERE room_id = $1 AND name = $2 AND is_guest = true`, roomID, guestName)
	}
	if err != nil {
		return fmt.Errorf("set winner: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, roomID); err != nil {
		return fmt.Errorf("touch room after winner: %w", err)
	}
	return nil
}
