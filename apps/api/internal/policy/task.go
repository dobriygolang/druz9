package policy

type TaskType string

const (
	TaskTypeArenaDuel         TaskType = "arena_duel"
	TaskTypeAlgorithmPractice TaskType = "algorithm_practice"
	TaskTypeFileParsing       TaskType = "file_parsing"
	TaskTypeAPIJSON           TaskType = "api_json"
	TaskTypeInterviewPractice TaskType = "interview_practice"
	TaskTypeCodeEditor        TaskType = "code_editor"
)

type TaskCapabilities struct {
	NeedsStdin      bool
	NeedsFilesystem bool
	NeedsNetwork    bool
	NeedsHTTP       bool
	Deterministic   bool
}

type TaskSpec struct {
	Type            TaskType
	Profile         ExecutionProfile
	Name            string
	Purpose         string
	Language        Language
	Capabilities    TaskCapabilities
	FixtureFiles    []string
	ReadablePaths   []string
	WritablePaths   []string
	WritableTempDir bool
	MockEndpoints   []string
	AllowedHosts    []string
	AllowedPorts    []int
	Override        *Override
}

type Override struct {
	TimeLimitMs      *int
	MemoryLimitMB    *int
	OutputLimitBytes *int
	ProcessLimit     *int
	TempDiskLimitMB  *int
	AllowStderr      *bool
	WritableTempDir  *bool
	FilesystemMode   *FilesystemMode
	NetworkMode      *NetworkMode
	ImportBlocklist  []string
}
