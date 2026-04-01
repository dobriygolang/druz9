package codeeditor

import (
	domain "api/internal/domain/codeeditor"
	"api/internal/model"
	"api/internal/policy"
)

func normalizeTaskPolicy(task *domain.Task) error {
	if task == nil {
		return domain.ErrTaskNotFound
	}

	if task.Language.String() == "" {
		task.Language = model.ProgrammingLanguageGo
	}

	if task.TaskType.String() == "" {
		task.TaskType = model.TaskTypeAlgorithm
	}

	if task.ExecutionProfile.String() == "" {
		task.ExecutionProfile = model.ExecutionProfilePure
	}

	spec := policy.TaskSpec{
		Type:            policyTaskTypeForTask(task, policy.TaskTypeAlgorithmPractice),
		Profile:         policy.ExecutionProfile(task.ExecutionProfile.String()),
		Name:            task.Title,
		Purpose:         task.Slug,
		Language:        policyLanguageForTask(task.Language),
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

	task.ExecutionProfile = model.ExecutionProfileFromString(string(resolved.Profile))
	task.FixtureFiles = normalizeStringSlice(spec.FixtureFiles)
	task.ReadablePaths = normalizeStringSlice(spec.ReadablePaths)
	task.WritablePaths = normalizeStringSlice(spec.WritablePaths)
	task.AllowedHosts = normalizeStringSlice(spec.AllowedHosts)
	task.MockEndpoints = normalizeStringSlice(spec.MockEndpoints)
	task.WritableTempDir = spec.WritableTempDir
	task.AllowedPorts = make([]int32, 0, len(spec.AllowedPorts))
	for _, port := range spec.AllowedPorts {
		normalizedPort, err := safePortInt32(port)
		if err != nil {
			return err
		}
		task.AllowedPorts = append(task.AllowedPorts, normalizedPort)
	}

	return nil
}

func policyTaskTypeForTask(task *domain.Task, fallback policy.TaskType) policy.TaskType {
	if task == nil {
		return fallback
	}

	switch task.ExecutionProfile {
	case model.ExecutionProfileFileIO:
		return policy.TaskTypeFileParsing
	case model.ExecutionProfileHTTPClient:
		return policy.TaskTypeAPIJSON
	case model.ExecutionProfileInterviewRealistic:
		return policy.TaskTypeInterviewPractice
	case model.ExecutionProfilePure:
		return fallback
	default:
		return fallback
	}
}

func policyLanguageForTask(language model.ProgrammingLanguage) policy.Language {
	return policy.LanguageForProgrammingLanguage(language)
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
