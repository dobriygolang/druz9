package hub

import (
	"context"
	"strings"

	"github.com/go-kratos/kratos/v2/errors"

	v1 "api/pkg/api/hub/v1"
)

func (i *Implementation) GetRegionContext(ctx context.Context, req *v1.GetRegionContextRequest) (*v1.RegionContext, error) {
	regionID := strings.TrimSpace(req.GetRegionId())
	if regionID == "" {
		return nil, errors.BadRequest("INVALID_REGION_ID", "region_id is required")
	}

	meta := regionMetaFor(regionID)
	stats := RegionStats{}
	if i.service.regions != nil {
		var err error
		stats, err = i.service.regions.GetRegionStats(ctx, regionID)
		if err != nil {
			return nil, errors.InternalServer("REGION_CONTEXT_FAILED", "failed to load region context")
		}
	}

	return &v1.RegionContext{
		RegionId:     regionID,
		Title:        meta.title,
		Description:  meta.description,
		ActiveGuilds: stats.ActiveGuilds,
		OpenEvents:   stats.OpenEvents,
		Podcasts:     stats.Podcasts,
		Links: []*v1.RegionLink{
			{Label: "Гильдии", ActionUrl: "/guild"},
			{Label: "События", ActionUrl: "/events"},
			{Label: "Подкасты", ActionUrl: "/podcasts"},
		},
	}, nil
}

type regionMeta struct {
	title       string
	description string
}

func regionMetaFor(regionID string) regionMeta {
	switch regionID {
	case "north_peaks":
		return regionMeta{"Северные пики", "Холодный регион для гильдий, рейдов и дисциплины: сюда попадают активности, привязанные к северной части атласа."}
	case "capital_market":
		return regionMeta{"Столичный рынок", "Центральная торговая зона: обмены, витрина предметов и публичные события рядом с главным городом."}
	case "east_archipelago":
		return regionMeta{"Восточный архипелаг", "Островной кластер для подкастов, историй и асинхронных активностей сообщества."}
	case "south_dunes":
		return regionMeta{"Южные дюны", "Открытая зона сезонных событий, испытаний и марш-бросков по арене."}
	case "west_caverns":
		return regionMeta{"Западные пещеры", "Тихий регион для глубокой практики, менторских комнат и скрытых находок."}
	default:
		title := strings.ReplaceAll(regionID, "_", " ")
		return regionMeta{strings.Title(title), "Регион атласа druz9. Контент появится здесь после привязки guilds/events/podcasts через region_tag."}
	}
}
