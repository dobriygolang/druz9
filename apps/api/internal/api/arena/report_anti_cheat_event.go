package arena

import (
	"context"

	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/arena/v1"
)

func (i *Implementation) ReportAntiCheatEvent(ctx context.Context, req *v1.ReportAntiCheatEventRequest) (*v1.ArenaStatusResponse, error) {
	user, err := resolveArenaActor(ctx, true)
	if err != nil {
		return nil, err
	}

	matchID, err := parseArenaMatchID(req.MatchId)
	if err != nil {
		return nil, err
	}

	reason := req.Reason.String()
	if err := i.service.ReportPlayerSuspicion(ctx, matchID, user, reason); err != nil {
		return nil, mapErr(err)
	}

	return &v1.ArenaStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
