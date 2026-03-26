import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar';
import { BottomNav } from '@/widgets/BottomNav/ui/BottomNav';
import { PodcastPlayer } from '@/features/Podcast/ui/PodcastPlayer';

export const PageLayout: React.FC = () => {
  const location = useLocation();
  const isRoomView = /^\/rooms\/[^/]+$/.test(location.pathname);

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className={isRoomView ? 'content-wrapper content-wrapper-wide' : 'content-wrapper'}>
          <Outlet />
        </div>
      </main>
      <BottomNav />
      <PodcastPlayer />
    </div>
  );
};
