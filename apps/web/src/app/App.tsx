import React, { lazy, Suspense, useMemo } from 'react';
import { useLocation, Navigate, Routes, Route } from 'react-router-dom';

import Sidebar from '../widgets/sidebar/ui/Sidebar';
import DeviceLockGate from '../features/profile/ui/security/DeviceLockGate';
import MessageToastViewport from '../features/chat/ui/MessageToastViewport';
import { CallProvider } from '../features/chat/model/CallProvider';
import { OfflineBanner } from '../shared/ui/OfflineBanner';
import { lazyWithRetry } from '../shared/lib/lazyWithRetry';

import { useUIStore } from '../shared/model/useUIStore';
import { useAuthStore } from '../shared/model/useAuthStore';
import { useSpotifyPlayerStore } from '../shared/model/useSpotifyPlayerStore';
const SpotifyBottomDock = lazyWithRetry(() =>
  import('../widgets/player/SpotifyBottomDock').then((m) => ({ default: m.SpotifyBottomDock })),
);
const SpotifyLyricsModal = lazyWithRetry(() =>
  import('../widgets/player/SpotifyLyricsModal').then((m) => ({ default: m.SpotifyLyricsModal })),
);
const SpotifyMobilePlayerSheet = lazyWithRetry(() =>
  import('../widgets/player/SpotifyMobilePlayerSheet').then((m) => ({
    default: m.SpotifyMobilePlayerSheet,
  })),
);
const SpotifyGameModePlayer = lazyWithRetry(() =>
  import('../widgets/player/SpotifyGameModePlayer').then((m) => ({
    default: m.SpotifyGameModePlayer,
  })),
);

const EditProfileModal = lazyWithRetry(() => import('../features/profile/ui/EditProfileModal'));
const ShareModal = lazyWithRetry(() =>
  import('../features/posts/ui/ShareModal').then((m) => ({ default: m.ShareModal })),
);
const CommentModal = lazyWithRetry(() =>
  import('@/widgets/comment').then((m) => ({ default: m.CommentModal })),
);
const CreateReelModal = lazyWithRetry(() =>
  import('../features/reels/ui/CreateReelModal').then((m) => ({ default: m.CreateReelModal })),
);
const StoryViewerModal = lazy(() =>
  import('../features/stories/ui/StoryViewerModal').then((m) => ({ default: m.StoryViewerModal })),
);
const StoryEditorModal = lazy(() =>
  import('../features/stories/ui/StoryEditorModal').then((m) => ({ default: m.StoryEditorModal })),
);
const UndoHideSnackbar = lazy(() =>
  import('../features/posts/ui/UndoHideSnackbar').then((m) => ({ default: m.UndoHideSnackbar })),
);
const UndoClearHistorySnackbar = lazy(() =>
  import('../features/chat/ui/UndoClearHistorySnackbar').then((m) => ({
    default: m.UndoClearHistorySnackbar,
  })),
);
const FloatingVideoNotePiP = lazy(() => import('../features/chat/ui/FloatingVideoNotePiP'));
const ReactionBurstCanvas = lazy(() => import('../features/chat/ui/ReactionBurstCanvas'));
const CallModal = lazy(() =>
  import('../features/chat/ui/Call/CallModal').then((m) => ({ default: m.CallModal })),
);
const IncomingCallToast = lazy(() =>
  import('../features/chat/ui/Call/IncomingCallToast').then((m) => ({
    default: m.IncomingCallToast,
  })),
);
const PictureInPicture = lazy(() =>
  import('../features/chat/ui/Call/PictureInPicture').then((m) => ({
    default: m.PictureInPicture,
  })),
);

