package code_editor

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
)

func (r *Repo) GetDuelEditorState(ctx context.Context, roomID uuid.UUID, actorKey string) (*codeeditordomain.DuelEditorState, error) {
	row := r.data.DB.QueryRow(
		ctx,
		`SELECT room_id, actor_key, code, language, updated_at
		 FROM code_duel_editor_states
		 WHERE room_id = $1 AND actor_key = $2`,
		roomID, actorKey,
	)

	var state codeeditordomain.DuelEditorState
	if err := row.Scan(&state.RoomID, &state.ActorKey, &state.Code, &state.Language, &state.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, codeeditordomain.ErrDuelStateNotFound
		}
		return nil, fmt.Errorf("get duel editor state: %w", err)
	}
	return &state, nil
}

func (r *Repo) SaveDuelEditorState(ctx context.Context, roomID uuid.UUID, actorKey, code string, language model.ProgrammingLanguage) error {
	_, err := r.data.DB.Exec(
		ctx,
		`INSERT INTO code_duel_editor_states (room_id, actor_key, code, language, updated_at)
		 VALUES ($1, $2, $3, $4, NOW())
		 ON CONFLICT (room_id, actor_key)
		 DO UPDATE
		    SET code = EXCLUDED.code,
		        language = EXCLUDED.language,
		        updated_at = NOW()`,
		roomID, actorKey, code, language,
	)
	if err != nil {
		return fmt.Errorf("save duel editor state: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, roomID); err != nil {
		return fmt.Errorf("touch room after duel editor save: %w", err)
	}
	return nil
}
