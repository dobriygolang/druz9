package podcast

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"

	v1 "api/pkg/api/podcast/v1"
)

func (i *Implementation) AdminUpdateSeries(_ context.Context, _ *v1.AdminUpdateSeriesRequest) (*v1.PodcastSeries, error) {
	return nil, kratoserrors.New(501, "UNIMPLEMENTED", "admin series CRUD lands in a follow-up")
}
