package model

import (
	"time"

	"github.com/google/uuid"
)

type InterviewPrepType string

const (
	InterviewPrepTypeUnknown      InterviewPrepType = ""
	InterviewPrepTypeCoding       InterviewPrepType = "coding"
	InterviewPrepTypeAlgorithm    InterviewPrepType = "algorithm"
	InterviewPrepTypeSystemDesign InterviewPrepType = "system_design"
	InterviewPrepTypeSQL          InterviewPrepType = "sql"
	InterviewPrepTypeCodeReview   InterviewPrepType = "code_review"
	InterviewPrepTypeBehavioral   InterviewPrepType = "behavioral"
)

func (t InterviewPrepType) String() string {
	return string(t)
}

func InterviewPrepTypeFromString(v string) InterviewPrepType {
	switch v {
	case "coding":
		return InterviewPrepTypeCoding
	case "algorithm":
		return InterviewPrepTypeAlgorithm
	case "system_design":
		return InterviewPrepTypeSystemDesign
	case "sql":
		return InterviewPrepTypeSQL
	case "code_review":
		return InterviewPrepTypeCodeReview
	case "behavioral":
		return InterviewPrepTypeBehavioral
	default:
		return InterviewPrepTypeUnknown
	}
}

func InterviewPrepTypeFromRoundType(v string) InterviewPrepType {
	switch v {
	case "coding_algorithmic":
		return InterviewPrepTypeAlgorithm
	case "coding_practical":
		return InterviewPrepTypeCoding
	case "sql":
		return InterviewPrepTypeSQL
	case "system_design":
		return InterviewPrepTypeSystemDesign
	case "code_review":
		return InterviewPrepTypeCodeReview
	case "behavioral":
		return InterviewPrepTypeBehavioral
	default:
		return InterviewPrepTypeUnknown
	}
}

type InterviewPrepSessionStatus string

const (
	InterviewPrepSessionStatusUnknown  InterviewPrepSessionStatus = ""
	InterviewPrepSessionStatusActive   InterviewPrepSessionStatus = "active"
	InterviewPrepSessionStatusFinished InterviewPrepSessionStatus = "finished"
)

func (s InterviewPrepSessionStatus) String() string {
	return string(s)
}

func InterviewPrepSessionStatusFromString(v string) InterviewPrepSessionStatus {
	switch v {
	case "active":
		return InterviewPrepSessionStatusActive
	case "finished":
		return InterviewPrepSessionStatusFinished
	default:
		return InterviewPrepSessionStatusUnknown
	}
}

type InterviewPrepMockSessionStatus string

const (
	InterviewPrepMockSessionStatusUnknown  InterviewPrepMockSessionStatus = ""
	InterviewPrepMockSessionStatusActive   InterviewPrepMockSessionStatus = "active"
	InterviewPrepMockSessionStatusFinished InterviewPrepMockSessionStatus = "finished"
)

func (s InterviewPrepMockSessionStatus) String() string {
	return string(s)
}

func InterviewPrepMockSessionStatusFromString(v string) InterviewPrepMockSessionStatus {
	switch v {
	case "active":
		return InterviewPrepMockSessionStatusActive
	case "finished":
		return InterviewPrepMockSessionStatusFinished
	default:
		return InterviewPrepMockSessionStatusUnknown
	}
}

type InterviewPrepMockStageKind string

const (
	InterviewPrepMockStageKindUnknown      InterviewPrepMockStageKind = ""
	InterviewPrepMockStageKindSlices       InterviewPrepMockStageKind = "slices"
	InterviewPrepMockStageKindConcurrency  InterviewPrepMockStageKind = "concurrency"
	InterviewPrepMockStageKindSQL          InterviewPrepMockStageKind = "sql"
	InterviewPrepMockStageKindArchitecture InterviewPrepMockStageKind = "architecture"
	InterviewPrepMockStageKindSystemDesign InterviewPrepMockStageKind = "system_design"
)

func (k InterviewPrepMockStageKind) String() string {
	return string(k)
}

func InterviewPrepMockStageKindFromString(v string) InterviewPrepMockStageKind {
	switch v {
	case "slices":
		return InterviewPrepMockStageKindSlices
	case "concurrency":
		return InterviewPrepMockStageKindConcurrency
	case "sql":
		return InterviewPrepMockStageKindSQL
	case "architecture":
		return InterviewPrepMockStageKindArchitecture
	case "system_design":
		return InterviewPrepMockStageKindSystemDesign
	default:
		return InterviewPrepMockStageKindUnknown
	}
}

