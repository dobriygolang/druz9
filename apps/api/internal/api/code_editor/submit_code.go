package code_editor

import (
	"context"

	"api/internal/metrics"
	realtime "api/internal/realtime/schema"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) SubmitCode(ctx context.Context, req *v1.SubmitCodeRequest) (*v1.SubmitCodeResponse, error) {
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}

	userID, guestName, _ := resolveActor(ctx, "")
	submission, err := i.service.SubmitCode(ctx, roomID, userID, guestName, req.Code)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	var exitCode int32
	if submission.Error != "" {
		exitCode = 1
	}
	submittedBy := submission.GuestName
	if submission.UserID != nil {
		submittedBy = submission.UserID.String()
	}
	i.realtime.PublishSubmission(roomID.String(), &realtime.CodeEditorSubmissionEvent{
		Output:      submission.Output,
		Error:       submission.Error,
		ExitCode:    exitCode,
		SubmittedBy: submittedBy,
	})

	if room, getErr := i.service.GetRoom(ctx, roomID); getErr == nil {
		i.realtime.PublishRoomUpdate(mapRealtimeRoom(room))
	}

	metrics.IncSubmissions("code_editor", "total")
	if submission.IsCorrect {
		metrics.IncSubmissionsAccepted()
	} else {
		metrics.IncSubmissionsRejected()
	}

	return &v1.SubmitCodeResponse{
		Output:    submission.Output,
		Error:     submission.Error,
		IsCorrect: submission.IsCorrect,
	}, nil
}
