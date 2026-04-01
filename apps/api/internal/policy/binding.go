package policy

import (
	"api/internal/model"
)

func TaskSpecForCodeEditorRun() TaskSpec {
	return TaskSpec{
		Type:     TaskTypeCodeEditor,
		Language: LanguageGo,
	}
}

func LanguageForProgrammingLanguage(language model.ProgrammingLanguage) Language {
	switch language {
	case model.ProgrammingLanguagePython:
		return LanguagePython
	case model.ProgrammingLanguageSQL:
		return LanguageSQL
	case model.ProgrammingLanguageGo:
		fallthrough
	default:
		return LanguageGo
	}
}

func TaskSpecForArenaTask(task *model.CodeTask) TaskSpec {
	spec := TaskSpecFromCodeTask(task, TaskTypeArenaDuel)
	spec.Type = TaskTypeArenaDuel
	spec.Capabilities.Deterministic = true
	return spec
}

func TaskSpecFromCodeTask(task *model.CodeTask, fallback TaskType) TaskSpec {
	spec := TaskSpec{
		Type:     fallback,
		Language: LanguageGo,
	}
	if task == nil {
		return spec
	}

	spec.Name = task.Title
	spec.Purpose = task.Slug
	spec.Type = taskPolicyTypeFromCodeTask(task, fallback)
	spec.Profile = ExecutionProfile(task.ExecutionProfile.String())
	spec.FixtureFiles = append([]string(nil), task.FixtureFiles...)
	spec.ReadablePaths = append([]string(nil), task.ReadablePaths...)
	spec.WritablePaths = append([]string(nil), task.WritablePaths...)
	spec.AllowedHosts = append([]string(nil), task.AllowedHosts...)
	spec.MockEndpoints = append([]string(nil), task.MockEndpoints...)
	spec.WritableTempDir = task.WritableTempDir

	spec.Language = LanguageForProgrammingLanguage(task.Language)
	for _, port := range task.AllowedPorts {
		spec.AllowedPorts = append(spec.AllowedPorts, int(port))
	}

	switch spec.Type {
	case TaskTypeArenaDuel:
		spec.Capabilities = TaskCapabilities{
			NeedsStdin:    true,
			Deterministic: true,
		}
	case TaskTypeFileParsing:
		spec.Capabilities = TaskCapabilities{
			NeedsStdin:      true,
			NeedsFilesystem: true,
			Deterministic:   true,
		}
	case TaskTypeAPIJSON:
		spec.Capabilities = TaskCapabilities{
			NeedsStdin:    true,
			NeedsNetwork:  true,
			NeedsHTTP:     true,
			Deterministic: false,
		}
	case TaskTypeInterviewPractice:
		spec.Capabilities = TaskCapabilities{
			NeedsStdin:      true,
			NeedsFilesystem: true,
			NeedsNetwork:    true,
			NeedsHTTP:       true,
			Deterministic:   false,
		}
	default:
		spec.Capabilities = TaskCapabilities{
			NeedsStdin:    true,
			Deterministic: fallback == TaskTypeArenaDuel,
		}
	}

	return spec
}

func taskPolicyTypeFromCodeTask(task *model.CodeTask, fallback TaskType) TaskType {
	if task == nil {
		return fallback
	}

	switch task.ExecutionProfile {
	case model.ExecutionProfileFileIO:
		return TaskTypeFileParsing
	case model.ExecutionProfileHTTPClient:
		return TaskTypeAPIJSON
	case model.ExecutionProfileInterviewRealistic:
		return TaskTypeInterviewPractice
	case model.ExecutionProfilePure:
		return fallback
	default:
		return fallback
	}
}
