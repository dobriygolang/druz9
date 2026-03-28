package policy

import "errors"

var (
	ErrInvalidPolicy      = errors.New("invalid sandbox policy")
	ErrUnsafeOverride     = errors.New("unsafe sandbox policy override")
	ErrUnsupportedTask    = errors.New("unsupported task type")
	ErrUnsupportedProfile = errors.New("unsupported execution profile")
	ErrUnsupportedLang    = errors.New("unsupported language")
)
