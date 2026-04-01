package geo

import (
	"api/internal/model"
	v1 "api/pkg/api/geo/v1"
)

func mapResolveResponse(resp *model.GeoResolveResponse) *v1.ResolveResponse {
	if resp == nil {
		return nil
	}

	candidates := make([]*v1.GeoCandidate, 0, len(resp.Candidates))
	for _, candidate := range resp.Candidates {
		if candidate == nil {
			continue
		}
		candidates = append(candidates, &v1.GeoCandidate{
			Region:      candidate.Region,
			Country:     candidate.Country,
			City:        candidate.City,
			Latitude:    candidate.Latitude,
			Longitude:   candidate.Longitude,
			DisplayName: candidate.DisplayName,
		})
	}

	return &v1.ResolveResponse{Candidates: candidates}
}
