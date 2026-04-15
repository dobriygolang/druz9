package interview_prep

import (
	"context"
	"errors"

	"api/internal/aireview"
	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/model"
	v1 "api/pkg/api/interview_prep/v1"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) ListTasks(ctx context.Context, req *v1.ListTasksRequest) (*v1.ListTasksResponse, error) {
	_ = req
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}

	tasks, err := i.service.ListTasks(ctx, user)
	if err != nil {
		return nil, toHTTPError(err)
	}

	items := make([]*v1.InterviewPrepTask, 0, len(tasks))
	for _, task := range tasks {
		items = append(items, mapTaskPublic(task))
	}
	return &v1.ListTasksResponse{Tasks: items}, nil
}

func (i *Implementation) StartSession(ctx context.Context, req *v1.StartSessionRequest) (*v1.SessionEnvelope, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	taskID, err := parseUUID(req.TaskId, "INVALID_TASK_ID", "invalid task id")
	if err != nil {
		return nil, err
	}

	session, err := i.service.StartSession(ctx, user, taskID)
	if err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.SessionEnvelope{Session: mapSession(session)}, nil
}

func (i *Implementation) GetSession(ctx context.Context, req *v1.GetSessionRequest) (*v1.SessionEnvelope, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	sessionID, err := parseUUID(req.SessionId, "INVALID_SESSION_ID", "invalid session id")
	if err != nil {
		return nil, err
	}

	session, err := i.service.GetSession(ctx, user, sessionID)
	if err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.SessionEnvelope{Session: mapSession(session)}, nil
}

func (i *Implementation) SubmitSession(ctx context.Context, req *v1.SubmitSessionRequest) (*v1.SubmitSessionResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	sessionID, err := parseUUID(req.SessionId, "INVALID_SESSION_ID", "invalid session id")
	if err != nil {
		return nil, err
	}

	result, err := i.service.Submit(ctx, user, sessionID, req.Code, unmapProgrammingLanguage(req.Language))
	if err != nil {
		return nil, toHTTPError(err)
	}

	return &v1.SubmitSessionResponse{
		Result: &v1.SubmitSessionResult{
			Passed:          result.Passed,
			LastError:       result.LastError,
			PassedCount:     result.PassedCount,
			TotalCount:      result.TotalCount,
			FailedTestIndex: result.FailedTestIndex,
			FailureKind:     mapSubmitFailureKind(result.FailureKind),
			Session:         mapSession(result.Session),
		},
	}, nil
}

func (i *Implementation) AnswerQuestion(ctx context.Context, req *v1.AnswerQuestionRequest) (*v1.AnswerQuestionResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	sessionID, err := parseUUID(req.SessionId, "INVALID_SESSION_ID", "invalid session id")
	if err != nil {
		return nil, err
	}
	questionID, err := parseUUID(req.QuestionId, "INVALID_QUESTION_ID", "invalid question id")
	if err != nil {
		return nil, err
	}

	result, err := i.service.AnswerQuestion(ctx, user, sessionID, questionID, string(unmapSelfAssessment(req.SelfAssessment)), req.Answer)
	if err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.AnswerQuestionResponse{
		Session:          mapSession(result.Session),
		AnsweredQuestion: mapQuestion(result.AnsweredQuestion),
		Review:           mapInterviewAnswerReview(result.Review),
	}, nil
}

func (i *Implementation) ReviewSystemDesign(ctx context.Context, req *v1.ReviewSystemDesignRequest) (*v1.ReviewSystemDesignResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	sessionID, err := parseUUID(req.SessionId, "INVALID_SESSION_ID", "invalid session id")
	if err != nil {
		return nil, err
	}
	if req.Design == nil {
		return nil, kratoserrors.BadRequest("DESIGN_REQUIRED", "design payload is required")
	}

	review, err := i.service.ReviewSystemDesign(ctx, user, sessionID, req.Design.ImageName, req.Design.ImageContentType, req.Design.Image, appinterviewprep.SystemDesignReviewInput{
		Notes:          req.Design.Notes,
		Components:     req.Design.Components,
		APIs:           req.Design.Apis,
		DatabaseSchema: req.Design.DatabaseSchema,
		Traffic:        req.Design.Traffic,
		Reliability:    req.Design.Reliability,
	})
	if err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.ReviewSystemDesignResponse{Review: mapSystemDesignReview(review)}, nil
}

func (i *Implementation) ListCompanies(ctx context.Context, req *v1.ListCompaniesRequest) (*v1.ListCompaniesResponse, error) {
	_ = req
	companies, err := i.service.GetAvailableCompanies(ctx)
	if err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.ListCompaniesResponse{Companies: companies}, nil
}

func (i *Implementation) ListMockBlueprints(ctx context.Context, req *v1.ListMockBlueprintsRequest) (*v1.ListMockBlueprintsResponse, error) {
	_ = req
	blueprints, err := i.service.ListMockBlueprints(ctx)
	if err != nil {
		return nil, toHTTPError(err)
	}
	items := make([]*v1.MockBlueprint, 0, len(blueprints))
	for _, blueprint := range blueprints {
		items = append(items, mapMockBlueprint(blueprint))
	}
	return &v1.ListMockBlueprintsResponse{Blueprints: items}, nil
}

func (i *Implementation) StartMockSession(ctx context.Context, req *v1.StartMockSessionRequest) (*v1.MockSessionEnvelope, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	session, err := i.service.StartMockSession(ctx, user, req.CompanyTag, req.ProgramSlug)
	if err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.MockSessionEnvelope{Session: mapMockSession(session)}, nil
}

