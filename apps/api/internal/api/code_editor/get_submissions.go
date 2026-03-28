package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) GetSubmissions(ctx context.Context, req *v1.GetSubmissionsRequest) (*v1.GetSubmissionsResponse, error) {
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}

	submissions, err := i.service.GetSubmissions(ctx, roomID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	return &v1.GetSubmissionsResponse{
		Submissions: mapSubmissions(submissions),
	}, nil
}