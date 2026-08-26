import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, LayoutGrid, Radio, Bookmark } from 'lucide-react';
import { useShowcase, useShowcasePresenceSync } from '@/entities/showcase/model/useShowcase';
import { useUserByUsername } from '@/entities/profile/model/useUserByUsername';
import { PersonalMetaWidget } from './PersonalMetaWidget';
import { LivePresenceWidget } from './LivePresenceWidget';
import { SpotlightMediaWidget } from './SpotlightMediaWidget';
import { MediaShowcaseWidget } from './MediaShowcaseWidget';
import { ShowcaseWishlistWidget } from './ShowcaseWishlistWidget';
import { ProfileAnthemCard } from './ProfileAnthemCard';
import { ShowcaseQuickEditor } from './ShowcaseQuickEditor';
import { TasteMatchBanner } from './TasteMatchBanner';
import { ExportShowcaseModal } from './ExportShowcaseModal';
import { ShowcaseMediaType } from '@backend/common/contracts';

interface ProfileShowcaseSidebarProps {
  username: string;
  userId?: string;
  isOwner: boolean;
  variant?: 'desktop' | 'mobile';
}

type ShowcaseNavTab = 'board' | 'activity' | 'wishlist';

export function ShowcaseSidebarSkeleton() {
  return (
    <div className="w-full flex flex-col gap-4 animate-pulse">
      <div className="h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
      <div className="h-44 rounded-3xl bg-white/[0.03] border border-white/[0.06]" />
      <div className="h-40 rounded-3xl bg-white/[0.03] border border-white/[0.06]" />
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

  const [activeTab, setActiveTab] = useState<ShowcaseNavTab>('board');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [editorInitialTab, setEditorInitialTab] = useState<
    'media' | 'spotlight' | 'meta' | 'activity' | 'privacy' | 'anthem' | 'wishlist'
  >('media');
  const [editorInitialMediaType, setEditorInitialMediaType] = useState<ShowcaseMediaType>(
    ShowcaseMediaType.GAME,
  );

  // Sync real-time WebSocket live activity presence
  useShowcasePresenceSync(userId || showcase?.userId, username);

  if (isLoading) {
    if (isOwner) {
      return (
        <aside
          className={
            variant === 'desktop'
              ? 'w-[360px] shrink-0 hidden xl:flex flex-col gap-4 sticky top-6 self-start'
              : 'w-full flex flex-col gap-4 mb-6 xl:hidden'
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

  // Strict Zero-State Handler: If guest and no public widgets are configured/visible, do not render anything
  if (!isOwner && !showcase.hasVisibleWidgets) {
    return null;
  }

  const openEditor = (
    tab: 'media' | 'spotlight' | 'meta' | 'activity' | 'privacy' | 'anthem' | 'wishlist' = 'media',
    mediaType: ShowcaseMediaType = ShowcaseMediaType.GAME,
  ) => {
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

  const tabs: Array<{ id: ShowcaseNavTab; label: string; icon: React.ReactNode }> = [
    { id: 'board', label: 'Board', icon: <LayoutGrid size={13} /> },
    { id: 'activity', label: 'Activity', icon: <Radio size={13} /> },
    { id: 'wishlist', label: 'Wishlist', icon: <Bookmark size={13} /> },
  ];

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
      <div className="relative flex items-center p-1 rounded-2xl bg-[#111116] border border-white/[0.08] shadow-inner mb-2">
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
                  className="absolute inset-0 rounded-xl bg-white/[0.12] border border-white/20 shadow-md backdrop-blur-md"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/20 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm hover:scale-102 active:scale-98"
          >
            <span className="text-indigo-400 font-bold">+</span>
            <span>Add Widget</span>
          </button>
        </div>
      )}

      {/* 4. Tab Contents with AnimatePresence */}
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
            {/* Spotlight Hero */}
            <SpotlightMediaWidget
              showcase={showcase}
              isOwner={isOwner}
              onEditClick={() => openEditor('spotlight')}
            />

            {/* Top 5 Showcase Grid */}
            <MediaShowcaseWidget
              showcase={showcase}
              isOwner={isOwner}
              onAddMediaClick={(type) => openEditor('media', type)}
              onEditClick={() => openEditor('media')}
            />

            {/* Personal Meta */}
            <PersonalMetaWidget
              showcase={showcase}
              isOwner={isOwner}
              onEditClick={() => openEditor('meta')}
            />
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
            {/* Live Presence & Connected Accounts */}
            <LivePresenceWidget
              showcase={showcase}
              isOwner={isOwner}
              onEditClick={() => openEditor('activity')}
            />
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
            {/* Wishlist Backlog Hub with Recommendation Radar */}
            <ShowcaseWishlistWidget
              showcase={showcase}
              isOwner={isOwner}
              onAddMediaClick={(type) => openEditor('wishlist', type)}
              onEditClick={() => openEditor('wishlist')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Export Showcase Button */}
      <button
        type="button"
        onClick={() => setIsExportOpen(true)}
        className="w-full py-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:border-white/20 mt-1"
      >
        <Share2 size={13} className="text-indigo-400" />
        <span>Share Showcase Card</span>
      </button>

      {/* In-Place Quick Editor Modal */}
      {isOwner && isEditorOpen && (
        <ShowcaseQuickEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          showcase={showcase}
          initialTab={editorInitialTab}
          initialMediaType={editorInitialMediaType}
        />
      )}

      {/* Export Showcase Card Modal */}
      {isExportOpen && (
        <ExportShowcaseModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          showcase={showcase}
          user={userProfile}
        />
      )}
    </>
  );

  // Mobile horizontal container
  if (variant === 'mobile') {
    return (
      <div className="w-full flex flex-col gap-4 mb-6 xl:hidden animate-fadeIn">{content}</div>
    );
  }

  // Desktop sticky sidebar container
  return (
    <aside className="w-[360px] shrink-0 hidden xl:flex flex-col gap-4 sticky top-6 self-start animate-fadeIn select-none">
      {content}
    </aside>
  );
};
