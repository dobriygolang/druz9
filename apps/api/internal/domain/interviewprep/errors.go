package interviewprep

import "errors"

var (
	ErrTaskNotFound      = errors.New("interview prep task not found")
	ErrSessionNotFound   = errors.New("interview prep session not found")
	ErrQuestionNotFound  = errors.New("interview prep question not found")
	ErrSessionFinished   = errors.New("interview prep session already finished")
	ErrSubmitNotAllowed  = errors.New("submit is not allowed for this task type")
	ErrQuestionLocked    = errors.New("question is locked")
	ErrInvalidAssessment = errors.New("invalid self assessment")
)
