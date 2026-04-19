package aireview

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"testing"
)

func TestKeyVault_NilIsPassThrough(t *testing.T) {
	t.Parallel()
	var v *KeyVault
	plain := []byte("sk-prod-abc123")
	ct, nonce, err := v.Seal(plain)
	if err != nil {
		t.Fatalf("Seal nil vault: %v", err)
	}
	if !bytes.Equal(ct, plain) || len(nonce) != 0 {
		t.Fatalf("nil vault should be pass-through; got ct=%v nonce=%v", ct, nonce)
	}
	out, err := v.Open(ct, nonce)
	if err != nil {
		t.Fatalf("Open nil vault: %v", err)
	}
	if !bytes.Equal(out, plain) {
		t.Fatalf("Open nil vault: got %q want %q", out, plain)
	}
}

func TestKeyVault_RoundTrip(t *testing.T) {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		t.Fatalf("rand: %v", err)
	}
	t.Setenv("AI_MENTOR_KEY_KMS", hex.EncodeToString(key))

	v, err := NewKeyVaultFromEnv()
	if err != nil || v == nil {
		t.Fatalf("NewKeyVaultFromEnv: vault=%v err=%v", v, err)
	}

	plain := []byte("sk-very-secret-mentor-api-key")
	ct, nonce, err := v.Seal(plain)
	if err != nil {
		t.Fatalf("Seal: %v", err)
	}
	if bytes.Equal(ct, plain) {
		t.Fatal("ciphertext must not equal plaintext")
	}
	if len(nonce) == 0 {
		t.Fatal("nonce must be non-empty")
	}

	got, err := v.Open(ct, nonce)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if !bytes.Equal(got, plain) {
		t.Fatalf("round trip: got %q want %q", got, plain)
	}
}

func TestKeyVault_BadMasterKey(t *testing.T) {
	t.Setenv("AI_MENTOR_KEY_KMS", "not-hex-not-base64")
	if _, err := NewKeyVaultFromEnv(); err == nil {
		t.Fatal("expected decode error for malformed key")
	}
	t.Setenv("AI_MENTOR_KEY_KMS", "deadbeef") // valid hex but wrong length (4 bytes)
	if _, err := NewKeyVaultFromEnv(); err == nil {
		t.Fatal("expected length error for short key")
	}
}

func TestKeyVault_EmptyEnvDisables(t *testing.T) {
	t.Setenv("AI_MENTOR_KEY_KMS", "")
	v, err := NewKeyVaultFromEnv()
	if err != nil {
		t.Fatalf("NewKeyVaultFromEnv with empty env: %v", err)
	}
	if v != nil {
		t.Fatal("empty env must produce nil vault")
	}
}
