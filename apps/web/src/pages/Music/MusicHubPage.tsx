import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import MessengerSidebar from '@/widgets/sidebar/ui/RailwaySidebar';
import { useUIStore } from '@/shared/model/useUIStore';
import { SEOHead } from '@/shared/seo';
import { MusicLibraryPanel } from '@/features/music/ui/MusicLibraryPanel';
import { MusicTopNavbar } from '@/features/music/ui/MusicTopNavbar';
import { MusicHomeOverview } from '@/features/music/ui/MusicHomeOverview';
import { MusicPlaylistDetailView } from '@/features/music/ui/MusicPlaylistDetailView';
import { MusicTrackDetailView } from '@/features/music/ui/MusicTrackDetailView';
import { MusicSearchResultsView } from '@/features/music/ui/MusicSearchResultsView';
import { MusicSectionDetailView } from '@/features/music/ui/MusicSectionDetailView';
import { MusicContentFeedView } from '@/features/music/ui/MusicContentFeedView';
import { MusicNowPlayingSidebar } from '@/features/music/ui/MusicNowPlayingSidebar';
import { useMusicHubStore } from '@/features/music/model/useMusicHubStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import type { MusicCatalogSource } from '@/features/music/model/types';

export default function MusicHubPage() {
  const params = useParams<{
    playlistId?: string;
    trackId?: string;
    playlistOrTrackId?: string;
    sectionId?: string;
  }>();

  const location = useLocation();
  const isContentFeed = Boolean(
    location.pathname.includes('/content-feed') || location.pathname.includes('/feed'),
  );

  const { data: currentUser } = useCurrentUser();
  const isSidebarExpanded = useUIStore((s) => s.isSidebarExpanded);
  const selectedPlaylistId = useMusicHubStore((s) => s.selectedPlaylistId);
  const setSelectedPlaylistId = useMusicHubStore((s) => s.setSelectedPlaylistId);
  const isLibraryFullWidth = useMusicHubStore((s) => s.isLibraryFullWidth);
  const getPlaylistById = useMusicHubStore((s) => s.getPlaylistById);
  const getTrackById = useMusicHubStore((s) => s.getTrackById);
  const switchUserLibrary = useMusicHubStore((s) => s.switchUserLibrary);

  useEffect(() => {
    switchUserLibrary(currentUser?.id || null);
  }, [currentUser?.id, switchUserLibrary]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSource, setActiveSource] = useState<MusicCatalogSource>('all');

  // Distinguish playlist vs track from URL
  const isExplicitPlaylistParam = Boolean(
    params.playlistOrTrackId &&
    (params.playlistOrTrackId.startsWith('sc-pl-') ||
      params.playlistOrTrackId.startsWith('sp-pl-') ||
      params.playlistOrTrackId.startsWith('pl-') ||
      params.playlistOrTrackId.startsWith('playlist-')),
  );

  const isExplicitTrackParam = Boolean(
    params.playlistOrTrackId &&
    !isExplicitPlaylistParam &&
    (params.playlistOrTrackId.startsWith('sc-') ||
      params.playlistOrTrackId.startsWith('track-') ||
      params.playlistOrTrackId.startsWith('trk-')),
  );

  const effectivePlaylistId =
    params.playlistId ||
    (params.playlistOrTrackId && (isExplicitPlaylistParam || !isExplicitTrackParam)
      ? params.playlistOrTrackId
      : undefined);

  const effectiveTrackId =
    params.trackId ||
    (params.playlistOrTrackId && isExplicitTrackParam ? params.playlistOrTrackId : undefined);

  const isExplicitRoute = Boolean(
    isContentFeed ||
    params.sectionId ||
    effectiveTrackId ||
    params.playlistId ||
    (params.playlistOrTrackId && (isExplicitPlaylistParam || isExplicitTrackParam)),
  );

  // Whenever navigating to an explicit route (playlist, track, section, feed), clear search query so page renders the entity
  useEffect(() => {
    if (isExplicitRoute) {
      setSearchQuery('');
    }
  }, [
    isExplicitRoute,
    params.playlistId,
    params.trackId,
    params.sectionId,
    params.playlistOrTrackId,
    isContentFeed,
  ]);

  useEffect(() => {
    if (effectivePlaylistId) {
      setSelectedPlaylistId(effectivePlaylistId);
    } else if (
      isContentFeed ||
      params.sectionId ||
      effectiveTrackId ||
      (!params.playlistId && !params.playlistOrTrackId)
    ) {
      setSelectedPlaylistId(null);
    }
  }, [
    effectivePlaylistId,
    effectiveTrackId,
    params.playlistId,
    params.playlistOrTrackId,
    params.sectionId,
    setSelectedPlaylistId,
    isContentFeed,
  ]);

  const currentPlaylist = effectivePlaylistId ? getPlaylistById(effectivePlaylistId) : null;
  const currentTargetTrack = effectiveTrackId ? getTrackById(effectiveTrackId) : null;

  const seoTitle = isContentFeed
    ? "What's New • Eternal Music"
    : currentTargetTrack
      ? `${currentTargetTrack.title} — ${currentTargetTrack.artist} • Eternal Music`
      : currentPlaylist
        ? `${currentPlaylist.title} • Eternal Playlist`
        : params.sectionId
          ? 'Recently Played • Eternal Music'
          : 'Music Hub • Eternal Music';

  const seoDescription = isContentFeed
    ? 'New podcasts, shows, and latest releases from artists you follow.'
    : currentTargetTrack
      ? `Listen to "${currentTargetTrack.title}" by ${currentTargetTrack.artist} on Eternal Music Hub.`
      : currentPlaylist
        ? currentPlaylist.description || `Playlist "${currentPlaylist.title}" on Eternal Music Hub.`
        : 'Listen to music from SoundCloud and search tracks from Spotify on Eternal Music Hub in dark liquid glass design.';

  const seoImage = currentTargetTrack?.albumArt || currentPlaylist?.coverUrl || undefined;

  return (
    <div className="fixed inset-0 flex bg-[#070709] overflow-hidden text-white select-none">
      <SEOHead title={seoTitle} description={seoDescription} ogImage={seoImage} noindex={false} />

      {/* Left Railway Sidebar */}
      <MessengerSidebar />

      {/* Content wrapper with smooth margin transition matching Messenger */}
      <div
        className={`flex-1 min-w-0 flex overflow-hidden transition-all duration-300 ease-in-out ${
          isSidebarExpanded ? 'ml-[200px]' : 'ml-16'
        }`}
      >
        {/* Left Column: Full-Height Library Panel (flush from y=0 to bottom, adjacent to RailwaySidebar like Discord/Apple) */}
        <MusicLibraryPanel />

        {/* Right Column: Top Navbar + Main Content Area + Now Playing Sidebar */}
        <div
          style={{
            transition: 'opacity 250ms ease-out',
          }}
          className={`flex-1 min-w-0 flex flex-col overflow-hidden ${
            isLibraryFullWidth ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Top Navbar */}
          <MusicTopNavbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeSource={activeSource}
            onSourceChange={setActiveSource}
          />

          {/* Main content + Now Playing */}
          <div className="flex-1 min-w-0 flex overflow-hidden bg-gradient-to-br from-[#0c0c12]/60 via-[#0a0a0e]/80 to-[#07070a] backdrop-blur-3xl">
            <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
              {isContentFeed ? (
                <MusicContentFeedView />
              ) : isExplicitRoute ? (
                params.sectionId ? (
                  <MusicSectionDetailView sectionId={params.sectionId} />
                ) : effectiveTrackId ? (
                  <MusicTrackDetailView key={effectiveTrackId} trackId={effectiveTrackId} />
                ) : (
                  <MusicPlaylistDetailView
                    playlistId={(effectivePlaylistId || selectedPlaylistId)!}
                  />
                )
              ) : searchQuery.trim() ? (
                <MusicSearchResultsView
                  query={searchQuery}
                  source={activeSource}
                  onClearSearch={() => setSearchQuery('')}
                />
              ) : selectedPlaylistId ? (
                <MusicPlaylistDetailView playlistId={selectedPlaylistId} />
              ) : (
                <MusicHomeOverview />
              )}
            </main>

            {/* Right-side Now Playing card */}
            <MusicNowPlayingSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
