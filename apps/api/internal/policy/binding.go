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

func TaskSpecForArenaTask(task *model.CodeTask) TaskSpec {
	spec := TaskSpecFromCodeTask(task, TaskTypeArenaDuel)
	spec.Type = TaskTypeArenaDuel
	spec.Profile = ProfilePure
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
	spec.Type = TaskType(task.TaskType)
	spec.Profile = ExecutionProfile(task.ExecutionProfile)
	spec.FixtureFiles = append([]string(nil), task.FixtureFiles...)
	spec.ReadablePaths = append([]string(nil), task.ReadablePaths...)
	spec.WritablePaths = append([]string(nil), task.WritablePaths...)
	spec.AllowedHosts = append([]string(nil), task.AllowedHosts...)
	spec.MockEndpoints = append([]string(nil), task.MockEndpoints...)
	spec.WritableTempDir = task.WritableTempDir

	if task.Language == string(LanguageGo) {
		spec.Language = LanguageGo
	}
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
