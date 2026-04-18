package apihelpers

// Page holds clamped limit/offset for list endpoints. Centralises the
// "what if the client sent limit=999999 or offset=-5" problem so every
// endpoint behaves the same way.
type Page struct {
	Limit  int32
	Offset int32
}

// ClampPage returns a sane (limit, offset) pair given raw request values
// and a per-endpoint default/max.
//
//   - negative offset → 0
//   - zero or negative limit → defaultLimit
//   - limit > maxLimit → maxLimit
//
// Individual endpoints are free to clamp further if the domain layer has
// tighter bounds; this is just the outer guard.
func ClampPage(rawLimit, rawOffset, defaultLimit, maxLimit int32) Page {
	lim := rawLimit
	if lim <= 0 {
		lim = defaultLimit
	}
	if lim > maxLimit {
		lim = maxLimit
	}
	off := rawOffset
	if off < 0 {
		off = 0
	}
	return Page{Limit: lim, Offset: off}
}