func (i *Implementation) GetMockSession(ctx context.Context, req *v1.GetMockSessionRequest) (*v1.MockSessionEnvelope, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	sessionID, err := parseUUID(req.SessionId, "INVALID_SESSION_ID", "invalid session id")
	if err != nil {
		return nil, err
	}
	session, err := i.service.GetMockSession(ctx, user, sessionID)
	if err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.MockSessionEnvelope{Session: mapMockSession(session)}, nil
}

func (i *Implementation) SubmitMockStage(ctx context.Context, req *v1.SubmitMockStageRequest) (*v1.SubmitMockStageResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	sessionID, err := parseUUID(req.SessionId, "INVALID_SESSION_ID", "invalid session id")
	if err != nil {
		return nil, err
	}
	result, err := i.service.SubmitMockStage(ctx, user, sessionID, req.Code, unmapProgrammingLanguage(req.Language), req.Notes)
	if err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.SubmitMockStageResponse{
		Result: &v1.SubmitMockStageResult{
			Passed:          result.Passed,
			LastError:       result.LastError,
			PassedCount:     result.PassedCount,
			TotalCount:      result.TotalCount,
			FailedTestIndex: result.FailedTestIndex,
			FailureKind:     mapSubmitFailureKind(result.FailureKind),
			Review:          mapInterviewSolutionReview(result.Review),
			Session:         mapMockSession(result.Session),
		},
	}, nil
}

func (i *Implementation) ReviewMockSystemDesign(ctx context.Context, req *v1.ReviewMockSystemDesignRequest) (*v1.ReviewMockSystemDesignResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	sessionID, err := parseUUID(req.SessionId, "INVALID_SESSION_ID", "invalid session id")
	if err != nil {
		return nil, err
	}
	if req.Design == nil {
		return nil, kratoserrors.BadRequest("DESIGN_REQUIRED", "design payload is required")
	}

	result, err := i.service.ReviewMockSystemDesign(ctx, user, sessionID, req.Design.ImageName, req.Design.ImageContentType, req.Design.Image, appinterviewprep.SystemDesignReviewInput{
		Notes:          req.Design.Notes,
		Components:     req.Design.Components,
		APIs:           req.Design.Apis,
		DatabaseSchema: req.Design.DatabaseSchema,
		Traffic:        req.Design.Traffic,
		Reliability:    req.Design.Reliability,
	})
	if err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.ReviewMockSystemDesignResponse{
		Result: &v1.ReviewMockSystemDesignResult{
			Review:  mapSystemDesignReview(result.Review),
			Session: mapMockSession(result.Session),
		},
	}, nil
}

func (i *Implementation) AnswerMockQuestion(ctx context.Context, req *v1.AnswerMockQuestionRequest) (*v1.AnswerMockQuestionResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	sessionID, err := parseUUID(req.SessionId, "INVALID_SESSION_ID", "invalid session id")
	if err != nil {
		return nil, err
	}
	result, err := i.service.AnswerMockQuestion(ctx, user, sessionID, req.Answer)
	if err != nil {
		return nil, toHTTPError(err)
	}
	return &v1.AnswerMockQuestionResponse{
		Result: &v1.AnswerMockQuestionResult{
			Review:  mapInterviewAnswerReview(result.Review),
			Session: mapMockSession(result.Session),
		},
	}, nil
}

func requireUser(ctx context.Context) (*model.User, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, kratoserrors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	return user, nil
}

func parseUUID(raw string, reason string, message string) (uuid.UUID, error) {
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, kratoserrors.BadRequest(reason, message)
	}
	return id, nil
}

func toHTTPError(err error) error {
	switch {
	case errors.Is(err, appinterviewprep.ErrTaskNotFound),
		errors.Is(err, appinterviewprep.ErrSessionNotFound),
		errors.Is(err, appinterviewprep.ErrMockSessionNotFound):
		return kratoserrors.NotFound("NOT_FOUND", err.Error())
	case errors.Is(err, appinterviewprep.ErrSessionFinished),
		errors.Is(err, appinterviewprep.ErrMockSessionFinished),
		errors.Is(err, appinterviewprep.ErrSubmitNotAllowed),
		errors.Is(err, appinterviewprep.ErrMockStageSubmitNotAllowed),
		errors.Is(err, appinterviewprep.ErrMockQuestionNotReady),
		errors.Is(err, appinterviewprep.ErrMockQuestionAnswerRequired),
		errors.Is(err, appinterviewprep.ErrMockCompanyTagRequired),
		errors.Is(err, appinterviewprep.ErrAnotherMockSessionActive),
		errors.Is(err, appinterviewprep.ErrMockTaskPoolIncomplete),
		errors.Is(err, appinterviewprep.ErrMockQuestionPoolIncomplete),
		errors.Is(err, appinterviewprep.ErrQuestionLocked),
		errors.Is(err, appinterviewprep.ErrInvalidAssessment),
		errors.Is(err, appinterviewprep.ErrUnsupportedLanguage),
		errors.Is(err, appinterviewprep.ErrExecutableTaskNotConfigured),
		errors.Is(err, appinterviewprep.ErrSystemDesignOnly),
		errors.Is(err, appinterviewprep.ErrInvalidReviewImage),
		errors.Is(err, appinterviewprep.ErrReviewImageTooLarge):
		return kratoserrors.BadRequest("BAD_REQUEST", err.Error())
	case errors.Is(err, aireview.ErrNotConfigured),
		errors.Is(err, aireview.ErrUnsupportedProvider),
		errors.Is(err, aireview.ErrInvalidResponse),
		errors.Is(err, aireview.ErrVisionUnsupported):
		return kratoserrors.New(502, "AI_REVIEW_FAILED", err.Error())
	default:
		return kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
}
