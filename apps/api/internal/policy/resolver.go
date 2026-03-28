package policy

import (
	"fmt"
	"slices"
)

func ResolvePolicy(task TaskSpec) (SandboxPolicy, error) {
	if task.Language == "" {
		task.Language = LanguageGo
	}
	if task.Language != LanguageGo {
		return SandboxPolicy{}, fmt.Errorf("%w: %s", ErrUnsupportedLang, task.Language)
	}
	if !isSupportedTaskType(task.Type) {
		return SandboxPolicy{}, fmt.Errorf("%w: %s", ErrUnsupportedTask, task.Type)
	}

	profile := task.Profile
	if profile == "" {
		profile = defaultProfileForTask(task.Type)
	}

	p, err := DefaultPolicy(profile)
	if err != nil {
		return SandboxPolicy{}, err
	}

	if task.Name != "" {
		p.Name = task.Name
	}
	if task.Purpose != "" {
		p.Purpose = task.Purpose
	}
	p.Language.Language = task.Language
	p.AllowStdin = p.AllowStdin || task.Capabilities.NeedsStdin

	if task.Capabilities.Deterministic {
		p.Deterministic = true
	}

	if len(task.FixtureFiles) > 0 {
		p.Filesystem.FixtureFiles = slices.Clone(task.FixtureFiles)
		p.Filesystem.ReadablePaths = appendUnique(p.Filesystem.ReadablePaths, task.FixtureFiles...)
	}
	if len(task.ReadablePaths) > 0 {
		p.Filesystem.ReadablePaths = appendUnique(p.Filesystem.ReadablePaths, task.ReadablePaths...)
	}
	if len(task.WritablePaths) > 0 {
		p.Filesystem.WritablePaths = appendUnique(p.Filesystem.WritablePaths, task.WritablePaths...)
	}
	if task.WritableTempDir {
		p.Filesystem.WritableTempDir = true
	}

	if len(task.MockEndpoints) > 0 {
		p.Network.Enabled = true
		p.Network.Mode = NetworkMockOnly
		p.Network.MockEndpoints = appendUnique(p.Network.MockEndpoints, task.MockEndpoints...)
	}
	if len(task.AllowedHosts) > 0 || len(task.AllowedPorts) > 0 {
		p.Network.Enabled = true
		p.Network.Mode = NetworkAllowlist
		p.Network.AllowedHosts = appendUnique(p.Network.AllowedHosts, task.AllowedHosts...)
		p.Network.AllowedPorts = appendUniqueInts(p.Network.AllowedPorts, task.AllowedPorts...)
	}

	if task.Type == TaskTypeArenaDuel {
		p.Arena.Enabled = true
		p.Arena.StandardizedEnv = true
		p.Deterministic = true
		p.Network = NetworkPolicy{Enabled: false, Mode: NetworkDisabled}
		p.Filesystem = FilesystemPolicy{Mode: FilesystemNone}
	}

	if task.Override != nil {
		if err := applyOverride(&p, *task.Override); err != nil {
			return SandboxPolicy{}, err
		}
	}

	if err := ValidatePolicy(p); err != nil {
		return SandboxPolicy{}, err
	}

	return p, nil
}

func defaultProfileForTask(taskType TaskType) ExecutionProfile {
	switch taskType {
	case TaskTypeArenaDuel, TaskTypeAlgorithmPractice, TaskTypeCodeEditor:
		return ProfilePure
	case TaskTypeFileParsing:
		return ProfileFileIO
	case TaskTypeAPIJSON:
		return ProfileHTTPClient
	case TaskTypeInterviewPractice:
		return ProfileInterviewRealistic
	default:
		return ""
	}
}

func isSupportedTaskType(taskType TaskType) bool {
	switch taskType {
	case TaskTypeArenaDuel, TaskTypeAlgorithmPractice, TaskTypeFileParsing, TaskTypeAPIJSON, TaskTypeInterviewPractice, TaskTypeCodeEditor:
		return true
	default:
		return false
	}
}

