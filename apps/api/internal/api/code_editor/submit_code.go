package code_editor

import (
	"context"

	"api/internal/app/solutionreview"
	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/metrics"
	"api/internal/model"
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
	selectedLanguage := protoLanguageToModel(req.Language)
	if selectedLanguage != model.ProgrammingLanguageUnknown {
		if actorService, ok := i.service.(interface {
			SetEditorLanguage(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, language model.ProgrammingLanguage) (*codeeditordomain.RoomEditorState, error)
		}); ok {
			if _, err := actorService.SetEditorLanguage(ctx, roomID, userID, guestName, selectedLanguage); err != nil {
				return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
			}
		}
	}
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

	room, getErr := i.service.GetRoom(ctx, roomID)
	if getErr == nil {
		i.realtime.PublishRoomUpdate(mapRealtimeRoom(room))
	}

	metrics.IncSubmissions("code_editor", "total")
	if submission.IsCorrect {
		metrics.IncSubmissionsAccepted()
	} else {
		metrics.IncSubmissionsRejected()
	}

	// Trigger post-solve review for authenticated users with a task
	if i.reviewService != nil && userID != nil && room != nil && room.TaskID != nil {
		go i.triggerReview(ctx, submission, room, *userID, req.Code, selectedLanguage)
	}

	return &v1.SubmitCodeResponse{
		Output:       submission.Output,
		Error:        submission.Error,
		IsCorrect:    submission.IsCorrect,
		SubmissionId: submission.ID.String(),
	}, nil
}

// triggerReview starts the post-solve review pipeline asynchronously.
func (i *Implementation) triggerReview(ctx context.Context, submission *codeeditordomain.Submission, room *codeeditordomain.Room, userID uuid.UUID, code string, language model.ProgrammingLanguage) {
	if room.TaskID == nil {
		return
	}

	// Determine source type
	sourceType := model.ReviewSourcePractice
	if room.Mode == model.RoomModeDuel {
		sourceType = model.ReviewSourceDuel
	}
	// Daily challenge detection: rooms with tasks and non-duel mode
	// could be enhanced with explicit daily flag in the future

	// Try to load task metadata for the review
	var taskTitle, taskStatement, taskDifficulty, taskPattern string
	var taskOptimalTime, taskOptimalSpace string
	if taskService, ok := i.service.(interface {
		GetTask(ctx context.Context, taskID uuid.UUID) (*codeeditordomain.Task, error)
	}); ok {
		if task, err := taskService.GetTask(ctx, *room.TaskID); err == nil && task != nil {
			taskTitle = task.Title
			taskStatement = task.Statement
			taskDifficulty = task.Difficulty.String()
			// Pattern and optimal complexity come from new columns (may be empty)
		}
	}

	input := solutionreview.ReviewInput{
		SubmissionID:     submission.ID,
		UserID:           userID,
		TaskID:           *room.TaskID,
		SourceType:       sourceType,
		Code:             code,
		Language:         language.String(),
		IsCorrect:        submission.IsCorrect,
		SolveTimeMs:      submission.DurationMs,
		PassedCount:      submission.PassedCount,
		TotalCount:       submission.TotalCount,
		TaskTitle:        taskTitle,
		TaskStatement:    taskStatement,
		TaskDifficulty:   taskDifficulty,
		TaskPattern:      taskPattern,
		TaskOptimalTime:  taskOptimalTime,
		TaskOptimalSpace: taskOptimalSpace,
	}

	if _, err := i.reviewService.StartReview(ctx, input); err != nil {
		// Non-fatal: review failure should never block submission.
	}
}
