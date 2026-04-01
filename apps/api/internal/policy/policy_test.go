package policy

import (
	"testing"

	"api/internal/model"

	"github.com/stretchr/testify/assert"
)

func TestDefaultPolicies(t *testing.T) {
	t.Parallel()

	t.Run("returns all default profiles", func(t *testing.T) {
		t.Parallel()

		policies := DefaultPolicies()
		assert.Len(t, policies, 4)
	})

	t.Run("contains ProfilePure", func(t *testing.T) {
		t.Parallel()

		policies := DefaultPolicies()
		policy, ok := policies[ProfilePure]
		assert.True(t, ok)
		assert.Equal(t, "Pure stdin/stdout", policy.Name)
		assert.False(t, policy.Network.Enabled)
		assert.Equal(t, FilesystemNone, policy.Filesystem.Mode)
	})

	t.Run("contains ProfileFileIO", func(t *testing.T) {
		t.Parallel()

		policies := DefaultPolicies()
		policy, ok := policies[ProfileFileIO]
		assert.True(t, ok)
		assert.Equal(t, "File IO fixtures", policy.Name)
		assert.Equal(t, FilesystemFixturesOnly, policy.Filesystem.Mode)
		assert.True(t, policy.Filesystem.WritableTempDir)
	})

	t.Run("contains ProfileHTTPClient", func(t *testing.T) {
		t.Parallel()

		policies := DefaultPolicies()
		policy, ok := policies[ProfileHTTPClient]
		assert.True(t, ok)
		assert.Equal(t, "HTTP client allowlisted", policy.Name)
		assert.True(t, policy.Network.Enabled)
		assert.Equal(t, NetworkMockOnly, policy.Network.Mode)
	})

	t.Run("contains ProfileInterviewRealistic", func(t *testing.T) {
		t.Parallel()

		policies := DefaultPolicies()
		policy, ok := policies[ProfileInterviewRealistic]
		assert.True(t, ok)
		assert.Equal(t, "Interview realistic", policy.Name)
	})
}

func TestDefaultPolicy(t *testing.T) {
	t.Parallel()

	t.Run("returns valid profile", func(t *testing.T) {
		t.Parallel()

		policy, err := DefaultPolicy(ProfilePure)
		assert.NoError(t, err)
		assert.Equal(t, ProfilePure, policy.Profile)
	})

	t.Run("returns error for unknown profile", func(t *testing.T) {
		t.Parallel()

		_, err := DefaultPolicy("unknown")
		assert.Error(t, err)
		assert.ErrorIs(t, err, ErrUnsupportedProfile)
	})
}

func TestExecutionProfileString(t *testing.T) {
	t.Parallel()

	tests := []struct {
		profile ExecutionProfile
		want    string
	}{
		{ProfilePure, "pure"},
		{ProfileFileIO, "file_io"},
		{ProfileHTTPClient, "http_client"},
		{ProfileInterviewRealistic, "interview_realistic"},
	}

	for _, tc := range tests {
		t.Run(string(tc.profile), func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tc.want, string(tc.profile))
		})
	}
}

func TestNetworkModeString(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "disabled", string(NetworkDisabled))
	assert.Equal(t, "mock_only", string(NetworkMockOnly))
	assert.Equal(t, "allowlist", string(NetworkAllowlist))
}

func TestFilesystemModeString(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "none", string(FilesystemNone))
	assert.Equal(t, "fixtures_only", string(FilesystemFixturesOnly))
	assert.Equal(t, "workspace_ro", string(FilesystemWorkspaceRO))
	assert.Equal(t, "workspace_rw", string(FilesystemWorkspaceRW))
}

func TestLanguageString(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "go", string(LanguageGo))
}

func TestSandboxPolicyConstants(t *testing.T) {
	t.Parallel()

	// Verify all policy profiles are defined
	policies := DefaultPolicies()
	assert.Contains(t, policies, ProfilePure)
	assert.Contains(t, policies, ProfileFileIO)
	assert.Contains(t, policies, ProfileHTTPClient)
	assert.Contains(t, policies, ProfileInterviewRealistic)
}

