import React, { Suspense, lazy, useMemo } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { PageLayout } from '@/widgets/PageLayout/ui/PageLayout';
import { GuestNameModal } from '@/features/CodeRoom/ui/GuestNameModal';
import { useInviteHandler } from '@/shared/hooks/useInviteHandler';
import { ENV } from '@/shared/config/env';

// Lazy load pages for better bundle size
const LoginPage = lazy(() => import('@/pages/LoginPage/ui/LoginPage').then(m => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage/ui/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const CompleteRegistrationPage = lazy(() => import('@/pages/CompleteRegistrationPage/ui/CompleteRegistrationPage').then(m => ({ default: m.CompleteRegistrationPage })));
const FeedPage = lazy(() => import('@/pages/FeedPage/ui/FeedPage').then(m => ({ default: m.FeedPage })));
const CirclesPage = lazy(() => import('@/pages/CirclesPage/ui/CirclesPage').then(m => ({ default: m.CirclesPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage/ui/UsersPage').then(m => ({ default: m.UsersPage })));
const EventsPage = lazy(() => import('@/pages/EventsPage/ui/EventsPage').then(m => ({ default: m.EventsPage })));
const VacanciesPage = lazy(() => import('@/pages/VacanciesPage/ui/VacanciesPage').then(m => ({ default: m.VacanciesPage })));
const MapPage = lazy(() => import('@/pages/MapPage/ui/MapPage').then(m => ({ default: m.MapPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage/ui/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CodeRoomsPage = lazy(() => import('@/pages/CodeRoomsPage/ui/CodeRoomsPage').then(m => ({ default: m.CodeRoomsPage })));
const CodeRoomPage = lazy(() => import('@/pages/CodeRoomPage/ui/CodeRoomPage').then(m => ({ default: m.CodeRoomPage })));
const CodeTasksAdminPage = lazy(() => import('@/pages/CodeTasksAdminPage/ui/CodeTasksAdminPage').then(m => ({ default: m.CodeTasksAdminPage })));
const RTConfigAdminPage = lazy(() => import('@/pages/RTConfigAdminPage/ui/RTConfigAdminPage').then(m => ({ default: m.RTConfigAdminPage })));
const ArenaMatchPage = lazy(() => import('@/pages/ArenaMatchPage/ui/ArenaMatchPage').then(m => ({ default: m.ArenaMatchPage })));
const InterviewPrepPage = lazy(() => import('@/pages/InterviewPrepPage/ui/InterviewPrepPage').then(m => ({ default: m.InterviewPrepPage })));
const InterviewPrepSessionPage = lazy(() => import('@/pages/InterviewPrepSessionPage/ui/InterviewPrepSessionPage').then(m => ({ default: m.InterviewPrepSessionPage })));
const InterviewPrepMockSessionPage = lazy(() => import('@/pages/InterviewPrepMockSessionPage/ui/InterviewPrepMockSessionPage').then(m => ({ default: m.InterviewPrepMockSessionPage })));
const InterviewPrepAdminPage = lazy(() => import('@/pages/InterviewPrepAdminPage/ui/InterviewPrepAdminPage').then(m => ({ default: m.InterviewPrepAdminPage })));

// Shared loading fallback
const LoadingFallback: React.FC = () => (
  <div className="flex-center full-height" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
    <div>Загрузка...</div>
  </div>
);


class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
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

  // Show global loading only on initial load
  if (isLoading) {
    return <LoadingFallback />;
  }

  // Redirect authenticated users away from login
  if (isAuthenticated && !needsProfileComplete) {
    // User is fully authenticated, proceed to routes
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <LoginPage />
            ) : needsProfileComplete ? (
              <Navigate to="/complete-registration" replace />
            ) : (
              <Navigate to="/feed" replace />
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
              <Navigate to="/feed" replace />
            ) : (
              <CompleteRegistrationPage />
            )
          }
        />

        {/* Protected routes with layout */}
        <Route element={<PageLayout />}>
          <Route path="/feed" element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <FeedPage />} />
          <Route path="/circles" element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <CirclesPage />} />
          <Route path="/users" element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <UsersPage />} />
          <Route path="/search" element={<Navigate to="/users" replace />} />
          <Route path="/events" element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <EventsPage />} />
          <Route path="/vacancies" element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <VacanciesPage />} />
          <Route path="/map" element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <MapPage />} />
          <Route path="/profile" element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <ProfilePage />} />
          <Route path="/profile/:userId" element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <ProfilePage />} />

          <Route
            path="/code-rooms"
            element={
              <InviteHandler>
                {!isAuthenticated && !needsProfileComplete ? (
                  <CodeRoomsPage />
                ) : needsProfileComplete ? (
                  <Navigate to="/complete-registration" replace />
                ) : (
                  <CodeRoomsPage />
                )}
              </InviteHandler>
            }
          />

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
            path="/interview-prep"
            element={!isAuthenticated || needsProfileComplete ? (
              <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} />
            ) : (
              <InterviewPrepPage />
            )}
          />

          <Route
            path="/interview-prep/:sessionId"
            element={!isAuthenticated || needsProfileComplete ? (
              <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} />
            ) : (
              <InterviewPrepSessionPage />
            )}
          />

          <Route
            path="/interview-prep/mock/:sessionId"
            element={!isAuthenticated || needsProfileComplete ? (
              <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} />
            ) : (
              <InterviewPrepMockSessionPage />
            )}
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

        {/* Wildcard - handle invites */}
        <Route
          path="*"
          element={<RootPageWithInvite />}
        />
      </Routes>
      </ErrorBoundary>
    </Suspense>
  );
};

// Helper component for auth redirects
const NavigateToAuth: React.FC<{ isAuthenticated: boolean; needsProfileComplete: boolean }> = ({ isAuthenticated, needsProfileComplete }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsProfileComplete) return <Navigate to="/complete-registration" replace />;
  return <Navigate to="/feed" replace />;
};

// Компонент для обработки invite ссылки
const InviteHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const { isAuthenticated, isLoading } = useAuth();

  const { redirectTo, isProcessing, needsGuestName, getGuestName, setGuestName, cancelGuestName } = useInviteHandler(
    { isAuthenticated, isLoading },
    inviteCode,
    '/code-rooms',
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

// Компонент для главной страницы с поддержкой invite
const RootPageWithInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const { isAuthenticated, isLoading, needsProfileComplete } = useAuth();

  const fallbackRedirect = useMemo(
    () => {
      if (!isAuthenticated) return '/login';
      if (needsProfileComplete) return '/complete-registration';
      return '/feed';
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

  return <Navigate to="/feed" replace />;
};
