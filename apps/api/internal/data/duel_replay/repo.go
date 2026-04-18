package duel_replay

import (
	"context"
	"errors"
	"fmt"

	"api/internal/model"
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(store *postgres.Store, logger log.Logger) *Repo {
	return &Repo{data: store, log: log.NewHelper(logger)}
}

const summarySelectSQL = `
    SELECT id, source_kind, source_id,
           player1_id, player1_username, player2_id, player2_username,
           task_title, task_topic, task_difficulty, duration_ms,
           winner_id, completed_at, created_at
    FROM duel_replays
`

func (r *Repo) GetSummary(ctx context.Context, replayID uuid.UUID) (*model.DuelReplaySummary, error) {
	row := r.data.DB.QueryRow(ctx, summarySelectSQL+` WHERE id = $1`, replayID)
	s, err := scanSummary(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get summary: %w", err)
	}
	return s, nil
}

func (r *Repo) ListEvents(ctx context.Context, replayID uuid.UUID) ([]*model.DuelReplayEvent, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT id, replay_id, user_id, t_ms, kind, label, lines_count, created_at
        FROM duel_replay_events
        WHERE replay_id = $1
        ORDER BY t_ms ASC, created_at ASC
    `, replayID)
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	defer rows.Close()

	events := make([]*model.DuelReplayEvent, 0, 128)
	for rows.Next() {
		var ev model.DuelReplayEvent
		var linesCount *int32
		var kind int16
		if err := rows.Scan(
			&ev.ID, &ev.ReplayID, &ev.UserID, &ev.TMs, &kind, &ev.Label, &linesCount, &ev.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan event: %w", err)
		}
		ev.Kind = model.ReplayEventKind(kind)
		ev.LinesCount = linesCount
		events = append(events, &ev)
	}
	return events, rows.Err()
}

func (r *Repo) ListForUser(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.DuelReplaySummary, int32, error) {
	rows, err := r.data.DB.Query(ctx, summarySelectSQL+`
        WHERE player1_id = $1 OR player2_id = $1
        ORDER BY completed_at DESC
        LIMIT $2 OFFSET $3
    `, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list for user: %w", err)
	}
	defer rows.Close()

	result := make([]*model.DuelReplaySummary, 0, limit)
	for rows.Next() {
		s, err := scanSummary(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan summary: %w", err)
		}
		result = append(result, s)
	}

	var total int32
	if err := r.data.DB.QueryRow(ctx, `
        SELECT COUNT(*) FROM duel_replays
        WHERE player1_id = $1 OR player2_id = $1
    `, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count for user: %w", err)
	}
	return result, total, nil
}

func (r *Repo) InsertEvent(ctx context.Context, ev *model.DuelReplayEvent) error {
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO duel_replay_events (id, replay_id, user_id, t_ms, kind, label, lines_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, ev.ID, ev.ReplayID, ev.UserID, ev.TMs, int16(ev.Kind), ev.Label, ev.LinesCount)
	if err != nil {
		return fmt.Errorf("insert event: %w", err)
	}
	return nil
}

func (r *Repo) CreateReplay(ctx context.Context, rpl *model.DuelReplaySummary) error {
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO duel_replays (
            id, source_kind, source_id, player1_id, player1_username,
            player2_id, player2_username, task_title, task_topic, task_difficulty,
            duration_ms, winner_id, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (source_kind, source_id) DO NOTHING
    `,
		rpl.ID, int16(rpl.SourceKind), rpl.SourceID,
		rpl.Player1ID, rpl.Player1Username, rpl.Player2ID, rpl.Player2Username,
		rpl.TaskTitle, rpl.TaskTopic, rpl.TaskDifficulty, rpl.DurationMs,
		rpl.WinnerID, rpl.CompletedAt,
	)
	if err != nil {
		return fmt.Errorf("create replay: %w", err)
	}
	return nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanSummary(s scanner) (*model.DuelReplaySummary, error) {
	var r model.DuelReplaySummary
	var sourceKind int16
	var difficulty int16
	var winner *uuid.UUID
	err := s.Scan(
		&r.ID, &sourceKind, &r.SourceID,
		&r.Player1ID, &r.Player1Username, &r.Player2ID, &r.Player2Username,
		&r.TaskTitle, &r.TaskTopic, &difficulty, &r.DurationMs,
		&winner, &r.CompletedAt, &r.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	r.SourceKind = model.ReplaySourceKind(sourceKind)
	r.TaskDifficulty = int32(difficulty)
	r.WinnerID = winner
	return &r, nil
}
