package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/config"
	"api/internal/rtc"
)

func main() {
	if len(os.Args) != 2 {
		exitf("usage: go run ./cmd/configvalue <key>")
	}

	key := rtc.Key(strings.TrimSpace(os.Args[1]))
	if key == "" {
		exitf("config key cannot be empty")
	}

	logger := klog.NewStdLogger(io.Discard)
	rtcPath := config.ResolveRTCValuesPath()
	manager, cleanup, err := rtc.NewManager(rtcPath, logger)
	if err != nil {
		exitf("init rtc manager: %v", err)
	}
	defer cleanup()

	value := manager.GetValue(context.Background(), key).String()
	if strings.TrimSpace(value) == "" {
		exitf("config value %q is empty", key)
	}

	fmt.Print(value)
}

func exitf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
