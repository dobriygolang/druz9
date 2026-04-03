package sandbox

type ExecuteEnvelope struct {
	Request ExecutionRequest `json:"request"`
}

type ExecuteResponseEnvelope struct {
	Result *ExecutionResult `json:"result,omitempty"`
	Error  string           `json:"error,omitempty"`
}
