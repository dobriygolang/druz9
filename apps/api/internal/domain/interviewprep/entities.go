package interviewprep

import "api/internal/model"

type Task = model.InterviewPrepTask
type Question = model.InterviewPrepQuestion
type Session = model.InterviewPrepSession
type QuestionResult = model.InterviewPrepQuestionResult

type PrepType = model.InterviewPrepType
type SessionStatus = model.InterviewPrepSessionStatus
type SelfAssessment = model.InterviewPrepSelfAssessment

const (
	PrepTypeCoding       = model.InterviewPrepTypeCoding
	PrepTypeAlgorithm    = model.InterviewPrepTypeAlgorithm
	PrepTypeSystemDesign = model.InterviewPrepTypeSystemDesign
	PrepTypeSQL          = model.InterviewPrepTypeSQL
	PrepTypeCodeReview   = model.InterviewPrepTypeCodeReview

	SessionStatusActive   = model.InterviewPrepSessionStatusActive
	SessionStatusFinished = model.InterviewPrepSessionStatusFinished

	SelfAssessmentAnswered = model.InterviewPrepSelfAssessmentAnswered
	SelfAssessmentSkipped  = model.InterviewPrepSelfAssessmentSkipped
)