const FeedPage = lazy(() => import('../pages/Feed/Feed'));
const ProfilePage = lazy(() => import('../pages/Profile/Profile'));
const MessengerPage = lazy(() => import('../pages/Chat/Messenger'));
const MusicHubPage = lazy(() => import('../pages/Music/MusicHubPage'));
const StandaloneChatPage = lazy(() => import('../pages/Chat/StandaloneChatPage'));
const SearchPage = lazy(() => import('../pages/Search/SearchPage'));
const ReelsPage = lazy(() => import('../pages/Reels/ReelsPage'));
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
const PrivacyPage = lazy(() => import('../pages/Privacy/PrivacyPage'));
const TermsPage = lazy(() => import('../pages/Terms/TermsPage'));
const ApplicantCandidatePrivacyPage = lazy(
  () => import('../pages/Terms/ApplicantCandidatePrivacyPage'),
);
const CookiePolicyPage = lazy(() => import('../pages/Terms/CookiePolicyPage'));
const RegionalPrivacyPage = lazy(() => import('../pages/Terms/RegionalPrivacyPage'));
const RetentionPolicyPage = lazy(() => import('../pages/Terms/RetentionPolicyPage'));
const DataPrivacyControlsPage = lazy(() => import('../pages/Terms/DataPrivacyControlsPage'));
const YourDataPackagePage = lazy(() => import('../pages/Terms/YourDataPackagePage'));
const CopyrightPolicyPage = lazy(() => import('../pages/Terms/CopyrightPolicyPage'));
const PaidServicesPage = lazy(() => import('../pages/Terms/PaidServicesPage'));
const LawEnforcementPage = lazy(() => import('../pages/Safety/LawEnforcementPage'));
const DeveloperTermsPage = lazy(() => import('../pages/Terms/DeveloperTermsPage'));
const NotFoundPage = lazy(() => import('../pages/NotFound/NotFoundPage'));
const GuidelinesPage = lazy(() => import('../pages/Guidelines/GuidelinesPage'));
const AcknowledgementsPage = lazy(() => import('../pages/Acknowledgements/AcknowledgementsPage'));
const LicensesPage = lazy(() => import('../pages/Licenses/LicensesPage'));
const CompanyInformationPage = lazy(() => import('../pages/Company/CompanyInformationPage'));
const CompanyAboutPage = lazy(() => import('../pages/Company/CompanyAboutPage'));
const CareersPage = lazy(() => import('../pages/Company/CareersPage'));
const BrandingPage = lazy(() => import('../pages/Brand/BrandingPage'));
const DownloadPage = lazy(() => import('../pages/Download/DownloadPage'));
const NewsroomPage = lazy(() => import('../pages/Newsroom/NewsroomPage'));
const BlogPage = lazy(() => import('../pages/Blog/BlogPage'));
const CategoryPage = lazy(() => import('../pages/Blog/CategoryPage'));
const FamilyCenterPage = lazy(() =>
  import('../pages/Safety/FamilyCenterPage').then((m) => ({ default: m.FamilyCenterPage })),
);
const SafetyCenterPage = lazy(() =>
  import('../pages/Safety/SafetyCenterPage').then((m) => ({ default: m.SafetyCenterPage })),
);
const SafetyLibraryPage = lazy(() =>
  import('../pages/Safety/SafetyLibraryPage').then((m) => ({ default: m.SafetyLibraryPage })),
);
const PrivacyHubPage = lazy(() =>
  import('../pages/Safety/PrivacyHubPage').then((m) => ({ default: m.PrivacyHubPage })),
);
const TransparencyHubPage = lazy(() =>
  import('../pages/Safety/TransparencyHubPage').then((m) => ({ default: m.TransparencyHubPage })),
);
const SafetyNewsHubPage = lazy(() =>
  import('../pages/Safety/SafetyNewsHubPage').then((m) => ({ default: m.SafetyNewsHubPage })),
);
const PolicyHubPage = lazy(() =>
  import('../pages/Safety/PolicyHubPage').then((m) => ({ default: m.PolicyHubPage })),
);
const TeenCharterPage = lazy(() =>
  import('../pages/Safety/TeenCharterPage').then((m) => ({ default: m.TeenCharterPage })),
);
const WellbeingHubPage = lazy(() =>
  import('../pages/Safety/WellbeingHubPage').then((m) => ({ default: m.WellbeingHubPage })),
);
const CreatorsPage = lazy(() =>
  import('../pages/Creators/CreatorsPage').then((m) => ({ default: m.CreatorsPage })),
);

const OnlineFriendsSidebar = lazy(() =>
  import('../widgets/sidebar/ui/OnlineFriendsSidebar').then((m) => ({
    default: m.OnlineFriendsSidebar,
  })),
);
import { usePresenceSync } from '../features/chat/model/usePresence';
import { useDynamicTabBadge, useNotificationRealtime } from '@/entities/notification';
import { ScrollToTop } from '../shared/lib/ScrollToTop';
import { useStoriesRealtime } from '../features/stories/model/useStoriesRealtime';
const OAuthCallbackHandler = lazy(() => import('../pages/OAuth/OAuthCallbackHandler'));

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

