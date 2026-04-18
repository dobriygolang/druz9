package interview_prep

import (
	"context"

	appinterviewprep "api/internal/app/interviewprep"
	notif "api/internal/clients/notification"
	interviewprepdata "api/internal/data/interviewprep"
	"api/internal/model"
	v1 "api/pkg/api/interview_prep/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

type Service interface {
	ListTasks(ctx context.Context, user *model.User) ([]*model.InterviewPrepTask, error)
	GetAvailableCompanies(ctx context.Context) ([]string, error)
	ListMockBlueprints(ctx context.Context) ([]*model.InterviewMockBlueprintSummary, error)
	StartSession(ctx context.Context, user *model.User, taskID uuid.UUID) (*model.InterviewPrepSession, error)
	GetSession(ctx context.Context, user *model.User, sessionID uuid.UUID) (*model.InterviewPrepSession, error)
	StartMockSession(ctx context.Context, user *model.User, companyTag string, programSlug string) (*model.InterviewPrepMockSession, error)
	GetMockSession(ctx context.Context, user *model.User, sessionID uuid.UUID) (*model.InterviewPrepMockSession, error)
	SubmitMockStage(ctx context.Context, user *model.User, sessionID uuid.UUID, code string, solveLanguage string, notes string, stageKind string) (*appinterviewprep.MockSubmitResult, error)
	ReviewMockSystemDesign(ctx context.Context, user *model.User, sessionID uuid.UUID, fileName string, contentType string, imageBytes []byte, req appinterviewprep.SystemDesignReviewInput) (*appinterviewprep.MockSystemDesignReviewResult, error)
	AnswerMockQuestion(ctx context.Context, user *model.User, sessionID uuid.UUID, answer string) (*appinterviewprep.MockQuestionAnswerResult, error)
	AbortMockSession(ctx context.Context, user *model.User, sessionID uuid.UUID) error
	Submit(ctx context.Context, user *model.User, sessionID uuid.UUID, code string, solveLanguage string) (*appinterviewprep.SubmitResult, error)
	ReviewSystemDesign(ctx context.Context, user *model.User, sessionID uuid.UUID, fileName string, contentType string, imageBytes []byte, req appinterviewprep.SystemDesignReviewInput) (*appinterviewprep.SystemDesignReviewResult, error)
	AnswerQuestion(ctx context.Context, user *model.User, sessionID, questionID uuid.UUID, assessment string, answer string) (*appinterviewprep.QuestionAnswerResult, error)
}

type AdminRepo interface {
	ListAllTasks(ctx context.Context) ([]*model.InterviewPrepTask, error)
	CreateTask(ctx context.Context, task *model.InterviewPrepTask) error
	UpdateTask(ctx context.Context, task *model.InterviewPrepTask) error
	DeleteTask(ctx context.Context, taskID uuid.UUID) error
	GetTask(ctx context.Context, taskID uuid.UUID) (*model.InterviewPrepTask, error)
	ListQuestionsByTask(ctx context.Context, taskID uuid.UUID) ([]*model.InterviewPrepQuestion, error)
	CreateQuestion(ctx context.Context, question *model.InterviewPrepQuestion) error
	UpdateQuestion(ctx context.Context, question *model.InterviewPrepQuestion) error
	DeleteQuestion(ctx context.Context, questionID uuid.UUID) error
	ListMockQuestionPools(ctx context.Context) ([]*model.InterviewPrepMockQuestionPoolItem, error)
	CreateMockQuestionPool(ctx context.Context, item *model.InterviewPrepMockQuestionPoolItem) error
	UpdateMockQuestionPool(ctx context.Context, item *model.InterviewPrepMockQuestionPoolItem) error
	DeleteMockQuestionPool(ctx context.Context, itemID uuid.UUID) error
	ListMockCompanyPresets(ctx context.Context) ([]*model.InterviewPrepMockCompanyPreset, error)
	CreateMockCompanyPreset(ctx context.Context, item *model.InterviewPrepMockCompanyPreset) error
	UpdateMockCompanyPreset(ctx context.Context, item *model.InterviewPrepMockCompanyPreset) error
	DeleteMockCompanyPreset(ctx context.Context, itemID uuid.UUID) error

	// Interview Experience Board (killer feature #5). Kept on the
	// existing AdminRepo interface to avoid adding a whole new repo
	// dep — the underlying *interviewprepdata.Repo implements all of
	// these. Moderation flow is intentionally minimal for MVP: every
	// post lands as moderation_status='approved' (see handler).
	InsertInterviewExperience(ctx context.Context, row *interviewprepdata.InterviewExperienceRow) (*interviewprepdata.InterviewExperienceRow, error)
	ListApprovedExperiences(ctx context.Context, companyTag string, limit, offset int32) ([]*interviewprepdata.InterviewExperienceRow, int32, error)
}

// Implementation of interview_prep service.
type Implementation struct {
	v1.UnimplementedInterviewPrepServiceServer
	service Service
	admin   AdminRepo
	notif   notif.Sender
}

// New returns new instance of Implementation.
func New(service Service, admin AdminRepo, n notif.Sender) *Implementation {
	return &Implementation{service: service, admin: admin, notif: n}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.InterviewPrepService_ServiceDesc
}
