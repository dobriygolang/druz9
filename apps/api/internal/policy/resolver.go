package policy

import (
	"fmt"
)

func ResolvePolicy(task TaskSpec) (SandboxPolicy, error) {
	if task.Language == "" {
		task.Language = LanguageGo
	}
	if task.Language != LanguageGo && task.Language != LanguagePython && task.Language != LanguageSQL {
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
		p.Filesystem.FixtureFiles = append([]string(nil), task.FixtureFiles...)
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
		p.Network.AllowedHosts = appendUnique(p.Network.AllowedHosts, task.AllowedHosts...)
		p.Network.AllowedPorts = appendUniqueInts(p.Network.AllowedPorts, task.AllowedPorts...)
		if len(task.MockEndpoints) == 0 {
			p.Network.Mode = NetworkAllowlist
		}
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
