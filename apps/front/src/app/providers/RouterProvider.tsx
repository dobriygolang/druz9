import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './AuthProvider';
import { CompleteRegistrationPage } from '@/pages/CompleteRegistrationPage/ui/CompleteRegistrationPage';
import { EventsPage } from '@/pages/EventsPage/ui/EventsPage';
import { FeedPage } from '@/pages/FeedPage/ui/FeedPage';
import { LoginPage } from '@/pages/LoginPage/ui/LoginPage';
import { MapPage } from '@/pages/MapPage/ui/MapPage';
import { ProfilePage } from '@/pages/ProfilePage/ui/ProfilePage';
import { UsersPage } from '@/pages/UsersPage/ui/UsersPage';
import { VacanciesPage } from '@/pages/VacanciesPage/ui/VacanciesPage';
import { RoomsPage } from '@/pages/RoomsPage/ui/RoomsPage';
import { RoomPage } from '@/pages/RoomPage/ui/RoomPage';
import { PageLayout } from '@/widgets/PageLayout/ui/PageLayout';

export const RouterProvider: React.FC = () => {
  const { needsProfileComplete, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div
        className="flex-center full-height"
        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}
      >
        <div>Загрузка...</div>
      </div>
    );
  }

  return (
    <Routes>
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

      <Route element={<PageLayout />}>
        <Route
          path="/feed"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : needsProfileComplete ? (
              <Navigate to="/complete-registration" replace />
            ) : (
              <FeedPage />
            )
          }
        />
        <Route
          path="/users"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : needsProfileComplete ? (
              <Navigate to="/complete-registration" replace />
            ) : (
              <UsersPage />
            )
          }
        />
        <Route path="/search" element={<Navigate to="/users" replace />} />
        <Route
          path="/events"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : needsProfileComplete ? (
              <Navigate to="/complete-registration" replace />
            ) : (
              <EventsPage />
            )
          }
        />
        <Route
          path="/vacancies"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : needsProfileComplete ? (
              <Navigate to="/complete-registration" replace />
            ) : (
              <VacanciesPage />
            )
          }
        />
        <Route
          path="/map"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : needsProfileComplete ? (
              <Navigate to="/complete-registration" replace />
            ) : (
              <MapPage />
            )
          }
        />
        <Route
          path="/profile"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : needsProfileComplete ? (
              <Navigate to="/complete-registration" replace />
            ) : (
              <ProfilePage />
            )
          }
        />
        <Route
          path="/profile/:userId"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : needsProfileComplete ? (
              <Navigate to="/complete-registration" replace />
            ) : (
              <ProfilePage />
            )
          }
        />
        <Route
          path="/rooms"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : needsProfileComplete ? (
              <Navigate to="/complete-registration" replace />
            ) : (
              <RoomsPage />
            )
          }
        />
        <Route
          path="/rooms/:roomId"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : needsProfileComplete ? (
              <Navigate to="/complete-registration" replace />
            ) : (
              <RoomPage />
            )
          }
        />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={
              isAuthenticated
                ? needsProfileComplete
                  ? '/complete-registration'
                  : '/feed'
                : '/login'
            }
            replace
          />
        }
      />
    </Routes>
  );
};