func TestRunnerConfigDefaults(t *testing.T) {
	t.Parallel()

	config := RunnerConfig{
		Profile:       ProfilePure,
		Deterministic: true,
		StdinEnabled:  true,
		StdoutEnabled: true,
		StderrEnabled: true,
	}

	assert.Equal(t, ProfilePure, config.Profile)
	assert.True(t, config.Deterministic)
	assert.True(t, config.StdinEnabled)
}

func TestResourceLimits(t *testing.T) {
	t.Parallel()

	limits := ResourceLimits{
		TimeLimitMs:      5000,
		MemoryLimitMB:    128,
		CPULimitMilli:    1000,
		ProcessLimit:     16,
		OutputLimitBytes: 64 * 1024,
		TempDiskLimitMB:  16,
	}

	assert.Equal(t, 5000, limits.TimeLimitMs)
	assert.Equal(t, 128, limits.MemoryLimitMB)
	assert.Equal(t, 1000, limits.CPULimitMilli)
	assert.Equal(t, 16, limits.ProcessLimit)
	assert.Equal(t, 64*1024, limits.OutputLimitBytes)
	assert.Equal(t, 16, limits.TempDiskLimitMB)
}

func TestNetworkPolicy(t *testing.T) {
	t.Parallel()

	policy := NetworkPolicy{
		Enabled:       true,
		Mode:          NetworkAllowlist,
		AllowedHosts:  []string{"example.com"},
		AllowedPorts:  []int{80, 443},
		AllowDNS:      true,
		AllowHTTP:     true,
		AllowHTTPS:    true,
		AllowRawTCP:   false,
		MockEndpoints: []string{},
	}

	assert.True(t, policy.Enabled)
	assert.Equal(t, NetworkAllowlist, policy.Mode)
	assert.Equal(t, []string{"example.com"}, policy.AllowedHosts)
	assert.Equal(t, []int{80, 443}, policy.AllowedPorts)
	assert.True(t, policy.AllowDNS)
	assert.True(t, policy.AllowHTTP)
	assert.True(t, policy.AllowHTTPS)
	assert.False(t, policy.AllowRawTCP)
}

func TestFilesystemPolicy(t *testing.T) {
	t.Parallel()

	policy := FilesystemPolicy{
		Mode:             FilesystemWorkspaceRW,
		WorkspaceRoot:    "/workspace",
		FixtureFiles:     []string{"testdata/input.txt"},
		ReadablePaths:    []string{"/data"},
		WritablePaths:    []string{"/output"},
		WritableTempDir:  true,
		MaxFileSizeBytes: 1024 * 1024,
	}

	assert.Equal(t, FilesystemWorkspaceRW, policy.Mode)
	assert.Equal(t, "/workspace", policy.WorkspaceRoot)
	assert.Equal(t, []string{"testdata/input.txt"}, policy.FixtureFiles)
	assert.Equal(t, []string{"/data"}, policy.ReadablePaths)
	assert.Equal(t, []string{"/output"}, policy.WritablePaths)
	assert.True(t, policy.WritableTempDir)
	assert.Equal(t, int64(1024*1024), policy.MaxFileSizeBytes)
}

func TestLanguagePolicy(t *testing.T) {
	t.Parallel()

	policy := LanguagePolicy{
		Language:    LanguageGo,
		AllowCgo:    false,
		AllowUnsafe: false,
		Imports: ImportPolicy{
			Allowlist: []string{},
			Blocklist: []string{"unsafe", "syscall"},
		},
	}

	assert.Equal(t, LanguageGo, policy.Language)
	assert.False(t, policy.AllowCgo)
	assert.False(t, policy.AllowUnsafe)
	assert.Contains(t, policy.Imports.Blocklist, "unsafe")
	assert.Contains(t, policy.Imports.Blocklist, "syscall")
}

func TestArenaFlags(t *testing.T) {
	t.Parallel()

	flags := ArenaFlags{
		Enabled:         true,
		StandardizedEnv: true,
	}

	assert.True(t, flags.Enabled)
	assert.True(t, flags.StandardizedEnv)
}

