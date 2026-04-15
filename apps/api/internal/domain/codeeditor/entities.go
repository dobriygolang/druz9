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

type Room = model.Room
type RoomEditorState = model.RoomEditorState
type DuelEditorState = model.DuelEditorState
type Participant = model.Participant
type Submission = model.Submission
type Task = model.CodeTask
type TestCase = model.CodeTestCase
type TaskFilter = model.CodeTaskFilter
type LeaderboardEntry = model.CodeLeaderboardEntry