func applyOverride(p *SandboxPolicy, override PolicyOverride) error {
	if override.TimeLimitMs != nil {
		if *override.TimeLimitMs > p.Limits.TimeLimitMs {
			return fmt.Errorf("%w: time limit cannot exceed profile default", ErrUnsafeOverride)
		}
		p.Limits.TimeLimitMs = *override.TimeLimitMs
	}
	if override.MemoryLimitMB != nil {
		if *override.MemoryLimitMB > p.Limits.MemoryLimitMB {
			return fmt.Errorf("%w: memory limit cannot exceed profile default", ErrUnsafeOverride)
		}
		p.Limits.MemoryLimitMB = *override.MemoryLimitMB
	}
	if override.OutputLimitBytes != nil {
		if *override.OutputLimitBytes > p.Limits.OutputLimitBytes {
			return fmt.Errorf("%w: output limit cannot exceed profile default", ErrUnsafeOverride)
		}
		p.Limits.OutputLimitBytes = *override.OutputLimitBytes
	}
	if override.ProcessLimit != nil {
		if *override.ProcessLimit > p.Limits.ProcessLimit {
			return fmt.Errorf("%w: process limit cannot exceed profile default", ErrUnsafeOverride)
		}
		p.Limits.ProcessLimit = *override.ProcessLimit
	}
	if override.TempDiskLimitMB != nil {
		if *override.TempDiskLimitMB > p.Limits.TempDiskLimitMB {
			return fmt.Errorf("%w: temp disk limit cannot exceed profile default", ErrUnsafeOverride)
		}
		p.Limits.TempDiskLimitMB = *override.TempDiskLimitMB
	}
	if override.AllowStderr != nil {
		if *override.AllowStderr && !p.AllowStderr {
			return fmt.Errorf("%w: stderr cannot be enabled by override", ErrUnsafeOverride)
		}
		p.AllowStderr = *override.AllowStderr
	}
	if override.WritableTempDir != nil {
		if *override.WritableTempDir && !p.Filesystem.WritableTempDir {
			return fmt.Errorf("%w: temp dir writes cannot be enabled by override", ErrUnsafeOverride)
		}
		p.Filesystem.WritableTempDir = *override.WritableTempDir
	}
	if override.FilesystemMode != nil {
		if filesystemRank(*override.FilesystemMode) > filesystemRank(p.Filesystem.Mode) {
			return fmt.Errorf("%w: filesystem mode cannot be expanded by override", ErrUnsafeOverride)
		}
		p.Filesystem.Mode = *override.FilesystemMode
	}
	if override.NetworkMode != nil {
		if !canTightenNetworkMode(p.Network.Mode, *override.NetworkMode) {
			return fmt.Errorf("%w: network mode cannot be expanded by override", ErrUnsafeOverride)
		}
		p.Network.Mode = *override.NetworkMode
		p.Network.Enabled = *override.NetworkMode != NetworkDisabled
	}
	if len(override.ImportBlocklist) > 0 {
		p.Language.Imports.Blocklist = appendUnique(p.Language.Imports.Blocklist, override.ImportBlocklist...)
	}

	return nil
}

func filesystemRank(mode FilesystemMode) int {
	switch mode {
	case FilesystemNone:
		return 0
	case FilesystemFixturesOnly:
		return 1
	case FilesystemWorkspaceRO:
		return 2
	case FilesystemWorkspaceRW:
		return 3
	default:
		return 100
	}
}

func canTightenNetworkMode(current, next NetworkMode) bool {
	if current == next {
		return true
	}
	if next == NetworkDisabled {
		return true
	}
	if current == NetworkAllowlist && next == NetworkMockOnly {
		return true
	}
	return false
}

func appendUnique(base []string, values ...string) []string {
	seen := make(map[string]struct{}, len(base))
	out := make([]string, 0, len(base)+len(values))
	for _, item := range base {
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	for _, item := range values {
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}

func appendUniqueInts(base []int, values ...int) []int {
	seen := make(map[int]struct{}, len(base))
	out := make([]int, 0, len(base)+len(values))
	for _, item := range base {
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	for _, item := range values {
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}
