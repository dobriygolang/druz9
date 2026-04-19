package insights

import (
	"context"

	"github.com/google/uuid"
	"google.golang.org/grpc"

	insightsdata "api/internal/data/insights"
	v1 "api/pkg/api/insights/v1"
)

// InsightProvider is the slice of the app/insights service that the
// handler consumes. Defined here so the API package doesn't import
// internal/app.
type InsightProvider interface {
	GetOrGenerate(ctx context.Context, userID uuid.UUID) (*insightsdata.Insight, error)
}

// Implementation of insights service.
type Implementation struct {
	v1.UnimplementedInsightsServiceServer
	provider InsightProvider
}

// New returns new instance of Implementation.
func New(provider InsightProvider) *Implementation {
	return &Implementation{provider: provider}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.InsightsService_ServiceDesc
}
