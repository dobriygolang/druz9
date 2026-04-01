package rtconfighttp

import (
	"context"
	"net/http"

	"api/internal/model"
	"api/internal/rtc"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

const (
	ListPath = "/api/admin/config"
	KeyPath  = "/api/admin/config/"
)

type ConfigService interface {
	GetValue(context.Context, rtc.Key) rtc.Value
	SetValue(context.Context, rtc.Key, string) error
	ListVariables(context.Context) map[rtc.Key]rtc.Variable
}

type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

func Register(srv *kratoshttp.Server, rtcService ConfigService, authorizer Authorizer) {
	srv.HandlePrefix(ListPath, Handler(rtcService, authorizer))
}

func Handler(rtcService ConfigService, authorizer Authorizer) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc(ListPath, handleConfigList(rtcService, authorizer))
	mux.HandleFunc(KeyPath, handleConfigKey(rtcService, authorizer))
	return mux
}
