import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from '../widgets/sidebar/ui/Sidebar';
import EditProfileModal from '../features/profile/ui/EditProfileModal';
import FeedPage from '../pages/Feed/Feed';
import ProfilePage from '../pages/Profile/Profile';
import { LoginPage } from '../pages/Login/LoginPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { ForgotPasswordPage } from '../pages/Forgot-Password/ForgotPasswordPage';

import { useUIStore } from '../shared/model/useUIStore';

const isAuthenticated = false;

export default function App() {
  const isSidebarExpanded = useUIStore((state) => state.isSidebarExpanded);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0b0b0c] text-gray-200 font-sans antialiased overflow-x-hidden">
      <Sidebar />

      <EditProfileModal />

      <main
        className={`flex-1 min-h-screen py-8 flex justify-center transition-all duration-300 ${
          isSidebarExpanded ? 'pl-72' : 'pl-28'
        }`}
      >
        <div className="w-full max-w-2xl px-4">
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/:username" element={<ProfilePage />} />

            <Route
              path="/search"
              element={
                <div className="text-center py-20 text-gray-500 animate-fadeIn">
                  Сторінка пошуку в розробці...
                </div>
              }
            />
            <Route
              path="/explore"
              element={
                <div className="text-center py-20 text-gray-500 animate-fadeIn">
                  Сторінка цікавого контенту...
                </div>
              }
            />
            <Route
              path="/messages"
              element={
                <div className="text-center py-20 text-gray-500 animate-fadeIn">
                  Приватні повідомлення користувачів...
                </div>
              }
            />
            <Route
              path="/notifications"
              element={
                <div className="text-center py-20 text-gray-500 animate-fadeIn">
                  Список ваших повідомлень (Колокольчик 🔔)
                </div>
              }
            />
            <Route
              path="/create"
              element={
                <div className="text-center py-20 text-gray-500 animate-fadeIn">
                  Швидке створення публікації...
                </div>
              }
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}
