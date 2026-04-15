package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
)

var (
	// Room metrics
	roomsCreatedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_rooms_created_total",
			Help: "Total number of rooms created",
		},
	)

	roomsJoinedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_rooms_joined_total",
			Help: "Total number of room join attempts",
		},
	)

	activeRooms = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "business_active_rooms",
			Help: "Current number of active rooms",
		},
	)

	// Match metrics
	matchesStartedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_matches_started_total",
			Help: "Total number of matches started",
		},
	)

	matchesFinishedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_matches_finished_total",
			Help: "Total number of matches finished",
		},
	)

	activeMatches = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "business_active_matches",
			Help: "Current number of active matches",
		},
	)

	matchDuration = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "business_match_duration_seconds",
			Help:    "Match duration in seconds",
			Buckets: []float64{60, 180, 300, 600, 900, 1200, 1800, 3600},
		},
	)

	// Submission metrics
	submissionsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "business_submissions_total",
			Help: "Total number of code submissions",
		},
		[]string{"service", "status"},
	)

	submissionsAcceptedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_submissions_accepted_total",
			Help: "Total number of accepted submissions",
		},
	)

	submissionsRejectedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_submissions_rejected_total",
			Help: "Total number of rejected submissions",
		},
	)

	// User metrics
	usersTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_users_total",
			Help: "Total number of registered users",
		},
	)

	userRegisteredTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_user_registered_total",
			Help: "Total number of completed user registrations",
		},
	)

	activeUsers = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "business_active_users",
			Help: "Current number of active users",
		},
	)

	// Podcast metrics
	podcastsTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_podcasts_total",
			Help: "Total number of podcasts",
		},
	)

	podcastCreatedTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_podcast_created_total",
			Help: "Total number of podcasts created",
		},
	)

	listensTotal = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "business_listens_total",
			Help: "Total number of podcast listens",
		},
	)

	podcastListenTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "business_podcast_listen_total",
			Help: "Total number of listens per podcast",
		},
		[]string{"podcast_id"},
	)
)

func init() {
	prometheus.MustRegister(
		roomsCreatedTotal,
		roomsJoinedTotal,
		activeRooms,
		matchesStartedTotal,
		matchesFinishedTotal,
		activeMatches,
		matchDuration,
		submissionsTotal,
		submissionsAcceptedTotal,
		submissionsRejectedTotal,
		usersTotal,
		userRegisteredTotal,
		activeUsers,
		podcastsTotal,
		podcastCreatedTotal,
		listensTotal,
		podcastListenTotal,
	)
}

// Room metrics
func IncRoomsCreated() {
	roomsCreatedTotal.Inc()
}

func IncRoomsJoined() {
	roomsJoinedTotal.Inc()
}

func SetActiveRooms(n int) {
	activeRooms.Set(float64(n))
}

// Match metrics
func IncMatchesStarted() {
	matchesStartedTotal.Inc()
}

func IncMatchesFinished(durationSeconds float64) {
	matchesFinishedTotal.Inc()
	matchDuration.Observe(durationSeconds)
}

func SetActiveMatches(n int) {
	activeMatches.Set(float64(n))
}

// Submission metrics
func IncSubmissions(service, status string) {
	submissionsTotal.WithLabelValues(service, status).Inc()
}

func IncSubmissionsAccepted() {
	submissionsAcceptedTotal.Inc()
}

func IncSubmissionsRejected() {
	submissionsRejectedTotal.Inc()
}

// User metrics
func IncUsers() {
	usersTotal.Inc()
}

func IncUserRegistered() {
	userRegisteredTotal.Inc()
}

func SetActiveUsers(n int) {
	activeUsers.Set(float64(n))
}

// Podcast metrics
func IncPodcasts() {
	podcastsTotal.Inc()
}

func IncPodcastCreated() {
	podcastCreatedTotal.Inc()
}

func IncListens() {
	listensTotal.Inc()
}

func IncPodcastListen(podcastID string) {
	podcastListenTotal.WithLabelValues(podcastID).Inc()
}