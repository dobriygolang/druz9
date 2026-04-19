package insights

import (
	"context"
	"fmt"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	insightsdata "api/internal/data/insights"
	v1 "api/pkg/api/insights/v1"
)

func (i *Implementation) GetMyInsight(ctx context.Context, _ *v1.GetMyInsightRequest) (*v1.Insight, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.provider == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "insights provider missing")
	}
	ins, err := i.provider.GetOrGenerate(ctx, user.ID)
	if err != nil || ins == nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to generate insight")
	}
	return mapToProto(ins), nil
}

func mapToProto(ins *insightsdata.Insight) *v1.Insight {
	return &v1.Insight{
		Summary:      ins.Summary,
		TopStrengths: itemsToProto(ins.TopStrengths),
		TopGaps:      itemsToProto(ins.TopGaps),
		NextSteps:    itemsToProto(ins.NextSteps),
		GeneratedAt:  timestamppb.New(ins.GeneratedAt),
		Source:       ins.Source,
	}
}

func itemsToProto(items []insightsdata.Item) []*v1.InsightItem {
	out := make([]*v1.InsightItem, len(items))
	for i, it := range items {
		out[i] = &v1.InsightItem{
			Title:       it.Title,
			Description: it.Description,
			ActionUrl:   it.ActionURL,
		}
	}
	return out
}
