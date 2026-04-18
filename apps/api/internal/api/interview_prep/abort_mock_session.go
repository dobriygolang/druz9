package interview_prep

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/interview_prep/v1"
)

func (i *Implementation) AbortMockSession(ctx context.Context, req *v1.AbortMockSessionRequest) (*v1.StatusResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	sessionID, err := parseUUID(req.GetSessionId(), "INVALID_SESSION_ID", "invalid session id")
	if err != nil {
		return nil, fmt.Errorf("parse session id: %w", err)
	}
	if err := i.service.AbortMockSession(ctx, user, sessionID); err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.StatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_ABORTED}, nil
}