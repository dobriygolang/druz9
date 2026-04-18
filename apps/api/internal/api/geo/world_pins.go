package geo

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	v1 "api/pkg/api/geo/v1"
)

// WorldPins proxies to the domain service. Auth is required so we can
// eventually tag the viewer's own guild/events as "hot"; the aggregation
// itself is public-safe.
func (i *Implementation) WorldPins(ctx context.Context, _ *v1.WorldPinsRequest) (*v1.WorldPinsResponse, error) {
	pins, err := i.service.WorldPins(ctx)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load world pins")
	}
	out := make([]*v1.WorldPin, 0, len(pins))
	for _, p := range pins {
		out = append(out, &v1.WorldPin{
			Id:        p.ID,
			Kind:      v1.WorldPinKind(p.Kind),
			Title:     p.Title,
			Subtitle:  p.Subtitle,
			Latitude:  p.Latitude,
			Longitude: p.Longitude,
			Region:    p.Region,
			IconRef:   p.IconRef,
			LinkPath:  p.LinkPath,
			IsHot:     p.IsHot,
		})
	}
	return &v1.WorldPinsResponse{Pins: out}, nil
}
