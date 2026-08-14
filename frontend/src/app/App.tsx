import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

import Sidebar from '../widgets/sidebar/ui/Sidebar';
import EditProfileModal from '../features/profile/ui/EditProfileModal';
import { ShareModal } from '../features/posts/ui/ShareModal';
import DeviceLockGate from '../features/profile/ui/security/DeviceLockGate';
import MessageToastViewport from '../features/chat/ui/MessageToastViewport';

import { useUIStore } from '../shared/model/useUIStore';
import { useAuthStore } from '../shared/model/useAuthStore';

const FeedPage = lazy(() => import('../pages/Feed/Feed'));
const ProfilePage = lazy(() => import('../pages/Profile/Profile'));
const MessengerPage = lazy(() => import('../pages/Chat/Messenger'));
const LoginPage = lazy(() =>
  import('../pages/Login/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('../pages/Register/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('../pages/Forgot-Password/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);

function PageFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
    </div>
  );
}

function CenteredPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full justify-center py-8">
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
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <DeviceLockGate>
      <div className="flex min-h-screen overflow-x-hidden bg-[#0b0b0c] font-sans text-gray-200 antialiased">
        {!isMessengerRoute && <Sidebar />}

        <EditProfileModal />
        <ShareModal />
        {!isMessengerRoute && <MessageToastViewport />}

        <main
          className={
            isMessengerRoute
              ? 'min-h-screen flex-1'
              : `flex min-h-screen flex-1 justify-center py-8 transition-all duration-300 ${
                  isSidebarExpanded ? 'pl-[232px]' : 'pl-24'
                }`
          }
        >
          <Suspense fallback={<PageFallback />}>
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
                    <div className="animate-fadeIn py-20 text-center text-gray-500">
                      Search page under development...
                    </div>
                  </CenteredPage>
                }
              />
              <Route
                path="/reels"
                element={
                  <CenteredPage>
                    <div className="animate-fadeIn py-20 text-center text-gray-500">
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
                    <div className="animate-fadeIn py-20 text-center text-gray-500">
                      List of your notifications
                    </div>
                  </CenteredPage>
                }
              />
              <Route
                path="/create"
                element={
                  <CenteredPage>
                    <div className="animate-fadeIn py-20 text-center text-gray-500">
                      Quickly create a publication...
                    </div>
                  </CenteredPage>
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </DeviceLockGate>
  );
}
