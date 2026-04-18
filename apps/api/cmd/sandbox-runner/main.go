package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"api/internal/sandboxrunner"
)

func main() {
	addr := firstNonEmpty(os.Getenv("SANDBOX_RUNNER_BIND_ADDR"), ":8098")
	service := sandboxrunner.NewService(sandboxrunner.Config{
		DockerBinary:      firstNonEmpty(os.Getenv("SANDBOX_RUNNER_DOCKER_BINARY"), "docker"),
		ExecImage:         firstNonEmpty(os.Getenv("SANDBOX_EXEC_IMAGE"), "druz9-sandbox-runner:local"),
		ContainerUser:     firstNonEmpty(os.Getenv("SANDBOX_EXEC_CONTAINER_USER"), "65532:65532"),
		MemoryLimit:       firstNonEmpty(os.Getenv("SANDBOX_EXEC_MEMORY_LIMIT"), "384m"),
		MemorySwapLimit:   firstNonEmpty(os.Getenv("SANDBOX_EXEC_MEMORY_SWAP"), "384m"),
		CPUQuota:          firstNonEmpty(os.Getenv("SANDBOX_EXEC_CPUS"), "1.0"),
		TmpfsSize:         firstNonEmpty(os.Getenv("SANDBOX_EXEC_TMPFS_SIZE"), "64m"),
		NetworkMode:       firstNonEmpty(os.Getenv("SANDBOX_EXEC_NETWORK_MODE"), "none"),
		ContainerWorkDir:  firstNonEmpty(os.Getenv("SANDBOX_EXEC_WORKDIR"), "/tmp"),
		ContainerHostname: firstNonEmpty(os.Getenv("SANDBOX_EXEC_HOSTNAME"), "sandbox"),
		PidsLimit:         intFromEnv("SANDBOX_EXEC_PIDS_LIMIT", 64),
		RuntimeTimeout:    durationFromEnv("SANDBOX_RUNNER_TIMEOUT", 20*time.Second),
		ReadOnlyRootFS:    boolFromEnv("SANDBOX_EXEC_READ_ONLY", true),
		NoNewPrivileges:   boolFromEnv("SANDBOX_EXEC_NO_NEW_PRIVILEGES", true),
	})

	server := &http.Server{
		Addr:              addr,
		Handler:           sandboxrunner.NewHTTPHandler(service),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("sandbox runner listening on %s", addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("sandbox runner stopped: %v", err)
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func intFromEnv(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func durationFromEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func boolFromEnv(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return fallback
	}
	switch value {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}
