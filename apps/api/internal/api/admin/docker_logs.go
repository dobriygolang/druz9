package admin

import (
	"bytes"
	"context"
	errs "errors"
	"fmt"
	"os"
	"os/exec"
	"sort"
	"strconv"
	"strings"

	"github.com/go-kratos/kratos/v2/errors"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

var errDockerLogsFailed = errs.New("docker logs failed")

const OperationAdminServiceGetDockerLogs = "/admin.v1.AdminService/GetDockerLogs"

const (
	defaultDockerLogsProject = "druz9"
	defaultDockerLogsTail    = 300
	maxDockerLogsTail        = 5000
)

var allowedDockerLogServices = map[string]struct{}{
	"alertmanager":         {},
	"backend":              {},
	"frontend":             {},
	"grafana":              {},
	"minio":                {},
	"minio-init":           {},
	"node-exporter":        {},
	"notification-service": {},
	"postgres":             {},
	"postgres-exporter":    {},
	"prometheus":           {},
	"sandbox-exec-image":   {},
	"sandbox-runner":       {},
	"seed":                 {},
}

type DockerLogsRequest struct {
	Service string `json:"service"`
	Tail    int    `json:"tail"`
	Since   string `json:"since,omitempty"`
}

type DockerLogsResponse struct {
	Service           string   `json:"service"`
	ContainerID       string   `json:"containerId"`
	Logs              string   `json:"logs"`
	Tail              int      `json:"tail"`
	Since             string   `json:"since,omitempty"`
	AvailableServices []string `json:"availableServices"`
}

type dockerLogsRunner interface {
	Run(ctx context.Context, stdin []byte, args []string) ([]byte, error)
}

type dockerLogsCommandRunner struct {
	binary string
}

func RegisterDockerLogsHTTPRoute(s *kratoshttp.Server, impl *Implementation) {
	r := s.Route("/")
	r.GET("/api/admin/docker/logs", func(ctx kratoshttp.Context) error {
		query := ctx.Request().URL.Query()
		tail := defaultDockerLogsTail
		if rawTail := strings.TrimSpace(query.Get("tail")); rawTail != "" {
			parsed, err := strconv.Atoi(rawTail)
			if err != nil {
				return errors.BadRequest("INVALID_LOG_TAIL", "tail must be a number")
			}
			tail = parsed
		}

		req := &DockerLogsRequest{
			Service: strings.TrimSpace(query.Get("service")),
			Tail:    tail,
			Since:   strings.TrimSpace(query.Get("since")),
		}

		kratoshttp.SetOperation(ctx, OperationAdminServiceGetDockerLogs)
		handler := ctx.Middleware(func(ctx context.Context, req interface{}) (interface{}, error) {
			return impl.GetDockerLogs(ctx, req.(*DockerLogsRequest))
		})
		out, err := handler(ctx, req)
		if err != nil {
			return err
		}
		return ctx.Result(200, out.(*DockerLogsResponse))
	})
}

func (i *Implementation) GetDockerLogs(ctx context.Context, req *DockerLogsRequest) (*DockerLogsResponse, error) {
	if i == nil {
		return nil, errors.InternalServer("ADMIN_SERVICE_UNAVAILABLE", "admin service is not configured")
	}

	service := strings.TrimSpace(req.Service)
	if _, ok := allowedDockerLogServices[service]; !ok {
		return nil, errors.BadRequest("UNKNOWN_DOCKER_SERVICE", "unknown docker compose service")
	}

	tail := req.Tail
	if tail <= 0 {
		tail = defaultDockerLogsTail
	}
	if tail > maxDockerLogsTail {
		tail = maxDockerLogsTail
	}

	since := strings.TrimSpace(req.Since)
	if len(since) > 64 || strings.ContainsAny(since, "\x00\r\n") {
		return nil, errors.BadRequest("INVALID_LOG_SINCE", "since has an invalid format")
	}

	runner := i.dockerLogsRunner
	if runner == nil {
		binary := strings.TrimSpace(os.Getenv("DOCKER_LOGS_BINARY"))
		if binary == "" {
			binary = "docker"
		}
		runner = dockerLogsCommandRunner{binary: binary}
	}

	project := strings.TrimSpace(os.Getenv("DOCKER_LOGS_PROJECT"))
	if project == "" {
		project = defaultDockerLogsProject
	}

	containerID, err := findComposeContainer(ctx, runner, project, service)
	if err != nil {
		return nil, err
	}

	args := []string{"logs", "--timestamps", "--tail", strconv.Itoa(tail)}
	if since != "" {
		args = append(args, "--since", since)
	}
	args = append(args, containerID)

	output, err := runner.Run(ctx, nil, args)
	if err != nil {
		return nil, errors.InternalServer("DOCKER_LOGS_FAILED", err.Error())
	}

	return &DockerLogsResponse{
		Service:           service,
		ContainerID:       containerID,
		Logs:              string(output),
		Tail:              tail,
		Since:             since,
		AvailableServices: AvailableDockerLogServices(),
	}, nil
}

func AvailableDockerLogServices() []string {
	services := make([]string, 0, len(allowedDockerLogServices))
	for service := range allowedDockerLogServices {
		services = append(services, service)
	}
	sort.Strings(services)
	return services
}

func findComposeContainer(ctx context.Context, runner dockerLogsRunner, project, service string) (string, error) {
	output, err := runner.Run(ctx, nil, []string{
		"ps",
		"-a",
		"--filter",
		"label=com.docker.compose.project=" + project,
		"--filter",
		"label=com.docker.compose.service=" + service,
		"--format",
		"{{.ID}}",
	})
	if err != nil {
		return "", errors.InternalServer("DOCKER_PS_FAILED", err.Error())
	}

	for _, line := range strings.Split(string(output), "\n") {
		containerID := strings.TrimSpace(line)
		if containerID != "" {
			return containerID, nil
		}
	}

	return "", errors.NotFound("DOCKER_CONTAINER_NOT_FOUND", fmt.Sprintf("container for service %q was not found", service))
}

func (r dockerLogsCommandRunner) Run(ctx context.Context, stdin []byte, args []string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, r.binary, args...)
	if stdin != nil {
		cmd.Stdin = bytes.NewReader(stdin)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		if ctx.Err() != nil {
			return nil, fmt.Errorf("docker command timed out or was cancelled: %w", ctx.Err())
		}
		message := strings.TrimSpace(string(output))
		if message == "" {
			message = err.Error()
		}
		return nil, fmt.Errorf("%w: %s", errDockerLogsFailed, message)
	}
	return output, nil
}
