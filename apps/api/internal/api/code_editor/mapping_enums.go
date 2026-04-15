package code_editor

import (
	"api/internal/model"
	v1 "api/pkg/api/code_editor/v1"
	commonv1 "api/pkg/api/common/v1"
)

func modelDifficultyToProto(difficulty model.TaskDifficulty) commonv1.Difficulty {
	switch difficulty {
	case model.TaskDifficultyEasy:
		return commonv1.Difficulty_DIFFICULTY_EASY
	case model.TaskDifficultyMedium:
		return commonv1.Difficulty_DIFFICULTY_MEDIUM
	case model.TaskDifficultyHard:
		return commonv1.Difficulty_DIFFICULTY_HARD
	default:
		return commonv1.Difficulty_DIFFICULTY_UNSPECIFIED
	}
}

func protoDifficultyToModel(difficulty commonv1.Difficulty) model.TaskDifficulty {
	switch difficulty {
	case commonv1.Difficulty_DIFFICULTY_EASY:
		return model.TaskDifficultyEasy
	case commonv1.Difficulty_DIFFICULTY_MEDIUM:
		return model.TaskDifficultyMedium
	case commonv1.Difficulty_DIFFICULTY_HARD:
		return model.TaskDifficultyHard
	default:
		return model.TaskDifficultyUnknown
	}
}

func modelLanguageToProto(language model.ProgrammingLanguage) commonv1.ProgrammingLanguage {
	switch language {
	case model.ProgrammingLanguageJavaScript:
		return commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVASCRIPT
	case model.ProgrammingLanguageTypeScript:
		return commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_TYPESCRIPT
	case model.ProgrammingLanguagePython:
		return commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_PYTHON
	case model.ProgrammingLanguageGo:
		return commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_GO
	case model.ProgrammingLanguageRust:
		return commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_RUST
	case model.ProgrammingLanguageCpp:
		return commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_CPP
	case model.ProgrammingLanguageJava:
		return commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVA
	case model.ProgrammingLanguageSQL:
		return commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_SQL
	default:
		return commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_UNSPECIFIED
	}
}

func protoLanguageToModel(language commonv1.ProgrammingLanguage) model.ProgrammingLanguage {
	switch language {
	case commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVASCRIPT:
		return model.ProgrammingLanguageJavaScript
	case commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_TYPESCRIPT:
		return model.ProgrammingLanguageTypeScript
	case commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_PYTHON:
		return model.ProgrammingLanguagePython
	case commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_GO:
		return model.ProgrammingLanguageGo
	case commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_RUST:
		return model.ProgrammingLanguageRust
	case commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_CPP:
		return model.ProgrammingLanguageCpp
	case commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVA:
		return model.ProgrammingLanguageJava
	case commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_SQL:
		return model.ProgrammingLanguageSQL
	default:
		return model.ProgrammingLanguageUnknown
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

func executionProfileToProto(profile model.ExecutionProfile) commonv1.ExecutionProfile {
	switch profile {
	case model.ExecutionProfilePure:
		return commonv1.ExecutionProfile_EXECUTION_PROFILE_PURE
	case model.ExecutionProfileFileIO:
		return commonv1.ExecutionProfile_EXECUTION_PROFILE_FILE_IO
	case model.ExecutionProfileHTTPClient:
		return commonv1.ExecutionProfile_EXECUTION_PROFILE_HTTP_CLIENT
	case model.ExecutionProfileInterviewRealistic:
		return commonv1.ExecutionProfile_EXECUTION_PROFILE_INTERVIEW_REALISTIC
	default:
		return commonv1.ExecutionProfile_EXECUTION_PROFILE_UNSPECIFIED
	}
}

func protoExecutionProfileToModel(profile commonv1.ExecutionProfile) model.ExecutionProfile {
	switch profile {
	case commonv1.ExecutionProfile_EXECUTION_PROFILE_PURE:
		return model.ExecutionProfilePure
	case commonv1.ExecutionProfile_EXECUTION_PROFILE_FILE_IO:
		return model.ExecutionProfileFileIO
	case commonv1.ExecutionProfile_EXECUTION_PROFILE_HTTP_CLIENT:
		return model.ExecutionProfileHTTPClient
	case commonv1.ExecutionProfile_EXECUTION_PROFILE_INTERVIEW_REALISTIC:
		return model.ExecutionProfileInterviewRealistic
	default:
		return model.ExecutionProfileUnknown
	}
}

func runnerModeToProto(mode model.RunnerMode) commonv1.RunnerMode {
	switch mode {
	case model.RunnerModeProgram:
		return commonv1.RunnerMode_RUNNER_MODE_PROGRAM
	case model.RunnerModeFunctionIO:
		return commonv1.RunnerMode_RUNNER_MODE_FUNCTION_IO
	default:
		return commonv1.RunnerMode_RUNNER_MODE_UNSPECIFIED
	}
}

func protoRunnerModeToModel(mode commonv1.RunnerMode) model.RunnerMode {
	switch mode {
	case commonv1.RunnerMode_RUNNER_MODE_PROGRAM:
		return model.RunnerModeProgram
	case commonv1.RunnerMode_RUNNER_MODE_FUNCTION_IO:
		return model.RunnerModeFunctionIO
	default:
		return model.RunnerModeUnknown
	}
}