func TestRunnerLimits(t *testing.T) {
	t.Parallel()

	limits := RunnerLimits{
		MemoryBytes:   128 * 1024 * 1024,
		CPULimitMilli: 1000,
		ProcessLimit:  16,
		OutputBytes:   64 * 1024,
		TempDiskBytes: 16 * 1024 * 1024,
	}

	assert.Equal(t, int64(128*1024*1024), limits.MemoryBytes)
	assert.Equal(t, 1000, limits.CPULimitMilli)
	assert.Equal(t, 16, limits.ProcessLimit)
	assert.Equal(t, 64*1024, limits.OutputBytes)
	assert.Equal(t, int64(16*1024*1024), limits.TempDiskBytes)
}

func TestRunnerNetworkConfig(t *testing.T) {
	t.Parallel()

	config := RunnerNetworkConfig{
		Enabled:       true,
		Mode:          NetworkMockOnly,
		AllowedHosts:  []string{"mock.local"},
		AllowedPorts:  []int{80},
		AllowDNS:      false,
		AllowHTTP:     true,
		AllowHTTPS:    true,
		AllowRawTCP:   false,
		MockEndpoints: []string{"http://mock.local"},
	}

	assert.True(t, config.Enabled)
	assert.Equal(t, NetworkMockOnly, config.Mode)
}

func TestRunnerFilesystemConfig(t *testing.T) {
	t.Parallel()

	config := RunnerFilesystemConfig{
		Mode:             FilesystemWorkspaceRW,
		WorkspaceRoot:    ".",
		FixtureFiles:     []string{"fixtures/"},
		ReadablePaths:    []string{},
		WritablePaths:    []string{},
		WritableTempDir:  true,
		MaxFileSizeBytes: 1024 * 1024,
	}

	assert.Equal(t, FilesystemWorkspaceRW, config.Mode)
	assert.Equal(t, ".", config.WorkspaceRoot)
	assert.True(t, config.WritableTempDir)
}

func TestRunnerLanguageConfig(t *testing.T) {
	t.Parallel()

	config := RunnerLanguageConfig{
		Language:    LanguageGo,
		AllowCgo:    false,
		AllowUnsafe: false,
		ImportAllow: []string{},
		ImportBlock: []string{"unsafe", "syscall"},
	}

	assert.Equal(t, LanguageGo, config.Language)
	assert.False(t, config.AllowCgo)
	assert.False(t, config.AllowUnsafe)
	assert.Contains(t, config.ImportBlock, "unsafe")
}

func TestTaskSpecForCodeEditorRun(t *testing.T) {
	t.Parallel()

	t.Run("returns valid task spec", func(t *testing.T) {
		t.Parallel()

		spec := TaskSpecForCodeEditorRun()
		assert.NotNil(t, spec)
		assert.Equal(t, TaskTypeCodeEditor, spec.Type)
		assert.Equal(t, LanguageGo, spec.Language)
	})
}

func TestTaskSpecForArenaTask(t *testing.T) {
	t.Parallel()

	t.Run("returns valid task spec", func(t *testing.T) {
		t.Parallel()

		task := &model.CodeTask{
			ExecutionProfile: model.ExecutionProfilePure,
			Language:         model.ProgrammingLanguageGo,
			RunnerMode:       model.RunnerModeProgram,
		}

		spec := TaskSpecForArenaTask(task)
		assert.NotNil(t, spec)
		assert.Equal(t, TaskTypeArenaDuel, spec.Type)
	})
}

func TestTaskSpecFromCodeTask(t *testing.T) {
	t.Parallel()

	t.Run("handles pure profile", func(t *testing.T) {
		t.Parallel()

		task := &model.CodeTask{
			ExecutionProfile: model.ExecutionProfilePure,
		}

		spec := TaskSpecFromCodeTask(task, TaskTypeCodeEditor)
		assert.NotNil(t, spec)
	})

	t.Run("handles file_io profile", func(t *testing.T) {
		t.Parallel()

		task := &model.CodeTask{
			ExecutionProfile: model.ExecutionProfileFileIO,
		}

		spec := TaskSpecFromCodeTask(task, TaskTypeCodeEditor)
		assert.NotNil(t, spec)
	})
}

