package admin

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/aireview"
	"api/internal/apihelpers"
	aimdata "api/internal/data/ai_mentor"
	v1 "api/pkg/api/admin/v1"
)

// MentorSecretRepo is the slice of data/ai_mentor.Repo this handler uses.
// Defined here so we can stub it in tests without spinning up Postgres.
type MentorSecretRepo interface {
	UpsertSecret(ctx context.Context, mentorID uuid.UUID, encryptedKey, nonce []byte, actorID uuid.UUID) error
	DeleteSecret(ctx context.Context, mentorID uuid.UUID) error
}

// UpsertMentorSecret seals the admin-supplied API key with the process-wide
// KeyVault (AI_MENTOR_KEY_KMS) and stores the cipher in ai_mentor_secrets.
// Returns the masked suffix for audit display — never echoes the cleartext.
func (i *AIMentorImpl) UpsertMentorSecret(ctx context.Context, req *v1.UpsertMentorSecretRequest) (*v1.UpsertMentorSecretResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	mentorID, err := uuid.Parse(req.GetMentorId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_MENTOR_ID", "invalid mentor_id")
	}
	plain := req.GetApiKey()
	if len(plain) < 8 {
		return nil, kratoserrors.BadRequest("INVALID_API_KEY", "api key looks too short")
	}
	if i.repo == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "ai mentor repo missing")
	}

	ct, nonce, err := i.vault.Seal([]byte(plain))
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to seal api key")
	}
	if err := i.repo.UpsertSecret(ctx, mentorID, ct, nonce, user.ID); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to persist api key")
	}
	return &v1.UpsertMentorSecretResponse{
		MaskedSuffix: maskKey(plain),
	}, nil
}

// maskKey returns "••••XXXX" for keys ≥ 4 chars, else the full key. Used
// purely for display — never persisted.
func maskKey(s string) string {
	if len(s) <= 4 {
		return s
	}
	return "••••" + s[len(s)-4:]
}

// Compile-time assertion: keep aireview imported even if Seal moves to a
// helper later (the var avoids an "imported and not used" if the reference
// path changes).
var _ = aireview.NewKeyVaultFromEnv

// _ ensures aimdata stays imported alongside MentorSecretRepo's signature
// (Go's import cycle protection only catches circular use, not unused
// pkg refs). The interface is the contract; *aimdata.Repo satisfies it
// at bootstrap.
var _ MentorSecretRepo = (*aimdata.Repo)(nil)
