package policy

import (
	"fmt"
	"path/filepath"
	"strings"
)

const (
	minTimeLimitMs      = 100
	maxTimeLimitMs      = 30000
	minMemoryLimitMB    = 32
	maxMemoryLimitMB    = 2048
	minOutputLimitBytes = 1024
	maxOutputLimitBytes = 2 * 1024 * 1024
)

func ValidatePolicy(p SandboxPolicy) error {
	var problems []string

	if p.Profile == "" {
		problems = append(problems, "profile is required")
	}
	if p.Language.Language != LanguageGo && p.Language.Language != LanguagePython && p.Language.Language != LanguageSQL {
		problems = append(problems, "unsupported language")
	}
	if p.Limits.TimeLimitMs < minTimeLimitMs || p.Limits.TimeLimitMs > maxTimeLimitMs {
		problems = append(problems, fmt.Sprintf("time_limit_ms must be within [%d,%d]", minTimeLimitMs, maxTimeLimitMs))
	}
	if p.Limits.MemoryLimitMB < minMemoryLimitMB || p.Limits.MemoryLimitMB > maxMemoryLimitMB {
		problems = append(problems, fmt.Sprintf("memory_limit_mb must be within [%d,%d]", minMemoryLimitMB, maxMemoryLimitMB))
	}
	if p.Limits.ProcessLimit <= 0 {
		problems = append(problems, "process_limit must be greater than 0")
	}
	if p.Limits.CPULimitMilli <= 0 {
		problems = append(problems, "cpu_limit_milli must be greater than 0")
	}
	if p.Limits.OutputLimitBytes < minOutputLimitBytes || p.Limits.OutputLimitBytes > maxOutputLimitBytes {
		problems = append(problems, fmt.Sprintf("output_limit_bytes must be within [%d,%d]", minOutputLimitBytes, maxOutputLimitBytes))
	}
	if p.Limits.TempDiskLimitMB < 0 {
		problems = append(problems, "temp_disk_limit_mb must be >= 0")
	}

	problems = append(problems, validateNetwork(p)...)
	problems = append(problems, validateFilesystem(p)...)
	problems = append(problems, validateImports(p)...)
	problems = append(problems, validateProfileInvariants(p)...)

	if len(problems) == 0 {
		return nil
	}

	return fmt.Errorf("%w: %s", ErrInvalidPolicy, strings.Join(problems, "; "))
}

func validateNetwork(p SandboxPolicy) []string {
	var problems []string

	if !p.Network.Enabled && p.Network.Mode != NetworkDisabled {
		problems = append(problems, "network.enabled=false requires network.mode=disabled")
	}
	if p.Network.Enabled && p.Network.Mode == NetworkDisabled {
		problems = append(problems, "network.enabled=true requires a non-disabled network mode")
	}
	if p.Network.Mode == NetworkMockOnly && len(p.Network.MockEndpoints) == 0 && len(p.Network.AllowedHosts) == 0 {
		problems = append(problems, "mock_only network requires at least one mock endpoint or allowed host")
	}
	if p.Network.Mode == NetworkAllowlist && len(p.Network.AllowedHosts) == 0 {
		problems = append(problems, "allowlist network requires allowed hosts")
	}
	for _, host := range p.Network.AllowedHosts {
		if host == "" || strings.Contains(host, "*") {
			problems = append(problems, fmt.Sprintf("allowed host %q is invalid", host))
		}
	}
	for _, endpoint := range p.Network.MockEndpoints {
		if endpoint == "" || strings.Contains(endpoint, "*") {
			problems = append(problems, fmt.Sprintf("mock endpoint %q is invalid", endpoint))
		}
	}
	for _, port := range p.Network.AllowedPorts {
		if port <= 0 || port > 65535 {
			problems = append(problems, fmt.Sprintf("allowed port %d is invalid", port))
		}
	}
	if p.Profile == ProfilePure && p.Network.Enabled {
		problems = append(problems, "pure profile cannot enable network")
	}
	if p.Arena.Enabled && p.Network.Enabled {
		problems = append(problems, "arena policy cannot enable external or mock network access")
	}

	return problems
}

func validateFilesystem(p SandboxPolicy) []string {
	var problems []string

	if p.Profile == ProfilePure && p.Filesystem.Mode != FilesystemNone {
		problems = append(problems, "pure profile cannot enable filesystem access")
	}
	if p.Filesystem.Mode == FilesystemNone && (len(p.Filesystem.FixtureFiles) > 0 || len(p.Filesystem.ReadablePaths) > 0 || len(p.Filesystem.WritablePaths) > 0) {
		problems = append(problems, "filesystem mode none cannot define fixture/readable/writable paths")
	}
	for _, path := range append(append([]string{}, p.Filesystem.FixtureFiles...), append(p.Filesystem.ReadablePaths, p.Filesystem.WritablePaths...)...) {
		if err := validateSafeRelativePath(path); err != nil {
			problems = append(problems, err.Error())
		}
	}
	if p.Filesystem.Mode == FilesystemFixturesOnly && len(p.Filesystem.FixtureFiles) == 0 {
		problems = append(problems, "fixtures_only mode requires at least one fixture file")
	}
	if p.Filesystem.Mode == FilesystemNone && p.Filesystem.WritableTempDir {
		problems = append(problems, "filesystem mode none cannot allow temp dir writes")
	}
	if p.Filesystem.MaxFileSizeBytes < 0 {
		problems = append(problems, "max_file_size_bytes must be >= 0")
	}

	return problems
}

func validateImports(p SandboxPolicy) []string {
	var problems []string

	if p.Language.Language != LanguageGo {
		return problems
	}

	if !p.Language.AllowUnsafe {
		for _, blocked := range p.Language.Imports.Blocklist {
			if blocked == "unsafe" {
				return problems
			}
		}
		problems = append(problems, "unsafe must be blocklisted when allow_unsafe=false")
	}

	for _, allowed := range p.Language.Imports.Allowlist {
		for _, blocked := range p.Language.Imports.Blocklist {
			if allowed == blocked {
				problems = append(problems, fmt.Sprintf("import %q cannot be both allowed and blocked", allowed))
			}
		}
	}

	return problems
}

func validateProfileInvariants(p SandboxPolicy) []string {
	var problems []string

	switch p.Profile {
	case ProfilePure:
		if !p.Deterministic {
			problems = append(problems, "pure profile must be deterministic")
		}
	case ProfileFileIO:
		if p.Network.Enabled {
			problems = append(problems, "file_io profile cannot enable network")
		}
	case ProfileHTTPClient:
		if !p.Network.Enabled {
			problems = append(problems, "http_client profile requires network access")
		}
	case ProfileInterviewRealistic:
		if p.Filesystem.Mode == FilesystemNone {
			problems = append(problems, "interview_realistic should include controlled filesystem access")
		}
	}

	return problems
}

func validateSafeRelativePath(path string) error {
	if path == "" {
		return fmt.Errorf("empty path is not allowed")
	}
	if filepath.IsAbs(path) {
		return fmt.Errorf("path %q must be relative", path)
	}
	cleaned := filepath.Clean(path)
	if cleaned == "." || cleaned == ".." || strings.HasPrefix(cleaned, "../") {
		return fmt.Errorf("path %q escapes workspace", path)
	}
	return nil
}