func TestValidatePolicy_Valid(t *testing.T) {
	t.Parallel()

	policy := SandboxPolicy{
		Profile:       ProfilePure,
		Deterministic: true,
		Language: LanguagePolicy{
			Language:    LanguageGo,
			AllowUnsafe: false,
			Imports: ImportPolicy{
				Blocklist: []string{"unsafe"},
			},
		},
		Limits: ResourceLimits{
			TimeLimitMs:      5000,
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
			Mode: FilesystemNone,
		},
	}

	err := ValidatePolicy(policy)
	assert.NoError(t, err)
}

func TestValidatePolicy_MissingProfile(t *testing.T) {
	t.Parallel()

	policy := SandboxPolicy{
		Profile: "",
		Language: LanguagePolicy{
			Language: LanguageGo,
		},
		Limits: ResourceLimits{
			TimeLimitMs:      5000,
			MemoryLimitMB:    128,
			CPULimitMilli:    1000,
			ProcessLimit:     16,
			OutputLimitBytes: 64 * 1024,
		},
		Network: NetworkPolicy{
			Enabled: false,
			Mode:    NetworkDisabled,
		},
		Filesystem: FilesystemPolicy{
			Mode: FilesystemNone,
		},
	}

	err := ValidatePolicy(policy)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "profile is required")
}

func TestValidatePolicy_InvalidTimeLimit(t *testing.T) {
	t.Parallel()

	t.Run("too low", func(t *testing.T) {
		t.Parallel()

		policy := SandboxPolicy{
			Profile: ProfilePure,
			Language: LanguagePolicy{
				Language:    LanguageGo,
				AllowUnsafe: false,
				Imports: ImportPolicy{
					Blocklist: []string{"unsafe"},
				},
			},
			Limits: ResourceLimits{
				TimeLimitMs:      50,
				MemoryLimitMB:    128,
				CPULimitMilli:    1000,
				ProcessLimit:     16,
				OutputLimitBytes: 64 * 1024,
			},
			Network:    NetworkPolicy{Enabled: false, Mode: NetworkDisabled},
			Filesystem: FilesystemPolicy{Mode: FilesystemNone},
		}

		err := ValidatePolicy(policy)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "time_limit_ms")
	})

	t.Run("too high", func(t *testing.T) {
		t.Parallel()

		policy := SandboxPolicy{
			Profile: ProfilePure,
			Language: LanguagePolicy{
				Language:    LanguageGo,
				AllowUnsafe: false,
				Imports: ImportPolicy{
					Blocklist: []string{"unsafe"},
				},
			},
			Limits: ResourceLimits{
				TimeLimitMs:      60000,
				MemoryLimitMB:    128,
				CPULimitMilli:    1000,
				ProcessLimit:     16,
				OutputLimitBytes: 64 * 1024,
			},
			Network:    NetworkPolicy{Enabled: false, Mode: NetworkDisabled},
			Filesystem: FilesystemPolicy{Mode: FilesystemNone},
		}

		err := ValidatePolicy(policy)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "time_limit_ms")
	})
}

func TestValidatePolicy_InvalidMemoryLimit(t *testing.T) {
	t.Parallel()

	policy := SandboxPolicy{
		Profile: ProfilePure,
		Language: LanguagePolicy{
			Language:    LanguageGo,
			AllowUnsafe: false,
			Imports: ImportPolicy{
				Blocklist: []string{"unsafe"},
			},
		},
		Limits: ResourceLimits{
			TimeLimitMs:      5000,
			MemoryLimitMB:    16,
			CPULimitMilli:    1000,
			ProcessLimit:     16,
			OutputLimitBytes: 64 * 1024,
		},
		Network:    NetworkPolicy{Enabled: false, Mode: NetworkDisabled},
		Filesystem: FilesystemPolicy{Mode: FilesystemNone},
	}

	err := ValidatePolicy(policy)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "memory_limit_mb")
}

