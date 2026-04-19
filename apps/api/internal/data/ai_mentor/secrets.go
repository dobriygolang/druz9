package ai_mentor

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// Secret stores the cipher-text + nonce as written to ai_mentor_secrets.
// Encryption/decryption happens in the aireview package (see ADR-001).
var (
	errEncryptedKeyEmpty = errors.New("upsert ai_mentor_secret: encrypted_key must not be empty")
	ErrSecretNotFound    = errors.New("ai mentor secret not found")
)

type Secret struct {
	MentorID     uuid.UUID
	EncryptedKey []byte
	Nonce        []byte
}

// GetSecret returns the stored secret for a mentor, or (nil, nil) when
// none has been provisioned. Callers that get nil should fall back to the
// bootstrap-default reviewer.
func (r *Repo) GetSecret(ctx context.Context, mentorID uuid.UUID) (*Secret, error) {
	row := r.data.DB.QueryRow(ctx, `
        SELECT mentor_id, encrypted_key, nonce
        FROM ai_mentor_secrets
        WHERE mentor_id = $1
    `, mentorID)
	s := &Secret{}
	if err := row.Scan(&s.MentorID, &s.EncryptedKey, &s.Nonce); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSecretNotFound
		}
		return nil, fmt.Errorf("get ai_mentor_secret: %w", err)
	}
	return s, nil
}

// UpsertSecret writes the cipher-text. Pass an empty actorID (uuid.Nil)
// for system-driven seeds; admin endpoints should pass the staff user ID.
func (r *Repo) UpsertSecret(ctx context.Context, mentorID uuid.UUID, encryptedKey, nonce []byte, actorID uuid.UUID) error {
	if len(encryptedKey) == 0 {
		return fmt.Errorf("upsert ai_mentor_secret: encrypted_key must not be empty: %w", errEncryptedKeyEmpty)
	}
	var actor any = nil
	if actorID != uuid.Nil {
		actor = actorID
	}
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO ai_mentor_secrets (mentor_id, encrypted_key, nonce, updated_by, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (mentor_id) DO UPDATE
            SET encrypted_key = EXCLUDED.encrypted_key,
                nonce         = EXCLUDED.nonce,
                updated_by    = EXCLUDED.updated_by,
                updated_at    = NOW()
    `, mentorID, encryptedKey, nonce, actor)
	if err != nil {
		return fmt.Errorf("upsert ai_mentor_secret: %w", err)
	}
	return nil
}

// DeleteSecret removes the row. ON CASCADE on the mentor_id FK already
// handles the case where the mentor itself is deleted; this is for the
// "rotate to no key" admin flow.
func (r *Repo) DeleteSecret(ctx context.Context, mentorID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `DELETE FROM ai_mentor_secrets WHERE mentor_id = $1`, mentorID)
	if err != nil {
		return fmt.Errorf("delete ai_mentor_secret: %w", err)
	}
	return nil
}
