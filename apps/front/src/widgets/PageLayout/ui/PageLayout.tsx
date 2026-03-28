import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar';
import { BottomNav } from '@/widgets/BottomNav/ui/BottomNav';
import { PodcastPlayer } from '@/features/Podcast/ui/PodcastPlayer';

export const PageLayout: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isCodeRoom = /^\/code-rooms\/[^/]+$/.test(location.pathname);
  const isArenaMatch = /^\/arena\/[^/]+$/.test(location.pathname);
  const isCodeRoomsDashboard = location.pathname === '/code-rooms';
  const isCodeTasksAdmin = location.pathname === '/admin/code-tasks';
  const isGuestCodeRoomsSurface = !isAuthenticated && isCodeRoomsDashboard;
  const showShell = !isCodeRoom && !isArenaMatch && !isGuestCodeRoomsSurface;
  const contentClassName = isArenaMatch
    ? 'content-wrapper content-wrapper-code-room'
    : isCodeTasksAdmin || isCodeRoom
      ? 'content-wrapper content-wrapper-wide'
      : 'content-wrapper';

  return (
    <div className="app-container">
      {showShell && <Sidebar />}
      <main className={isCodeRoom || isArenaMatch ? 'main-content main-content-code-room' : 'main-content'}>
        <div className={contentClassName}>
          <Outlet />
        </div>
      </main>
      {isAuthenticated && <BottomNav />}
      {showShell && <PodcastPlayer />}
    </div>
  );
};
