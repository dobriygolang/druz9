package code_editor

import (
	"context"

	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
	"api/internal/server"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CreateRoom(ctx context.Context, req *v1.CreateRoomRequest) (*v1.CreateRoomResponse, error) {
	userID, name, isGuest := resolveActor(ctx, req.Name)

	mode := protoRoomModeToModel(req.Mode)
	difficulty := protoDifficultyToModel(req.Difficulty)
	room, err := i.service.CreateRoom(ctx, userID, name, isGuest, mode.String(), req.Topic, difficulty.String())
	if err != nil {
		if errors.Is(err, codeeditordomain.ErrInvalidMode) {
			return nil, errors.BadRequest("INVALID_MODE", "invalid room mode")
		}
		if errors.Is(err, codeeditordomain.ErrNoAvailableTasks) {
			return nil, errors.BadRequest("NO_AVAILABLE_TASKS", "no available tasks for this duel topic")
		}
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	server.IncRoomsCreated()

	return &v1.CreateRoomResponse{
		Room:       mapRoom(room),
		InviteCode: room.InviteCode,
	}, nil
}

func protoRoomModeToModel(mode v1.RoomMode) model.RoomMode {
	switch mode {
	case v1.RoomMode_ROOM_MODE_ALL:
		return model.RoomModeAll
	case v1.RoomMode_ROOM_MODE_DUEL:
		return model.RoomModeDuel
	default:
		return model.RoomModeAll
	}
}

func protoDifficultyToModel(difficulty v1.TaskDifficulty) model.TaskDifficulty {
	switch difficulty {
	case v1.TaskDifficulty_TASK_DIFFICULTY_EASY:
		return model.TaskDifficultyEasy
	case v1.TaskDifficulty_TASK_DIFFICULTY_MEDIUM:
		return model.TaskDifficultyMedium
	case v1.TaskDifficulty_TASK_DIFFICULTY_HARD:
		return model.TaskDifficultyHard
	default:
		return model.TaskDifficultyUnknown
	}
}

func protoLanguageToModel(language v1.ProgrammingLanguage) model.ProgrammingLanguage {
	switch language {
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVASCRIPT:
		return model.ProgrammingLanguageJavaScript
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_TYPESCRIPT:
		return model.ProgrammingLanguageTypeScript
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_PYTHON:
		return model.ProgrammingLanguagePython
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_GO:
		return model.ProgrammingLanguageGo
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_RUST:
		return model.ProgrammingLanguageRust
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_CPP:
		return model.ProgrammingLanguageCpp
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVA:
		return model.ProgrammingLanguageJava
	case v1.ProgrammingLanguage(8):
		return model.ProgrammingLanguageSQL
	default:
		return model.ProgrammingLanguageUnknown
	}
}

func protoTaskTypeToModel(taskType v1.TaskType) model.TaskType {
	switch taskType {
	case v1.TaskType_TASK_TYPE_ALGORITHM:
		return model.TaskTypeAlgorithm
	case v1.TaskType_TASK_TYPE_DEBUGGING:
		return model.TaskTypeDebugging
	case v1.TaskType_TASK_TYPE_REFACTORING:
		return model.TaskTypeRefactoring
	default:
		return model.TaskTypeUnknown
	}
}
