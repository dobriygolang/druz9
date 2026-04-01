package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	appcodeeditor "api/internal/app/codeeditor"
	"api/internal/config"
	codeeditordata "api/internal/data/code_editor"
	"api/internal/rtc"
	"api/internal/sandbox"
	"api/internal/seeds"
	"api/internal/storage/postgres"

	klog "github.com/go-kratos/kratos/v2/log"
)

func main() {
	var only string
	var status bool
	flag.StringVar(&only, "only", "all", "which seeds to run: all, sql, blind75, interview-prep")
	flag.BoolVar(&status, "status", false, "print applied seed records and exit")
	flag.Parse()

	logger := klog.NewStdLogger(os.Stdout)
	rtcPath := config.ResolveRTCValuesPath()
	rtcManager, cleanupRTC, err := rtc.NewManager(rtcPath, logger)
	if err != nil {
		exitf("init rtc manager: %v", err)
	}
	defer cleanupRTC()

	cfg, err := config.Load(rtcManager)
	if err != nil {
		exitf("load config: %v", err)
	}

	store, cleanupDB, err := postgres.New(cfg.Data, postgres.DefaultPoolConfig())
	if err != nil {
		exitf("connect postgres: %v", err)
	}
	defer cleanupDB()

	codeEditorRepo := codeeditordata.NewRepo(store, logger)
	codeEditorService := appcodeeditor.New(appcodeeditor.Config{
		Repository: codeEditorRepo,
		Sandbox:    sandbox.New(),
	})

	runner := seeds.NewRunner(store.DB, codeEditorService, filepath.Join(".", "scripts", "seeds"))
	ctx := context.Background()

	if status {
		records, err := runner.List(ctx)
		if err != nil {
			exitf("list seeds: %v", err)
		}
		if len(records) == 0 {
			fmt.Println("no seeds applied")
			return
		}
		for _, record := range records {
			fmt.Printf("%s\t%s\t%s\t%s\n", record.AppliedAt.Format("2006-01-02 15:04:05"), record.Kind, record.Name, record.Checksum)
		}
		return
	}

	opts, err := parseOptions(only)
	if err != nil {
		exitf("%v", err)
	}
	results, err := runner.Run(ctx, opts)
	if err != nil {
		exitf("run seeds: %v", err)
	}
	for _, result := range results {
		fmt.Printf("%s\t%s\t%s\n", result.Kind, result.Name, result.Message)
	}
}

func parseOptions(value string) (seeds.Options, error) {
	var opts seeds.Options
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "", "all":
		opts.RunSQL = true
		opts.RunBlind75 = true
		opts.RunInterviewPrep = true
	case "sql":
		opts.RunSQL = true
	case "blind75":
		opts.RunBlind75 = true
	case "interview-prep":
		opts.RunInterviewPrep = true
	default:
		return seeds.Options{}, fmt.Errorf("unsupported -only value %q", value)
	}
	return opts, nil
}

func exitf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
