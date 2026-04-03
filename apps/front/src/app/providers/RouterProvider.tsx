import React, { Suspense, lazy, useMemo } from 'react';
import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { PageLayout } from '@/widgets/PageLayout/ui/PageLayout';
import { GuestNameModal } from '@/features/CodeRoom/ui/GuestNameModal';
import { useInviteHandler } from '@/shared/hooks/useInviteHandler';
import { ENV } from '@/shared/config/env';

const LoginPage = lazy(() => import('@/pages/LoginPage/ui/LoginPage').then((m) => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage/ui/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const CompleteRegistrationPage = lazy(() => import('@/pages/CompleteRegistrationPage/ui/CompleteRegistrationPage').then((m) => ({ default: m.CompleteRegistrationPage })));
const HomePage = lazy(() => import('@/pages/HomePage/ui/HomePage').then((m) => ({ default: m.HomePage })));
const CommunityHubPage = lazy(() => import('@/pages/CommunityHubPage/ui/CommunityHubPage').then((m) => ({ default: m.CommunityHubPage })));
const PracticeHubPage = lazy(() => import('@/pages/PracticeHubPage/ui/PracticeHubPage').then((m) => ({ default: m.PracticeHubPage })));
const GrowthHubPage = lazy(() => import('@/pages/GrowthHubPage/ui/GrowthHubPage').then((m) => ({ default: m.GrowthHubPage })));
const ArenaHubPage = lazy(() => import('@/pages/ArenaHubPage/ui/ArenaHubPage').then((m) => ({ default: m.ArenaHubPage })));
const CirclesPage = lazy(() => import('@/pages/CirclesPage/ui/CirclesPage').then((m) => ({ default: m.CirclesPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage/ui/UsersPage').then((m) => ({ default: m.UsersPage })));
const EventsPage = lazy(() => import('@/pages/EventsPage/ui/EventsPage').then((m) => ({ default: m.EventsPage })));
const VacanciesPage = lazy(() => import('@/pages/VacanciesPage/ui/VacanciesPage').then((m) => ({ default: m.VacanciesPage })));
const MapPage = lazy(() => import('@/pages/MapPage/ui/MapPage').then((m) => ({ default: m.MapPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage/ui/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const CodeRoomsPage = lazy(() => import('@/pages/CodeRoomsPage/ui/CodeRoomsPage').then((m) => ({ default: m.CodeRoomsPage })));
const CodeRoomPage = lazy(() => import('@/pages/CodeRoomPage/ui/CodeRoomPage').then((m) => ({ default: m.CodeRoomPage })));
const CodeTasksAdminPage = lazy(() => import('@/pages/CodeTasksAdminPage/ui/CodeTasksAdminPage').then((m) => ({ default: m.CodeTasksAdminPage })));
const RTConfigAdminPage = lazy(() => import('@/pages/RTConfigAdminPage/ui/RTConfigAdminPage').then((m) => ({ default: m.RTConfigAdminPage })));
const ArenaMatchPage = lazy(() => import('@/pages/ArenaMatchPage/ui/ArenaMatchPage').then((m) => ({ default: m.ArenaMatchPage })));
const InterviewPrepPage = lazy(() => import('@/pages/InterviewPrepPage/ui/InterviewPrepPage').then((m) => ({ default: m.InterviewPrepPage })));
const InterviewPrepSessionPage = lazy(() => import('@/pages/InterviewPrepSessionPage/ui/InterviewPrepSessionPage').then((m) => ({ default: m.InterviewPrepSessionPage })));
const InterviewPrepMockSessionPage = lazy(() => import('@/pages/InterviewPrepMockSessionPage/ui/InterviewPrepMockSessionPage').then((m) => ({ default: m.InterviewPrepMockSessionPage })));
const InterviewPrepAdminPage = lazy(() => import('@/pages/InterviewPrepAdminPage/ui/InterviewPrepAdminPage').then((m) => ({ default: m.InterviewPrepAdminPage })));

const LoadingFallback: React.FC = () => (
  null
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || '';
      const isChunkLoadFailed = /Failed to fetch dynamically imported module/i.test(msg) || /Importing a module script failed/i.test(msg);
      if (isChunkLoadFailed) {
        window.location.reload();
        return null;
      }
      return (
        <div style={{ padding: '20px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-color)', height: '100vh' }}>
          <h2>Что-то пошло не так</h2>
          <p>{msg}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Перезагрузить страницу</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const RouterProvider: React.FC = () => {
  const { isLoading, isAuthenticated, needsProfileComplete } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorBoundary>
        <Routes>
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <LoginPage />
              ) : needsProfileComplete ? (
                <Navigate to="/complete-registration" replace />
              ) : (
                <Navigate to="/home" replace />
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
                <Navigate to="/home" replace />
              ) : (
                <CompleteRegistrationPage />
              )
            }
          />

          <Route element={<PageLayout />}>
            <Route
              path="/home"
              element={!isAuthenticated || needsProfileComplete ? (
                <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} />
              ) : (
                <HomePage />
              )}
            />

            <Route
              path="/community"
              element={!isAuthenticated || needsProfileComplete ? (
                <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} />
              ) : (
                <CommunityHubPage />
              )}
            >
              <Route index element={<Navigate to="people" replace />} />
              <Route path="people" element={<UsersPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="circles" element={<CirclesPage />} />
            </Route>

            <Route path="/practice" element={<PracticeHubPage />}>
              <Route index element={<Navigate to="code-rooms" replace />} />
              <Route
                path="code-rooms"
                element={(
                  <InviteHandler>
                    {!isAuthenticated && !needsProfileComplete ? (
                      <CodeRoomsPage />
                    ) : needsProfileComplete ? (
                      <Navigate to="/complete-registration" replace />
                    ) : (
                      <CodeRoomsPage />
                    )}
                  </InviteHandler>
                )}
              />
              <Route path="arena" element={<ArenaHubPage />} />
            </Route>

            <Route
              path="/growth"
              element={!isAuthenticated || needsProfileComplete ? (
                <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} />
              ) : (
                <GrowthHubPage />
              )}
            >
              <Route index element={<Navigate to="interview-prep" replace />} />
              <Route path="interview-prep" element={<InterviewPrepPage />} />
              <Route path="vacancies" element={<VacanciesPage />} />
            </Route>

            <Route path="/feed" element={<Navigate to="/home" replace />} />
            <Route path="/users" element={<Navigate to="/community/people" replace />} />
            <Route path="/search" element={<Navigate to="/community/people" replace />} />
            <Route path="/events" element={<Navigate to="/community/events" replace />} />
            <Route path="/circles" element={<Navigate to="/community/circles" replace />} />
            <Route path="/vacancies" element={<Navigate to="/growth/vacancies" replace />} />
            <Route path="/map" element={<Navigate to="/community/map" replace />} />
            <Route path="/interview-prep" element={<Navigate to="/growth/interview-prep" replace />} />

            <Route
              path="/profile"
              element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <ProfilePage />}
            />
            <Route
              path="/profile/:userId"
              element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <ProfilePage />}
            />

            <Route path="/code-rooms" element={<Navigate to="/practice/code-rooms" replace />} />

            <Route
              path="/code-rooms/:roomId"
              element={
                !isAuthenticated || needsProfileComplete ? (
                  needsProfileComplete ? <Navigate to="/complete-registration" replace /> : <CodeRoomPage />
                ) : (
                  <CodeRoomPage />
                )
              }
            />

            <Route
              path="/arena/:matchId"
              element={
                ENV.ARENA_REQUIRE_AUTH
                  ? (!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <ArenaMatchPage />)
                  : <ArenaMatchPage />
              }
            />

            <Route
              path="/growth/interview-prep/:sessionId"
              element={!isAuthenticated || needsProfileComplete ? (
                <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} />
              ) : (
                <InterviewPrepSessionPage />
              )}
            />

            <Route
              path="/growth/interview-prep/mock/:sessionId"
              element={!isAuthenticated || needsProfileComplete ? (
                <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} />
              ) : (
                <InterviewPrepMockSessionPage />
              )}
            />

            <Route
              path="/interview-prep/:sessionId"
              element={<LegacyInterviewPrepSessionRedirect />}
            />

            <Route
              path="/interview-prep/mock/:sessionId"
              element={<LegacyInterviewPrepMockRedirect />}
            />

            <Route
              path="/admin/code-tasks"
              element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <CodeTasksAdminPage />}
            />
            <Route
              path="/admin/config"
              element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <RTConfigAdminPage />}
            />
            <Route
              path="/admin/interview-prep"
              element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <InterviewPrepAdminPage />}
            />
          </Route>

          <Route path="*" element={<RootPageWithInvite />} />
        </Routes>
      </ErrorBoundary>
    </Suspense>
  );
};

