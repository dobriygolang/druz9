package codeeditor

import "api/internal/model"

const (
	RoomModeAll        = model.RoomModeAll
	RoomModeDuel       = model.RoomModeDuel
	RoomStatusWaiting  = model.RoomStatusWaiting
	RoomStatusActive   = model.RoomStatusActive
	RoomStatusFinished = model.RoomStatusFinished

	TaskDifficultyEasy   = model.TaskDifficultyEasy
	TaskDifficultyMedium = model.TaskDifficultyMedium
	TaskDifficultyHard   = model.TaskDifficultyHard

	ProgrammingLanguageJavaScript = model.ProgrammingLanguageJavaScript
	ProgrammingLanguageTypeScript = model.ProgrammingLanguageTypeScript
	ProgrammingLanguagePython     = model.ProgrammingLanguagePython
	ProgrammingLanguageGo         = model.ProgrammingLanguageGo
	ProgrammingLanguageRust       = model.ProgrammingLanguageRust
	ProgrammingLanguageCpp        = model.ProgrammingLanguageCpp
	ProgrammingLanguageJava       = model.ProgrammingLanguageJava
	ProgrammingLanguageSQL        = model.ProgrammingLanguageSQL

	TaskTypeAlgorithm   = model.TaskTypeAlgorithm
	TaskTypeDebugging   = model.TaskTypeDebugging
	TaskTypeRefactoring = model.TaskTypeRefactoring
)

type (
	Room             = model.Room
	RoomEditorState  = model.RoomEditorState
	DuelEditorState  = model.DuelEditorState
	Participant      = model.Participant
	Submission       = model.Submission
	Task             = model.CodeTask
	TestCase         = model.CodeTestCase
	TaskFilter       = model.CodeTaskFilter
	LeaderboardEntry = model.CodeLeaderboardEntry
)
