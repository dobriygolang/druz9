package arena

import (
	"context"

	v1 "api/pkg/api/arena/v1"
)

// GetPlayerStats stub. Please implement it.
func (i *Implementation) GetPlayerStats(ctx context.Context, req *v1.GetPlayerStatsRequest) (*v1.ArenaPlayerStatsResponse, error) {
	_ = ctx
	_ = req
	panic("TODO: implement GetPlayerStats")
}
