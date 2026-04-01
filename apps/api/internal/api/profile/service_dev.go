package profile

// DevBypass returns whether dev bypass is enabled.
func (i *Implementation) DevBypass() bool {
	if service, ok := i.service.(interface{ DevBypass() bool }); ok {
		return service.DevBypass()
	}
	return false
}

// DevUserID returns the dev user ID for bypass mode.
func (i *Implementation) DevUserID() string {
	if service, ok := i.service.(interface{ DevUserID() string }); ok {
		return service.DevUserID()
	}
	return ""
}
