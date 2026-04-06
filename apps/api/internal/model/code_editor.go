package model

import (
	"time"

	"github.com/google/uuid"
)

// RoomMode represents the room type
type RoomMode int

const (
	RoomModeUnknown RoomMode = iota
	RoomModeAll              // collaborative mode
	RoomModeDuel             // duel mode (two users race)
)

func (m RoomMode) String() string {
	switch m {
	case RoomModeAll:
		return "all"
	case RoomModeDuel:
		return "duel"
	default:
		return ""
	}
}

func RoomModeFromString(s string) RoomMode {
	switch s {
	case "all":
		return RoomModeAll
	case "duel":
		return RoomModeDuel
	default:
		return RoomModeUnknown
	}
}

// RoomStatus represents the room status
type RoomStatus int

const (
	RoomStatusUnknown  RoomStatus = iota
	RoomStatusWaiting             // waiting for participants
	RoomStatusActive              // room is active
	RoomStatusFinished            // duel finished
)

func (s RoomStatus) String() string {
	switch s {
	case RoomStatusWaiting:
		return "waiting"
	case RoomStatusActive:
		return "active"
	case RoomStatusFinished:
		return "finished"
	default:
		return ""
	}
}

func RoomStatusFromString(str string) RoomStatus {
	switch str {
	case "waiting":
		return RoomStatusWaiting
	case "active":
		return RoomStatusActive
	case "finished":
		return RoomStatusFinished
	default:
		return RoomStatusUnknown
	}
}

// TaskDifficulty represents task difficulty level
type TaskDifficulty int

const (
	TaskDifficultyUnknown TaskDifficulty = iota
	TaskDifficultyEasy
	TaskDifficultyMedium
	TaskDifficultyHard
)

func (d TaskDifficulty) String() string {
	switch d {
	case TaskDifficultyEasy:
		return "easy"
	case TaskDifficultyMedium:
		return "medium"
	case TaskDifficultyHard:
		return "hard"
	default:
		return ""
	}
}

func TaskDifficultyFromString(s string) TaskDifficulty {
	switch s {
	case "easy":
		return TaskDifficultyEasy
	case "medium":
		return TaskDifficultyMedium
	case "hard":
		return TaskDifficultyHard
	default:
		return TaskDifficultyUnknown
	}
}

// ProgrammingLanguage represents supported programming languages
type ProgrammingLanguage int

const (
	ProgrammingLanguageUnknown ProgrammingLanguage = iota
	ProgrammingLanguageJavaScript
	ProgrammingLanguageTypeScript
	ProgrammingLanguagePython
	ProgrammingLanguageGo
	ProgrammingLanguageRust
	ProgrammingLanguageCpp
	ProgrammingLanguageJava
	ProgrammingLanguageSQL
)

func (l ProgrammingLanguage) String() string {
	switch l {
	case ProgrammingLanguageJavaScript:
		return "javascript"
	case ProgrammingLanguageTypeScript:
		return "typescript"
	case ProgrammingLanguagePython:
		return "python"
	case ProgrammingLanguageGo:
		return "go"
	case ProgrammingLanguageRust:
		return "rust"
	case ProgrammingLanguageCpp:
		return "cpp"
	case ProgrammingLanguageJava:
		return "java"
	case ProgrammingLanguageSQL:
		return "sql"
	default:
		return ""
	}
}

func ProgrammingLanguageFromString(s string) ProgrammingLanguage {
	switch s {
	case "javascript":
		return ProgrammingLanguageJavaScript
	case "typescript":
		return ProgrammingLanguageTypeScript
	case "python":
		return ProgrammingLanguagePython
	case "go":
		return ProgrammingLanguageGo
	case "rust":
		return ProgrammingLanguageRust
	case "cpp":
		return ProgrammingLanguageCpp
	case "java":
		return ProgrammingLanguageJava
	case "sql":
		return ProgrammingLanguageSQL
	default:
		return ProgrammingLanguageUnknown
	}
}

// TaskType represents the type of coding task
type TaskType int

const (
	TaskTypeUnknown TaskType = iota
	TaskTypeAlgorithm
	TaskTypeDebugging
	TaskTypeRefactoring
)

func (t TaskType) String() string {
	switch t {
	case TaskTypeAlgorithm:
		return "algorithm"
	case TaskTypeDebugging:
		return "debugging"
	case TaskTypeRefactoring:
		return "refactoring"
	default:
		return ""
	}
}

