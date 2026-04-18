package skills

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"google.golang.org/grpc"

	skillsdata "api/internal/data/skills"
	v1 "api/pkg/api/skills/v1"
)

const refundGoldDefault = int32(50)

// WalletService deducts gold when a skill is refunded.
type WalletService interface {
	DeductGold(ctx context.Context, userID uuid.UUID, amount int32) error
}

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	GetSkillTree(ctx context.Context, userID uuid.UUID) (*v1.GetSkillTreeResponse, error)
	GetSkillPoints(ctx context.Context, userID uuid.UUID) (*v1.GetSkillPointsResponse, error)
	AllocateSkill(ctx context.Context, userID uuid.UUID, skillID string) (*v1.AllocateSkillResponse, error)
	RefundSkill(ctx context.Context, userID uuid.UUID, skillID string) (*v1.RefundSkillResponse, error)
	// AddEarnedPoints credits the user with skill points (called by other services on level-up, arena win, etc.)
	AddEarnedPoints(ctx context.Context, userID uuid.UUID, delta int32) error
}

type liveService struct {
	repo   *skillsdata.Repo
	wallet WalletService
}

// Implementation is the gRPC transport handler.
type Implementation struct {
	v1.UnimplementedSkillsServiceServer
	service Service
}

func NewService(repo *skillsdata.Repo, wallet WalletService) Service {
	return &liveService{repo: repo, wallet: wallet}
}

func New(service Service) *Implementation {
	return &Implementation{service: service}
}

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.SkillsService_ServiceDesc
}

// ── Service implementation ────────────────────────────────────────────────────

func (s *liveService) GetSkillTree(ctx context.Context, userID uuid.UUID) (*v1.GetSkillTreeResponse, error) {
	allocs, err := s.repo.ListAllocations(ctx, userID)
	if err != nil {
		return nil, err
	}
	pts, err := s.repo.GetPoints(ctx, userID)
	if err != nil {
		return nil, err
	}

	allocated := make(map[string]struct{}, len(allocs))
	for _, a := range allocs {
		allocated[a.SkillID] = struct{}{}
	}

	available := pts.Earned - pts.Spent
	if available < 0 {
		available = 0
	}

	nodes := buildNodes(allocated)
	edges := buildEdges()

	return &v1.GetSkillTreeResponse{
		Nodes:           nodes,
		Edges:           edges,
		PointsAvailable: available,
		PointsEarned:    pts.Earned,
		PointsSpent:     pts.Spent,
	}, nil
}

func (s *liveService) GetSkillPoints(ctx context.Context, userID uuid.UUID) (*v1.GetSkillPointsResponse, error) {
	pts, err := s.repo.GetPoints(ctx, userID)
	if err != nil {
		return nil, err
	}
	available := pts.Earned - pts.Spent
	if available < 0 {
		available = 0
	}
	return &v1.GetSkillPointsResponse{
		Available: available,
		Earned:    pts.Earned,
		Spent:     pts.Spent,
	}, nil
}

func (s *liveService) AllocateSkill(ctx context.Context, userID uuid.UUID, skillID string) (*v1.AllocateSkillResponse, error) {
	def := findSkillDef(skillID)
	if def == nil {
		return &v1.AllocateSkillResponse{Success: false, ErrorMessage: "unknown skill"}, nil
	}

	pts, err := s.repo.GetPoints(ctx, userID)
	if err != nil {
		return nil, err
	}
	available := pts.Earned - pts.Spent
	if available <= 0 {
		return &v1.AllocateSkillResponse{Success: false, ErrorMessage: "no skill points available"}, nil
	}

	// Check all prereqs are allocated.
	for _, prereq := range def.Prereq {
		has, err := s.repo.HasAllocation(ctx, userID, prereq)
		if err != nil {
			return nil, err
		}
		if !has {
			return &v1.AllocateSkillResponse{Success: false, ErrorMessage: "prerequisite not allocated: " + prereq}, nil
		}
	}

	already, err := s.repo.HasAllocation(ctx, userID, skillID)
	if err != nil {
		return nil, err
	}
	if already {
		return &v1.AllocateSkillResponse{Success: false, ErrorMessage: "skill already allocated"}, nil
	}

	if err := s.repo.Allocate(ctx, userID, skillID); err != nil {
		return nil, err
	}

	pts, err = s.repo.GetPoints(ctx, userID)
	if err != nil {
		return nil, err
	}
	remaining := pts.Earned - pts.Spent
	if remaining < 0 {
		remaining = 0
	}
	return &v1.AllocateSkillResponse{Success: true, PointsRemaining: remaining}, nil
}

