package interview_prep

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	v1 "api/pkg/api/interview_prep/v1"
)

func (i *Implementation) ListAIMentors(ctx context.Context, _ *v1.ListAIMentorsRequest) (*v1.ListAIMentorsResponse, error) {
	if i.aiMentors == nil {
		return &v1.ListAIMentorsResponse{}, nil
	}
	rows, err := i.aiMentors.ListActive(ctx)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list AI mentors")
	}
	out := make([]*v1.AIMentor, 0, len(rows))
	for _, r := range rows {
		out = append(out, &v1.AIMentor{
			Id:   r.ID.String(),
			Name: r.Name,
			Tier: r.Tier,
		})
	}
	return &v1.ListAIMentorsResponse{Mentors: out}, nil
}