func InterviewPrepMockStageKindFromRoundType(v string) InterviewPrepMockStageKind {
	switch v {
	case "coding_algorithmic":
		return InterviewPrepMockStageKindSlices
	case "coding_practical":
		return InterviewPrepMockStageKindConcurrency
	case "sql":
		return InterviewPrepMockStageKindSQL
	case "system_design":
		return InterviewPrepMockStageKindSystemDesign
	case "behavioral", "code_review":
		return InterviewPrepMockStageKindArchitecture
	default:
		return InterviewPrepMockStageKindUnknown
	}
}

type InterviewPrepMockStageStatus string

const (
	InterviewPrepMockStageStatusUnknown   InterviewPrepMockStageStatus = ""
	InterviewPrepMockStageStatusPending   InterviewPrepMockStageStatus = "pending"
	InterviewPrepMockStageStatusSolving   InterviewPrepMockStageStatus = "solving"
	InterviewPrepMockStageStatusQuestions InterviewPrepMockStageStatus = "questions"
	InterviewPrepMockStageStatusCompleted InterviewPrepMockStageStatus = "completed"
)

func (s InterviewPrepMockStageStatus) String() string {
	return string(s)
}

type InterviewPrepCheckpointStatus string

const (
	InterviewPrepCheckpointStatusUnknown InterviewPrepCheckpointStatus = ""
	InterviewPrepCheckpointStatusActive  InterviewPrepCheckpointStatus = "active"
	InterviewPrepCheckpointStatusPassed  InterviewPrepCheckpointStatus = "passed"
	InterviewPrepCheckpointStatusFailed  InterviewPrepCheckpointStatus = "failed"
	InterviewPrepCheckpointStatusExpired InterviewPrepCheckpointStatus = "expired"
)

func (s InterviewPrepCheckpointStatus) String() string {
	return string(s)
}

func InterviewPrepCheckpointStatusFromString(v string) InterviewPrepCheckpointStatus {
	switch v {
	case "active":
		return InterviewPrepCheckpointStatusActive
	case "passed":
		return InterviewPrepCheckpointStatusPassed
	case "failed":
		return InterviewPrepCheckpointStatusFailed
	case "expired":
		return InterviewPrepCheckpointStatusExpired
	default:
		return InterviewPrepCheckpointStatusUnknown
	}
}

func InterviewPrepMockStageStatusFromString(v string) InterviewPrepMockStageStatus {
	switch v {
	case "pending":
		return InterviewPrepMockStageStatusPending
	case "solving":
		return InterviewPrepMockStageStatusSolving
	case "questions":
		return InterviewPrepMockStageStatusQuestions
	case "completed":
		return InterviewPrepMockStageStatusCompleted
	default:
		return InterviewPrepMockStageStatusUnknown
	}
}

type InterviewPrepSelfAssessment string

const (
	InterviewPrepSelfAssessmentUnknown  InterviewPrepSelfAssessment = ""
	InterviewPrepSelfAssessmentAnswered InterviewPrepSelfAssessment = "answered"
	InterviewPrepSelfAssessmentSkipped  InterviewPrepSelfAssessment = "skipped"
)

func (s InterviewPrepSelfAssessment) String() string {
	return string(s)
}

func InterviewPrepSelfAssessmentFromString(v string) InterviewPrepSelfAssessment {
	switch v {
	case "answered":
		return InterviewPrepSelfAssessmentAnswered
	case "skipped":
		return InterviewPrepSelfAssessmentSkipped
	default:
		return InterviewPrepSelfAssessmentUnknown
	}
}

