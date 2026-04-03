package server

import (
	adminusershttp "api/internal/server/adminusershttp"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

type adminUsersAuthorizer = adminusershttp.Authorizer
type adminUsersRepo = adminusershttp.Repo
type profileCacheInvalidator = adminusershttp.CacheInvalidator

func RegisterAdminUsersRoutes(
	srv *kratoshttp.Server,
	repo adminUsersRepo,
	authorizer adminUsersAuthorizer,
	cacheInvalidator profileCacheInvalidator,
) {
	adminusershttp.Register(srv, repo, authorizer, cacheInvalidator)
}
