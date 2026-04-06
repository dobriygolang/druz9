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
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_SQL
	default:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_UNSPECIFIED
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
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_SQL:
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

func executionProfileToProto(profile model.ExecutionProfile) v1.ExecutionProfile {
	switch profile {
	case model.ExecutionProfilePure:
		return v1.ExecutionProfile_EXECUTION_PROFILE_PURE
	case model.ExecutionProfileFileIO:
		return v1.ExecutionProfile_EXECUTION_PROFILE_FILE_IO
	case model.ExecutionProfileHTTPClient:
		return v1.ExecutionProfile_EXECUTION_PROFILE_HTTP_CLIENT
	case model.ExecutionProfileInterviewRealistic:
		return v1.ExecutionProfile_EXECUTION_PROFILE_INTERVIEW_REALISTIC
	default:
		return v1.ExecutionProfile_EXECUTION_PROFILE_UNSPECIFIED
	}
}

func protoExecutionProfileToModel(profile v1.ExecutionProfile) model.ExecutionProfile {
	switch profile {
	case v1.ExecutionProfile_EXECUTION_PROFILE_PURE:
		return model.ExecutionProfilePure
	case v1.ExecutionProfile_EXECUTION_PROFILE_FILE_IO:
		return model.ExecutionProfileFileIO
	case v1.ExecutionProfile_EXECUTION_PROFILE_HTTP_CLIENT:
		return model.ExecutionProfileHTTPClient
	case v1.ExecutionProfile_EXECUTION_PROFILE_INTERVIEW_REALISTIC:
		return model.ExecutionProfileInterviewRealistic
	default:
		return model.ExecutionProfileUnknown
	}
}

func runnerModeToProto(mode model.RunnerMode) v1.RunnerMode {
	switch mode {
	case model.RunnerModeProgram:
		return v1.RunnerMode_RUNNER_MODE_PROGRAM
	case model.RunnerModeFunctionIO:
		return v1.RunnerMode_RUNNER_MODE_FUNCTION_IO
	default:
		return v1.RunnerMode_RUNNER_MODE_UNSPECIFIED
	}
}

func protoRunnerModeToModel(mode v1.RunnerMode) model.RunnerMode {
	switch mode {
	case v1.RunnerMode_RUNNER_MODE_PROGRAM:
		return model.RunnerModeProgram
	case v1.RunnerMode_RUNNER_MODE_FUNCTION_IO:
		return model.RunnerModeFunctionIO
	default:
		return model.RunnerModeUnknown
	}
}
