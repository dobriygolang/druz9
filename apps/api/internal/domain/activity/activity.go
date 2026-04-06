package activity

import "time"

// Day holds the activity count for a single calendar day.
type Day struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// BuildCalendar takes a map of date->count (from the database) and returns
// a full 365-day slice with zero-filled gaps, sorted oldest to newest.
func BuildCalendar(dailyCounts map[string]int) []Day {
	const days = 365
	today := time.Now().UTC().Truncate(24 * time.Hour)

	result := make([]Day, days)
	for i := range result {
		dayOffset := days - 1 - i
		dateStr := today.AddDate(0, 0, -dayOffset).Format("2006-01-02")
		count := dailyCounts[dateStr]
		result[i] = Day{
			Date:  dateStr,
			Count: count,
		}
	}
	return result
}
