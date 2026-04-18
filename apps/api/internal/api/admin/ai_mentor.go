package admin

import (
	"context"

	kerrs "github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"google.golang.org/grpc"

	"api/internal/apihelpers"
	aimdata "api/internal/data/ai_mentor"
	v1 "api/pkg/api/admin/v1"
)

// AIMentorImpl implements the gRPC AIMentorService.
type AIMentorImpl struct {
	v1.UnimplementedAIMentorServiceServer
	repo *aimdata.Repo
}

func NewAIMentorImpl(repo *aimdata.Repo) *AIMentorImpl {
	return &AIMentorImpl{repo: repo}
}

func (i *AIMentorImpl) GetDescription() grpc.ServiceDesc {
	return v1.AIMentorService_ServiceDesc
}

func (i *AIMentorImpl) ListAIMentors(ctx context.Context, _ *v1.ListAIMentorsRequest) (*v1.ListAIMentorsResponse, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, err
	}
	rows, err := i.repo.List(ctx)
	if err != nil {
		klog.Errorf("admin ai_mentor: list: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to list mentors")
	}
	out := make([]*v1.AIMentor, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapMentorRow(r))
	}
	return &v1.ListAIMentorsResponse{Mentors: out}, nil
}

func (i *AIMentorImpl) CreateAIMentor(ctx context.Context, req *v1.CreateAIMentorRequest) (*v1.AIMentor, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, err
	}
	m := &aimdata.Row{
		Name:           req.GetName(),
		Provider:       req.GetProvider(),
		ModelID:        req.GetModelId(),
		Tier:           req.GetTier(),
		PromptTemplate: req.GetPromptTemplate(),
		IsActive:       req.GetIsActive(),
	}
	if m.Provider == "" {
		m.Provider = "anthropic"
	}
	if m.ModelID == "" {
		m.ModelID = "claude-sonnet-4-6"
	}
	created, err := i.repo.Create(ctx, m)
	if err != nil {
		klog.Errorf("admin ai_mentor: create: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to create mentor")
	}
	return mapMentorRow(created), nil
}

func (i *AIMentorImpl) UpdateAIMentor(ctx context.Context, req *v1.UpdateAIMentorRequest) (*v1.AIMentor, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, err
	}
	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, kerrs.BadRequest("INVALID_ID", "invalid mentor id")
	}
	m := &aimdata.Row{
		ID:             id,
		Name:           req.GetName(),
		Provider:       req.GetProvider(),
		ModelID:        req.GetModelId(),
		Tier:           req.GetTier(),
		PromptTemplate: req.GetPromptTemplate(),
		IsActive:       req.GetIsActive(),
	}
	updated, err := i.repo.Update(ctx, m)
	if err != nil {
		klog.Errorf("admin ai_mentor: update %s: %v", id, err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to update mentor")
	}
	return mapMentorRow(updated), nil
}

func (i *AIMentorImpl) DeleteAIMentor(ctx context.Context, req *v1.DeleteAIMentorRequest) (*v1.DeleteAIMentorResponse, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, err
	}
	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, kerrs.BadRequest("INVALID_ID", "invalid mentor id")
	}
	if err := i.repo.Delete(ctx, id); err != nil {
		klog.Errorf("admin ai_mentor: delete %s: %v", id, err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to delete mentor")
	}
	return &v1.DeleteAIMentorResponse{Ok: true}, nil
}

func mapMentorRow(r *aimdata.Row) *v1.AIMentor {
	return &v1.AIMentor{
		Id:             r.ID.String(),
		Name:           r.Name,
		Provider:       r.Provider,
		ModelId:        r.ModelID,
		Tier:           r.Tier,
		PromptTemplate: r.PromptTemplate,
		IsActive:       r.IsActive,
	}
}