func (s *liveService) RefundSkill(ctx context.Context, userID uuid.UUID, skillID string) (*v1.RefundSkillResponse, error) {
	def := findSkillDef(skillID)
	if def == nil {
		return &v1.RefundSkillResponse{Success: false, ErrorMessage: "unknown skill"}, nil
	}

	// artisan_core (hub) cannot be refunded.
	if skillID == "artisan_core" {
		return &v1.RefundSkillResponse{Success: false, ErrorMessage: "the hub node cannot be refunded"}, nil
	}

	has, err := s.repo.HasAllocation(ctx, userID, skillID)
	if err != nil {
		return nil, err
	}
	if !has {
		return &v1.RefundSkillResponse{Success: false, ErrorMessage: "skill not allocated"}, nil
	}

	goldCost := def.RefundGold
	if goldCost <= 0 {
		goldCost = refundGoldDefault
	}

	if s.wallet != nil {
		if err := s.wallet.DeductGold(ctx, userID, goldCost); err != nil {
			//nolint:nilerr // Insufficient funds is represented as a domain response, not a transport error.
			return &v1.RefundSkillResponse{Success: false, ErrorMessage: "insufficient gold"}, nil
		}
	}

	if err := s.repo.Refund(ctx, userID, skillID); err != nil {
		return nil, err
	}

	return &v1.RefundSkillResponse{
		Success:        true,
		GoldCost:       goldCost,
		PointsReturned: 1,
	}, nil
}

func (s *liveService) AddEarnedPoints(ctx context.Context, userID uuid.UUID, delta int32) error {
	if delta <= 0 {
		return nil
	}
	return s.repo.AddEarnedPoints(ctx, userID, delta)
}

// ── Node/edge builders ────────────────────────────────────────────────────────

func buildNodes(allocated map[string]struct{}) []*v1.SkillNode {
	nodes := make([]*v1.SkillNode, 0, len(skillDefs))
	for _, def := range skillDefs {
		state := nodeState(def, allocated)
		gold := def.RefundGold
		if state != "allocated" {
			gold = 0
		}
		nodes = append(nodes, &v1.SkillNode{
			SkillId:     def.ID,
			Label:       def.Label,
			Description: def.Description,
			Branch:      def.Branch,
			Keystone:    def.Keystone,
			X:           def.X,
			Y:           def.Y,
			State:       state,
			Effect: &v1.SkillEffect{
				Type:  def.Effect.Type,
				Value: def.Effect.Value,
				Label: def.Effect.Label,
			},
			RefundGold: gold,
		})
	}
	return nodes
}

func buildEdges() []*v1.SkillEdge {
	edges := make([]*v1.SkillEdge, 0, len(skillEdgeDefs))
	for _, e := range skillEdgeDefs {
		edges = append(edges, &v1.SkillEdge{FromSkillId: e[0], ToSkillId: e[1]})
	}
	return edges
}

// nodeState returns "allocated" | "available" | "locked".
func nodeState(def skillDef, allocated map[string]struct{}) string {
	if _, ok := allocated[def.ID]; ok {
		return "allocated"
	}
	if len(def.Prereq) == 0 {
		return "available"
	}
	for _, prereq := range def.Prereq {
		if _, ok := allocated[prereq]; !ok {
			return "locked"
		}
	}
	return "available"
}

// ── Transport handler ─────────────────────────────────────────────────────────

var _ v1.SkillsServiceServer = (*Implementation)(nil)

func (i *Implementation) GetSkillTree(ctx context.Context, req *v1.GetSkillTreeRequest) (*v1.GetSkillTreeResponse, error) {
	_ = req
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	resp, err := i.service.GetSkillTree(ctx, user)
	if err != nil {
		return nil, internalErr("failed to load skill tree")
	}
	return resp, nil
}

func (i *Implementation) GetSkillPoints(ctx context.Context, req *v1.GetSkillPointsRequest) (*v1.GetSkillPointsResponse, error) {
	_ = req
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	resp, err := i.service.GetSkillPoints(ctx, user)
	if err != nil {
		return nil, internalErr("failed to load skill points")
	}
	return resp, nil
}

func (i *Implementation) AllocateSkill(ctx context.Context, req *v1.AllocateSkillRequest) (*v1.AllocateSkillResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	resp, err := i.service.AllocateSkill(ctx, user, req.GetSkillId())
	if err != nil {
		return nil, internalErr("failed to allocate skill")
	}
	return resp, nil
}

func (i *Implementation) RefundSkill(ctx context.Context, req *v1.RefundSkillRequest) (*v1.RefundSkillResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	resp, err := i.service.RefundSkill(ctx, user, req.GetSkillId())
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &v1.RefundSkillResponse{Success: false, ErrorMessage: "skill not allocated"}, nil
		}
		return nil, internalErr("failed to refund skill")
	}
	return resp, nil
}
