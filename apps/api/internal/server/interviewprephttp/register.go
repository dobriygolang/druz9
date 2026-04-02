package interviewprephttp

import (
	"context"
	"net/http"
	"regexp"
	"strings"

	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/model"

	"github.com/google/uuid"
)

const (
	TasksPath        = "/api/v1/interview-prep/tasks"
	SessionsPath     = "/api/v1/interview-prep/sessions"
	MockSessionsPath = "/api/v1/interview-prep/mock-sessions"
	AdminPrefix      = "/api/admin/interview-prep/"
)

var SlugPattern = regexp.MustCompile(`[^a-z0-9]+`)

type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
	DevBypass() bool
	DevUserID() string
}

type Service interface {
	ListTasks(ctx context.Context, user *model.User) ([]*model.InterviewPrepTask, error)
	StartSession(ctx context.Context, user *model.User, taskID uuid.UUID) (*model.InterviewPrepSession, error)
	GetSession(ctx context.Context, user *model.User, sessionID uuid.UUID) (*model.InterviewPrepSession, error)
	StartMockSession(ctx context.Context, user *model.User, companyTag string) (*model.InterviewPrepMockSession, error)
	GetMockSession(ctx context.Context, user *model.User, sessionID uuid.UUID) (*model.InterviewPrepMockSession, error)
	SubmitMockStage(ctx context.Context, user *model.User, sessionID uuid.UUID, code string, solveLanguage string, notes string) (*appinterviewprep.MockSubmitResult, error)
	ReviewMockSystemDesign(ctx context.Context, user *model.User, sessionID uuid.UUID, fileName string, contentType string, imageBytes []byte, req appinterviewprep.SystemDesignReviewInput) (*appinterviewprep.MockSystemDesignReviewResult, error)
	AnswerMockQuestion(ctx context.Context, user *model.User, sessionID uuid.UUID, answer string) (*appinterviewprep.MockQuestionAnswerResult, error)
	Submit(ctx context.Context, user *model.User, sessionID uuid.UUID, code string, solveLanguage string) (*appinterviewprep.SubmitResult, error)
	ReviewSystemDesign(ctx context.Context, user *model.User, sessionID uuid.UUID, fileName string, contentType string, imageBytes []byte, req appinterviewprep.SystemDesignReviewInput) (*appinterviewprep.SystemDesignReviewResult, error)
	AnswerQuestion(ctx context.Context, user *model.User, sessionID, questionID uuid.UUID, assessment string) (*model.InterviewPrepSession, error)
}

type AdminAuthorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
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
}

func RegisterRoutes(srv interface {
	HandlePrefix(prefix string, handler http.Handler)
}, service Service, authorizer Authorizer) {
	handler := Handler(service, authorizer)
	srv.HandlePrefix(TasksPath, handler)
	srv.HandlePrefix(SessionsPath, handler)
	srv.HandlePrefix(MockSessionsPath, handler)
}

func Handler(service Service, authorizer Authorizer) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(TasksPath, handleTasks(service, authorizer))
	mux.HandleFunc(SessionsPath, handleSessions(service, authorizer))
	mux.HandleFunc(SessionsPath+"/", handleSessionResource(service, authorizer))
	mux.HandleFunc(MockSessionsPath, handleMockSessions(service, authorizer))
	mux.HandleFunc(MockSessionsPath+"/", handleMockSessionResource(service, authorizer))
	return mux
}

func RegisterAdminRoutes(
	srv interface {
		HandlePrefix(prefix string, handler http.Handler)
	},
	repo AdminRepo,
	authorizer AdminAuthorizer,
) {
	srv.HandlePrefix(AdminPrefix, AdminHandler(repo, authorizer))
}

func AdminHandler(repo AdminRepo, authorizer AdminAuthorizer) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		user, authErr := adminCheckAuth(r, authorizer)
		if authErr != nil {
			writeAdminJSON(w, authErr.status, authErr.response)
			return
		}
		if !user.IsAdmin {
			writeAdminJSON(w, http.StatusForbidden, map[string]any{"error": "admin required"})
			return
		}

		path := strings.Trim(strings.TrimPrefix(r.URL.Path, AdminPrefix), "/")
		if path == "" {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		handleAdminPath(w, r, repo, strings.Split(path, "/"))
	})
	return mux
}
