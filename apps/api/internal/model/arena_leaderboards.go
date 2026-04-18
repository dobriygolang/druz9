package model

// GuildLeaderboardEntry is one row on the guild-of-the-week board:
// aggregate wins, member average rating, and a 7-day delta for
// movement visualisation. Produced by the arena data layer so the API
// handler can stay pure-mapping.
type GuildLeaderboardEntry struct {
	GuildID         string
	Name            string
	MemberCount     int32
	TotalWins       int32
	AggregatePoints int32
	AvgRating       int32
	DeltaWeek       int32
}

// SeasonXPEntry is one row on the Season-Pass XP board. seasonNumber
// lives outside the row — the repo returns it alongside the slice.
type SeasonXPEntry struct {
	UserID      string
	Username    string
	DisplayName string
	AvatarURL   string
	GuildName   string
	XP          int32
	CurrentTier int32
	Trophies    int32
}
