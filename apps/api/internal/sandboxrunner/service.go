package sandboxrunner

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"api/internal/sandbox"
)

const defaultRuntimeTimeout = 20 * time.Second

type Config struct {
	DockerBinary      string
	ExecImage         string
	ContainerUser     string
	MemoryLimit       string
	MemorySwapLimit   string
	CPUQuota          string
	PidsLimit         int
	TmpfsSize         string
	NetworkMode       string
	ReadOnlyRootFS    bool
	NoNewPrivileges   bool
	ContainerWorkDir  string
	ContainerHostname string
	RuntimeTimeout    time.Duration
}

type DockerRunner interface {
	Run(ctx context.Context, stdin []byte, args []string) ([]byte, error)
}

type Service struct {
	cfg    Config
	docker DockerRunner
}

type dockerCommandRunner struct {
	binary string
}

func NewService(cfg Config) *Service {
	if strings.TrimSpace(cfg.DockerBinary) == "" {
		cfg.DockerBinary = "docker"
	}
	if strings.TrimSpace(cfg.ContainerUser) == "" {
		cfg.ContainerUser = "65532:65532"
	}
	if strings.TrimSpace(cfg.MemoryLimit) == "" {
		cfg.MemoryLimit = "384m"
	}
	if strings.TrimSpace(cfg.MemorySwapLimit) == "" {
		cfg.MemorySwapLimit = "384m"
	}
	if strings.TrimSpace(cfg.CPUQuota) == "" {
		cfg.CPUQuota = "1.0"
	}
	if cfg.PidsLimit <= 0 {
		cfg.PidsLimit = 64
	}
	if strings.TrimSpace(cfg.TmpfsSize) == "" {
		cfg.TmpfsSize = "64m"
	}
	if strings.TrimSpace(cfg.NetworkMode) == "" {
		cfg.NetworkMode = "none"
	}
	if strings.TrimSpace(cfg.ContainerWorkDir) == "" {
		cfg.ContainerWorkDir = "/tmp"
	}
	if strings.TrimSpace(cfg.ContainerHostname) == "" {
		cfg.ContainerHostname = "sandbox"
	}
	if cfg.RuntimeTimeout <= 0 {
		cfg.RuntimeTimeout = defaultRuntimeTimeout
	}
	cfg.ReadOnlyRootFS = true
	cfg.NoNewPrivileges = true

	return &Service{
		cfg:    cfg,
		docker: dockerCommandRunner{binary: cfg.DockerBinary},
	}
}

func (s *Service) Execute(ctx context.Context, req sandbox.ExecutionRequest) (sandbox.ExecutionResult, error) {
	if strings.TrimSpace(s.cfg.ExecImage) == "" {
		return sandbox.ExecutionResult{}, errors.New("sandbox exec image is not configured")
	}

	payload, err := json.Marshal(sandbox.ExecuteEnvelope{Request: req})
	if err != nil {
		return sandbox.ExecutionResult{}, fmt.Errorf("marshal sandbox envelope: %w", err)
	}

	timeout := s.cfg.RuntimeTimeout
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	output, err := s.docker.Run(ctx, payload, s.buildDockerArgs())
	if err != nil {
		return sandbox.ExecutionResult{}, err
	}

	var envelope sandbox.ExecuteResponseEnvelope
	if err := json.Unmarshal(output, &envelope); err != nil {
		return sandbox.ExecutionResult{}, fmt.Errorf("decode sandbox executor response: %w", err)
	}
	if strings.TrimSpace(envelope.Error) != "" {
		return sandbox.ExecutionResult{}, fmt.Errorf("%s", strings.TrimSpace(envelope.Error))
	}
	if envelope.Result == nil {
		return sandbox.ExecutionResult{}, errors.New("sandbox executor returned empty result")
	}
	return *envelope.Result, nil
}

func (s *Service) buildDockerArgs() []string {
	args := []string{
		"run",
		"--rm",
		"-i",
		"--pull=never",
		"--network", s.cfg.NetworkMode,
		"--user", s.cfg.ContainerUser,
		"--workdir", s.cfg.ContainerWorkDir,
		"--hostname", s.cfg.ContainerHostname,
		"--memory", s.cfg.MemoryLimit,
		"--memory-swap", s.cfg.MemorySwapLimit,
		"--cpus", s.cfg.CPUQuota,
		"--pids-limit", strconv.Itoa(s.cfg.PidsLimit),
		"--cap-drop", "ALL",
		"--security-opt", "no-new-privileges=true",
		"--tmpfs", "/tmp:rw,exec,nosuid,size=" + s.cfg.TmpfsSize,
		"--tmpfs", "/var/tmp:rw,exec,nosuid,size=" + s.cfg.TmpfsSize,
		"-e", "HOME=/tmp",
		"-e", "TMPDIR=/tmp",
	}
	if s.cfg.ReadOnlyRootFS {
		args = append(args, "--read-only")
	}
	args = append(args, s.cfg.ExecImage, "/app/bin/sandbox-exec")
	return args
}

func (r dockerCommandRunner) Run(ctx context.Context, stdin []byte, args []string) ([]byte, error) {
	//nolint:gosec // binary and args come from trusted config; user input is passed via stdin.
	cmd := exec.CommandContext(ctx, r.binary, args...)
	cmd.Stdin = bytes.NewReader(stdin)

	output, err := cmd.CombinedOutput()
	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("sandbox container timed out or was cancelled: %w", ctx.Err())
		}
		message := strings.TrimSpace(string(output))
		if message == "" {
			message = err.Error()
		}
		return nil, fmt.Errorf("sandbox container failed: %s", message)
	}
	return output, nil
}
