package codeeditor

import (
	"strings"

	domain "api/internal/domain/codeeditor"
	"api/internal/policy"
)

func normalizeTaskPolicy(task *domain.Task) error {
	if task == nil {
		return domain.ErrTaskNotFound
	}

	task.Language = strings.TrimSpace(task.Language)
	if task.Language == "" {
		task.Language = string(policy.LanguageGo)
	}

	task.TaskType = strings.TrimSpace(task.TaskType)
	if task.TaskType == "" {
		task.TaskType = string(policy.TaskTypeAlgorithmPractice)
	}

	task.ExecutionProfile = strings.TrimSpace(task.ExecutionProfile)
	if task.ExecutionProfile == "" {
		task.ExecutionProfile = string(policy.ProfilePure)
	}

	spec := policy.TaskSpec{
		Type:            policy.TaskType(task.TaskType),
		Profile:         policy.ExecutionProfile(task.ExecutionProfile),
		Name:            task.Title,
		Purpose:         task.Slug,
		Language:        policy.Language(task.Language),
		FixtureFiles:    cloneStrings(task.FixtureFiles),
		ReadablePaths:   cloneStrings(task.ReadablePaths),
		WritablePaths:   cloneStrings(task.WritablePaths),
		AllowedHosts:    cloneStrings(task.AllowedHosts),
		MockEndpoints:   cloneStrings(task.MockEndpoints),
		WritableTempDir: task.WritableTempDir,
	}
	for _, port := range task.AllowedPorts {
		spec.AllowedPorts = append(spec.AllowedPorts, int(port))
	}

	switch spec.Type {
	case policy.TaskTypeArenaDuel:
		spec.Capabilities = policy.TaskCapabilities{NeedsStdin: true, Deterministic: true}
	case policy.TaskTypeFileParsing:
		spec.Capabilities = policy.TaskCapabilities{NeedsStdin: true, NeedsFilesystem: true, Deterministic: true}
	case policy.TaskTypeAPIJSON:
		spec.Capabilities = policy.TaskCapabilities{NeedsStdin: true, NeedsNetwork: true, NeedsHTTP: true}
	case policy.TaskTypeInterviewPractice:
		spec.Capabilities = policy.TaskCapabilities{NeedsStdin: true, NeedsFilesystem: true, NeedsNetwork: true, NeedsHTTP: true}
	default:
		spec.Capabilities = policy.TaskCapabilities{NeedsStdin: true}
	}

	resolved, err := policy.ResolvePolicy(spec)
	if err != nil {
		return err
	}

	task.TaskType = string(spec.Type)
	task.ExecutionProfile = string(resolved.Profile)
	task.FixtureFiles = normalizeStringSlice(spec.FixtureFiles)
	task.ReadablePaths = normalizeStringSlice(spec.ReadablePaths)
	task.WritablePaths = normalizeStringSlice(spec.WritablePaths)
	task.AllowedHosts = normalizeStringSlice(spec.AllowedHosts)
	task.MockEndpoints = normalizeStringSlice(spec.MockEndpoints)
	task.WritableTempDir = spec.WritableTempDir
	task.AllowedPorts = make([]int32, 0, len(spec.AllowedPorts))
	for _, port := range spec.AllowedPorts {
		task.AllowedPorts = append(task.AllowedPorts, int32(port))
	}

	return nil
}

func cloneStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	return append([]string(nil), values...)
}

func normalizeStringSlice(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	return append([]string(nil), values...)
}
