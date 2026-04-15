package rating

import "math"

const (
	DefaultRating = int32(300)
	MinimumRating = int32(100)
	baseKFactor   = 40.0
)

type League struct {
	Name      string
	MinRating int32
}

var Leagues = []League{
	{Name: "Bronze", MinRating: 100},
	{Name: "Silver", MinRating: 500},
	{Name: "Gold", MinRating: 900},
	{Name: "Platinum", MinRating: 1350},
	{Name: "Diamond", MinRating: 1800},
	{Name: "Master", MinRating: 2250},
}

func LeagueName(rating int32) string {
	current := Leagues[0].Name
	for _, league := range Leagues {
		if rating >= league.MinRating {
			current = league.Name
		}
	}
	return current
}

func DifficultyMultiplier(difficulty string) float64 {
	switch difficulty {
	case "hard":
		return 2
	case "medium":
		return 1.5
	default:
		return 1
	}
}

func ExpectedScore(self, opponent int32) float64 {
	return 1 / (1 + math.Pow(10, float64(opponent-self)/400))
}

func NextRating(self, opponent int32, score float64, difficulty string) int32 {
	k := baseKFactor * DifficultyMultiplier(difficulty)
	next := float64(self) + k*(score-ExpectedScore(self, opponent))
	if next < float64(MinimumRating) {
		next = float64(MinimumRating)
	}
	return int32(math.Round(next))
}

// SeasonResetRating computes the soft-reset rating for a new season.
// Formula: 75% current + 25% default — compresses the spread without full reset.
func SeasonResetRating(current int32) int32 {
	reset := float64(current)*0.75 + float64(DefaultRating)*0.25
	if reset < float64(MinimumRating) {
		reset = float64(MinimumRating)
	}
	return int32(math.Round(reset))
}

// LeagueIndex returns the 0-based index of the league for a given rating.
func LeagueIndex(rating int32) int {
	idx := 0
	for i, league := range Leagues {
		if rating >= league.MinRating {
			idx = i
		}
	}
	return idx
}

// NextLeagueThreshold returns the min rating for the next league, or -1 if already at top.
func NextLeagueThreshold(rating int32) int32 {
	idx := LeagueIndex(rating)
	if idx >= len(Leagues)-1 {
		return -1
	}
	return Leagues[idx+1].MinRating
}
