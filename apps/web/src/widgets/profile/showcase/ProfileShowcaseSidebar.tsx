import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Share2, LayoutGrid, Radio, Bookmark, Music, Pause } from 'lucide-react';
import { DiscordGamepadIcon } from '@/shared/ui/BrandIcons';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import {
  useShowcase,
  useShowcasePresenceSync,
  useUpdateShowcase,
} from '@/entities/showcase/model/useShowcase';
import { useUserByUsername } from '@/entities/profile/model/useUserByUsername';
import { PersonalMetaWidget } from './PersonalMetaWidget';
import { LivePresenceWidget } from './LivePresenceWidget';
import { SpotlightMediaWidget } from './SpotlightMediaWidget';
import { MediaShowcaseWidget } from './MediaShowcaseWidget';
import { ShowcaseWishlistWidget } from './ShowcaseWishlistWidget';
import { ProfileAnthemCard } from './ProfileAnthemCard';
import { TasteMatchBanner } from './TasteMatchBanner';
import { MediaDetailModal } from '@/widgets/showcase';
import { ShowcaseWidgetWrapper } from './ShowcaseWidgetWrapper';
import { UnsavedChangesBar } from './UnsavedChangesBar';
import { ShowcaseMediaType, type ShowcaseMediaItemDto } from '@backend/common/contracts';

const ShowcaseQuickEditor = React.lazy(() =>
  import('./ShowcaseQuickEditor').then((m) => ({ default: m.ShowcaseQuickEditor })),
);
const ExportShowcaseModal = React.lazy(() =>
  import('./ExportShowcaseModal').then((m) => ({ default: m.ExportShowcaseModal })),
);

interface ProfileShowcaseSidebarProps {
  username: string;
  userId?: string;
  isOwner: boolean;
  variant?: 'desktop' | 'mobile';
}

type ShowcaseNavTab = 'board' | 'activity' | 'wishlist';

const DEFAULT_BOARD_WIDGET_ORDER = ['spotlight', 'media', 'meta'];

export function ShowcaseSidebarSkeleton() {
  return (
    <div className="w-full flex flex-col gap-4 animate-pulse">
      <div className="h-16 rounded-2xl bg-white/3 border border-white/6" />
      <div className="h-44 rounded-3xl bg-white/3 border border-white/6" />
      <div className="h-40 rounded-3xl bg-white/3 border border-white/6" />
    </div>
  );
}

