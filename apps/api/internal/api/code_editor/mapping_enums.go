package code_editor

import (
	"api/internal/model"
	v1 "api/pkg/api/code_editor/v1"
)

func modelDifficultyToProto(difficulty model.TaskDifficulty) v1.TaskDifficulty {
	switch difficulty {
	case model.TaskDifficultyEasy:
		return v1.TaskDifficulty_TASK_DIFFICULTY_EASY
	case model.TaskDifficultyMedium:
		return v1.TaskDifficulty_TASK_DIFFICULTY_MEDIUM
	case model.TaskDifficultyHard:
		return v1.TaskDifficulty_TASK_DIFFICULTY_HARD
	default:
		return v1.TaskDifficulty_TASK_DIFFICULTY_UNSPECIFIED
	}
}

func modelLanguageToProto(language model.ProgrammingLanguage) v1.ProgrammingLanguage {
	switch language {
	case model.ProgrammingLanguageJavaScript:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVASCRIPT
	case model.ProgrammingLanguageTypeScript:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_TYPESCRIPT
	case model.ProgrammingLanguagePython:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_PYTHON
	case model.ProgrammingLanguageGo:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_GO
	case model.ProgrammingLanguageRust:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_RUST
	case model.ProgrammingLanguageCpp:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_CPP
	case model.ProgrammingLanguageJava:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVA
	case model.ProgrammingLanguageSQL:
		return v1.ProgrammingLanguage(8)
	default:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_UNSPECIFIED
	}
}

func modelTaskTypeToProto(taskType model.TaskType) v1.TaskType {
	switch taskType {
	case model.TaskTypeAlgorithm:
		return v1.TaskType_TASK_TYPE_ALGORITHM
	case model.TaskTypeDebugging:
		return v1.TaskType_TASK_TYPE_DEBUGGING
	case model.TaskTypeRefactoring:
		return v1.TaskType_TASK_TYPE_REFACTORING
	default:
		return v1.TaskType_TASK_TYPE_UNSPECIFIED
	}
}

func roomModeToProto(mode model.RoomMode) v1.RoomMode {
	switch mode {
	case model.RoomModeAll:
		return v1.RoomMode_ROOM_MODE_ALL
	case model.RoomModeDuel:
		return v1.RoomMode_ROOM_MODE_DUEL
	default:
		return v1.RoomMode_ROOM_MODE_UNSPECIFIED
	}
}

func roomStatusToProto(status model.RoomStatus) v1.RoomStatus {
	switch status {
	case model.RoomStatusWaiting:
		return v1.RoomStatus_ROOM_STATUS_WAITING
	case model.RoomStatusActive:
		return v1.RoomStatus_ROOM_STATUS_ACTIVE
	case model.RoomStatusFinished:
		return v1.RoomStatus_ROOM_STATUS_FINISHED
	default:
		return v1.RoomStatus_ROOM_STATUS_UNSPECIFIED
	}
}
