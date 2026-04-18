import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { useRuntimeConfig } from './RuntimeConfigProvider'
import { PageLayout } from '@/widgets/PageLayout'
import { AdminLayout } from '@/widgets/AdminLayout/ui/AdminLayout'
import { i18n } from '@/shared/i18n'

// Auth
const LoginPage = lazy(() =>
  import('@/pages/LoginPage/ui/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const AuthCallbackPage = lazy(() =>
  import('@/pages/AuthCallbackPage/ui/AuthCallbackPage').then((m) => ({
    default: m.AuthCallbackPage,
  })),
)
const CompleteRegistrationPage = lazy(() =>
  import('@/pages/CompleteRegistrationPage/ui/CompleteRegistrationPage').then((m) => ({
    default: m.CompleteRegistrationPage,
  })),
)

// New pixel RPG screens
const HubPage = lazy(() => import('@/pages/HubPage/ui/HubPage').then((m) => ({ default: m.HubPage })))
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage/ui/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const GuildPage = lazy(() =>
  import('@/pages/GuildPage/ui/GuildPage').then((m) => ({ default: m.GuildPage })),
)
const ArenaHubPage = lazy(() =>
  import('@/pages/ArenaHubPage/ui/ArenaHubPage').then((m) => ({ default: m.ArenaHubPage })),
)
// /atlas uses the TrainingPage layout (the card design the user prefers).
// SkillsPage stayed around briefly as the candidate but we ended up on
// Training's cleaner node cards.
const TrainingPage = lazy(() =>
  import('@/pages/TrainingPage/ui/TrainingPage').then((m) => ({ default: m.TrainingPage })),
)
const TrainingTaskPage = lazy(() =>
  import('@/pages/TrainingTaskPage/ui/TrainingTaskPage').then((m) => ({
    default: m.TrainingTaskPage,
  })),
)
const InterviewHubPage = lazy(() =>
  import('@/pages/InterviewHubPage/ui/InterviewHubPage').then((m) => ({ default: m.InterviewHubPage })),
)
const InterviewLiveSessionPage = lazy(() =>
  import('@/pages/InterviewLiveSessionPage/ui/InterviewLiveSessionPage').then((m) => ({
    default: m.InterviewLiveSessionPage,
  })),
)
const DuelLivePage = lazy(() =>
  import('@/pages/DuelLivePage/ui/DuelLivePage').then((m) => ({ default: m.DuelLivePage })),
)
const PeerMocksPage = lazy(() =>
  import('@/pages/PeerMocksPage/ui/PeerMocksPage').then((m) => ({ default: m.PeerMocksPage })),
)
const LeaderboardsPage = lazy(() =>
  import('@/pages/LeaderboardsPage/ui/LeaderboardsPage').then((m) => ({
    default: m.LeaderboardsPage,
  })),
)
const EventsPage = lazy(() =>
  import('@/pages/EventsPage/ui/EventsPage').then((m) => ({ default: m.EventsPage })),
)
const PodcastsPage = lazy(() =>
  import('@/pages/PodcastsPage/ui/PodcastsPage').then((m) => ({ default: m.PodcastsPage })),
)
const MapPage = lazy(() =>
  import('@/pages/MapPage/ui/MapPage').then((m) => ({ default: m.MapPage })),
)
const ShopPage = lazy(() =>
  import('@/pages/ShopPage/ui/ShopPage').then((m) => ({ default: m.ShopPage })),
)
const GuildWarPage = lazy(() =>
  import('@/pages/GuildWarPage/ui/GuildWarPage').then((m) => ({ default: m.GuildWarPage })),
)
const SeasonPassPage = lazy(() =>
  import('@/pages/SeasonPassPage/ui/SeasonPassPage').then((m) => ({ default: m.SeasonPassPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage/ui/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const CodeRoomsIndexPage = lazy(() =>
  import('@/pages/CodeRoomsIndexPage/ui/CodeRoomsIndexPage').then((m) => ({
    default: m.CodeRoomsIndexPage,
  })),
)
const DesignSystemPage = lazy(() =>
  import('@/pages/DesignSystemPage/ui/DesignSystemPage').then((m) => ({
    default: m.DesignSystemPage,
  })),
)
const InboxPage = lazy(() =>
  import('@/pages/InboxPage/ui/InboxPage').then((m) => ({ default: m.InboxPage })),
)
const DuelReplayPage = lazy(() =>
  import('@/pages/DuelReplayPage/ui/DuelReplayPage').then((m) => ({ default: m.DuelReplayPage })),
)
const FriendChallengesPage = lazy(() =>
  import('@/pages/FriendChallengesPage/ui/FriendChallengesPage').then((m) => ({ default: m.FriendChallengesPage })),
)

// Preserved code-editor / ws-logic pages (UI to be restyled later)
const CodeRoomPage = lazy(() =>
  import('@/pages/CodeRoomPage/ui/CodeRoomPage').then((m) => ({ default: m.CodeRoomPage })),
)
const ArenaMatchPage = lazy(() =>
  import('@/pages/ArenaMatchPage/ui/ArenaMatchPage').then((m) => ({ default: m.ArenaMatchPage })),
)
const DailyChallengePage = lazy(() =>
  import('@/pages/DailyChallengePage/ui/DailyChallengePage').then((m) => ({
    default: m.DailyChallengePage,
  })),
)
const SpeedRunPage = lazy(() =>
  import('@/pages/SpeedRunPage/ui/SpeedRunPage').then((m) => ({ default: m.SpeedRunPage })),
)
const WeeklyBossPage = lazy(() =>
  import('@/pages/WeeklyBossPage/ui/WeeklyBossPage').then((m) => ({ default: m.WeeklyBossPage })),
)
const BlindReviewPage = lazy(() =>
  import('@/pages/BlindReviewPage/ui/BlindReviewPage').then((m) => ({ default: m.BlindReviewPage })),
)
const InterviewPrepSessionPage = lazy(() =>
  import('@/pages/InterviewPrepSessionPage/ui/InterviewPrepSessionPage').then((m) => ({
    default: m.InterviewPrepSessionPage,
  })),
)
const InterviewPrepMockSessionPage = lazy(() =>
  import('@/pages/InterviewPrepMockSessionPage/ui/InterviewPrepMockSessionPage').then((m) => ({
    default: m.InterviewPrepMockSessionPage,
  })),
)

// Admin (kept as-is; will break visually under pixel theme — deliberate)
const CodeTasksAdminPage = lazy(() =>
  import('@/pages/CodeTasksAdminPage/ui/CodeTasksAdminPage').then((m) => ({
    default: m.CodeTasksAdminPage,
  })),
)
const RTConfigAdminPage = lazy(() =>
  import('@/pages/RTConfigAdminPage/ui/RTConfigAdminPage').then((m) => ({
    default: m.RTConfigAdminPage,
  })),
)
const InterviewPrepAdminPage = lazy(() =>
  import('@/pages/InterviewPrepAdminPage/ui/InterviewPrepAdminPage').then((m) => ({
    default: m.InterviewPrepAdminPage,
  })),
)
const AdminAnalyticsPage = lazy(() =>
  import('@/pages/AdminAnalyticsPage/ui/AdminAnalyticsPage').then((m) => ({
    default: m.AdminAnalyticsPage,
  })),
)
const AdminLogsPage = lazy(() =>
  import('@/pages/AdminLogsPage/ui/AdminLogsPage').then((m) => ({
    default: m.AdminLogsPage,
  })),
)
const AdminCodeGamePage = lazy(() =>
  import('@/pages/AdminCodeGamePage/ui/AdminCodeGamePage').then((m) => ({
    default: m.AdminCodeGamePage,
  })),
)
const AdminDashboardPage = lazy(() =>
  import('@/pages/AdminDashboardPage/ui/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  })),
)
const InterviewBoardPage = lazy(() =>
  import('@/pages/InterviewBoardPage/ui/InterviewBoardPage').then((m) => ({ default: m.InterviewBoardPage })),
)
const AdminShopPage = lazy(() =>
  import('@/pages/AdminShopPage/ui/AdminShopPage').then((m) => ({ default: m.AdminShopPage })),
)
const AdminNotificationsPage = lazy(() =>
  import('@/pages/AdminNotificationsPage/ui/AdminNotificationsPage').then((m) => ({ default: m.AdminNotificationsPage })),
)
const AdminPodcastsPage = lazy(() =>
  import('@/pages/AdminPodcastsPage/ui/AdminPodcastsPage').then((m) => ({ default: m.AdminPodcastsPage })),
)
const AdminSeasonPassPage = lazy(() =>
  import('@/pages/AdminSeasonPassPage/ui/AdminSeasonPassPage').then((m) => ({ default: m.AdminSeasonPassPage })),
)
const AdminAIBotsPage = lazy(() =>
  import('@/pages/AdminAIBotsPage/ui/AdminAIBotsPage').then((m) => ({ default: m.AdminAIBotsPage })),
)

const Fallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--parch-1)',
    }}
  >
    <div
      style={{
        width: 24,
        height: 24,
        border: '3px solid var(--parch-3)',
        borderTopColor: 'var(--ember-1)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  </div>
)

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? ''
      if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
        window.location.reload()
        return null
      }
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="rpg-panel" style={{ maxWidth: 480, textAlign: 'center' }}>
            <h2 className="font-display" style={{ fontSize: 22, marginBottom: 8 }}>
              {i18n.t('router.error.title')}
            </h2>
            <p style={{ color: 'var(--ink-2)', fontSize: 14, marginBottom: 12 }}>{msg}</p>
            <button className="rpg-btn rpg-btn--primary" onClick={() => window.location.reload()}>
              {i18n.t('router.error.reload')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export const RouterProvider: React.FC = () => {
  const { isLoading, isAuthenticated, needsProfileComplete } = useAuth()
  const { isLoading: rcLoading, appRequireAuth, arenaRequireAuth } = useRuntimeConfig()

  if (isLoading || rcLoading) return null

  const gate = appRequireAuth && (!isAuthenticated || needsProfileComplete)
  const authGate = !isAuthenticated || needsProfileComplete

  return (
    <Suspense fallback={<Fallback />}>
      <ErrorBoundary>
        <Routes>
          {/* Auth */}
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <LoginPage />
              ) : needsProfileComplete ? (
                <Navigate to="/complete-registration" replace />
              ) : (
                <Navigate to="/hub" replace />
              )
            }
          />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/complete-registration"
            element={
              !isAuthenticated ? (
                <Navigate to="/login" replace />
              ) : !needsProfileComplete ? (
                <Navigate to="/hub" replace />
              ) : (
                <CompleteRegistrationPage />
              )
            }
          />

          {/* Main pixel-RPG shell */}
          <Route element={<PageLayout />}>
            <Route path="/hub" element={gate ? <Navigate to="/login" replace /> : <HubPage />} />
            <Route
              path="/profile"
              element={authGate ? <Navigate to="/login" replace /> : <ProfilePage />}
            />
            <Route
              path="/profile/:userId"
              element={gate ? <Navigate to="/login" replace /> : <ProfilePage />}
            />
            <Route path="/guild" element={gate ? <Navigate to="/login" replace /> : <GuildPage />} />
            <Route path="/arena" element={gate ? <Navigate to="/login" replace /> : <ArenaHubPage />} />
            <Route
              path="/arena/:matchId"
              element={
                arenaRequireAuth && !isAuthenticated ? (
                  <Navigate to="/login" replace />
                ) : (
                  <ArenaMatchPage />
                )
              }
            />
            {/* Atlas = merged skill tree (was /skills + /training root).
                 Keep old paths as redirects so bookmarks survive. Training
                 sub-routes (daily, speed-run, task/:id, weekly-boss,
                 blind-review) stay as-is — they're the actual playable
                 screens, not the map. */}
            <Route
              path="/atlas"
              element={gate ? <Navigate to="/login" replace /> : <TrainingPage />}
            />
            <Route path="/skills" element={<Navigate to="/atlas" replace />} />
            <Route path="/training" element={<Navigate to="/atlas" replace />} />
            <Route
              path="/training/task/:taskId"
              element={gate ? <Navigate to="/login" replace /> : <TrainingTaskPage />}
            />
            <Route
              path="/interview"
              element={gate ? <Navigate to="/login" replace /> : <InterviewHubPage />}
            />
            <Route
              path="/interview/peer"
              element={gate ? <Navigate to="/login" replace /> : <PeerMocksPage />}
            />
            <Route
              path="/interview/board"
              element={gate ? <Navigate to="/login" replace /> : <InterviewBoardPage />}
            />
            <Route
              path="/interview/live/:sessionId"
              element={gate ? <Navigate to="/login" replace /> : <InterviewLiveSessionPage />}
            />
            <Route
              path="/interview/:sessionId"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : <InterviewPrepSessionPage />
              }
            />
            <Route
              path="/interview/mock/:sessionId"
              element={
                !isAuthenticated ? <Navigate to="/login" replace /> : <InterviewPrepMockSessionPage />
              }
            />
            <Route path="/duel" element={gate ? <Navigate to="/login" replace /> : <DuelLivePage />} />
            {/* /social is now part of /inbox (Friends tab). Keep the old path
                 as a transparent redirect so deep-links and bookmarks still work. */}
            <Route path="/social" element={<Navigate to="/inbox?tab=friends" replace />} />
            <Route
              path="/leaderboards"
              element={gate ? <Navigate to="/login" replace /> : <LeaderboardsPage />}
            />
            <Route path="/events" element={gate ? <Navigate to="/login" replace /> : <EventsPage />} />
            <Route
              path="/podcasts"
              element={gate ? <Navigate to="/login" replace /> : <PodcastsPage />}
            />
            <Route path="/map" element={gate ? <Navigate to="/login" replace /> : <MapPage />} />
            {/* /tavern is the new canonical path; /shop kept as a backward-compat redirect. */}
            <Route path="/tavern" element={gate ? <Navigate to="/login" replace /> : <ShopPage />} />
            <Route path="/shop" element={<Navigate to="/tavern" replace />} />
            <Route path="/war" element={gate ? <Navigate to="/login" replace /> : <GuildWarPage />} />
            <Route
              path="/seasonpass"
              element={gate ? <Navigate to="/login" replace /> : <SeasonPassPage />}
            />
            <Route path="/settings" element={authGate ? <Navigate to="/login" replace /> : <SettingsPage />} />
            <Route path="/inbox" element={gate ? <Navigate to="/login" replace /> : <InboxPage />} />
            <Route path="/duel/replay/:id" element={gate ? <Navigate to="/login" replace /> : <DuelReplayPage />} />
            <Route path="/duel/replay" element={gate ? <Navigate to="/login" replace /> : <DuelReplayPage />} />
            <Route path="/challenges" element={gate ? <Navigate to="/login" replace /> : <FriendChallengesPage />} />
            <Route path="/ds" element={<DesignSystemPage />} />

            {/* Preserved code-editor-logic routes (UI restyle pending) */}
            <Route path="/practice/code-rooms" element={gate ? <Navigate to="/login" replace /> : <CodeRoomsIndexPage />} />
            <Route
              path="/training/daily"
              element={gate ? <Navigate to="/login" replace /> : <DailyChallengePage />}
            />
            <Route
              path="/training/speed-run"
              element={gate ? <Navigate to="/login" replace /> : <SpeedRunPage />}
            />
            <Route
              path="/training/weekly-boss"
              element={gate ? <Navigate to="/login" replace /> : <WeeklyBossPage />}
            />
            <Route
              path="/training/blind-review"
              element={gate ? <Navigate to="/login" replace /> : <BlindReviewPage />}
            />
          </Route>

          {/* Full-screen code room (no sidebar/header — matches code-interview layout) */}
          <Route path="/code-rooms/:roomId" element={<CodeRoomPage />} />

          {/* Admin — restyled to match the pixel theme. All /admin/*
               routes are gated by AdminLayout (isAdmin check) — no need
               to repeat the guard on each inner route. */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/code-tasks" element={<CodeTasksAdminPage />} />
            <Route path="/admin/config" element={<RTConfigAdminPage />} />
            <Route path="/admin/interview-prep" element={<InterviewPrepAdminPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/logs" element={<AdminLogsPage />} />
            <Route path="/admin/code-game" element={<AdminCodeGamePage />} />
            {/* Stubs for the Wave E sections that don't have UI yet — the
                dashboard links land here; each will get a real page as
                the corresponding admin RPCs ship. */}
            <Route path="/admin/podcasts"     element={<AdminPodcastsPage />} />
            <Route path="/admin/shop"         element={<AdminShopPage />} />
            <Route path="/admin/seasonpass"   element={<AdminSeasonPassPage />} />
            <Route path="/admin/ai-bots"      element={<AdminAIBotsPage />} />
            <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
          </Route>

          {/* Catch-all */}
          <Route
            path="*"
            element={
              !appRequireAuth ? (
                <Navigate to="/hub" replace />
              ) : !isAuthenticated ? (
                <Navigate to="/login" replace />
              ) : needsProfileComplete ? (
                <Navigate to="/complete-registration" replace />
              ) : (
                <Navigate to="/hub" replace />
              )
            }
          />
        </Routes>
      </ErrorBoundary>
    </Suspense>
  )
}