const NavigateToAuth: React.FC<{ isAuthenticated: boolean; needsProfileComplete: boolean }> = ({ isAuthenticated, needsProfileComplete }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsProfileComplete) return <Navigate to="/complete-registration" replace />;
  return <Navigate to="/home" replace />;
};

const InviteHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const { isAuthenticated, isLoading } = useAuth();

  const { redirectTo, isProcessing, needsGuestName, getGuestName, setGuestName, cancelGuestName } = useInviteHandler(
    { isAuthenticated, isLoading },
    inviteCode,
    '/practice/code-rooms',
  );

  if (isLoading || isProcessing) {
    return <LoadingFallback />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <>
      {children}
      <GuestNameModal
        open={needsGuestName}
        initialValue={getGuestName()}
        onCancel={cancelGuestName}
        onConfirm={setGuestName}
      />
    </>
  );
};

const RootPageWithInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const { isAuthenticated, isLoading, needsProfileComplete } = useAuth();

  const fallbackRedirect = useMemo(
    () => {
      if (!isAuthenticated) return '/login';
      if (needsProfileComplete) return '/complete-registration';
      return '/home';
    },
    [isAuthenticated, needsProfileComplete],
  );

  const { redirectTo, isProcessing, needsGuestName, getGuestName, setGuestName, cancelGuestName } = useInviteHandler(
    { isAuthenticated, isLoading },
    inviteCode,
    fallbackRedirect,
  );

  if (isLoading || isProcessing) {
    return <LoadingFallback />;
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  if (needsGuestName) {
    return (
      <div className="flex-center full-height" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
        <GuestNameModal
          open
          initialValue={getGuestName()}
          onCancel={() => {
            cancelGuestName();
            window.location.href = fallbackRedirect;
          }}
          onConfirm={setGuestName}
        />
      </div>
    );
  }

  return <Navigate to="/home" replace />;
};

const LegacyInterviewPrepSessionRedirect: React.FC = () => {
  const { sessionId = '' } = useParams();
  return <Navigate to={`/growth/interview-prep/${sessionId}`} replace />;
};

const LegacyInterviewPrepMockRedirect: React.FC = () => {
  const { sessionId = '' } = useParams();
  return <Navigate to={`/growth/interview-prep/mock/${sessionId}`} replace />;
};
