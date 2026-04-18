package code_editor

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

	codeeditordomain "api/internal/domain/codeeditor"
)

type participantRow struct {
	UserID   *string   `json:"user_id"`
	Name     string    `json:"name"`
	IsGuest  bool      `json:"is_guest"`
	IsReady  bool      `json:"is_ready"`
	IsWinner bool      `json:"is_winner"`
	JoinedAt time.Time `json:"joined_at"`
}

// scanRoomFull reads room fields + participants JSON from roomFullQuery in one pass.
func scanRoomFull(row scanner) (*codeeditordomain.Room, error) {
	var room codeeditordomain.Room
	var participantsJSON []byte

	if err := row.Scan(
		&room.ID,
		&room.Mode,
		&room.Code,
		&room.CodeRevision,
		&room.Status,
		&room.CreatorID,
		&room.InviteCode,
		&room.Language,
		&room.Task,
		&room.TaskID,
		&room.DuelTopic,
		&room.WinnerUserID,
		&room.WinnerGuest,
		&room.StartedAt,
		&room.FinishedAt,
		&room.CreatedAt,
		&room.UpdatedAt,
		&room.IsPrivate,
		&participantsJSON,
	); err != nil {
		return nil, err
	}

	var rows []participantRow
	if err := json.Unmarshal(participantsJSON, &rows); err != nil {
		return nil, fmt.Errorf("unmarshal participants: %w", err)
	}

	room.Participants = make([]*codeeditordomain.Participant, 0, len(rows))
	for _, r := range rows {
		p := &codeeditordomain.Participant{
			Name:     r.Name,
			IsGuest:  r.IsGuest,
			IsReady:  r.IsReady,
			IsWinner: r.IsWinner,
			JoinedAt: r.JoinedAt,
		}
		if r.UserID != nil && *r.UserID != "" {
			id, err := uuid.Parse(*r.UserID)
			if err == nil {
				p.UserID = &id
			}
		}
		room.Participants = append(room.Participants, p)
	}

	return &room, nil
}

func scanSubmission(row scanner, submission *codeeditordomain.Submission) error {
	return row.Scan(
		&submission.ID,
		&submission.RoomID,
		&submission.UserID,
		&submission.GuestName,
		&submission.Output,
		&submission.Error,
		&submission.SubmittedAt,
		&submission.DurationMs,
		&submission.IsCorrect,
		&submission.PassedCount,
		&submission.TotalCount,
	)
}
