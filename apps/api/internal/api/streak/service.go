package streak

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	streakdomain "api/internal/domain/streak"
	"api/internal/model"
	v1 "api/pkg/api/streak/v1"
)

type Service interface {
	GetStreak(ctx context.Context, userID uuid.UUID) (*model.StreakState, error)
	UseShield(ctx context.Context, userID uuid.UUID) (*model.StreakState, int32, error)
	PurchaseShield(ctx context.Context, userID uuid.UUID, count int32) (*model.StreakState, int32, int32, error)
}

type Implementation struct {
	v1.UnimplementedStreakServiceServer
	service Service
}

func New(s Service) *Implementation { return &Implementation{service: s} }

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.StreakService_ServiceDesc
}

func (i *Implementation) GetStreak(ctx context.Context, _ *v1.GetStreakRequest) (*v1.GetStreakResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	state, err := i.service.GetStreak(ctx, user.ID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load streak state")
	}
	return &v1.GetStreakResponse{State: mapState(state)}, nil
}

func (i *Implementation) UseShield(ctx context.Context, _ *v1.UseShieldRequest) (*v1.UseShieldResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	state, restoredTo, err := i.service.UseShield(ctx, user.ID)
	if err != nil {
		return nil, mapStreakErr(err)
	}
	return &v1.UseShieldResponse{State: mapState(state), RestoredToDays: restoredTo}, nil
}

func (i *Implementation) PurchaseShield(ctx context.Context, req *v1.PurchaseShieldRequest) (*v1.PurchaseShieldResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	state, count, cost, err := i.service.PurchaseShield(ctx, user.ID, req.GetCount())
	if err != nil {
		return nil, mapStreakErr(err)
	}
	return &v1.PurchaseShieldResponse{
		State:          mapState(state),
		PurchasedCount: count,
		TotalCostGold:  cost,
	}, nil
}

// ---------- helpers ----------

func mapState(s *model.StreakState) *v1.StreakState {
	if s == nil {
		return nil
	}
	out := &v1.StreakState{
		CurrentDays:     s.CurrentDays,
		LongestDays:     s.LongestDays,
		ShieldsOwned:    s.ShieldsOwned,
		IsBroken:        s.IsBroken,
		CanRestore:      s.CanRestore,
		ShieldPriceGold: s.ShieldPriceGold,
	}
	if s.LastActiveAt != nil {
		out.LastActiveAt = timestamppb.New(*s.LastActiveAt)
	}
	if s.LastShieldUsedAt != nil {
		out.LastShieldUsedAt = timestamppb.New(*s.LastShieldUsedAt)
	}
	return out
}

func mapStreakErr(err error) error {
	switch {
	case goerr.Is(err, streakdomain.ErrStreakNotBroken):
		return errors.Conflict("STREAK_NOT_BROKEN", "streak is not broken; no shield needed")
	case goerr.Is(err, streakdomain.ErrNoShieldsOwned):
		return errors.Conflict("NO_SHIELDS", "you own no streak shields")
	case goerr.Is(err, streakdomain.ErrRestoreWindow):
		return errors.Conflict("RESTORE_WINDOW_EXPIRED", "streak is past the restore window")
	case goerr.Is(err, streakdomain.ErrInvalidCount):
		return errors.BadRequest("INVALID_COUNT", "purchase count must be 1..5")
	case goerr.Is(err, streakdomain.ErrInsufficientGold):
		return errors.BadRequest("INSUFFICIENT_GOLD", "not enough gold")
	default:
		return errors.InternalServer("INTERNAL", "streak operation failed")
	}
}
