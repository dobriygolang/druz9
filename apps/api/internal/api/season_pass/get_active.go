package season_pass

import (
	"context"
	"fmt"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	seasonpassdomain "api/internal/domain/season_pass"
	v1 "api/pkg/api/season_pass/v1"
)

func (i *Implementation) GetActive(ctx context.Context, _ *v1.GetActiveRequest) (*v1.GetActiveResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	snap, err := i.service.GetActive(ctx, user.ID)
	if err != nil {
		if goerr.Is(err, seasonpassdomain.ErrNoActivePass) {
			return nil, errors.NotFound("NO_ACTIVE_PASS", "no active season pass")
		}
		return nil, errors.InternalServer("INTERNAL", "failed to load season pass")
	}
	tiers := make([]*v1.SeasonPassTier, 0, len(snap.Tiers))
	for _, t := range snap.Tiers {
		tiers = append(tiers, mapTier(t))
	}
	return &v1.GetActiveResponse{
		Pass:     mapPass(snap.Pass),
		Tiers:    tiers,
		Progress: mapProgress(snap.Progress),
	}, nil
}
