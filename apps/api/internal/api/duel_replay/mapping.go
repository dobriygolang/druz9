package duel_replay

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/model"
	v1 "api/pkg/api/duel_replay/v1"
)

func mapSummary(s *model.DuelReplaySummary) *v1.ReplaySummary {
	if s == nil {
		return nil
	}
	out := &v1.ReplaySummary{
		Id:              s.ID.String(),
		SourceKind:      v1.ReplaySourceKind(s.SourceKind),
		SourceId:        s.SourceID.String(),
		Player1Id:       s.Player1ID.String(),
		Player1Username: s.Player1Username,
		Player2Id:       s.Player2ID.String(),
		Player2Username: s.Player2Username,
		TaskTitle:       s.TaskTitle,
		TaskTopic:       s.TaskTopic,
		TaskDifficulty:  s.TaskDifficulty,
		DurationMs:      s.DurationMs,
		CompletedAt:     timestamppb.New(s.CompletedAt),
	}
	if s.WinnerID != nil {
		out.WinnerId = s.WinnerID.String()
	}
	return out
}

func mapEvent(e *model.DuelReplayEvent) *v1.ReplayEvent {
	if e == nil {
		return nil
	}
	out := &v1.ReplayEvent{
		Id:     e.ID.String(),
		UserId: e.UserID.String(),
		TMs:    e.TMs,
		Kind:   v1.EventKind(e.Kind),
		Label:  e.Label,
	}
	if e.LinesCount != nil {
		out.LinesCount = *e.LinesCount
	}
	return out
}