function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full justify-center py-8 px-4">{children}</div>;
}

function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full justify-center gap-8 py-8 px-4">
      <div className="w-full max-w-2xl">{children}</div>
      <Suspense fallback={null}>
        <OnlineFriendsSidebar />
      </Suspense>
    </div>
  );
}

export default function App() {
  const isSidebarExpanded = useUIStore((state) => state.isSidebarExpanded);
  const isEditProfileOpen = useUIStore((state) => state.isEditProfileOpen);
  const isShareModalOpen = useUIStore((state) => state.isShareModalOpen);
  const isCommentModalOpen = useUIStore((state) => state.isCommentModalOpen);
  const isCreateReelOpen = useUIStore((state) => state.isCreateReelOpen);
  const closeCreateReel = useUIStore((state) => state.closeCreateReel);
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  usePresenceSync();
  useDynamicTabBadge();
  useNotificationRealtime();
  useStoriesRealtime();

  // Initialize Spotify Web Playback SDK lazily only if user was actively playing across session restore
  React.useEffect(() => {
    const store = useSpotifyPlayerStore.getState();
    if (isAuthenticated && store.currentTrack && store.isPlaying) {
      store.initSpotifySDK();
    }
  }, [isAuthenticated]);

  const isSpotifyDockVisible = useSpotifyPlayerStore((s) => s.isDockVisible);
  const isSpotifyDockMinimized = useSpotifyPlayerStore((s) => s.isDockMinimized);
  const isGameModeOpen = useSpotifyPlayerStore((s) => s.isGameModeOpen);

  // Preserve scroll position when entering/leaving Game Mode
  const savedScrollYRef = React.useRef(0);

  React.useEffect(() => {
    if (isGameModeOpen) {
      savedScrollYRef.current = window.scrollY;
    } else if (savedScrollYRef.current > 0) {
      // Double RAF ensures layout reconciliation after remounting before restoring scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, savedScrollYRef.current);
        });
      });
    }
  }, [isGameModeOpen]);

  const isOAuthCallback = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (
      params.has('code') ||
      params.has('error') ||
      location.pathname.includes('/callback') ||
      location.pathname.startsWith('/api/auth/') ||
      location.pathname.startsWith('/integrations/') ||
      location.pathname.startsWith('/auth/')
    );
  }, [location.search, location.pathname]);

  const showOAuthCallback = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (
      isOAuthCallback &&
      (params.has('code') || params.has('error') || location.pathname.includes('/callback'))
    );
  }, [isOAuthCallback, location.search, location.pathname]);

  const isStandaloneRoute = useMemo(() => {
    return (
      location.pathname.startsWith('/music') ||
      location.pathname.startsWith('/playlist') ||
      location.pathname.startsWith('/track') ||
      location.pathname.startsWith('/messages') ||
      location.pathname.startsWith('/messenger') ||
      location.pathname.startsWith('/privacy') ||
      location.pathname.startsWith('/terms') ||
      location.pathname.startsWith('/copyright') ||
      location.pathname.startsWith('/dmca') ||
      location.pathname.startsWith('/developers') ||
      location.pathname.startsWith('/developer') ||
      location.pathname.startsWith('/guidelines') ||
      location.pathname.startsWith('/acknowledgements') ||
      location.pathname.startsWith('/licenses') ||
      location.pathname.startsWith('/licences') ||
      location.pathname.startsWith('/company-information') ||
      location.pathname.startsWith('/impressum') ||
      location.pathname.startsWith('/company') ||
      location.pathname.startsWith('/about') ||
      location.pathname.startsWith('/careers') ||
      location.pathname.startsWith('/jobs') ||
      location.pathname.startsWith('/branding') ||
      location.pathname.startsWith('/brand') ||
      location.pathname.startsWith('/download') ||
      location.pathname.startsWith('/newsroom') ||
      location.pathname.startsWith('/blog') ||
      location.pathname.startsWith('/category') ||
      location.pathname.startsWith('/safety-family-center') ||
      location.pathname.startsWith('/safety-library') ||
      location.pathname.startsWith('/safety-privacy') ||
      location.pathname.startsWith('/safety-law') ||
      location.pathname.startsWith('/safety-law-enforcement') ||
      location.pathname.startsWith('/law-enforcement') ||
      location.pathname.startsWith('/policies') ||
      location.pathname.startsWith('/teen-charter') ||
      location.pathname.startsWith('/wellbeing') ||
      location.pathname.startsWith('/404') ||
      location.pathname.startsWith('/faq') ||
      location.pathname.startsWith('/help-center') ||
      location.pathname.startsWith('/safety')
    );
  }, [location.pathname]);

  const isMessengerRoute = useMemo(() => {
    return (
      location.pathname.startsWith('/messages') ||
      location.pathname.startsWith('/messenger') ||
      location.pathname.startsWith('/chat/standalone')
    );
  }, [location.pathname]);

  const isReelsRoute = useMemo(() => {
    return location.pathname.startsWith('/reels');
  }, [location.pathname]);

  if (showOAuthCallback) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-white flex items-center justify-center">
        <Suspense fallback={<PageFallback />}>
          <OAuthCallbackHandler />
        </Suspense>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-white">
        <ScrollToTop />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route
              path="/terms/applicant-candidate-privacy-policy"
              element={<ApplicantCandidatePrivacyPage />}
            />
            <Route path="/terms/applicant-candidate" element={<ApplicantCandidatePrivacyPage />} />
            <Route path="/terms/cookie-policy" element={<CookiePolicyPage />} />
            <Route path="/terms/cookies" element={<CookiePolicyPage />} />
            <Route path="/terms/local-laws" element={<RegionalPrivacyPage />} />
            <Route path="/terms/regional-privacy" element={<RegionalPrivacyPage />} />
            <Route path="/privacy/regional" element={<RegionalPrivacyPage />} />
            <Route path="/terms/retention-policy" element={<RetentionPolicyPage />} />
            <Route path="/terms/retention" element={<RetentionPolicyPage />} />
            <Route path="/privacy/retention" element={<RetentionPolicyPage />} />
            <Route path="/terms/data-privacy-controls" element={<DataPrivacyControlsPage />} />
            <Route path="/terms/privacy-controls" element={<DataPrivacyControlsPage />} />
            <Route path="/privacy/controls" element={<DataPrivacyControlsPage />} />
            <Route path="/terms/your-eternal-data-package" element={<YourDataPackagePage />} />
            <Route path="/terms/data-package" element={<YourDataPackagePage />} />
            <Route path="/privacy/data-package" element={<YourDataPackagePage />} />
            <Route path="/copyright" element={<CopyrightPolicyPage />} />
            <Route path="/dmca" element={<CopyrightPolicyPage />} />
            <Route path="/terms/copyright" element={<CopyrightPolicyPage />} />
            <Route path="/terms/dmca" element={<CopyrightPolicyPage />} />
            <Route path="/terms/paid-services" element={<PaidServicesPage />} />
            <Route path="/terms/paid" element={<PaidServicesPage />} />
            <Route path="/terms/refunds" element={<PaidServicesPage />} />
            <Route path="/terms/refund-policy" element={<PaidServicesPage />} />
            <Route path="/safety-law-enforcement" element={<LawEnforcementPage />} />
            <Route path="/safety/law-enforcement" element={<LawEnforcementPage />} />
            <Route path="/safety/law" element={<LawEnforcementPage />} />
            <Route path="/law-enforcement" element={<LawEnforcementPage />} />
            <Route path="/terms/developer" element={<DeveloperTermsPage />} />
            <Route path="/terms/developers" element={<DeveloperTermsPage />} />
            <Route path="/developers" element={<DeveloperTermsPage />} />
            <Route path="/developer" element={<DeveloperTermsPage />} />
            <Route path="/guidelines" element={<GuidelinesPage />} />
            <Route path="/acknowledgements" element={<AcknowledgementsPage />} />
            <Route path="/licenses" element={<LicensesPage />} />
            <Route path="/licences" element={<LicensesPage />} />
            <Route path="/company-information" element={<CompanyInformationPage />} />
            <Route path="/impressum" element={<CompanyInformationPage />} />
            <Route path="/company" element={<CompanyAboutPage />} />
            <Route path="/about" element={<CompanyAboutPage />} />
            <Route path="/careers" element={<CareersPage />} />
            <Route path="/jobs" element={<CareersPage />} />
            <Route path="/branding" element={<BrandingPage />} />
            <Route path="/brand" element={<BrandingPage />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/newsroom" element={<NewsroomPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/category/:categoryId" element={<CategoryPage />} />
            <Route path="/category/community" element={<CategoryPage />} />
            <Route path="/safety-family-center" element={<FamilyCenterPage />} />
            <Route path="/safety/family-center" element={<FamilyCenterPage />} />
            <Route path="/safety-library" element={<SafetyLibraryPage />} />
            <Route path="/safety/library" element={<SafetyLibraryPage />} />
            <Route path="/safety-privacy" element={<PrivacyHubPage />} />
            <Route path="/safety/privacy" element={<PrivacyHubPage />} />
            <Route path="/safety-transparency" element={<TransparencyHubPage />} />
            <Route path="/safety/transparency" element={<TransparencyHubPage />} />
            <Route path="/transparency" element={<TransparencyHubPage />} />
            <Route path="/safety-news" element={<SafetyNewsHubPage />} />
            <Route path="/safety/news" element={<SafetyNewsHubPage />} />
            <Route path="/safety-policies" element={<PolicyHubPage />} />
            <Route path="/safety/policies" element={<PolicyHubPage />} />
            <Route path="/policies" element={<PolicyHubPage />} />
            <Route path="/safety-teen-charter" element={<TeenCharterPage />} />
            <Route path="/safety/teen-charter" element={<TeenCharterPage />} />
            <Route path="/teen-charter" element={<TeenCharterPage />} />
            <Route path="/safety-wellbeing" element={<WellbeingHubPage />} />
            <Route path="/safety/wellbeing" element={<WellbeingHubPage />} />
            <Route path="/wellbeing" element={<WellbeingHubPage />} />
            <Route path="/safety" element={<SafetyCenterPage />} />
            <Route path="/faq" element={<Navigate to="/safety" replace />} />
            <Route path="/help-center" element={<Navigate to="/safety" replace />} />
            <Route path="/creators" element={<CreatorsPage />} />
            <Route path="/api/auth/:platform/callback" element={<OAuthCallbackHandler />} />
            <Route path="/integrations/:platform/callback" element={<OAuthCallbackHandler />} />
            <Route path="/auth/:platform/callback" element={<OAuthCallbackHandler />} />
            <Route path="/oauth/callback" element={<OAuthCallbackHandler />} />
            <Route path="/callback" element={<OAuthCallbackHandler />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  return (
    <DeviceLockGate>
      <CallProvider>
        <div
          className={`relative ${isGameModeOpen ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-[#070709] text-white`}
        >
          <ScrollToTop />
          {isGameModeOpen ? (
            <Suspense fallback={null}>
              <SpotifyGameModePlayer />
              <SpotifyLyricsModal />
            </Suspense>
          ) : (
            <>
              {!isStandaloneRoute && <Sidebar />}
              <Suspense fallback={null}>
                {isEditProfileOpen && <EditProfileModal />}
                {isShareModalOpen && <ShareModal />}
                {isCommentModalOpen && <CommentModal />}
                {isCreateReelOpen && (
                  <CreateReelModal isOpen={isCreateReelOpen} onClose={closeCreateReel} />
                )}
                <StoryViewerModal />
                <StoryEditorModal />
                <CallModal />
                <IncomingCallToast />
                <PictureInPicture />
              </Suspense>
              <UndoHideSnackbar />
              <UndoClearHistorySnackbar />
              <Suspense fallback={null}>
                <FloatingVideoNotePiP />
                <ReactionBurstCanvas />
                {!isMessengerRoute && <MessageToastViewport />}
              </Suspense>

              {/* Global Spotify Apple Liquid Glass Player Dock & Overlays */}
              <Suspense fallback={null}>
                <SpotifyBottomDock />
                <SpotifyLyricsModal />
                <SpotifyMobilePlayerSheet />
              </Suspense>

              <main
                className={
                  isStandaloneRoute
                    ? `min-h-screen flex-1 transition-[padding-bottom] duration-300 ${
                        isSpotifyDockVisible ? (isSpotifyDockMinimized ? 'pb-14' : 'pb-28') : ''
                      }`
                    : isReelsRoute
                      ? `min-h-screen flex-1 transition-[padding-left,padding-bottom] duration-200 ease-out will-change-[padding-left] ${
                          isSidebarExpanded ? 'pl-72' : 'pl-24'
                        } max-md:pl-0 ${isSpotifyDockVisible ? (isSpotifyDockMinimized ? 'pb-14' : 'pb-28') : ''}`
                      : `flex min-h-screen flex-1 justify-center py-8 transition-[padding-left,padding-bottom] duration-300 ${
                          isSidebarExpanded ? 'pl-72' : 'pl-24'
                        } ${isSpotifyDockVisible ? (isSpotifyDockMinimized ? 'pb-14' : 'pb-28') : ''}`
                }
              >
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route
                      path="/terms/applicant-candidate-privacy-policy"
                      element={<ApplicantCandidatePrivacyPage />}
                    />
                    <Route
                      path="/terms/applicant-candidate"
                      element={<ApplicantCandidatePrivacyPage />}
                    />
                    <Route path="/terms/cookie-policy" element={<CookiePolicyPage />} />
                    <Route path="/terms/cookies" element={<CookiePolicyPage />} />
                    <Route path="/terms/local-laws" element={<RegionalPrivacyPage />} />
                    <Route path="/terms/regional-privacy" element={<RegionalPrivacyPage />} />
                    <Route path="/privacy/regional" element={<RegionalPrivacyPage />} />
                    <Route path="/terms/retention-policy" element={<RetentionPolicyPage />} />
                    <Route path="/terms/retention" element={<RetentionPolicyPage />} />
                    <Route path="/privacy/retention" element={<RetentionPolicyPage />} />
                    <Route
                      path="/terms/data-privacy-controls"
                      element={<DataPrivacyControlsPage />}
                    />
                    <Route path="/terms/privacy-controls" element={<DataPrivacyControlsPage />} />
                    <Route path="/privacy/controls" element={<DataPrivacyControlsPage />} />
                    <Route
                      path="/terms/your-eternal-data-package"
                      element={<YourDataPackagePage />}
                    />
                    <Route path="/terms/data-package" element={<YourDataPackagePage />} />
                    <Route path="/privacy/data-package" element={<YourDataPackagePage />} />
                    <Route path="/copyright" element={<CopyrightPolicyPage />} />
                    <Route path="/dmca" element={<CopyrightPolicyPage />} />
                    <Route path="/terms/copyright" element={<CopyrightPolicyPage />} />
                    <Route path="/terms/dmca" element={<CopyrightPolicyPage />} />
                    <Route path="/terms/paid-services" element={<PaidServicesPage />} />
                    <Route path="/terms/paid" element={<PaidServicesPage />} />
                    <Route path="/terms/refunds" element={<PaidServicesPage />} />
                    <Route path="/terms/refund-policy" element={<PaidServicesPage />} />
                    <Route path="/safety-law-enforcement" element={<LawEnforcementPage />} />
                    <Route path="/safety/law-enforcement" element={<LawEnforcementPage />} />
                    <Route path="/safety/law" element={<LawEnforcementPage />} />
                    <Route path="/law-enforcement" element={<LawEnforcementPage />} />
                    <Route path="/terms/developer" element={<DeveloperTermsPage />} />
                    <Route path="/terms/developers" element={<DeveloperTermsPage />} />
                    <Route path="/developers" element={<DeveloperTermsPage />} />
                    <Route path="/developer" element={<DeveloperTermsPage />} />
                    <Route path="/guidelines" element={<GuidelinesPage />} />
                    <Route path="/acknowledgements" element={<AcknowledgementsPage />} />
                    <Route path="/licenses" element={<LicensesPage />} />
                    <Route path="/licences" element={<LicensesPage />} />
                    <Route path="/company-information" element={<CompanyInformationPage />} />
                    <Route path="/impressum" element={<CompanyInformationPage />} />
                    <Route path="/company" element={<CompanyAboutPage />} />
                    <Route path="/about" element={<CompanyAboutPage />} />
                    <Route path="/careers" element={<CareersPage />} />
                    <Route path="/jobs" element={<CareersPage />} />
                    <Route path="/branding" element={<BrandingPage />} />
                    <Route path="/brand" element={<BrandingPage />} />
                    <Route path="/download" element={<DownloadPage />} />
                    <Route path="/newsroom" element={<NewsroomPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/category/:categoryId" element={<CategoryPage />} />
                    <Route path="/category/community" element={<CategoryPage />} />
                    <Route path="/safety-family-center" element={<FamilyCenterPage />} />
                    <Route path="/safety/family-center" element={<FamilyCenterPage />} />
                    <Route path="/safety-library" element={<SafetyLibraryPage />} />
                    <Route path="/safety/library" element={<SafetyLibraryPage />} />
                    <Route path="/safety-privacy" element={<PrivacyHubPage />} />
                    <Route path="/safety/privacy" element={<PrivacyHubPage />} />
                    <Route path="/safety-transparency" element={<TransparencyHubPage />} />
                    <Route path="/safety/transparency" element={<TransparencyHubPage />} />
                    <Route path="/transparency" element={<TransparencyHubPage />} />
                    <Route path="/safety-news" element={<SafetyNewsHubPage />} />
                    <Route path="/safety/news" element={<SafetyNewsHubPage />} />
                    <Route path="/safety-policies" element={<PolicyHubPage />} />
                    <Route path="/safety/policies" element={<PolicyHubPage />} />
                    <Route path="/policies" element={<PolicyHubPage />} />
                    <Route path="/safety-teen-charter" element={<TeenCharterPage />} />
                    <Route path="/safety/teen-charter" element={<TeenCharterPage />} />
                    <Route path="/teen-charter" element={<TeenCharterPage />} />
                    <Route path="/safety-wellbeing" element={<WellbeingHubPage />} />
                    <Route path="/safety/wellbeing" element={<WellbeingHubPage />} />
                    <Route path="/wellbeing" element={<WellbeingHubPage />} />
                    <Route path="/safety" element={<SafetyCenterPage />} />
                    <Route path="/faq" element={<Navigate to="/safety" replace />} />
                    <Route path="/help-center" element={<Navigate to="/safety" replace />} />
                    <Route path="/creators" element={<CreatorsPage />} />
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
                    <Route path="/api/auth/:platform/callback" element={<OAuthCallbackHandler />} />
                    <Route
                      path="/integrations/:platform/callback"
                      element={<OAuthCallbackHandler />}
                    />
                    <Route path="/auth/:platform/callback" element={<OAuthCallbackHandler />} />
                    <Route path="/oauth/callback" element={<OAuthCallbackHandler />} />
                    <Route path="/callback" element={<OAuthCallbackHandler />} />

                    <Route
                      path="/profile"
                      element={
                        <ProfileLayout>
                          <ProfilePage />
                        </ProfileLayout>
                      }
                    />
                    <Route
                      path="/profile/:username"
                      element={
                        <ProfileLayout>
                          <ProfilePage />
                        </ProfileLayout>
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

                    <Route path="/music" element={<MusicHubPage />} />
                    <Route path="/music/content-feed" element={<MusicHubPage />} />
                    <Route path="/music/feed" element={<MusicHubPage />} />
                    <Route
                      path="/content-feed"
                      element={<Navigate to="/music/content-feed" replace />}
                    />
                    <Route path="/music/section/:sectionId" element={<MusicHubPage />} />
                    <Route path="/section/:sectionId" element={<MusicHubPage />} />
                    <Route path="/music/playlist/:playlistId" element={<MusicHubPage />} />
                    <Route path="/music/track/:trackId" element={<MusicHubPage />} />
                    <Route path="/playlist/:playlistId" element={<MusicHubPage />} />
                    <Route path="/track/:trackId" element={<MusicHubPage />} />
                    <Route path="/music/:playlistOrTrackId" element={<MusicHubPage />} />
                    <Route path="/reels" element={<ReelsPage />} />

                    <Route
                      path="/messages/standalone/:conversationId"
                      element={<StandaloneChatPage />}
                    />
                    <Route
                      path="/chat/standalone/:conversationId"
                      element={<StandaloneChatPage />}
                    />
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
                        <ProfileLayout>
                          <ProfilePage />
                        </ProfileLayout>
                      }
                    />

                    <Route path="/404" element={<NotFoundPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </main>
            </>
          )}
        </div>
        <OfflineBanner />
      </CallProvider>
    </DeviceLockGate>
  );
}