func TaskTypeFromString(s string) TaskType {
	switch s {
	case "algorithm":
		return TaskTypeAlgorithm
	case "debugging":
		return TaskTypeDebugging
	case "refactoring":
		return TaskTypeRefactoring
	default:
		return TaskTypeUnknown
	}
}

type ExecutionProfile int

const (
	ExecutionProfileUnknown ExecutionProfile = iota
	ExecutionProfilePure
	ExecutionProfileFileIO
	ExecutionProfileHTTPClient
	ExecutionProfileInterviewRealistic
)

func (p ExecutionProfile) String() string {
	switch p {
	case ExecutionProfilePure:
		return "pure"
	case ExecutionProfileFileIO:
		return "file_io"
	case ExecutionProfileHTTPClient:
		return "http_client"
	case ExecutionProfileInterviewRealistic:
		return "interview_realistic"
	default:
		return ""
	}
}

func ExecutionProfileFromString(s string) ExecutionProfile {
	switch s {
	case "pure":
		return ExecutionProfilePure
	case "file_io":
		return ExecutionProfileFileIO
	case "http_client":
		return ExecutionProfileHTTPClient
	case "interview_realistic":
		return ExecutionProfileInterviewRealistic
	default:
		return ExecutionProfileUnknown
	}
}

type RunnerMode int

const (
	RunnerModeUnknown RunnerMode = iota
	RunnerModeProgram
	RunnerModeFunctionIO
)

func (m RunnerMode) String() string {
	switch m {
	case RunnerModeProgram:
		return "program"
	case RunnerModeFunctionIO:
		return "function_io"
	default:
		return ""
	}
}

func RunnerModeFromString(s string) RunnerMode {
	switch s {
	case "program":
		return RunnerModeProgram
	case "function_io":
		return RunnerModeFunctionIO
	default:
		return RunnerModeUnknown
	}
}

type Room struct {
	ID           uuid.UUID
	Mode         RoomMode
	Code         string // current code
	CodeRevision int64
	Status       RoomStatus
	CreatorID    uuid.UUID // creator user ID (nil for guests)
	InviteCode   string    // public invite code for guests
	Task         string    // task description for duel
	TaskID       *uuid.UUID
	DuelTopic    string
	WinnerUserID *uuid.UUID
	WinnerGuest  string
	StartedAt    *time.Time
	FinishedAt   *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
	IsPrivate    bool // if true, only joinable via invite code
	Participants []*Participant
}

type Participant struct {
	UserID   *uuid.UUID // nil for guests
	Name     string     // display name
	IsGuest  bool       // true if not registered
	IsReady  bool       // ready for duel
	IsWinner bool       // winner in duel mode
	JoinedAt time.Time
}

type Submission struct {
	ID          uuid.UUID
	RoomID      uuid.UUID
	UserID      *uuid.UUID // nil for guests
	GuestName   string
	Code        string
	Output      string
	Error       string
	SubmittedAt time.Time
	DurationMs  int64 // time to solve in duel
	IsCorrect   bool
	PassedCount int32
	TotalCount  int32
}

type CodeTask struct {
	ID               uuid.UUID
	Title            string
	Slug             string
	Statement        string
	Difficulty       TaskDifficulty
	Topics           []string
	StarterCode      string
	Language         ProgrammingLanguage
	TaskType         TaskType
	ExecutionProfile ExecutionProfile
	RunnerMode       RunnerMode
	DurationSeconds  int32  // Duration in seconds for arena matches (default 15 minutes)
	FixtureFiles     []string
	ReadablePaths    []string
	WritablePaths    []string
	AllowedHosts     []string
	AllowedPorts     []int32
	MockEndpoints    []string
	WritableTempDir  bool
	IsActive         bool
	PublicTestCases  []*CodeTestCase
	HiddenTestCases  []*CodeTestCase
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type CodeTestCase struct {
	ID             uuid.UUID
	TaskID         uuid.UUID
	Input          string
	ExpectedOutput string
	IsPublic       bool
	Weight         int32
	Order          int32
}

type CodeTaskFilter struct {
	Topic           string
	Difficulty      string
	IncludeInactive bool
}

type CodeLeaderboardEntry struct {
	UserID      string
	DisplayName string
	Wins        int32
	Matches     int32
	WinRate     float64
	BestSolveMs int64
}

type CodeUpdatedEvent struct {
	Type   string // "code_updated", "participant_joined", "participant_left", "duel_started", "duel_finished"
	Code   string
	RoomID string
}

type ParticipantEvent struct {
	Type        string
	Participant *Participant
}
