package guild

import (
	"google.golang.org/grpc"

	notif "api/internal/clients/notification"
	guilddata "api/internal/data/guild"
	v1 "api/pkg/api/guild/v1"
)

// Implementation of guild service.
type Implementation struct {
	v1.UnimplementedGuildServiceServer
	service  Service
	eventSvc EventService
	notif    notif.Sender
	// warRepo is the persistent guild-war store (Wave B.5). Optional —
	// when nil the war handlers gracefully fall back to demo data.
	warRepo *guilddata.Repo
}

// New returns new instance of Implementation.
func New(service Service, eventSvc EventService, n notif.Sender) *Implementation {
	return &Implementation{service: service, eventSvc: eventSvc, notif: n}
}

// WithWarRepo attaches the persistent guild-war store so ContributeToFront
// / ListTerritories have somewhere to read and write. Kept as an
// optional setter so the public New signature stays stable.
func (i *Implementation) WithWarRepo(r *guilddata.Repo) *Implementation {
	i.warRepo = r
	return i
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.GuildService_ServiceDesc
}