type InterviewPrepTask struct {
	ID                 uuid.UUID
	Slug               string
	Title              string
	Statement          string
	PrepType           InterviewPrepType
	Language           string
	CompanyTag         string
	SupportedLanguages []string
	IsExecutable       bool
	ExecutionProfile   string
	RunnerMode         string
	DurationSeconds    int32
	StarterCode        string
	ReferenceSolution  string
	CodeTaskID         *uuid.UUID
	IsActive           bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type InterviewPrepQuestion struct {
	ID        uuid.UUID
	TaskID    uuid.UUID
	Position  int32
	Prompt    string
	Answer    string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type InterviewPrepQuestionResult struct {
	ID             uuid.UUID
	SessionID      uuid.UUID
	QuestionID     uuid.UUID
	Position       int32
	PromptSnapshot string
	AnswerSnapshot string
	SelfAssessment InterviewPrepSelfAssessment
	AnsweredAt     time.Time
}

type InterviewPrepSession struct {
	ID                      uuid.UUID
	UserID                  uuid.UUID
	TaskID                  uuid.UUID
	Status                  InterviewPrepSessionStatus
	CurrentQuestionPosition int32
	SolveLanguage           string
	Code                    string
	LastSubmissionPassed    bool
	StartedAt               time.Time
	FinishedAt              *time.Time
	CreatedAt               time.Time
	UpdatedAt               time.Time

	Task            *InterviewPrepTask
	Questions       []*InterviewPrepQuestion
	CurrentQuestion *InterviewPrepQuestion
	Results         []*InterviewPrepQuestionResult
}

type InterviewPrepCheckpoint struct {
	ID              uuid.UUID
	UserID          uuid.UUID
	TaskID          uuid.UUID
	SessionID       uuid.UUID
	SkillKey        string
	Status          InterviewPrepCheckpointStatus
	DurationSeconds int32
	AttemptsUsed    int32
	MaxAttempts     int32
	Score           int32
	StartedAt       time.Time
	FinishedAt      *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type InterviewPrepMockQuestionResult struct {
	ID              uuid.UUID
	StageID         uuid.UUID
	Position        int32
	QuestionKey     string
	Prompt          string
	ReferenceAnswer string
	Score           int32
	Summary         string
	AnsweredAt      *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type InterviewPrepMockStage struct {
	ID                   uuid.UUID
	SessionID            uuid.UUID
	StageIndex           int32
	Kind                 InterviewPrepMockStageKind
	Status               InterviewPrepMockStageStatus
	TaskID               uuid.UUID
	BlueprintRoundID     *uuid.UUID
	SourcePoolID         *uuid.UUID
	SolveLanguage        string
	Code                 string
	LastSubmissionPassed bool
	ReviewScore          int32
	ReviewSummary        string
	StartedAt            time.Time
	FinishedAt           *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time

	Task            *InterviewPrepTask
	QuestionResults []*InterviewPrepMockQuestionResult
	CurrentQuestion *InterviewPrepMockQuestionResult
}

type InterviewPrepMockSession struct {
	ID                uuid.UUID
	UserID            uuid.UUID
	CompanyTag        string
	BlueprintSlug     string
	BlueprintTitle    string
	TrackSlug         string
	Status            InterviewPrepMockSessionStatus
	CurrentStageIndex int32
	StartedAt         time.Time
	FinishedAt        *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time

	Stages       []*InterviewPrepMockStage
	CurrentStage *InterviewPrepMockStage
}

type InterviewPrepMockQuestionPoolItem struct {
	ID              uuid.UUID
	Topic           string
	CompanyTag      string
	QuestionKey     string
	Prompt          string
	ReferenceAnswer string
	Position        int32
	AlwaysAsk       bool
	IsActive        bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type InterviewPrepMockCompanyPreset struct {
	ID              uuid.UUID
	CompanyTag      string
	StageKind       InterviewPrepMockStageKind
	Position        int32
	TaskSlugPattern string
	AIModelOverride string
	IsActive        bool
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type InterviewMockBlueprintSummary struct {
	ID                   uuid.UUID
	TrackSlug            string
	Slug                 string
	Title                string
	Description          string
	Level                string
	TotalDurationSeconds int32
	PublicAliasSlugs     []string
	PublicAliasNames     []string
}

type InterviewMockBlueprint struct {
	ID                   uuid.UUID
	TrackID              uuid.UUID
	TrackSlug            string
	Slug                 string
	Title                string
	Description          string
	Level                string
	RuntimeMode          string
	TotalDurationSeconds int32
	IntroText            string
	ClosingText          string
	IsActive             bool
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type InterviewBlueprintRound struct {
	ID                              uuid.UUID
	BlueprintID                     uuid.UUID
	Position                        int32
	RoundType                       string
	Title                           string
	SelectionMode                   string
	FixedItemID                     *uuid.UUID
	PoolID                          *uuid.UUID
	DurationSeconds                 int32
	EvaluatorMode                   string
	MaxFollowupCount                int32
	CandidateInstructionsOverride   string
	InterviewerInstructionsOverride string
	IsActive                        bool
	CreatedAt                       time.Time
	UpdatedAt                       time.Time
}
