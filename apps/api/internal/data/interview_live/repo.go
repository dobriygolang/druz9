package interview_live

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TranscriptMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type SessionRow struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	Focus      string
	FrontID    *uuid.UUID
	Transcript []TranscriptMessage
	Code       string
	Evaluation string
	DurationS  int32
}

type Repo struct {
	db *pgxpool.Pool
}

func NewRepo(db *pgxpool.Pool) *Repo {
	return &Repo{db: db}
}

func (r *Repo) SaveSession(ctx context.Context, row SessionRow) error {
	transcriptJSON, err := json.Marshal(row.Transcript)
	if err != nil {
		return fmt.Errorf("marshal transcript: %w", err)
	}
	if _, err := r.db.Exec(ctx, `
        INSERT INTO interview_live_sessions
            (id, user_id, focus, front_id, transcript, code, evaluation, duration_s)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, row.ID, row.UserID, row.Focus, row.FrontID, transcriptJSON, row.Code, row.Evaluation, row.DurationS); err != nil {
		return fmt.Errorf("save interview live session: %w", err)
	}
	return nil
}
