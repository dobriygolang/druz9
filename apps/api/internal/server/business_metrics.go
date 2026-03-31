package server

import (
	"api/internal/metrics"
)

// IncRoomsCreated increments the rooms created counter
func IncRoomsCreated() {
	metrics.IncRoomsCreated()
}

// IncRoomsJoined increments the rooms joined counter
func IncRoomsJoined() {
	metrics.IncRoomsJoined()
}

// SetActiveRooms sets the current number of active rooms
func SetActiveRooms(n int) {
	metrics.SetActiveRooms(n)
}

// IncMatchesStarted increments the matches started counter
func IncMatchesStarted() {
	metrics.IncMatchesStarted()
}

// IncMatchesFinished increments the matches finished counter and observes duration
func IncMatchesFinished(durationSeconds float64) {
	metrics.IncMatchesFinished(durationSeconds)
}

// SetActiveMatches sets the current number of active matches
func SetActiveMatches(n int) {
	metrics.SetActiveMatches(n)
}

// IncSubmissions increments the submissions counter by service and status
func IncSubmissions(service, status string) {
	metrics.IncSubmissions(service, status)
}

// IncSubmissionsAccepted increments the accepted submissions counter
func IncSubmissionsAccepted() {
	metrics.IncSubmissionsAccepted()
}

// IncSubmissionsRejected increments the rejected submissions counter
func IncSubmissionsRejected() {
	metrics.IncSubmissionsRejected()
}

// IncUsers increments the users counter
func IncUsers() {
	metrics.IncUsers()
}

// IncUserRegistered increments the completed registrations counter
func IncUserRegistered() {
	metrics.IncUserRegistered()
}

// SetActiveUsers sets the current number of active users
func SetActiveUsers(n int) {
	metrics.SetActiveUsers(n)
}

// IncPodcasts increments the podcasts counter
func IncPodcasts() {
	metrics.IncPodcasts()
}

// IncPodcastCreated increments the podcasts created counter
func IncPodcastCreated() {
	metrics.IncPodcastCreated()
}

// IncListens increments the podcast listens counter
func IncListens() {
	metrics.IncListens()
}

// IncPodcastListen increments the podcast listen counter for a specific podcast
func IncPodcastListen(podcastID, podcastTitle string) {
	metrics.IncPodcastListen(podcastID, podcastTitle)
}