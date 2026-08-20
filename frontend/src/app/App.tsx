import React, { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

import Sidebar from '../widgets/sidebar/ui/Sidebar';
import { UndoHideSnackbar } from '../features/posts/ui/UndoHideSnackbar';
import { UndoClearHistorySnackbar } from '../features/chat/ui/UndoClearHistorySnackbar';
import DeviceLockGate from '../features/profile/ui/security/DeviceLockGate';
import MessageToastViewport from '../features/chat/ui/MessageToastViewport';
import FloatingVideoNotePiP from '../features/chat/ui/FloatingVideoNotePiP';

import { useUIStore } from '../shared/model/useUIStore';
import { useAuthStore } from '../shared/model/useAuthStore';

const EditProfileModal = lazy(() => import('../features/profile/ui/EditProfileModal'));
const ShareModal = lazy(() =>
  import('../features/posts/ui/ShareModal').then((m) => ({ default: m.ShareModal })),
);
const CommentModal = lazy(() =>
  import('../features/comment/ui/CommentModal').then((m) => ({ default: m.CommentModal })),
);

const FeedPage = lazy(() => import('../pages/Feed/Feed'));
const ProfilePage = lazy(() => import('../pages/Profile/Profile'));
const MessengerPage = lazy(() => import('../pages/Chat/Messenger'));
const StandaloneChatPage = lazy(() => import('../pages/Chat/StandaloneChatPage'));
const SearchPage = lazy(() => import('../pages/Search/SearchPage'));
const NotificationsPage = lazy(() =>
  import('../pages/Notifications/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
);
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

import { OnlineFriendsSidebar } from '../widgets/sidebar/ui/OnlineFriendsSidebar';
import { usePresenceSync } from '../features/chat/model/usePresence';
import { useDynamicTabBadge } from '../shared/lib/useDynamicTabBadge';

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

function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full justify-center gap-8 py-8 px-4">
      <div className="w-full max-w-2xl">{children}</div>
      <OnlineFriendsSidebar />
    </div>
  );
}

export default function App() {
  const isSidebarExpanded = useUIStore((state) => state.isSidebarExpanded);
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  usePresenceSync();
  useDynamicTabBadge();

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-white">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  const isMessengerRoute =
    location.pathname.startsWith('/messages') || location.pathname.startsWith('/messenger');

  return (
    <DeviceLockGate>
      <div className="relative min-h-screen bg-[#070709] text-white">
        {!isMessengerRoute && <Sidebar />}
        <Suspense fallback={null}>
          <EditProfileModal />
          <ShareModal />
          <CommentModal />
        </Suspense>
        <UndoHideSnackbar />
        <UndoClearHistorySnackbar />
        <FloatingVideoNotePiP />
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
                  <FeedLayout>
                    <FeedPage />
                  </FeedLayout>
                }
              />
              <Route
                path="/feed"
                element={
                  <FeedLayout>
                    <FeedPage />
                  </FeedLayout>
                }
              />

              <Route
                path="/profile"
                element={
                  <CenteredPage>
                    <ProfilePage />
                  </CenteredPage>
                }
              />
              <Route
                path="/profile/:username"
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
                    <SearchPage />
                  </CenteredPage>
                }
              />
              <Route
                path="/explore"
                element={
                  <CenteredPage>
                    <SearchPage />
                  </CenteredPage>
                }
              />

              <Route
                path="/explore"
                element={
                  <CenteredPage>
                    <SearchPage />
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

              <Route path="/messages/standalone/:conversationId" element={<StandaloneChatPage />} />
              <Route path="/chat/standalone/:conversationId" element={<StandaloneChatPage />} />
              <Route path="/messages" element={<MessengerPage />} />
              <Route path="/messages/:conversationId" element={<MessengerPage />} />

              <Route
                path="/notifications"
                element={
                  <CenteredPage>
                    <NotificationsPage />
                  </CenteredPage>
                }
              />
              <Route
                path="/create"
                element={
                  <CenteredPage>
                    <FeedPage />
                  </CenteredPage>
                }
              />

              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="/forgot-password" element={<Navigate to="/" replace />} />

              <Route
                path="/:username"
                element={
                  <CenteredPage>
                    <ProfilePage />
                  </CenteredPage>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </DeviceLockGate>
  );
}
