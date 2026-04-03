package sandbox

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRemoteClientExecute(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/execute" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(ExecuteResponseEnvelope{
			Result: &ExecutionResult{Output: "ok"},
		})
	}))
	defer server.Close()

	client := NewRemote(RemoteConfig{BaseURL: server.URL})
	result, err := client.Execute(context.Background(), ExecutionRequest{})
	if err != nil {
		t.Fatalf("execute: %v", err)
	}
	if result.Output != "ok" {
		t.Fatalf("unexpected output: %q", result.Output)
	}
}
