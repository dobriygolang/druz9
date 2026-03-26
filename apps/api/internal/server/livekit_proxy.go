package server

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"api/internal/config"

	klog "github.com/go-kratos/kratos/v2/log"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

func RegisterHTTPProxy(srv *kratoshttp.Server, cfg *config.LiveKit, logger klog.Logger) error {
	if cfg == nil || strings.TrimSpace(cfg.URL) == "" {
		return nil
	}

	targetURL, err := url.Parse(normalizeProxyTarget(cfg.URL))
	if err != nil {
		return err
	}

	helper := klog.NewHelper(logger)
	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.URL.Path = strings.TrimPrefix(req.URL.Path, "/livekit")
		if req.URL.Path == "" {
			req.URL.Path = "/"
		}
		req.Host = targetURL.Host
	}
	proxy.ErrorHandler = func(rw http.ResponseWriter, _ *http.Request, proxyErr error) {
		helper.Errorf("livekit proxy error: %v", proxyErr)
		http.Error(rw, "livekit proxy unavailable", http.StatusBadGateway)
	}

	srv.HandlePrefix("/livekit", proxy)
	return nil
}

func normalizeProxyTarget(raw string) string {
	value := strings.TrimSpace(raw)
	value = strings.Replace(value, "ws://", "http://", 1)
	value = strings.Replace(value, "wss://", "https://", 1)
	return value
}
