import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

import Sidebar from '../widgets/sidebar/ui/Sidebar';
import EditProfileModal from '../features/profile/ui/EditProfileModal';
import DeviceLockGate from '../features/profile/ui/security/DeviceLockGate';

import FeedPage from '../pages/Feed/Feed';
import ProfilePage from '../pages/Profile/Profile';
import MessengerPage from '../pages/Chat/Messenger';
import MessageToastViewport from '../features/chat/ui/MessageToastViewport';
import { LoginPage } from '../pages/Login/LoginPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { ForgotPasswordPage } from '../pages/Forgot-Password/ForgotPasswordPage';

import { useUIStore } from '../shared/model/useUIStore';
import { useAuthStore } from '../shared/model/useAuthStore';

// const isAuthenticated = true;

function CenteredPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full py-8 flex justify-center">
      <div className="w-full max-w-2xl px-4">{children}</div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const isSidebarExpanded = useUIStore((state) => state.isSidebarExpanded);
  const location = useLocation();
  const isMessengerRoute = location.pathname.startsWith('/messages');

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
    <DeviceLockGate>
      <div className="flex min-h-screen bg-[#0b0b0c] text-gray-200 font-sans antialiased overflow-x-hidden">
        {!isMessengerRoute && <Sidebar />}

        <EditProfileModal />
        {!isMessengerRoute && <MessageToastViewport />}

        <main
          className={
            isMessengerRoute
              ? 'flex-1 min-h-screen'
              : `flex-1 min-h-screen py-8 flex justify-center transition-all duration-300 ${
                  isSidebarExpanded ? 'pl-[232px]' : 'pl-24'
                }`
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <CenteredPage>
                  <FeedPage />
                </CenteredPage>
              }
            />
            <Route
              path="/:username"
              element={
                <CenteredPage>
                  <ProfilePage />
                </CenteredPage>
              }
            />

            <Route
              path="/search"
              element={
                <CenteredPage>
                  <div className="text-center py-20 text-gray-500 animate-fadeIn">
                    Search page under development...
                  </div>
                </CenteredPage>
              }
            />
            <Route
              path="/reels"
              element={
                <CenteredPage>
                  <div className="text-center py-20 text-gray-500 animate-fadeIn">
                    Reels page under development...
                  </div>
                </CenteredPage>
              }
            />

            <Route path="/messages" element={<MessengerPage />} />
            <Route path="/messages/:conversationId" element={<MessengerPage />} />

            <Route
              path="/notifications"
              element={
                <CenteredPage>
                  <div className="text-center py-20 text-gray-500 animate-fadeIn">
                    List of your notifications
                  </div>
                </CenteredPage>
              }
            />
            <Route
              path="/create"
              element={
                <CenteredPage>
                  <div className="text-center py-20 text-gray-500 animate-fadeIn">
                    Quickly create a publication...
                  </div>
                </CenteredPage>
              }
            />
          </Routes>
        </main>
      </div>
    </DeviceLockGate>
  );
}
