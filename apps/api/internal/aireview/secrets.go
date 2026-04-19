// AES-GCM helpers for ai_mentor_secrets (ADR-001).
//
// Master key is read from the AI_MENTOR_KEY_KMS env at process start
// (32 raw bytes, hex- or base64-encoded). When unset, encryption is a
// no-op pass-through — useful for dev environments where keys live in
// plain ENV vars rather than the DB.
package aireview

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
)

// KeyVault wraps a 32-byte symmetric key. Construct via NewKeyVaultFromEnv
// at bootstrap; pass a nil *KeyVault to disable encryption (the helper
// methods then return their input unchanged so callers don't branch).
type KeyVault struct {
	gcm cipher.AEAD
}

var (
	errMasterKeyLen       = errors.New("master key must be 32 bytes")
	errMasterKeyEncoding  = errors.New("master key must be hex or base64 encoded")
	errInvalidNonceSize   = errors.New("invalid nonce size")
)

// NewKeyVaultFromEnv reads AI_MENTOR_KEY_KMS. Accepts hex (64 chars) or
// base64 (44 chars including '='). Returns (nil, nil) when the env is
// empty — caller should treat that as "encryption disabled".
func NewKeyVaultFromEnv() (*KeyVault, error) {
	raw := os.Getenv("AI_MENTOR_KEY_KMS")
	if raw == "" {
		return nil, nil
	}
	keyBytes, err := decodeMasterKey(raw)
	if err != nil {
		return nil, fmt.Errorf("ai_mentor key vault: %w", err)
	}
	if len(keyBytes) != 32 {
		return nil, fmt.Errorf("ai_mentor key vault: %w", errMasterKeyLen)
	}
	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("ai_mentor key vault: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("ai_mentor key vault: %w", err)
	}
	return &KeyVault{gcm: gcm}, nil
}

func decodeMasterKey(raw string) ([]byte, error) {
	if b, err := hex.DecodeString(raw); err == nil {
		return b, nil
	}
	if b, err := base64.StdEncoding.DecodeString(raw); err == nil {
		return b, nil
	}
	return nil, fmt.Errorf("decode master key: %w", errMasterKeyEncoding)
}

// Seal returns (cipher, nonce). When the vault is nil, plaintext is
// returned unchanged with an empty nonce — this makes the dev path
// trivially compatible with the encrypted-prod path.
func (v *KeyVault) Seal(plaintext []byte) ([]byte, []byte, error) {
	if v == nil {
		return plaintext, nil, nil
	}
	nonce := make([]byte, v.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, fmt.Errorf("ai_mentor seal: %w", err)
	}
	ct := v.gcm.Seal(nil, nonce, plaintext, nil)
	return ct, nonce, nil
}

// Open is the inverse of Seal. With a nil vault, ciphertext is returned
// as-is (matching the no-op Seal behavior).
func (v *KeyVault) Open(ciphertext, nonce []byte) ([]byte, error) {
	if v == nil {
		return ciphertext, nil
	}
	if len(nonce) != v.gcm.NonceSize() {
		return nil, fmt.Errorf("ai_mentor open: %w", errInvalidNonceSize)
	}
	plaintext, err := v.gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("ai_mentor decrypt: %w", err)
	}
	return plaintext, nil
}
