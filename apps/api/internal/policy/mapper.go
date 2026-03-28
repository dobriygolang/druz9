package policy

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

func BuildRunnerConfig(p SandboxPolicy, task TaskSpec) (RunnerConfig, error) {
	if err := ValidatePolicy(p); err != nil {
		return RunnerConfig{}, err
	}

	cfg := RunnerConfig{
		Profile:       p.Profile,
		Deterministic: p.Deterministic,
		StdinEnabled:  p.AllowStdin,
		StdoutEnabled: p.AllowStdout,
		StderrEnabled: p.AllowStderr,
		Timeout:       time.Duration(p.Limits.TimeLimitMs) * time.Millisecond,
		Limits: RunnerLimits{
			MemoryBytes:   int64(p.Limits.MemoryLimitMB) * 1024 * 1024,
			CPULimitMilli: p.Limits.CPULimitMilli,
			ProcessLimit:  p.Limits.ProcessLimit,
			OutputBytes:   p.Limits.OutputLimitBytes,
			TempDiskBytes: int64(p.Limits.TempDiskLimitMB) * 1024 * 1024,
		},
		Network: RunnerNetworkConfig{
			Enabled:       p.Network.Enabled,
			Mode:          p.Network.Mode,
			AllowedHosts:  append([]string(nil), p.Network.AllowedHosts...),
			AllowedPorts:  append([]int(nil), p.Network.AllowedPorts...),
			AllowDNS:      p.Network.AllowDNS,
			AllowHTTP:     p.Network.AllowHTTP,
			AllowHTTPS:    p.Network.AllowHTTPS,
			AllowRawTCP:   p.Network.AllowRawTCP,
			MockEndpoints: append([]string(nil), p.Network.MockEndpoints...),
		},
		Filesystem: RunnerFilesystemConfig{
			Mode:             p.Filesystem.Mode,
			WorkspaceRoot:    p.Filesystem.WorkspaceRoot,
			FixtureFiles:     append([]string(nil), p.Filesystem.FixtureFiles...),
			ReadablePaths:    append([]string(nil), p.Filesystem.ReadablePaths...),
			WritablePaths:    append([]string(nil), p.Filesystem.WritablePaths...),
			WritableTempDir:  p.Filesystem.WritableTempDir,
			MaxFileSizeBytes: p.Filesystem.MaxFileSizeBytes,
		},
		Language: RunnerLanguageConfig{
			Language:    p.Language.Language,
			AllowCgo:    p.Language.AllowCgo,
			AllowUnsafe: p.Language.AllowUnsafe,
			ImportAllow: append([]string(nil), p.Language.Imports.Allowlist...),
			ImportBlock: append([]string(nil), p.Language.Imports.Blocklist...),
		},
	}

	cfg.MinimalEnv = buildMinimalEnv(cfg, task)
	return cfg, nil
}

func buildMinimalEnv(cfg RunnerConfig, task TaskSpec) []string {
	env := []string{
		"GOMAXPROCS=1",
		"CGO_ENABLED=0",
		"SANDBOX_POLICY_PROFILE=" + string(cfg.Profile),
		"SANDBOX_NETWORK_MODE=" + string(cfg.Network.Mode),
		"SANDBOX_FS_MODE=" + string(cfg.Filesystem.Mode),
		"SANDBOX_ALLOWED_HOSTS=" + strings.Join(cfg.Network.AllowedHosts, ","),
		"SANDBOX_ALLOWED_PORTS=" + joinInts(cfg.Network.AllowedPorts),
		"SANDBOX_MOCK_ENDPOINTS=" + strings.Join(cfg.Network.MockEndpoints, ","),
		"SANDBOX_FIXTURE_FILES=" + strings.Join(cfg.Filesystem.FixtureFiles, ","),
		"SANDBOX_IMPORT_BLOCKLIST=" + strings.Join(cfg.Language.ImportBlock, ","),
		"SANDBOX_TASK_TYPE=" + string(task.Type),
	}
	if cfg.Deterministic {
		env = append(env, "TZ=UTC")
	}
	return env
}

func joinInts(values []int) string {
	if len(values) == 0 {
		return ""
	}
	parts := make([]string, 0, len(values))
	for _, value := range values {
		parts = append(parts, strconv.Itoa(value))
	}
	return strings.Join(parts, ",")
}

func RunnerConfigSummary(cfg RunnerConfig) string {
	return fmt.Sprintf(
		"profile=%s timeout=%s network=%s fs=%s output_limit=%d",
		cfg.Profile,
		cfg.Timeout,
		cfg.Network.Mode,
		cfg.Filesystem.Mode,
		cfg.Limits.OutputBytes,
	)
}
