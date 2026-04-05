import React from 'react';
import { AuthProvider } from './providers/AuthProvider';
import { PodcastProvider } from './providers/PodcastProvider';
import { RouterProvider } from './providers/RouterProvider';
import { RuntimeConfigProvider } from './providers/RuntimeConfigProvider';
import '@/app/styles/index.css';

export const App: React.FC = () => {
  return (
    <RuntimeConfigProvider>
      <AuthProvider>
        <PodcastProvider>
          <RouterProvider />
        </PodcastProvider>
      </AuthProvider>
    </RuntimeConfigProvider>
  );
};
