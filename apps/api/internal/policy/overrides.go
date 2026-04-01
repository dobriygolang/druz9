package policy

import "fmt"

func applyOverride(p *SandboxPolicy, override Override) error {
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
