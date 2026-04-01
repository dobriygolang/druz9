package policy

func defaultPurePolicy() SandboxPolicy {
	return SandboxPolicy{
		Profile:       ProfilePure,
		Name:          "Pure stdin/stdout",
		Description:   "Deterministic algorithm execution without filesystem or network access.",
		Purpose:       "arena_and_algorithms",
		Deterministic: true,
		AllowStdin:    true,
		AllowStdout:   true,
		AllowStderr:   true,
		Limits: ResourceLimits{
			TimeLimitMs:      15000,
			MemoryLimitMB:    128,
			CPULimitMilli:    1000,
			ProcessLimit:     16,
			OutputLimitBytes: 64 * 1024,
			TempDiskLimitMB:  16,
		},
		Network: NetworkPolicy{
			Enabled: false,
			Mode:    NetworkDisabled,
		},
		Filesystem: FilesystemPolicy{
			Mode:             FilesystemNone,
			MaxFileSizeBytes: 0,
		},
		Language: defaultGoLanguagePolicy(),
		Arena: ArenaFlags{
			StandardizedEnv: true,
		},
	}
}

func defaultFileIOPolicy() SandboxPolicy {
	return SandboxPolicy{
		Profile:       ProfileFileIO,
		Name:          "File IO fixtures",
		Description:   "Execution with prepared fixture files and optional temp output.",
		Purpose:       "file_parsing",
		Deterministic: true,
		AllowStdin:    true,
		AllowStdout:   true,
		AllowStderr:   true,
		Limits: ResourceLimits{
			TimeLimitMs:      4000,
			MemoryLimitMB:    192,
			CPULimitMilli:    1000,
			ProcessLimit:     24,
			OutputLimitBytes: 128 * 1024,
			TempDiskLimitMB:  32,
		},
		Network: NetworkPolicy{
			Enabled: false,
			Mode:    NetworkDisabled,
		},
		Filesystem: FilesystemPolicy{
			Mode:             FilesystemFixturesOnly,
			WorkspaceRoot:    ".",
			WritableTempDir:  true,
			MaxFileSizeBytes: 2 * 1024 * 1024,
		},
		Language: defaultGoLanguagePolicy(),
	}
}

func defaultHTTPClientPolicy() SandboxPolicy {
	return SandboxPolicy{
		Profile:       ProfileHTTPClient,
		Name:          "HTTP client allowlisted",
		Description:   "Execution with restricted HTTP client access to mock or allowlisted endpoints.",
		Purpose:       "api_json",
		Deterministic: false,
		AllowStdin:    true,
		AllowStdout:   true,
		AllowStderr:   true,
		Limits: ResourceLimits{
			TimeLimitMs:      15000,
			MemoryLimitMB:    192,
			CPULimitMilli:    1000,
			ProcessLimit:     24,
			OutputLimitBytes: 128 * 1024,
			TempDiskLimitMB:  16,
		},
		Network: defaultMockNetworkPolicy(),
		Filesystem: FilesystemPolicy{
			Mode:             FilesystemNone,
			MaxFileSizeBytes: 0,
		},
		Language: defaultGoLanguagePolicy(),
	}
}

func defaultInterviewRealisticPolicy() SandboxPolicy {
	return SandboxPolicy{
		Profile:       ProfileInterviewRealistic,
		Name:          "Interview realistic",
		Description:   "Interview mode with controlled fixture files and mock HTTP access.",
		Purpose:       "interview_practice",
		Deterministic: false,
		AllowStdin:    true,
		AllowStdout:   true,
		AllowStderr:   true,
		Limits: ResourceLimits{
			TimeLimitMs:      8000,
			MemoryLimitMB:    256,
			CPULimitMilli:    1500,
			ProcessLimit:     32,
			OutputLimitBytes: 256 * 1024,
			TempDiskLimitMB:  64,
		},
		Network: defaultMockNetworkPolicy(),
		Filesystem: FilesystemPolicy{
			Mode:             FilesystemFixturesOnly,
			WorkspaceRoot:    ".",
			WritableTempDir:  true,
			MaxFileSizeBytes: 4 * 1024 * 1024,
		},
		Language: defaultGoLanguagePolicy(),
	}
}

func defaultGoLanguagePolicy() LanguagePolicy {
	return LanguagePolicy{
		Language:    LanguageGo,
		AllowCgo:    false,
		AllowUnsafe: false,
		Imports: ImportPolicy{
			Blocklist: []string{"unsafe", "syscall", "plugin"},
		},
	}
}

func defaultMockNetworkPolicy() NetworkPolicy {
	return NetworkPolicy{
		Enabled:       true,
		Mode:          NetworkMockOnly,
		AllowDNS:      false,
		AllowHTTP:     true,
		AllowHTTPS:    true,
		AllowRawTCP:   false,
		MockEndpoints: []string{"http://mock.local"},
		AllowedHosts:  []string{"mock.local"},
		AllowedPorts:  []int{80},
	}
}
