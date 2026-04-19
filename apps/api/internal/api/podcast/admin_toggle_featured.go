package podcast

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"

	v1 "api/pkg/api/podcast/v1"
)

func (i *Implementation) AdminToggleFeatured(_ context.Context, _ *v1.AdminToggleFeaturedRequest) (*v1.Podcast, error) {
	return nil, kratoserrors.New(501, "UNIMPLEMENTED", "featured-flag editorial endpoint lands in a follow-up")
}