func TestValidatePolicy_NetworkConflict(t *testing.T) {
	t.Parallel()

	t.Run("disabled mode with enabled", func(t *testing.T) {
		t.Parallel()

		// Use ProfileHTTPClient which allows network to test the conflict
		policy := SandboxPolicy{
			Profile:       ProfileHTTPClient,
			Deterministic: true,
			Language: LanguagePolicy{
				Language:    LanguageGo,
				AllowUnsafe: false,
				Imports: ImportPolicy{
					Blocklist: []string{"unsafe"},
				},
			},
			Limits: ResourceLimits{
				TimeLimitMs:      5000,
				MemoryLimitMB:    128,
				CPULimitMilli:    1000,
				ProcessLimit:     16,
				OutputLimitBytes: 64 * 1024,
			},
			Network: NetworkPolicy{
				Enabled: true,
				Mode:    NetworkDisabled,
			},
			Filesystem: FilesystemPolicy{Mode: FilesystemNone},
		}

		err := ValidatePolicy(policy)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "network.enabled=true requires")
	})

	t.Run("enabled with disabled mode", func(t *testing.T) {
		t.Parallel()

		// Use ProfileHTTPClient which requires network
		policy := SandboxPolicy{
			Profile:       ProfileHTTPClient,
			Deterministic: true,
			Language: LanguagePolicy{
				Language:    LanguageGo,
				AllowUnsafe: false,
				Imports: ImportPolicy{
					Blocklist: []string{"unsafe"},
				},
			},
			Limits: ResourceLimits{
				TimeLimitMs:      5000,
				MemoryLimitMB:    128,
				CPULimitMilli:    1000,
				ProcessLimit:     16,
				OutputLimitBytes: 64 * 1024,
			},
			Network: NetworkPolicy{
				Enabled:      false,
				Mode:         NetworkMockOnly,
				AllowedHosts: []string{"localhost"},
			},
			Filesystem: FilesystemPolicy{Mode: FilesystemNone},
		}

		err := ValidatePolicy(policy)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "network.enabled=false requires")
	})
}

func TestValidatePolicy_PureProfileCannotHaveNetwork(t *testing.T) {
	t.Parallel()

	policy := SandboxPolicy{
		Profile: ProfilePure,
		Language: LanguagePolicy{
			Language:    LanguageGo,
			AllowUnsafe: false,
			Imports: ImportPolicy{
				Blocklist: []string{"unsafe"},
			},
		},
		Limits: ResourceLimits{
			TimeLimitMs:      5000,
			MemoryLimitMB:    128,
			CPULimitMilli:    1000,
			ProcessLimit:     16,
			OutputLimitBytes: 64 * 1024,
		},
		Network: NetworkPolicy{
			Enabled:      true,
			Mode:         NetworkMockOnly,
			AllowedHosts: []string{"localhost"},
		},
		Filesystem: FilesystemPolicy{Mode: FilesystemNone},
	}

	err := ValidatePolicy(policy)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "pure profile cannot enable network")
}

func TestValidatePolicy_FilesystemNoneCannotHavePaths(t *testing.T) {
	t.Parallel()

	policy := SandboxPolicy{
		Profile: ProfilePure,
		Language: LanguagePolicy{
			Language:    LanguageGo,
			AllowUnsafe: false,
			Imports: ImportPolicy{
				Blocklist: []string{"unsafe"},
			},
		},
		Limits: ResourceLimits{
			TimeLimitMs:      5000,
			MemoryLimitMB:    128,
			CPULimitMilli:    1000,
			ProcessLimit:     16,
			OutputLimitBytes: 64 * 1024,
		},
		Network: NetworkPolicy{Enabled: false, Mode: NetworkDisabled},
		Filesystem: FilesystemPolicy{
			Mode:          FilesystemNone,
			FixtureFiles:  []string{"test.txt"},
			ReadablePaths: []string{"/data"},
		},
	}

	err := ValidatePolicy(policy)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "filesystem mode none cannot define")
}

