package server

import (
	publicruntimeconfighttp "api/internal/server/publicruntimeconfighttp"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

type publicRuntimeConfigReader = publicruntimeconfighttp.ConfigReader

func RegisterPublicRuntimeConfigRoutes(srv *kratoshttp.Server, config publicRuntimeConfigReader) {
	publicruntimeconfighttp.Register(srv, config)
}
