package podcast

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"

	v1 "api/pkg/api/podcast/v1"
)

// AdminCreateSeries — ADR-005 stub. Data-layer write lands in a follow-up
// (needs a SeriesAdminRepo with INSERT). Returning UNIMPLEMENTED keeps the
// route discoverable in OpenAPI without silently succeeding.
func (i *Implementation) AdminCreateSeries(_ context.Context, _ *v1.AdminCreateSeriesRequest) (*v1.PodcastSeries, error) {
	return nil, kratoserrors.New(501, "UNIMPLEMENTED", "admin series CRUD lands in a follow-up")
}
