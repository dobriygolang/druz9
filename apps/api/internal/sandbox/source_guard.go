package sandbox

import (
	"errors"
	"fmt"
	"go/parser"
	"go/token"
	"strings"

	"api/internal/policy"
)

var errImportBlocked = errors.New("import is blocked by sandbox policy")

func validateExecutionRequest(req ExecutionRequest, cfg policy.RunnerConfig) error {
	if req.Language != policy.LanguageGo {
		return nil
	}
	return validateGoImports(req.Code, cfg, req.RunnerMode)
}

func validateGoImports(code string, cfg policy.RunnerConfig, runnerMode string) error {
	source := code
	if strings.TrimSpace(runnerMode) == "function_io" {
		source = normalizeGoPackageSource(code)
	}

	file, err := parser.ParseFile(token.NewFileSet(), "candidate.go", source, parser.ImportsOnly)
	if err != nil {
		//nolint:nilerr // Syntax errors are reported by the runner; this guard only blocks imports in parseable code.
		return nil
	}

	blocked := blockedImportsForConfig(cfg)
	if len(blocked) == 0 {
		return nil
	}

	for _, item := range file.Imports {
		name := strings.Trim(item.Path.Value, `"`)
		if blocked[name] {
			return fmt.Errorf("%w: %q", errImportBlocked, name)
		}
	}
	return nil
}

func blockedImportsForConfig(cfg policy.RunnerConfig) map[string]bool {
	blocked := map[string]bool{
		"os/exec": true,
		"syscall": true,
		"plugin":  true,
		"unsafe":  true,
	}

	for _, item := range cfg.Language.ImportBlock {
		item = strings.TrimSpace(item)
		if item != "" {
			blocked[item] = true
		}
	}

	if cfg.Filesystem.Mode == policy.FilesystemNone {
		for _, item := range []string{
			"os",
			"io/ioutil",
			"path/filepath",
			"embed",
			"archive/tar",
			"archive/zip",
		} {
			blocked[item] = true
		}
	}

	if !cfg.Network.Enabled {
		for _, item := range []string{
			"net",
			"net/http",
			"net/http/httputil",
			"net/url",
			"net/rpc",
			"net/smtp",
			"net/mail",
			"crypto/tls",
		} {
			blocked[item] = true
		}
	}

	if cfg.Network.Mode == policy.NetworkMockOnly {
		for _, item := range []string{
			"net",
			"net/rpc",
			"net/smtp",
			"net/mail",
		} {
			blocked[item] = true
		}
	}

	result := make(map[string]bool, len(blocked))
	for item, value := range blocked {
		if !value {
			continue
		}
		result[item] = true
	}
	return result
}
