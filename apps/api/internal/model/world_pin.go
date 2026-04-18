package model

type WorldPinKind int32

const (
	WorldPinKindUnspecified WorldPinKind = 0
	WorldPinKindGuild       WorldPinKind = 1
	WorldPinKindEvent       WorldPinKind = 2
	WorldPinKindPlayer      WorldPinKind = 3
)

// WorldPin is an aggregate map marker: a guild hall, an upcoming event, or
// (reserved) the current viewer's location.
type WorldPin struct {
	ID        string       `json:"id"`
	Kind      WorldPinKind `json:"kind"`
	Title     string       `json:"title"`
	Subtitle  string       `json:"subtitle"`
	Latitude  float64      `json:"latitude"`
	Longitude float64      `json:"longitude"`
	Region    string       `json:"region"`
	IconRef   string       `json:"iconRef"`
	LinkPath  string       `json:"linkPath"`
	IsHot     bool         `json:"isHot"`
}
