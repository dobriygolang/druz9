package interview_prep

import (
	"context"

	v1 "api/pkg/api/interview_prep/v1"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) GetCheckpointBySession(ctx context.Context, req *v1.GetCheckpointBySessionRequest) (*v1.CheckpointSessionResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	sessionID, err := uuid.Parse(req.SessionId)
	if err != nil {
		return nil, kratosErrors.BadRequest("INVALID_SESSION_ID", "bad session id")
	}
	checkpoint, err := i.service.GetCheckpointBySession(ctx, user, sessionID)
	if err != nil {
		return nil, mapCheckpointErr(err)
	}
	return &v1.CheckpointSessionResponse{Checkpoint: mapCheckpoint(checkpoint)}, nil
}
