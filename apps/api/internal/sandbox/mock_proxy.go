package sandbox

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"api/internal/policy"
)

var errUnsupportedNetworkMode = errors.New("unsupported sandbox network mode")

type mockProxyServer struct {
	server *http.Server
	base   string
}

const fallbackMockProxyURL = "http://127.0.0.1:1"

func (s *mockProxyServer) close() {
	if s == nil || s.server == nil {
		return
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	_ = s.server.Shutdown(shutdownCtx)
}

func startMockProxy(ctx context.Context, cfg policy.RunnerNetworkConfig) (*mockProxyServer, error) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("start mock proxy listener: %w", err)
	}

	handler := &mockProxyHandler{cfg: cfg}
	srv := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 2 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	go func() {
		_ = srv.Serve(listener)
	}()

	return &mockProxyServer{
		server: srv,
		base:   "http://" + listener.Addr().String(),
	}, nil
}

func buildNetworkEnv(ctx context.Context, cfg policy.RunnerNetworkConfig) ([]string, *mockProxyServer, error) {
	switch cfg.Mode {
	case policy.NetworkDisabled:
		return proxyEnv(fallbackMockProxyURL), nil, nil
	case policy.NetworkMockOnly:
		proxy, err := startMockProxy(ctx, cfg)
		if err != nil {
			//nolint:nilerr // The sandbox can still run safely with a closed fallback proxy.
			return proxyEnv(fallbackMockProxyURL), nil, nil
		}
		return proxyEnv(proxy.base), proxy, nil
	case policy.NetworkAllowlist:
		return []string{
			"NO_PROXY=",
			"no_proxy=",
		}, nil, nil
	default:
		return nil, nil, fmt.Errorf("%w: %s", errUnsupportedNetworkMode, cfg.Mode)
	}
}

func proxyEnv(base string) []string {
	return []string{
		"SANDBOX_HTTP_PROXY=" + base,
		"HTTP_PROXY=" + base,
		"http_proxy=" + base,
		"HTTPS_PROXY=" + base,
		"https_proxy=" + base,
		"ALL_PROXY=" + base,
		"all_proxy=" + base,
		"NO_PROXY=",
		"no_proxy=",
	}
}

type mockProxyHandler struct {
	cfg policy.RunnerNetworkConfig
}

func (h *mockProxyHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodConnect {
		http.Error(w, "https connect is blocked in sandbox mock transport", http.StatusForbidden)
		return
	}

	target := r.URL
	if !target.IsAbs() {
		host := r.Host
		if host == "" {
			host = "mock.local"
		}
		target = &url.URL{
			Scheme:   "http",
			Host:     host,
			Path:     r.URL.Path,
			RawQuery: r.URL.RawQuery,
		}
	}

	if !h.isAllowed(target) {
		http.Error(w, "outbound network is blocked for "+target.String(), http.StatusForbidden)
		return
	}

	dump, _ := httputil.DumpRequest(r, true)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Sandbox-Mock", "true")
	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprintf(w, `{"mock":true,"url":%q,"method":%q,"body":%q}`, target.String(), r.Method, string(dump))
}

func (h *mockProxyHandler) isAllowed(target *url.URL) bool {
	host := strings.ToLower(strings.TrimSpace(target.Hostname()))
	if host == "" {
		return false
	}
	for _, allowed := range h.cfg.AllowedHosts {
		if strings.ToLower(strings.TrimSpace(allowed)) == host {
			return true
		}
	}
	for _, endpoint := range h.cfg.MockEndpoints {
		parsed, err := url.Parse(endpoint)
		if err != nil {
			continue
		}
		if strings.ToLower(strings.TrimSpace(parsed.Hostname())) == host {
			return true
		}
	}
	return false
}