func TestValidateSafeRelativePath(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		path    string
		wantErr bool
	}{
		{"empty", "", true},
		{"absolute", "/absolute", true},
		{"dot", ".", true},
		{"dotdot", "..", true},
		{"escapes", "../escape", true},
		{"valid", "subdir/file.txt", false},
		{"valid deep", "a/b/c/file.txt", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			err := validateSafeRelativePath(tc.path)
			if tc.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidatePolicy_ImportConflict(t *testing.T) {
	t.Parallel()

	// Test when AllowUnsafe is true (so early return doesn't happen)
	// and there's a conflict between allowlist and blocklist
	policy := SandboxPolicy{
		Profile:       ProfileHTTPClient,
		Deterministic: true,
		Language: LanguagePolicy{
			Language:    LanguageGo,
			AllowUnsafe: true,
			Imports: ImportPolicy{
				Allowlist: []string{"net"},
				Blocklist: []string{"net", "os"},
			},
		},
		Limits: ResourceLimits{
			TimeLimitMs:      5000,
			MemoryLimitMB:    128,
			CPULimitMilli:    1000,
			ProcessLimit:     16,
			OutputLimitBytes: 64 * 1024,
		},
		Network:    NetworkPolicy{Enabled: true, Mode: NetworkMockOnly, AllowedHosts: []string{"localhost"}},
		Filesystem: FilesystemPolicy{Mode: FilesystemNone},
	}

	err := ValidatePolicy(policy)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot be both allowed and blocked")
}

func TestValidatePolicy_RequireUnsafeBlocklist(t *testing.T) {
	t.Parallel()

	policy := SandboxPolicy{
		Profile:       ProfileHTTPClient,
		Deterministic: true,
		Language: LanguagePolicy{
			Language:    LanguageGo,
			AllowUnsafe: false,
			Imports: ImportPolicy{
				Blocklist: []string{"syscall"},
			},
		},
		Limits: ResourceLimits{
			TimeLimitMs:      5000,
			MemoryLimitMB:    128,
			CPULimitMilli:    1000,
			ProcessLimit:     16,
			OutputLimitBytes: 64 * 1024,
		},
		Network:    NetworkPolicy{Enabled: true, Mode: NetworkMockOnly, AllowedHosts: []string{"localhost"}},
		Filesystem: FilesystemPolicy{Mode: FilesystemNone},
	}

	err := ValidatePolicy(policy)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsafe must be blocklisted")
}

func TestBuildRunnerConfig(t *testing.T) {
	t.Parallel()

	t.Run("valid config", func(t *testing.T) {
		t.Parallel()

		policy := DefaultPolicies()[ProfilePure]
		task := TaskSpec{
			Type:     TaskTypeCodeEditor,
			Language: LanguageGo,
		}

		cfg, err := BuildRunnerConfig(policy, task)
		assert.NoError(t, err)
		assert.Equal(t, ProfilePure, cfg.Profile)
	})

	t.Run("unknown profile", func(t *testing.T) {
		t.Parallel()

		policy := SandboxPolicy{
			Profile: ExecutionProfile("unknown"),
			Language: LanguagePolicy{
				Language: LanguageGo,
			},
			Limits: ResourceLimits{
				TimeLimitMs:      5000,
				MemoryLimitMB:    128,
				CPULimitMilli:    1000,
				ProcessLimit:     16,
				OutputLimitBytes: 64 * 1024,
			},
			Network:    NetworkPolicy{Enabled: false, Mode: NetworkDisabled},
			Filesystem: FilesystemPolicy{Mode: FilesystemNone},
		}
		task := TaskSpec{
			Type:     TaskTypeCodeEditor,
			Language: LanguageGo,
		}

		_, err := BuildRunnerConfig(policy, task)
		assert.Error(t, err)
	})
}

func TestResolvePolicy(t *testing.T) {
	t.Parallel()

	t.Run("resolves code editor task", func(t *testing.T) {
		t.Parallel()

		spec := TaskSpecForCodeEditorRun()
		policy, err := ResolvePolicy(spec)
		assert.NoError(t, err)
		assert.NotNil(t, policy)
	})

	t.Run("resolves arena task", func(t *testing.T) {
		t.Parallel()

		task := &model.CodeTask{
			ExecutionProfile: model.ExecutionProfilePure,
		}
		spec := TaskSpecForArenaTask(task)
		policy, err := ResolvePolicy(spec)
		assert.NoError(t, err)
		assert.NotNil(t, policy)
	})
}

func TestRunnerConfigSummary(t *testing.T) {
	t.Parallel()

	cfg := RunnerConfig{
		Profile: ProfilePure,
		Limits: RunnerLimits{
			MemoryBytes:   128 * 1024 * 1024,
			CPULimitMilli: 1000,
			ProcessLimit:  16,
			OutputBytes:   64 * 1024,
			TempDiskBytes: 16 * 1024 * 1024,
		},
	}

	summary := RunnerConfigSummary(cfg)
	assert.NotEmpty(t, summary)
	assert.Contains(t, summary, "profile=")
}
