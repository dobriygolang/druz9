package admin

import (
	"context"
	"strings"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	v1 "api/pkg/api/admin/v1"
	commonv1 "api/pkg/api/common/v1"
)

// GrantCurrency credits the user's wallet (gold / gems / shards) by the
// requested amount. Records the reason in the wallet ledger so audits
// can trace where each grant came from.
func (i *Implementation) GrantCurrency(ctx context.Context, req *v1.GrantCurrencyRequest) (*v1.AdminStatusResponse, error) {
	if i.wallet == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "wallet granter missing")
	}
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_USER_ID", "invalid user_id")
	}
	currency := strings.ToLower(strings.TrimSpace(req.GetCurrency()))
	switch currency {
	case "gold", "gems", "shards":
	default:
		return nil, kratoserrors.BadRequest("INVALID_CURRENCY", "currency must be gold, gems, or shards")
	}
	amount := req.GetAmount()
	if amount <= 0 {
		return nil, kratoserrors.BadRequest("INVALID_AMOUNT", "amount must be positive (admin grant only credits)")
	}
	reason := strings.TrimSpace(req.GetReason())
	if reason == "" {
		reason = "admin grant"
	}
	if err := i.wallet.Grant(ctx, userID, currency, amount, reason); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "grant failed: "+err.Error())
	}
	return &v1.AdminStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
