package interviewprep

import "api/internal/model"

// Mock interview access is currently open to any authenticated user.
func ensureTrusted(user *model.User) error {
	_ = user
	return nil
}
