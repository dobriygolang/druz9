package server

import (
	"net/http"

	adminusershttp "api/internal/server/adminusershttp"
	rtconfighttp "api/internal/server/rtconfighttp"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

type rtcConfigService = rtconfighttp.ConfigService
type rtconfigAuthorizer = rtconfighttp.Authorizer
type adminUsersAuthorizer = adminusershttp.Authorizer
type adminUsersRepo = adminusershttp.Repo
type profileCacheInvalidator = adminusershttp.CacheInvalidator

func RegisterRTConfig(srv *kratoshttp.Server, rtcService rtcConfigService, authorizer rtconfigAuthorizer) {
	rtconfighttp.Register(srv, rtcService, authorizer)
}

func RegisterAdminUsersRoutes(
	srv interface {
		HandlePrefix(prefix string, handler http.Handler)
	},
	repo adminUsersRepo,
	authorizer adminUsersAuthorizer,
	cacheInvalidator profileCacheInvalidator,
) {
	adminusershttp.Register(srv, repo, authorizer, cacheInvalidator)
}
