package arena

import (
	"context"

	v1 "api/pkg/api/arena/v1"
	commonv1 "api/pkg/api/common/v1"
)

func (i *Implementation) ReportAntiCheatEvent(ctx context.Context, req *v1.ReportAntiCheatEventRequest) (*v1.ArenaStatusResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	matchID, err := parseArenaMatchID(req.GetMatchId())
	if err != nil {
		return nil, err
	}

	reason := req.GetReason().String()
	if err := i.service.ReportPlayerSuspicion(ctx, matchID, user, reason); err != nil {
		return nil, mapErr(err)
	}

	return &v1.ArenaStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
