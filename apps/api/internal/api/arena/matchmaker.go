package arena

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	domain "api/internal/domain/arena"
	"api/internal/model"
	v1 "api/pkg/api/arena/v1"
	commonv1 "api/pkg/api/common/v1"
)

// matchmakerTicket tracks one player waiting in the queue.
type matchmakerTicket struct {
	id        uuid.UUID
	userID    uuid.UUID
	mode      string
	createdAt time.Time

	mu      sync.Mutex
	status  v1.QueueStatus
	matchID uuid.UUID
}

// Matchmaker is an in-memory per-mode FIFO queue. Enqueue pairs the
// current ticket with an existing waiter (same mode) and creates an
// arena match. State lives only in this struct — good enough for a
// single-replica staging deploy; multi-replica would need Redis/PG.
type Matchmaker struct {
	mu      sync.Mutex
	byID    map[uuid.UUID]*matchmakerTicket
	byMode  map[string][]*matchmakerTicket
	timeout time.Duration
}

func NewMatchmaker() *Matchmaker {
	return &Matchmaker{
		byID:    make(map[uuid.UUID]*matchmakerTicket),
		byMode:  make(map[string][]*matchmakerTicket),
		timeout: 30 * time.Second,
	}
}

// pickTopic maps an abstract game mode to a concrete match topic. When
// the catalog of modes grows this should consult an admin-editable
// table; a static switch is fine while the feature is limited to two
// variants.
func pickTopic(_ string) (string, model.ArenaDifficulty) {
	// TODO: expand when more modes are added
	return "arrays", model.ArenaDifficultyMedium
}

// EnqueueForMatch puts the caller into the queue for their mode. If a
// peer is already waiting for the same mode, a match is created
// immediately and both tickets flip to MATCHED before this call
// returns. Otherwise a fresh WAITING ticket is added.
func (i *Implementation) EnqueueForMatch(ctx context.Context, req *v1.EnqueueForMatchRequest) (*v1.EnqueueForMatchResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.matchmaker == nil {
		return nil, errors.InternalServer("INTERNAL", "matchmaker not initialised")
	}
	mode := req.GetMode()
	if mode == "" {
		mode = "ranked_1v1"
	}
	mm := i.matchmaker
	mm.mu.Lock()

	// If there's a waiter for this mode and it isn't stale, pair them up.
	queue := mm.byMode[mode]
	var peer *matchmakerTicket
	for len(queue) > 0 {
		candidate := queue[0]
		queue = queue[1:]
		candidate.mu.Lock()
		expired := candidate.status != v1.QueueStatus_QUEUE_STATUS_WAITING
		candidate.mu.Unlock()
		if !expired {
			peer = candidate
			break
		}
	}
	mm.byMode[mode] = queue

	ticket := &matchmakerTicket{
		id:        uuid.New(),
		userID:    user.ID,
		mode:      mode,
		createdAt: time.Now(),
		status:    v1.QueueStatus_QUEUE_STATUS_WAITING,
	}
	mm.byID[ticket.id] = ticket

	if peer == nil {
		mm.byMode[mode] = append(mm.byMode[mode], ticket)
		mm.mu.Unlock()
		return &v1.EnqueueForMatchResponse{
			QueueId:              ticket.id.String(),
			EstimatedWaitSeconds: 10,
		}, nil
	}
	mm.mu.Unlock()

	// Two tickets — create the match. Do this outside the top-level mm
	// lock because arena.CreateMatch hits the DB.
	topic, difficulty := pickTopic(mode)
	peerUser := &domain.User{ID: peer.userID}
	match, err := i.service.CreateMatch(ctx, peerUser, topic, difficulty, false)
	if err != nil {
		// Put the ticket back in the queue (peer is already lost to the
		// popped state — they'll need to re-enqueue). Mark ours WAITING
		// so the poller keeps trying.
		mm.mu.Lock()
		mm.byMode[mode] = append(mm.byMode[mode], ticket)
		mm.mu.Unlock()
		klog.Errorf("matchmaker: CreateMatch mode=%s: %v", mode, err)
		return &v1.EnqueueForMatchResponse{
			QueueId:              ticket.id.String(),
			EstimatedWaitSeconds: 15,
		}, nil
	}
	// Second caller (this request) joins the match so both players are
	// assigned to it.
	if _, err := i.service.JoinMatch(ctx, match.ID, &domain.User{ID: user.ID}); err != nil {
		klog.Errorf("matchmaker: JoinMatch mode=%s match=%s: %v", mode, match.ID, err)
	}

	peer.mu.Lock()
	peer.status = v1.QueueStatus_QUEUE_STATUS_MATCHED
	peer.matchID = match.ID
	peer.mu.Unlock()

	ticket.mu.Lock()
	ticket.status = v1.QueueStatus_QUEUE_STATUS_MATCHED
	ticket.matchID = match.ID
	ticket.mu.Unlock()

	return &v1.EnqueueForMatchResponse{
		QueueId:              ticket.id.String(),
		EstimatedWaitSeconds: 0,
	}, nil
}

// GetQueueStatus is the client's poll endpoint. Every 2s the client
// checks here; on MATCHED it routes to the match, on TIMEOUT it offers
// the solo-timed fallback.
func (i *Implementation) GetQueueStatus(ctx context.Context, req *v1.GetQueueStatusRequest) (*v1.GetQueueStatusResponse, error) {
	if _, err := apihelpers.RequireUser(ctx); err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.matchmaker == nil {
		return nil, errors.InternalServer("INTERNAL", "matchmaker not initialised")
	}
	qid, err := uuid.Parse(req.GetQueueId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_QUEUE_ID", "invalid queue id")
	}
	i.matchmaker.mu.Lock()
	ticket, ok := i.matchmaker.byID[qid]
	i.matchmaker.mu.Unlock()
	if !ok {
		return nil, errors.NotFound("QUEUE_NOT_FOUND", "queue ticket not found")
	}
	ticket.mu.Lock()
	defer ticket.mu.Unlock()
	waited := int32(time.Since(ticket.createdAt).Seconds())
	// Server-side timeout so a client that disconnects still gets cleaned
	// up on next poll.
	if ticket.status == v1.QueueStatus_QUEUE_STATUS_WAITING && time.Since(ticket.createdAt) > i.matchmaker.timeout {
		ticket.status = v1.QueueStatus_QUEUE_STATUS_TIMEOUT
	}
	resp := &v1.GetQueueStatusResponse{
		Status:        ticket.status,
		WaitedSeconds: waited,
	}
	if ticket.matchID != uuid.Nil {
		resp.MatchId = ticket.matchID.String()
	}
	return resp, nil
}

func (i *Implementation) LeaveQueue(ctx context.Context, req *v1.LeaveQueueRequest) (*v1.ArenaStatusResponse, error) {
	if _, err := apihelpers.RequireUser(ctx); err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.matchmaker == nil {
		return nil, errors.InternalServer("INTERNAL", "matchmaker not initialised")
	}
	qid, err := uuid.Parse(req.GetQueueId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_QUEUE_ID", "invalid queue id")
	}
	i.matchmaker.mu.Lock()
	ticket, ok := i.matchmaker.byID[qid]
	if ok {
		ticket.mu.Lock()
		ticket.status = v1.QueueStatus_QUEUE_STATUS_CANCELLED
		ticket.mu.Unlock()
	}
	i.matchmaker.mu.Unlock()
	return &v1.ArenaStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
