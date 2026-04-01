package server

import (
	"net/http"

	interviewprephttp "api/internal/server/interviewprephttp"
)

type interviewPrepAuthorizer = interviewprephttp.Authorizer
type InterviewPrepService = interviewprephttp.Service
type adminInterviewPrepAuthorizer = interviewprephttp.AdminAuthorizer
type adminInterviewPrepRepo = interviewprephttp.AdminRepo

func RegisterInterviewPrepRoutes(srv interface {
	HandlePrefix(prefix string, handler http.Handler)
}, service InterviewPrepService, authorizer interviewPrepAuthorizer) {
	interviewprephttp.RegisterRoutes(srv, service, authorizer)
}

func RegisterAdminInterviewPrepRoutes(
	srv interface {
		HandlePrefix(prefix string, handler http.Handler)
	},
	repo adminInterviewPrepRepo,
	authorizer adminInterviewPrepAuthorizer,
) {
	interviewprephttp.RegisterAdminRoutes(srv, repo, authorizer)
}
