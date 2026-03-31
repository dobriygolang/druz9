import React, { Suspense, lazy, useMemo } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { PageLayout } from '@/widgets/PageLayout/ui/PageLayout';
import { GuestNameModal } from '@/features/CodeRoom/ui/GuestNameModal';
import { useInviteHandler } from '@/shared/hooks/useInviteHandler';
import { ENV } from '@/shared/config/env';

// Lazy load pages for better bundle size
const LoginPage = lazy(() => import('@/pages/LoginPage/ui/LoginPage').then(m => ({ default: m.LoginPage })));
const CompleteRegistrationPage = lazy(() => import('@/pages/CompleteRegistrationPage/ui/CompleteRegistrationPage').then(m => ({ default: m.CompleteRegistrationPage })));
const FeedPage = lazy(() => import('@/pages/FeedPage/ui/FeedPage').then(m => ({ default: m.FeedPage })));
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

// Shared loading fallback
const LoadingFallback: React.FC = () => (
  <div className="flex-center full-height" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
    <div>Загрузка...</div>
  </div>
);

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
            path="/admin/code-tasks"
            element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <CodeTasksAdminPage />}
          />
          <Route
            path="/admin/config"
            element={!isAuthenticated || needsProfileComplete ? <NavigateToAuth isAuthenticated={isAuthenticated} needsProfileComplete={needsProfileComplete} /> : <RTConfigAdminPage />}
          />
        </Route>

        {/* Wildcard - handle invites */}
        <Route
          path="*"
          element={<RootPageWithInvite />}
        />
      </Routes>
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
