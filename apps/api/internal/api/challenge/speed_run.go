package challenge

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	v1 "api/pkg/api/challenge/v1"
)

// GetSpeedRunRecords returns the caller's personal-best records across
// all attempted speed-run tasks. Records are written by the arena
// flow (a speed-run is just a time-limited solo match), not by a
// dedicated submit endpoint — that write path was deleted as dead.
func (i *Implementation) GetSpeedRunRecords(ctx context.Context, _ *v1.GetSpeedRunRecordsRequest) (*v1.GetSpeedRunRecordsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	records, err := i.service.GetUserRecords(ctx, user.ID, 50)
	if err != nil {
		return nil, fmt.Errorf("get user records: %w", err)
	}
	out := make([]*v1.TaskRecord, 0, len(records))
	for _, r := range records {
		out = append(out, mapTaskRecord(r))
	}
	return &v1.GetSpeedRunRecordsResponse{Records: out}, nil
}
