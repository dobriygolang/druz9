import React from 'react';
import { AuthProvider } from './providers/AuthProvider';
import { PodcastProvider } from './providers/PodcastProvider';
import { RouterProvider } from './providers/RouterProvider';
import '@/app/styles/index.css';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <PodcastProvider>
        <RouterProvider />
      </PodcastProvider>
    </AuthProvider>
  );
};
