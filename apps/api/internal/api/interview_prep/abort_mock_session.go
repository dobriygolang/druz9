package interview_prep

import (
	"context"

	v1 "api/pkg/api/interview_prep/v1"
)

func (i *Implementation) AbortMockSession(ctx context.Context, req *v1.AbortMockSessionRequest) (*v1.StatusResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	sessionID, err := parseUUID(req.SessionId, "INVALID_SESSION_ID", "invalid session id")
	if err != nil {
		return nil, err
	}
	if err := i.service.AbortMockSession(ctx, user, sessionID); err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.StatusResponse{Status: "aborted"}, nil
}