export const ProfileShowcaseSidebar: React.FC<ProfileShowcaseSidebarProps> = ({
  username,
  userId,
  isOwner,
  variant = 'desktop',
}) => {
  const { data: showcase, isLoading } = useShowcase(username);
  const { data: userData } = useUserByUsername(username);
  const updateShowcaseMutation = useUpdateShowcase();

  const [activeTab, setActiveTab] = useState<ShowcaseNavTab>('board');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [editorInitialTab, setEditorInitialTab] = useState<
    'media' | 'spotlight' | 'meta' | 'activity' | 'privacy' | 'anthem' | 'wishlist'
  >('media');
  const [editorInitialMediaType, setEditorInitialMediaType] = useState<ShowcaseMediaType>(
    ShowcaseMediaType.GAME,
  );

  // Widget Order & Media Order Management
  const serverWidgetOrder =
    showcase?.widgetOrder && showcase.widgetOrder.length > 0
      ? showcase.widgetOrder
      : DEFAULT_BOARD_WIDGET_ORDER;

  const serverMediaItems = showcase?.mediaItems || [];

  const [localWidgetOrder, setLocalWidgetOrder] = useState<string[]>(serverWidgetOrder);
  const [localMediaItems, setLocalMediaItems] = useState<ShowcaseMediaItemDto[]>(serverMediaItems);

  useEffect(() => {
    if (showcase?.widgetOrder && showcase.widgetOrder.length > 0) {
      setLocalWidgetOrder(showcase.widgetOrder);
    } else {
      setLocalWidgetOrder(DEFAULT_BOARD_WIDGET_ORDER);
    }
  }, [showcase?.widgetOrder]);

  useEffect(() => {
    setLocalMediaItems(showcase?.mediaItems || []);
  }, [showcase?.mediaItems]);

  const hasUnsavedOrderChanges =
    JSON.stringify(localWidgetOrder) !== JSON.stringify(serverWidgetOrder);
  const hasUnsavedMediaChanges =
    JSON.stringify(localMediaItems) !== JSON.stringify(serverMediaItems);

  const hasUnsavedChanges = hasUnsavedOrderChanges || hasUnsavedMediaChanges;

  const handleReorder = (newOrder: string[]) => {
    setLocalWidgetOrder(newOrder);
  };

  const handleMediaReorder = (newItems: ShowcaseMediaItemDto[]) => {
    setLocalMediaItems(newItems);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setLocalWidgetOrder((prev) => prev.filter((id) => id !== widgetId));
  };

  const handleResetOrder = () => {
    setLocalWidgetOrder(serverWidgetOrder);
    setLocalMediaItems(serverMediaItems);
  };

  const handleSaveOrder = async () => {
    try {
      await updateShowcaseMutation.mutateAsync({
        ...(hasUnsavedOrderChanges && { widgetOrder: localWidgetOrder }),
        ...(hasUnsavedMediaChanges && { mediaItems: localMediaItems }),
      });
    } catch (err) {
      console.error('Failed to save showcase changes', err);
    }
  };

  // Sync real-time WebSocket live activity presence
  useShowcasePresenceSync(userId || showcase?.userId, username);

  const targetProfileId = userData?.id || userId || showcase?.userId;
  useEffect(() => {
    if (targetProfileId && showcase?.activityStatus !== undefined) {
      usePresenceStore.getState().setUserActivity(targetProfileId, showcase.activityStatus);
    }
  }, [targetProfileId, showcase?.activityStatus]);

  if (isLoading) {
    if (isOwner) {
      return (
        <aside
          className={
            variant === 'desktop'
              ? 'w-[320px] xl:w-90 shrink-0 hidden lg:flex flex-col gap-4 sticky top-6 self-start'
              : 'w-full flex flex-col gap-4 mb-6 lg:hidden'
          }
        >
          <ShowcaseSidebarSkeleton />
        </aside>
      );
    }
    return null;
  }

  if (!showcase) {
    return null;
  }

  // Check active content per tab for visitors
  const pInfo = showcase.personalInfo;
  const pToggles = (pInfo?.toggles as Record<string, boolean | undefined>) || {};
  const hasMetaData = Boolean(
    (pToggles.showRelationship === true && pInfo?.relationshipStatus) ||
    (pToggles.showLivesIn === true && pInfo?.livesIn) ||
    (pToggles.showHometown === true && pInfo?.hometown) ||
    (pToggles.showWorkplace === true && pInfo?.workplace) ||
    (pToggles.showEducation === true && pInfo?.education) ||
    (pToggles.showLanguages === true &&
      (Array.isArray(pInfo?.languages) ? pInfo.languages.length > 0 : pInfo?.languages)) ||
    (pToggles.showFamily === true &&
      ((Array.isArray(pInfo?.familyMembers) && pInfo.familyMembers.length > 0) || pInfo?.family)) ||
    (pToggles.showPronouns === true && showcase.pronouns) ||
    (showcase.showGender === true && (pInfo?.gender || showcase.gender)) ||
    (showcase.showBirthdate === true && showcase.birthDate) ||
    (showcase.showAge === true && showcase.age !== null && showcase.age !== undefined) ||
    ((showcase.showZodiac === true || pToggles.showZodiac === true) && showcase.zodiacSign) ||
    showcase.showTimezone === true,
  );

  const hasBoardContent = Boolean(
    showcase.spotlightMedia || localMediaItems.some((m) => !m.isWishlist) || hasMetaData,
  );

  const connectedAccounts = showcase.connectedAccounts as Record<string, any> | null;
  const visibleAccounts = connectedAccounts
    ? Object.entries(connectedAccounts).filter(
        ([_, val]) => val && (typeof val !== 'object' || (val as any).displayOnProfile !== false),
      )
    : [];
  const hasActivityContent = Boolean(
    showcase.activityStatus?.type === 'gaming' ||
    showcase.activityStatus?.isSteam ||
    showcase.activityStatus?.type === 'spotify' ||
    (connectedAccounts?.steam as any)?.currentActivity ||
    (connectedAccounts?.spotify as any)?.currentActivity ||
    visibleAccounts.length > 0,
  );

  const hasWishlistContent = localMediaItems.some((m) => m.isWishlist === true);
  const hasAnyShowcaseContent = hasBoardContent || hasActivityContent || hasWishlistContent;

  const openEditor = (
    tab: 'media' | 'spotlight' | 'meta' | 'activity' | 'privacy' | 'anthem' | 'wishlist' = 'media',
    mediaType: ShowcaseMediaType = ShowcaseMediaType.GAME,
  ) => {
    // Auto-restore widget to local order if user is configuring a previously deleted widget
    const widgetKey =
      tab === 'spotlight'
        ? 'spotlight'
        : tab === 'media'
          ? 'media'
          : tab === 'meta'
            ? 'meta'
            : null;

    if (widgetKey && !localWidgetOrder.includes(widgetKey)) {
      setLocalWidgetOrder((prev) => [...prev, widgetKey]);
    }

    setEditorInitialTab(tab);
    setEditorInitialMediaType(mediaType);
    setIsEditorOpen(true);
  };

  const userProfile = {
    id: userData?.id || userId || showcase.userId,
    username: userData?.username || username,
    displayName: userData?.displayName || username,
    avatar: userData?.avatar,
    banner: userData?.banner,
    isVerified: userData?.isVerified,
    primaryBadge: userData?.primaryBadge,
  };

  const isGamingActive = Boolean(
    showcase?.activityStatus &&
    (showcase.activityStatus.type === 'gaming' ||
      showcase.activityStatus.isSteam ||
      (showcase.activityStatus.title && showcase.activityStatus.type !== 'spotify')),
  );

  const isSpotifyActive = Boolean(
    showcase?.activityStatus &&
    !isGamingActive &&
    (showcase.activityStatus.type === 'spotify' || Boolean(showcase.activityStatus.trackId)),
  );

  const tabs: Array<{ id: ShowcaseNavTab; label: string; icon: React.ReactNode }> = [
    { id: 'board', label: 'Board', icon: <LayoutGrid size={13} /> },
    {
      id: 'activity',
      label: 'Activity',
      icon: isGamingActive ? (
        <DiscordGamepadIcon
          size={14}
          className="text-[#23a55a] drop-shadow-[0_0_5px_rgba(35,165,90,0.8)]"
        />
      ) : isSpotifyActive ? (
        (showcase?.activityStatus as any)?.isPaused ? (
          <Pause
            size={13}
            className="text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)] fill-amber-400/40"
          />
        ) : (
          <Music size={13} className="text-[#1DB954] drop-shadow-[0_0_5px_rgba(29,185,84,0.8)]" />
        )
      ) : (
        <Radio size={13} />
      ),
    },
    { id: 'wishlist', label: 'Wishlist', icon: <Bookmark size={13} /> },
  ];

  const renderBoardWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'spotlight':
        return (
          <ShowcaseWidgetWrapper
            key="spotlight"
            widgetId="spotlight"
            isOwner={isOwner}
            onDelete={() => handleDeleteWidget('spotlight')}
          >
            <SpotlightMediaWidget
              showcase={showcase}
              isOwner={isOwner}
              onEditClick={() => openEditor('spotlight')}
            />
          </ShowcaseWidgetWrapper>
        );
      case 'media':
        return (
          <ShowcaseWidgetWrapper
            key="media"
            widgetId="media"
            isOwner={isOwner}
            onDelete={() => handleDeleteWidget('media')}
          >
            <MediaShowcaseWidget
              showcase={showcase}
              isOwner={isOwner}
              mediaItems={localMediaItems}
              onMediaReorder={handleMediaReorder}
              onAddMediaClick={(type: ShowcaseMediaType) => openEditor('media', type)}
              onEditClick={(category) => openEditor('media', category || ShowcaseMediaType.GAME)}
            />
          </ShowcaseWidgetWrapper>
        );
      case 'meta':
        return (
          <ShowcaseWidgetWrapper
            key="meta"
            widgetId="meta"
            isOwner={isOwner}
            onDelete={() => handleDeleteWidget('meta')}
          >
            <PersonalMetaWidget
              showcase={showcase}
              isOwner={isOwner}
              onEditClick={() => openEditor('meta')}
            />
          </ShowcaseWidgetWrapper>
        );
      default:
        return null;
    }
  };

  const content = (
    <>
      {/* 1. Taste Match Radar Banner */}
      <TasteMatchBanner targetShowcase={showcase} targetUsername={username} isOwner={isOwner} />

      {/* 2. Profile Anthem Player Strip (Top of Showcase) */}
      <ProfileAnthemCard
        anthem={showcase.anthemTrack}
        isOwner={isOwner}
        onEditClick={() => openEditor('anthem')}
      />

      {/* 3. Discord-Grade 3-Tab Selector with Framer Motion Sliding Pill */}
      <div className="relative flex items-center p-1 rounded-2xl bg-[#111116] border border-white/8 shadow-inner mb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors z-10 cursor-pointer ${
                isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeShowcaseTab"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  className="absolute inset-0 rounded-xl bg-white/[0.14] border border-white/20 shadow-md"
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Discord Header Row: Your Widgets & Add Widget Action */}
      {isOwner && (
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Your Widgets
          </span>
          <button
            type="button"
            onClick={() => openEditor(activeTab === 'wishlist' ? 'wishlist' : 'media')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/6 hover:bg-white/12 border border-white/8 hover:border-white/20 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm hover:scale-102 active:scale-98"
          >
            <span className="text-indigo-400 font-bold">+</span>
            <span>Add Widget</span>
          </button>
        </div>
      )}

      {/* 4. Tab Contents with AnimatePresence & Reorderable List */}
      <AnimatePresence mode="wait">
        {activeTab === 'board' && (
          <motion.div
            key="board"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {isOwner ? (
              <Reorder.Group
                axis="y"
                values={localWidgetOrder}
                onReorder={handleReorder}
                className="flex flex-col gap-4"
              >
                {localWidgetOrder.map((widgetId) => renderBoardWidget(widgetId))}
              </Reorder.Group>
            ) : hasBoardContent ? (
              <div className="flex flex-col gap-4">
                {serverWidgetOrder.map((widgetId) => renderBoardWidget(widgetId))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-3xl bg-white/2 border border-white/6 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center text-gray-400 mb-2.5">
                  <LayoutGrid size={18} className="opacity-50 text-gray-400" />
                </div>
                <p className="text-xs font-medium text-gray-400">There is nothing here yet...</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {isOwner || hasActivityContent ? (
              <LivePresenceWidget
                showcase={showcase}
                isOwner={isOwner}
                onEditClick={() => openEditor('activity')}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-3xl bg-white/2 border border-white/6 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center text-gray-400 mb-2.5">
                  <Radio size={18} className="opacity-50 text-gray-400" />
                </div>
                <p className="text-xs font-medium text-gray-400">There is nothing here yet...</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'wishlist' && (
          <motion.div
            key="wishlist"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {isOwner || hasWishlistContent ? (
              <ShowcaseWishlistWidget
                showcase={showcase}
                isOwner={isOwner}
                mediaItems={localMediaItems}
                onMediaReorder={handleMediaReorder}
                onAddMediaClick={(type) => openEditor('wishlist', type)}
                onEditClick={(category) =>
                  openEditor('wishlist', category || ShowcaseMediaType.GAME)
                }
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-3xl bg-white/2 border border-white/6 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center text-gray-400 mb-2.5">
                  <Bookmark size={18} className="opacity-50 text-gray-400" />
                </div>
                <p className="text-xs font-medium text-gray-400">There is nothing here yet...</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Export Showcase Button (Only shown if owner or if showcase has visible content) */}
      {(isOwner || hasAnyShowcaseContent) && (
        <button
          type="button"
          onClick={() => setIsExportOpen(true)}
          className="w-full py-2.5 rounded-2xl bg-white/3 hover:bg-white/8 border border-white/8 text-xs font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:border-white/20 mt-1"
        >
          <Share2 size={13} className="text-indigo-400" />
          <span>Share Showcase Card</span>
        </button>
      )}

      {/* Discord-style Floating Bottom Unsaved Changes Bar */}
      <UnsavedChangesBar
        isVisible={isOwner && hasUnsavedChanges}
        onReset={handleResetOrder}
        onSave={handleSaveOrder}
        isSaving={updateShowcaseMutation.isPending}
      />

      {/* In-Place Quick Editor Modal */}
      {isOwner && isEditorOpen && showcase && (
        <React.Suspense fallback={null}>
          <ShowcaseQuickEditor
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            showcase={{
              ...showcase,
              mediaItems: localMediaItems.length > 0 ? localMediaItems : showcase.mediaItems || [],
            }}
            initialTab={editorInitialTab}
            initialMediaType={editorInitialMediaType}
          />
        </React.Suspense>
      )}

      {/* Export Showcase Card Modal */}
      {isExportOpen && (
        <React.Suspense fallback={null}>
          <ExportShowcaseModal
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            showcase={showcase}
            user={userProfile}
          />
        </React.Suspense>
      )}

      {/* 1-to-1 Media Detail Modal (Shared UI for Games, Anime, Movies) */}
      <MediaDetailModal />
    </>
  );

  // Mobile horizontal container
  if (variant === 'mobile') {
    return (
      <div className="w-full flex flex-col gap-4 mb-6 lg:hidden animate-fadeIn relative z-20">
        {content}
      </div>
    );
  }

  // Desktop sticky sidebar container
  return (
    <aside className="w-[320px] xl:w-90 shrink-0 hidden lg:flex flex-col gap-4 sticky top-6 z-20 self-start animate-fadeIn select-none">
      {content}
    </aside>
  );
};
