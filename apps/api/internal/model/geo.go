package model

type GeoCandidate struct {
	Region      string
	Country     string
	City        string
	Latitude    float64
	Longitude   float64
	DisplayName string
}

type GeoResolveResponse struct {
	Candidates []*GeoCandidate
}

type CommunityMapPoint struct {
	UserID           string
	Title            string
	Region           string
	Latitude         float64
	Longitude        float64
	IsCurrentUser    bool
	AvatarURL        string
	Username         string
	FirstName        string
	LastName         string
	ActivityStatus   string
	TelegramUsername string
}

type CommunityMapResponse struct {
	Points []*CommunityMapPoint
}
