package interview_prep

import (
	"errors"

	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/model"
	v1 "api/pkg/api/interview_prep/v1"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapCheckpoint(cp *model.InterviewPrepCheckpoint) *v1.CheckpointProgress {
	if cp == nil {
		return nil
	}
	out := &v1.CheckpointProgress{
		Id:              cp.ID.String(),
		UserId:          cp.UserID.String(),
		TaskId:          cp.TaskID.String(),
		SessionId:       cp.SessionID.String(),
		SkillKey:        cp.SkillKey,
		Status:          string(cp.Status),
		DurationSeconds: cp.DurationSeconds,
		AttemptsUsed:    cp.AttemptsUsed,
		MaxAttempts:     cp.MaxAttempts,
		Score:           cp.Score,
		StartedAt:       timestamppb.New(cp.StartedAt),
		CreatedAt:       timestamppb.New(cp.CreatedAt),
		UpdatedAt:       timestamppb.New(cp.UpdatedAt),
	}
	if cp.FinishedAt != nil {
		out.FinishedAt = timestamppb.New(*cp.FinishedAt)
	}
	return out
}

func mapCheckpointErr(err error) error {
	switch {
	case errors.Is(err, appinterviewprep.ErrTaskNotFound), errors.Is(err, appinterviewprep.ErrCheckpointNotFound):
		return kratosErrors.NotFound("NOT_FOUND", err.Error())
	case errors.Is(err, appinterviewprep.ErrCheckpointUnsupported):
		return kratosErrors.BadRequest("UNSUPPORTED", err.Error())
	case errors.Is(err, appinterviewprep.ErrCheckpointExpired), errors.Is(err, appinterviewprep.ErrCheckpointAttemptsExceeded):
		return kratosErrors.Conflict("CHECKPOINT_CONFLICT", err.Error())
	default:
		return err
	}
}
