package code_editor

import (
	"context"
	"fmt"
	"time"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"

	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"
)

func (i *Implementation) GetDailyChallenge(ctx context.Context, _ *v1.GetDailyChallengeRequest) (*v1.GetDailyChallengeResponse, error) {
	tasks, err := i.service.ListTasks(ctx, codeeditordomain.TaskFilter{IncludeInactive: false})
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	if len(tasks) == 0 {
		return nil, kratosErrors.NotFound("NO_TASKS", "no tasks available")
	}
	now := time.Now()
	task := tasks[now.YearDay()%len(tasks)]
	tomorrow := time.Date(now.UTC().Year(), now.UTC().Month(), now.UTC().Day()+1, 0, 0, 0, 0, time.UTC)
	return &v1.GetDailyChallengeResponse{
		Task:      mapTask(task),
		Date:      now.UTC().Format("2006-01-02"),
		ExpiresAt: tomorrow.Format(time.RFC3339),
	}, nil
}
