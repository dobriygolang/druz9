import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { useRuntimeConfig } from './RuntimeConfigProvider'
import { PageLayout } from '@/widgets/PageLayout/ui/PageLayout'
import { AdminLayout } from '@/widgets/AdminLayout/ui/AdminLayout'

// Lazy load all pages
const LoginPage = lazy(() => import('@/pages/LoginPage/ui/LoginPage').then(m => ({ default: m.LoginPage })))
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage/ui/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })))
const CompleteRegistrationPage = lazy(() => import('@/pages/CompleteRegistrationPage/ui/CompleteRegistrationPage').then(m => ({ default: m.CompleteRegistrationPage })))
const HomePage = lazy(() => import('@/pages/HomePage/ui/HomePage').then(m => ({ default: m.HomePage })))
const CommunityHubPage = lazy(() => import('@/pages/CommunityHubPage/ui/CommunityHubPage').then(m => ({ default: m.CommunityHubPage })))
const UsersPage = lazy(() => import('@/pages/UsersPage/ui/UsersPage').then(m => ({ default: m.UsersPage })))
const EventsPage = lazy(() => import('@/pages/EventsPage/ui/EventsPage').then(m => ({ default: m.EventsPage })))
const MapPage = lazy(() => import('@/pages/MapPage/ui/MapPage').then(m => ({ default: m.MapPage })))
const CirclesPage = lazy(() => import('@/pages/CirclesPage/ui/CirclesPage').then(m => ({ default: m.CirclesPage })))
const PracticeHubPage = lazy(() => import('@/pages/PracticeHubPage/ui/PracticeHubPage').then(m => ({ default: m.PracticeHubPage })))
const CodeRoomsPage = lazy(() => import('@/pages/CodeRoomsPage/ui/CodeRoomsPage').then(m => ({ default: m.CodeRoomsPage })))
const ArenaHubPage = lazy(() => import('@/pages/ArenaHubPage/ui/ArenaHubPage').then(m => ({ default: m.ArenaHubPage })))
const PracticeSoloPage = lazy(() => import('@/pages/PracticeSoloPage/ui/PracticeSoloPage').then(m => ({ default: m.PracticeSoloPage })))
const GrowthHubPage = lazy(() => import('@/pages/GrowthHubPage/ui/GrowthHubPage').then(m => ({ default: m.GrowthHubPage })))
const InterviewPrepPage = lazy(() => import('@/pages/InterviewPrepPage/ui/InterviewPrepPage').then(m => ({ default: m.InterviewPrepPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage/ui/ProfilePage').then(m => ({ default: m.ProfilePage })))
const CodeRoomPage = lazy(() => import('@/pages/CodeRoomPage/ui/CodeRoomPage').then(m => ({ default: m.CodeRoomPage })))
const ArenaMatchPage = lazy(() => import('@/pages/ArenaMatchPage/ui/ArenaMatchPage').then(m => ({ default: m.ArenaMatchPage })))
const InterviewPrepSessionPage = lazy(() => import('@/pages/InterviewPrepSessionPage/ui/InterviewPrepSessionPage').then(m => ({ default: m.InterviewPrepSessionPage })))
const InterviewPrepMockSessionPage = lazy(() => import('@/pages/InterviewPrepMockSessionPage/ui/InterviewPrepMockSessionPage').then(m => ({ default: m.InterviewPrepMockSessionPage })))
const CodeTasksAdminPage = lazy(() => import('@/pages/CodeTasksAdminPage/ui/CodeTasksAdminPage').then(m => ({ default: m.CodeTasksAdminPage })))
const RTConfigAdminPage = lazy(() => import('@/pages/RTConfigAdminPage/ui/RTConfigAdminPage').then(m => ({ default: m.RTConfigAdminPage })))
const InterviewPrepAdminPage = lazy(() => import('@/pages/InterviewPrepAdminPage/ui/InterviewPrepAdminPage').then(m => ({ default: m.InterviewPrepAdminPage })))
const AdminAnalyticsPage = lazy(() => import('@/pages/AdminAnalyticsPage/ui/AdminAnalyticsPage').then(m => ({ default: m.AdminAnalyticsPage })))
const AdminCodeGamePage = lazy(() => import('@/pages/AdminCodeGamePage/ui/AdminCodeGamePage').then(m => ({ default: m.AdminCodeGamePage })))

const Fallback: React.FC = () => null

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? ''
      if (/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
        window.location.reload()
        return null
      }
      return (
        <div className="flex items-center justify-center h-screen bg-[#F2F3F0]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Что-то пошло не так</h2>
            <p className="text-[#64748b] mb-4 text-sm">{msg}</p>
            <button className="px-4 py-2 bg-[#FF8400] rounded-lg text-sm font-medium" onClick={() => window.location.reload()}>
              Перезагрузить страницу
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

  return (
    <Suspense fallback={<Fallback />}>
      <ErrorBoundary>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={
            !isAuthenticated ? <LoginPage />
              : needsProfileComplete ? <Navigate to="/complete-registration" replace />
              : <Navigate to="/home" replace />
          } />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/complete-registration" element={
            !isAuthenticated ? <Navigate to="/login" replace />
              : !needsProfileComplete ? <Navigate to="/home" replace />
              : <CompleteRegistrationPage />
          } />

          {/* Main app layout */}
          <Route element={<PageLayout />}>
            <Route path="/home" element={gate ? <Navigate to="/login" replace /> : <HomePage />} />

            {/* Community */}
            <Route path="/community" element={gate ? <Navigate to="/login" replace /> : <CommunityHubPage />}>
              <Route index element={<Navigate to="people" replace />} />
              <Route path="people" element={<UsersPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="circles" element={<CirclesPage />} />
            </Route>

            {/* Practice */}
            <Route path="/practice" element={<PracticeHubPage />}>
              <Route index element={<Navigate to="code-rooms" replace />} />
              <Route path="code-rooms" element={<CodeRoomsPage />} />
              <Route path="arena" element={<ArenaHubPage />} />
              <Route path="solo" element={<PracticeSoloPage />} />
            </Route>

            {/* Growth */}
            <Route path="/growth" element={gate ? <Navigate to="/login" replace /> : <GrowthHubPage />}>
              <Route index element={<Navigate to="interview-prep" replace />} />
              <Route path="interview-prep" element={<InterviewPrepPage />} />
            </Route>

            {/* Profile */}
            <Route path="/profile" element={
              !isAuthenticated || needsProfileComplete
                ? <Navigate to="/login" replace />
                : <ProfilePage />
            } />
            <Route path="/profile/:userId" element={
              gate ? <Navigate to="/login" replace /> : <ProfilePage />
            } />

            {/* Full-screen pages within layout */}
            <Route path="/code-rooms/:roomId" element={<CodeRoomPage />} />
            <Route path="/arena/:matchId" element={
              arenaRequireAuth && !isAuthenticated ? <Navigate to="/login" replace /> : <ArenaMatchPage />
            } />
            <Route path="/growth/interview-prep/:sessionId" element={
              !isAuthenticated ? <Navigate to="/login" replace /> : <InterviewPrepSessionPage />
            } />
            <Route path="/growth/interview-prep/mock/:sessionId" element={
              !isAuthenticated ? <Navigate to="/login" replace /> : <InterviewPrepMockSessionPage />
            } />

            {/* Legacy redirects */}
            <Route path="/feed" element={<Navigate to="/home" replace />} />
            <Route path="/users" element={<Navigate to="/community/people" replace />} />
            <Route path="/events" element={<Navigate to="/community/events" replace />} />
            <Route path="/circles" element={<Navigate to="/community/circles" replace />} />
            <Route path="/map" element={<Navigate to="/community/map" replace />} />
            <Route path="/interview-prep" element={<Navigate to="/growth/interview-prep" replace />} />
            <Route path="/interview-prep/:sessionId" element={<LegacySessionRedirect base="/growth/interview-prep" />} />
            <Route path="/interview-prep/mock/:sessionId" element={<LegacySessionRedirect base="/growth/interview-prep/mock" />} />
            <Route path="/code-rooms" element={<Navigate to="/practice/code-rooms" replace />} />
          </Route>

          {/* Admin layout */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/code-tasks" element={
              !isAuthenticated ? <Navigate to="/login" replace /> : <CodeTasksAdminPage />
            } />
            <Route path="/admin/config" element={
              !isAuthenticated ? <Navigate to="/login" replace /> : <RTConfigAdminPage />
            } />
            <Route path="/admin/interview-prep" element={
              !isAuthenticated ? <Navigate to="/login" replace /> : <InterviewPrepAdminPage />
            } />
            <Route path="/admin/analytics" element={
              !isAuthenticated ? <Navigate to="/login" replace /> : <AdminAnalyticsPage />
            } />
            <Route path="/admin/code-game" element={
              !isAuthenticated ? <Navigate to="/login" replace /> : <AdminCodeGamePage />
            } />
          </Route>

          {/* Root */}
          <Route path="*" element={
            !appRequireAuth ? <Navigate to="/home" replace />
              : !isAuthenticated ? <Navigate to="/login" replace />
              : needsProfileComplete ? <Navigate to="/complete-registration" replace />
              : <Navigate to="/home" replace />
          } />
        </Routes>
      </ErrorBoundary>
    </Suspense>
  )
}

const LegacySessionRedirect: React.FC<{ base: string }> = ({ base }) => {
  const { sessionId = '' } = useParams()
  return <Navigate to={`${base}/${sessionId}`} replace />
}
