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
  const isHomeRoute = location.pathname === '/home';
  const isCodeRoom = /^\/code-rooms\/[^/]+$/.test(location.pathname);
  const isArenaMatch = /^\/arena\/[^/]+$/.test(location.pathname);
  const isInterviewPrepSession = /^\/interview-prep\/[^/]+$/.test(location.pathname) || /^\/growth\/interview-prep\/[^/]+$/.test(location.pathname);
  const isInterviewPrepMock = /^\/interview-prep\/mock\/[^/]+$/.test(location.pathname) || /^\/growth\/interview-prep\/mock\/[^/]+$/.test(location.pathname);
  const isCodeRoomsDashboard = location.pathname === '/code-rooms' || location.pathname === '/practice/code-rooms';
  const isCodeTasksAdmin = location.pathname === '/admin/code-tasks';
  const isAdminRoute = location.pathname.startsWith('/admin/');
  const isGuestCodeRoomsSurface = !isAuthenticated && isCodeRoomsDashboard;
  const showShell = !isCodeRoom && !isArenaMatch && !isGuestCodeRoomsSurface;
  const contentClassName = isArenaMatch
    ? 'content-wrapper content-wrapper-code-room'
    : isCodeTasksAdmin || isCodeRoom || isInterviewPrepSession || isInterviewPrepMock
      ? 'content-wrapper content-wrapper-wide'
      : `content-wrapper${isHomeRoute ? ' content-wrapper--home' : ''}`;

  return (
    <div className={`app-container${isAdminRoute ? ' app-container--admin' : ''}${isHomeRoute ? ' app-container--home' : ''}`}>
      {showShell && <Sidebar isAdmin={isAdminRoute} isHome={isHomeRoute} />}
      <main className={isCodeRoom || isArenaMatch || isInterviewPrepSession || isInterviewPrepMock ? 'main-content main-content-code-room' : `main-content${isAdminRoute ? ' main-content--admin' : ''}${isHomeRoute ? ' main-content--home' : ''}`}>
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
