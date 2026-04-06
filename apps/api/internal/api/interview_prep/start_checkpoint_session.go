package interview_prep

import (
	"context"

	v1 "api/pkg/api/interview_prep/v1"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) StartCheckpointSession(ctx context.Context, req *v1.StartCheckpointSessionRequest) (*v1.CheckpointSessionResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	taskID, err := uuid.Parse(req.TaskId)
	if err != nil {
		return nil, kratosErrors.BadRequest("INVALID_TASK_ID", "bad task id")
	}
	session, checkpoint, err := i.service.StartCheckpointSession(ctx, user, taskID)
	if err != nil {
		return nil, mapCheckpointErr(err)
	}
	return &v1.CheckpointSessionResponse{
		Session:    mapSession(session),
		Checkpoint: mapCheckpoint(checkpoint),
	}, nil
}
