package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"

	"api/internal/sandbox"
)

func main() {
	input, err := io.ReadAll(os.Stdin)
	if err != nil {
		exitf("read sandbox request: %v", err)
	}

	var envelope sandbox.ExecuteEnvelope
	if err := json.Unmarshal(input, &envelope); err != nil {
		exitf("decode sandbox request: %v", err)
	}

	result, execErr := sandbox.New().Execute(context.Background(), envelope.Request)
	response := sandbox.ExecuteResponseEnvelope{}
	if execErr != nil {
		response.Error = execErr.Error()
	} else {
		response.Result = &result
	}

	if err := json.NewEncoder(os.Stdout).Encode(response); err != nil {
		exitf("encode sandbox response: %v", err)
	}
}

func exitf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
