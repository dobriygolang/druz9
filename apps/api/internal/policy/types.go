package policy

import "time"

type ExecutionProfile string

const (
	ProfilePure               ExecutionProfile = "pure"
	ProfileFileIO             ExecutionProfile = "file_io"
	ProfileHTTPClient         ExecutionProfile = "http_client"
	ProfileInterviewRealistic ExecutionProfile = "interview_realistic"
)

type NetworkMode string

const (
	NetworkDisabled  NetworkMode = "disabled"
	NetworkMockOnly  NetworkMode = "mock_only"
	NetworkAllowlist NetworkMode = "allowlist"
)

type FilesystemMode string

const (
	FilesystemNone         FilesystemMode = "none"
	FilesystemFixturesOnly FilesystemMode = "fixtures_only"
	FilesystemWorkspaceRO  FilesystemMode = "workspace_ro"
	FilesystemWorkspaceRW  FilesystemMode = "workspace_rw"
)

type Language string

const (
	LanguageGo Language = "go"
)

type SandboxPolicy struct {
	Profile       ExecutionProfile
	Name          string
	Description   string
	Purpose       string
	Deterministic bool
	AllowStdin    bool
	AllowStdout   bool
	AllowStderr   bool
	Limits        ResourceLimits
	Network       NetworkPolicy
	Filesystem    FilesystemPolicy
	Language      LanguagePolicy
	Arena         ArenaFlags
}

type ResourceLimits struct {
	TimeLimitMs      int
	MemoryLimitMB    int
	CPULimitMilli    int
	ProcessLimit     int
	OutputLimitBytes int
	TempDiskLimitMB  int
}

type NetworkPolicy struct {
	Enabled       bool
	Mode          NetworkMode
	AllowedHosts  []string
	AllowedPorts  []int
	AllowDNS      bool
	AllowHTTP     bool
	AllowHTTPS    bool
	AllowRawTCP   bool
	MockEndpoints []string
}

type FilesystemPolicy struct {
	Mode             FilesystemMode
	WorkspaceRoot    string
	FixtureFiles     []string
	ReadablePaths    []string
	WritablePaths    []string
	WritableTempDir  bool
	MaxFileSizeBytes int64
}

type LanguagePolicy struct {
	Language    Language
	AllowCgo    bool
	AllowUnsafe bool
	Imports     ImportPolicy
}

type ImportPolicy struct {
	Allowlist []string
	Blocklist []string
}

type ArenaFlags struct {
	Enabled         bool
	StandardizedEnv bool
}

type RunnerConfig struct {
	Profile       ExecutionProfile
	Deterministic bool
	StdinEnabled  bool
	StdoutEnabled bool
	StderrEnabled bool
	Timeout       time.Duration
	Limits        RunnerLimits
	Network       RunnerNetworkConfig
	Filesystem    RunnerFilesystemConfig
	Language      RunnerLanguageConfig
	MinimalEnv    []string
}

type RunnerLimits struct {
	MemoryBytes   int64
	CPULimitMilli int
	ProcessLimit  int
	OutputBytes   int
	TempDiskBytes int64
}

type RunnerNetworkConfig struct {
	Enabled       bool
	Mode          NetworkMode
	AllowedHosts  []string
	AllowedPorts  []int
	AllowDNS      bool
	AllowHTTP     bool
	AllowHTTPS    bool
	AllowRawTCP   bool
	MockEndpoints []string
}

type RunnerFilesystemConfig struct {
	Mode             FilesystemMode
	WorkspaceRoot    string
	FixtureFiles     []string
	ReadablePaths    []string
	WritablePaths    []string
	WritableTempDir  bool
	MaxFileSizeBytes int64
}

type RunnerLanguageConfig struct {
	Language    Language
	AllowCgo    bool
	AllowUnsafe bool
	ImportAllow []string
	ImportBlock []string
}
