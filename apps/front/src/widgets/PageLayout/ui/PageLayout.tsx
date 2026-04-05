import React, { Suspense, lazy } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { usePodcast } from '@/app/providers/PodcastProvider';
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar';
import { BottomNav } from '@/widgets/BottomNav/ui/BottomNav';

const PodcastPlayer = lazy(() => import('@/features/Podcast/ui/PodcastPlayer').then((m) => ({ default: m.PodcastPlayer })));

export const PageLayout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { currentPodcast } = usePodcast();

  const isAdminRoute = location.pathname.startsWith('/admin/');
  const isCodeRoom = /^\/code-rooms\/[^/]+$/.test(location.pathname);
  const isArenaMatch = /^\/arena\/[^/]+$/.test(location.pathname);
  const isInterviewPrepSession =
    /^\/interview-prep\/[^/]+$/.test(location.pathname) ||
    /^\/growth\/interview-prep\/[^/]+$/.test(location.pathname);
  const isInterviewPrepMock =
    /^\/interview-prep\/mock\/[^/]+$/.test(location.pathname) ||
    /^\/growth\/interview-prep\/mock\/[^/]+$/.test(location.pathname);
  const isCodeRoomsDashboard =
    location.pathname === '/code-rooms' || location.pathname === '/practice/code-rooms';
  const isGuestCodeRoomsSurface = !isAuthenticated && isCodeRoomsDashboard;

  // Fullscreen dark sessions — keep dark theme
  const isFullscreenDark = isCodeRoom || isArenaMatch;

  // Shell is hidden for fullscreen dark sessions and guest code rooms
  const showShell = !isFullscreenDark && !isGuestCodeRoomsSurface;

  // All non-admin, non-fullscreen pages get the LUNARIS light shell
  const isLightShell = !isAdminRoute && !isFullscreenDark;

  const contentClassName = isArenaMatch
    ? 'content-wrapper content-wrapper-code-room'
    : isCodeRoom || isInterviewPrepSession || isInterviewPrepMock
      ? 'content-wrapper content-wrapper-wide'
      : isAdminRoute
        ? 'content-wrapper content-wrapper-wide'
        : 'content-wrapper content-wrapper--home';

  const mainClassName = [
    isFullscreenDark ? 'main-content-code-room' : 'main-content',
    isAdminRoute ? ' main-content--admin' : '',
    isLightShell && !isFullscreenDark ? ' main-content--home' : '',
  ].join('');

  return (
    <div
      className={[
        'app-container',
        isAdminRoute ? ' app-container--admin' : '',
        isLightShell ? ' app-container--home' : '',
        isFullscreenDark ? ' app-dark' : '',
      ].join('')}
    >
      {showShell && (
        <Sidebar
          isAdmin={isAdminRoute}
          isLight={isLightShell}
        />
      )}
      <main className={mainClassName}>
        <div className={contentClassName}>
          <Outlet />
        </div>
      </main>
      {isAuthenticated && <BottomNav />}
      {showShell && currentPodcast && (
        <Suspense fallback={null}>
          <PodcastPlayer />
        </Suspense>
      )}
    </div>
  );
};
