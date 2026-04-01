package policy

func DefaultPolicies() map[ExecutionProfile]SandboxPolicy {
	return map[ExecutionProfile]SandboxPolicy{
		ProfilePure:               defaultPurePolicy(),
		ProfileFileIO:             defaultFileIOPolicy(),
		ProfileHTTPClient:         defaultHTTPClientPolicy(),
		ProfileInterviewRealistic: defaultInterviewRealisticPolicy(),
	}
}

func DefaultPolicy(profile ExecutionProfile) (SandboxPolicy, error) {
	policy, ok := DefaultPolicies()[profile]
	if !ok {
		return SandboxPolicy{}, ErrUnsupportedProfile
	}
	return policy, nil
}
