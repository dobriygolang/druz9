package model

import (
	"time"

	"github.com/google/uuid"
)

type InterviewPrepType string

const (
	InterviewPrepTypeUnknown    InterviewPrepType = ""
	InterviewPrepTypeCoding     InterviewPrepType = "coding"
	InterviewPrepTypeAlgorithm  InterviewPrepType = "algorithm"
	InterviewPrepTypeSystemDesign InterviewPrepType = "system_design"
	InterviewPrepTypeSQL        InterviewPrepType = "sql"
	InterviewPrepTypeCodeReview InterviewPrepType = "code_review"
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
	default:
		return InterviewPrepTypeUnknown
	}
}

type InterviewPrepSessionStatus string

const (
	InterviewPrepSessionStatusActive   InterviewPrepSessionStatus = "active"
	InterviewPrepSessionStatusFinished InterviewPrepSessionStatus = "finished"
)

func (s InterviewPrepSessionStatus) String() string {
	return string(s)
}

func InterviewPrepSessionStatusFromString(v string) InterviewPrepSessionStatus {
	switch v {
	case "finished":
		return InterviewPrepSessionStatusFinished
	default:
		return InterviewPrepSessionStatusActive
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
	ID                uuid.UUID
	Slug              string
	Title             string
	Statement         string
	PrepType          InterviewPrepType
	Language          string
	IsExecutable      bool
	ExecutionProfile  string
	RunnerMode        string
	DurationSeconds   int32
	StarterCode       string
	ReferenceSolution string
	IsActive          bool
	CreatedAt         time.Time
	UpdatedAt         time.Time
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
	SelfAssessment InterviewPrepSelfAssessment
	AnsweredAt     time.Time
}

type InterviewPrepSession struct {
	ID                      uuid.UUID
	UserID                  uuid.UUID
	TaskID                  uuid.UUID
	Status                  InterviewPrepSessionStatus
	CurrentQuestionPosition int32
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
