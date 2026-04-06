package code_editor

import (
	"api/internal/model"
	v1 "api/pkg/api/code_editor/v1"
)

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
