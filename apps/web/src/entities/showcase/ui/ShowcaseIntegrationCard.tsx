import React from 'react';
import {
  ExternalLink,
  Star,
  GitFork,
  Check,
  Flame,
  Gamepad2,
  Play,
  Layers,
  Music,
  Users,
  Code2,
  Eye,
} from 'lucide-react';
import {
  GitHubBrandIcon,
  SteamBrandIcon,
  RiotGamesBrandIcon,
  BattleNetBrandIcon,
  SpotifyBrandIcon,
  SoundCloudBrandIcon,
  YouTubeBrandIcon,
  TwitchBrandIcon,
  RobloxBrandIcon,
  XBrandIcon,
  FacebookBrandIcon,
  EpicGamesBrandIcon,
  Dota2BrandIcon,
  CS2BrandIcon,
} from '@/shared/ui/BrandIcons';
import { DotaRankMedal } from './DotaRankMedal';
import { CS2PremierBadge } from './CS2PremierBadge';
import { SteamLevelBadge } from '@/shared/ui/SteamLevelBadge';
import {
  getSafeSpotifyTrackUrl,
  sanitizeImageUrl,
  sanitizePlatformUrl,
} from '@/shared/lib/spotifyUrl';

interface ShowcaseIntegrationCardProps {
  platform: string;
  data: Record<string, any>;
  isOwner: boolean;
  onConfigureClick?: () => void;
}

export const ShowcaseIntegrationCard: React.FC<ShowcaseIntegrationCardProps> = ({
  platform,
  data,
  isOwner,
  onConfigureClick,
}) => {
  if (data.displayOnProfile === false) {
    return null;
  }

  const p = platform.toLowerCase();
  const activeSteamGames: string[] = Array.isArray(data.featuredGames)
    ? data.featuredGames
    : data.featuredGame
      ? [data.featuredGame]
      : ['dota2'];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-4.5 transition-all duration-300 hover:border-white/[0.16] shadow-xl flex flex-col gap-3 group">
      {/* 1. Header with Platform Icon, Name, and Status */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {p === 'github' && <GitHubBrandIcon size={32} />}
          {p === 'steam' && <SteamBrandIcon size={32} />}
          {p === 'riot' && <RiotGamesBrandIcon size={32} />}
          {p === 'battlenet' && <BattleNetBrandIcon size={32} />}
          {p === 'spotify' && <SpotifyBrandIcon size={32} />}
          {p === 'soundcloud' && <SoundCloudBrandIcon size={32} />}
          {p === 'youtube' && <YouTubeBrandIcon size={32} />}
          {p === 'twitch' && <TwitchBrandIcon size={32} />}
          {p === 'roblox' && <RobloxBrandIcon size={32} />}
          {p === 'x' && <XBrandIcon size={32} />}
          {p === 'facebook' && <FacebookBrandIcon size={32} />}
          {p === 'epicgames' && <EpicGamesBrandIcon size={32} />}

          <div className="flex flex-col">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {p === 'x' ? 'X.com' : p === 'battlenet' ? 'Battle.net' : p}
            </span>
            <span className="text-[10px] text-gray-400">
              {data.username ||
                data.handle ||
                data.channel ||
                data.riotId ||
                data.battleTag ||
                data.steamId}
            </span>
          </div>
        </div>

        {isOwner && onConfigureClick && (
          <button
            type="button"
            onClick={onConfigureClick}
            className="opacity-0 group-hover:opacity-100 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            Configure
          </button>
        )}
      </div>

      {/* 2. Platform Specific Rich Content */}

      {/* STEAM CARD */}
      {p === 'steam' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#1b2838]/60 border border-[#2a475e]/40">
            <div className="flex items-center gap-2.5">
              <SteamLevelBadge level={data.level ?? 0} size="md" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Steam Profile</span>
                <span className="text-[10px] text-gray-400">
                  {(data.gamesCount ?? 0).toLocaleString()} Games
                </span>
              </div>
            </div>
          </div>

          {/* Featured Games (Dota 2, CS2, both, or none) */}
          {activeSteamGames.map((gameId) => {
            if (gameId === 'dota2' && data.dota2) {
              return (
                <div
                  key="dota2"
                  className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#14151a] to-[#0c0d10] border border-white/[0.08]"
                >
                  <div className="flex items-center gap-3">
                    <Dota2BrandIcon size={38} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Dota 2</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <DotaRankMedal
                          rankIcon={data.dota2?.rankIcon}
                          rankTier={data.dota2?.rankTier}
                          size="sm"
                        />
                        <span className="text-[11px] font-bold text-white">
                          {data.dota2?.rankTier || 'Unranked'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col text-right">
                    {data.dota2?.winRate && (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {data.dota2.winRate}% WR
                      </span>
                    )}
                    {data.dota2?.hours && data.dota2.hours > 0 ? (
                      <span className="text-[9px] text-gray-400">
                        {data.dota2.hours.toLocaleString()} hrs
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            }

            if (gameId === 'cs2' && data.cs2) {
              return (
                <div
                  key="cs2"
                  className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#14151a] to-[#0c0d10] border border-white/[0.08]"
                >
                  <div className="flex items-center gap-3">
                    <CS2BrandIcon size={38} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Counter-Strike 2</span>
                      {data.cs2?.premierRating ? (
                        <div className="mt-1">
                          <CS2PremierBadge rating={data.cs2.premierRating} />
                        </div>
                      ) : data.cs2?.hours && data.cs2.hours > 0 ? (
                        <span className="text-[10px] text-gray-400 font-medium">
                          {data.cs2.hours.toLocaleString()} hrs played
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col text-right">
                    {data.cs2?.winRate ? (
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {data.cs2.winRate}% WR
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-gray-400 font-semibold">
                        {data.cs2?.rankTier || 'Unranked'}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* RIOT GAMES CARD */}
      {p === 'riot' && (
        <div className="flex flex-col gap-2.5">
          {data.featuredGame === 'lol' && data.lol ? (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-black/60 border border-indigo-500/30">
              <div className="flex items-center gap-3">
                <img
                  src={sanitizeImageUrl(data.lol.rankIcon)}
                  alt="LoL Rank"
                  loading="lazy"
                  decoding="async"
                  className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(99,102,241,0.6)]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-indigo-300">
                    League of Legends: {data.lol.tier}
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold">
                    {data.lol.lp} LP • Lvl {data.lol.level}
                  </span>
                </div>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-emerald-400 font-bold">
                  {data.lol.winRate}% WR
                </span>
                <span className="text-[9px] text-gray-400">{data.lol.hours} hrs</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-rose-950/40 via-red-950/30 to-black/60 border border-rose-500/30">
              <div className="flex items-center gap-3">
                <img
                  src={sanitizeImageUrl(
                    data.valorant?.rankIcon,
                    'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/23/largeicon.png',
                  )}
                  alt="Valorant Rank"
                  loading="lazy"
                  decoding="async"
                  className="w-9 h-9 object-contain drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-rose-300">
                    VALORANT: {data.valorant?.tier || 'Immortal 3'}
                  </span>
                  <span className="text-[10px] text-white font-bold">
                    {data.valorant?.rr || 185} RR • Lvl {data.valorant?.level || 215}
                  </span>
                </div>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-emerald-400 font-bold">
                  {data.valorant?.winRate || 59.2}% WR
                </span>
                <span className="text-[9px] text-gray-400">{data.valorant?.hours || 1120} hrs</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BATTLE.NET CARD */}
      {p === 'battlenet' && data.wow && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-950/40 to-black/60 border border-blue-500/30">
          <div className="flex items-center gap-3">
            <img
              src={sanitizeImageUrl(data.wow.classIcon)}
              alt="WoW Class"
              loading="lazy"
              decoding="async"
              className="w-9 h-9 rounded-xl object-cover border border-red-500/40 shadow-md"
            />
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                {data.wow.character} •{' '}
                <span style={{ color: data.wow.classColor }}>{data.wow.class}</span>
              </span>
              <span className="text-[10px] text-gray-400">
                Lvl {data.wow.level} • {data.wow.realm} • &lt;{data.wow.guild}&gt;
              </span>
            </div>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold text-amber-300">ilvl {data.wow.ilvl}</span>
            <span className="text-[9px] text-indigo-300 font-semibold">
              {data.wow.mythicPlusScore} M+
            </span>
          </div>
        </div>
      )}

      {/* GITHUB CARD */}
      {p === 'github' && (
        <div className="flex flex-col gap-2.5">
          {data.showBio !== false && data.bio && (
            <p className="text-[11px] text-gray-300 leading-relaxed">{data.bio}</p>
          )}

          {/* Discord-style GitHub Stats Chips */}
          <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
            {data.showReposCount !== false && typeof data.reposCount === 'number' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] text-gray-300">
                <Code2 size={11} className="text-indigo-400 shrink-0" />
                <span className="font-bold text-white">{data.reposCount}</span> repos
              </div>
            )}

            {data.showStarsCount !== false &&
              typeof data.starsCount === 'number' &&
              data.starsCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
                  <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                  <span className="font-bold text-white">{data.starsCount}</span> stars
                </div>
              )}

            {data.showFollowersCount !== false &&
              typeof data.followersCount === 'number' &&
              data.followersCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] text-gray-300">
                  <Users size={11} className="text-emerald-400 shrink-0" />
                  <span className="font-bold text-white">{data.followersCount}</span> followers
                </div>
              )}

            {data.username && (
              <a
                href={sanitizePlatformUrl(
                  `https://github.com/${encodeURIComponent(data.username)}`,
                  ['github.com'],
                  'https://github.com',
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-[#5865F2] hover:text-[#7983f5] hover:underline transition-colors cursor-pointer py-1"
              >
                <span>GitHub Profile</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Pinned Repository */}
          {data.showPinnedRepo !== false && data.pinnedRepo && (
            <a
              href={
                sanitizePlatformUrl(data.pinnedRepo.url, ['github.com']) ||
                sanitizePlatformUrl(
                  `https://github.com/${encodeURIComponent(data.username || '')}/${encodeURIComponent(
                    data.pinnedRepo.name || '',
                  )}`,
                  ['github.com'],
                  'https://github.com',
                )
              }
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.16] transition-all flex flex-col gap-1.5 group/repo cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate group-hover/repo:text-indigo-300 transition-colors">
                  <Layers size={13} className="text-indigo-400 shrink-0" />
                  {data.pinnedRepo.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-amber-300 font-bold flex items-center gap-0.5">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    {data.pinnedRepo.stars ?? 0}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <GitFork size={10} />
                    {data.pinnedRepo.forks ?? 0}
                  </span>
                </div>
              </div>
              {data.pinnedRepo.description && (
                <p className="text-[10px] text-gray-400 line-clamp-2">
                  {data.pinnedRepo.description}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04] text-[9px] text-gray-400">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>{data.pinnedRepo.language || 'TypeScript'}</span>
              </div>
            </a>
          )}
        </div>
      )}

      {/* YOUTUBE CARD */}
      {p === 'youtube' && (
        <div className="flex flex-col gap-3">
          {/* Stats Badges */}
          <div className="flex items-center flex-wrap gap-2">
            {data.showSubscribersCount !== false && typeof data.subscribersCount === 'number' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-300">
                <Users size={12} className="text-red-400 shrink-0" />
                <span className="font-bold text-white">
                  {data.subscribersCount.toLocaleString()}
                </span>{' '}
                subscribers
              </div>
            )}

            {data.showTotalViews !== false && typeof data.totalViews === 'number' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-300">
                <Eye size={12} className="text-gray-400 shrink-0" />
                <span className="font-bold text-white">
                  {data.totalViews.toLocaleString()}
                </span>{' '}
                views
              </div>
            )}

            {data.url && (
              <a
                href={
                  sanitizePlatformUrl(data.url, ['youtube.com', 'youtu.be']) ||
                  sanitizePlatformUrl(
                    data.username
                      ? `https://www.youtube.com/@${encodeURIComponent(data.username)}`
                      : 'https://youtube.com',
                    ['youtube.com', 'youtu.be'],
                    'https://youtube.com',
                  )
                }
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 hover:underline transition-colors py-0.5"
              >
                <span>Channel</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Recent Video Uploads */}
          {data.showRecentVideos !== false && data.videos && data.videos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Recent Uploads
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {data.videos.slice(0, 3).map((v: any, idx: number) => (
                  <a
                    key={v.id || idx}
                    href={
                      sanitizePlatformUrl(v.url, ['youtube.com', 'youtu.be']) ||
                      sanitizePlatformUrl(
                        v.id
                          ? `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`
                          : 'https://youtube.com',
                        ['youtube.com', 'youtu.be'],
                        'https://youtube.com',
                      )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-1.5 group/vid cursor-pointer"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10 group-hover/vid:border-red-500/50 group-hover/vid:shadow-[0_0_12px_rgba(239,68,68,0.25)] transition-all">
                      {sanitizeImageUrl(v.thumbnailUrl) ? (
                        <img
                          src={sanitizeImageUrl(v.thumbnailUrl)}
                          alt={v.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover/vid:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-red-950/40 flex items-center justify-center">
                          <Play size={20} className="text-red-500/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity">
                        <div className="w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform group-hover/vid:scale-110 transition-transform">
                          <Play size={12} className="fill-white translate-x-0.5" />
                        </div>
                      </div>
                      {v.duration && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[9px] font-bold font-mono text-white shadow">
                          {v.duration}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-gray-300 group-hover/vid:text-white line-clamp-2 leading-tight transition-colors">
                      {v.title}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ROBLOX CARD */}
      {p === 'roblox' && (
        <div className="flex flex-col gap-3">
          {/* Avatar Render & Stats Header */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            {data.showAvatarRender !== false &&
              Boolean(sanitizeImageUrl(data.avatarBustUrl || data.avatarUrl)) && (
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-b from-blue-900/30 to-black/60 border border-white/10 shrink-0 shadow-inner flex items-center justify-center">
                  <img
                    src={sanitizeImageUrl(data.avatarBustUrl || data.avatarUrl)}
                    alt={data.username || 'Roblox Avatar'}
                    loading="lazy"
                    className="w-full h-full object-cover scale-110"
                  />
                </div>
              )}

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-white truncate">
                  {data.displayName || data.username}
                </span>
                {data.username && (
                  <span className="text-[10px] text-gray-400 truncate">@{data.username}</span>
                )}
              </div>

              {/* Friends & Followers Chips */}
              <div className="flex items-center gap-2 mt-1">
                {data.showFriends !== false && typeof data.friendsCount === 'number' && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-300">
                    <Users size={11} className="text-blue-400 shrink-0" />
                    <span className="font-bold text-white">
                      {data.friendsCount.toLocaleString()}
                    </span>
                    <span>friends</span>
                  </div>
                )}
                {typeof data.followersCount === 'number' && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-300">
                    <Flame size={11} className="text-amber-400 shrink-0" />
                    <span className="font-bold text-white">
                      {data.followersCount.toLocaleString()}
                    </span>
                    <span>followers</span>
                  </div>
                )}
              </div>
            </div>

            {(data.url || data.userId) && (
              <a
                href={
                  sanitizePlatformUrl(data.url, ['roblox.com']) ||
                  sanitizePlatformUrl(
                    data.userId
                      ? `https://www.roblox.com/users/${encodeURIComponent(data.userId)}/profile`
                      : 'https://www.roblox.com',
                    ['roblox.com'],
                    'https://www.roblox.com',
                  )
                }
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white transition-colors"
                title="View Roblox Profile"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Featured Collectibles / Favorite Places */}
          {data.showCollectibles !== false &&
            (() => {
              const hasItems = Array.isArray(data.items) && data.items.length > 0;
              const hasPlaces = Array.isArray(data.places) && data.places.length > 0;

              // If top 5 collectibles were substituted with places or displayContent is 'places'
              const isSubstitutedPlaces = hasItems && data.items[0]?.type === 'Place';
              const showPlaces =
                isSubstitutedPlaces ||
                (!hasItems && hasPlaces) ||
                (data.displayContent === 'places' && hasPlaces);

              const rawList = showPlaces
                ? data.places?.length
                  ? data.places
                  : data.items
                : data.items;
              const list = Array.isArray(rawList) ? rawList.slice(0, 5) : [];
              if (list.length === 0) return null;

              const isGamePlace =
                showPlaces ||
                Boolean(list[0]?.placeId || list[0]?.universeId || list[0]?.type === 'Place');
              const sectionTitle = isGamePlace ? 'Favorite Places' : 'Featured Collectibles';

              return (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {sectionTitle}
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    {list.map((item: any, idx: number) => {
                      const itemUrl =
                        sanitizePlatformUrl(item.url, ['roblox.com']) ||
                        (item.placeId
                          ? sanitizePlatformUrl(
                              `https://www.roblox.com/games/${encodeURIComponent(item.placeId)}`,
                              ['roblox.com'],
                            )
                          : item.assetId
                            ? sanitizePlatformUrl(
                                `https://www.roblox.com/catalog/${encodeURIComponent(item.assetId)}`,
                                ['roblox.com'],
                              )
                            : null);

                      const content = (
                        <div
                          className="group/item relative aspect-square rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.25] p-1 flex items-center justify-center transition-all overflow-hidden shadow-sm hover:shadow-md cursor-pointer"
                          title={item.name}
                        >
                          {sanitizeImageUrl(item.iconUrl) ? (
                            <img
                              src={sanitizeImageUrl(item.iconUrl)}
                              alt={item.name || 'Roblox Item'}
                              loading="lazy"
                              className={`w-full h-full ${
                                isGamePlace ? 'object-cover' : 'object-contain'
                              } rounded-lg transition-transform duration-200 group-hover/item:scale-110`}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full rounded-lg bg-white/[0.04] flex items-center justify-center text-[10px] font-bold text-gray-400">
                              {(item.name || '?')[0].toUpperCase()}
                            </div>
                          )}
                          {/* Title overlay on hover */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-1 py-0.5 pt-2 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 pointer-events-none rounded-b-xl">
                            <p className="text-[8px] leading-tight text-white font-medium truncate text-center">
                              {item.name}
                            </p>
                          </div>
                        </div>
                      );

                      return itemUrl ? (
                        <a
                          key={item.assetId || item.placeId || item.universeId || idx}
                          href={sanitizePlatformUrl(itemUrl, ['roblox.com'], '#')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block focus:outline-none focus:ring-1 focus:ring-white/30 rounded-xl"
                        >
                          {content}
                        </a>
                      ) : (
                        <div key={idx}>{content}</div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
        </div>
      )}

      {/* TWITCH CARD */}
      {p === 'twitch' && (
        <div className="flex flex-col gap-2.5">
          {data.isLive ? (
            <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/70 via-[#180e29]/80 to-[#0e0e11] border border-purple-500/40 shadow-[0_0_24px_rgba(145,70,255,0.18)] transition-all group/live">
              {/* Channel Header Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-purple-950/60 border border-purple-400/40 shadow-sm">
                      <img
                        src={sanitizeImageUrl(data.avatarUrl, '/icons/brands/twitch.png')}
                        alt={data.displayName || data.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-white group-hover/live:text-purple-300 transition-colors truncate">
                        {data.displayName || data.username}
                      </span>
                    </div>
                    {data.showFollowersCount !== false &&
                      typeof data.followersCount === 'number' && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Users size={10} className="text-purple-400 shrink-0" />
                          <span>{data.followersCount.toLocaleString()} followers</span>
                        </span>
                      )}
                  </div>
                </div>

                {/* Live Badge + Viewers */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-[#eb0400] text-[9px] font-black tracking-wider text-white uppercase flex items-center gap-1 shadow-[0_0_12px_rgba(235,4,0,0.5)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-gray-200 flex items-center gap-1">
                    <Users size={10} className="text-red-400" />
                    {(data.viewersCount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Stream Title & Game Category */}
              {(data.streamTitle || data.gameName) && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
                  {data.streamTitle && (
                    <div className="text-xs font-medium text-gray-100 leading-snug line-clamp-2">
                      {data.streamTitle}
                    </div>
                  )}
                  {data.gameName && (
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 rounded-lg w-fit">
                      <Gamepad2 size={11} className="text-purple-400 shrink-0" />
                      <span className="truncate">{data.gameName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Watch on Twitch Link Button */}
              <a
                href={
                  sanitizePlatformUrl(data.url, ['twitch.tv']) ||
                  sanitizePlatformUrl(
                    data.username
                      ? `https://twitch.tv/${encodeURIComponent(data.username)}`
                      : 'https://twitch.tv',
                    ['twitch.tv'],
                    'https://twitch.tv',
                  )
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#9146FF] hover:bg-[#772ce8] transition-all rounded-xl py-2 px-3 shadow-[0_4px_14px_rgba(145,70,255,0.35)] hover:scale-101 active:scale-99 cursor-pointer"
              >
                <span>Watch Stream on Twitch</span>
                <ExternalLink size={12} />
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] transition-all">
              {/* Channel Header Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-purple-950/30 border border-white/10 shrink-0">
                    <img
                      src={sanitizeImageUrl(data.avatarUrl, '/icons/brands/twitch.png')}
                      alt={data.displayName || data.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">
                      {data.displayName || data.username}
                    </span>
                    {data.showFollowersCount !== false &&
                      typeof data.followersCount === 'number' && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Users size={10} className="text-gray-400 shrink-0" />
                          <span>{data.followersCount.toLocaleString()} followers</span>
                        </span>
                      )}
                  </div>
                </div>

                {/* Offline Badge */}
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-semibold text-gray-400 flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                  Offline
                </span>
              </div>

              {/* Visit Channel Link */}
              <a
                href={
                  sanitizePlatformUrl(data.url, ['twitch.tv']) ||
                  sanitizePlatformUrl(
                    data.username
                      ? `https://twitch.tv/${encodeURIComponent(data.username)}`
                      : 'https://twitch.tv',
                    ['twitch.tv'],
                    'https://twitch.tv',
                  )
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl py-2 px-3 transition-colors cursor-pointer"
              >
                <span>Visit Twitch Channel</span>
                <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
      )}

      {/* SPOTIFY RICH CARD */}
      {p === 'spotify' &&
        (() => {
          const displayMode = data.displayMode || 'tracks';
          const likedSongs: any[] = Array.isArray(data.likedSongs) ? data.likedSongs : [];
          const playlists: any[] = Array.isArray(data.playlists) ? data.playlists : [];
          const favoriteTrackIds: string[] = Array.isArray(data.favoriteTracks)
            ? data.favoriteTracks
            : [];
          const favoritePlaylistIds: string[] = Array.isArray(data.favoritePlaylists)
            ? data.favoritePlaylists
            : [];

          const displayTracks =
            favoriteTrackIds.length > 0
              ? likedSongs.filter((t) => favoriteTrackIds.includes(t.id)).slice(0, 3)
              : likedSongs.slice(0, 3);

          const displayPlaylists =
            favoritePlaylistIds.length > 0
              ? playlists.filter((pl) => favoritePlaylistIds.includes(pl.id)).slice(0, 3)
              : playlists.slice(0, 3);

          const formatDuration = (ms: number) => {
            const totalSec = Math.floor((ms || 0) / 1000);
            const min = Math.floor(totalSec / 60);
            const sec = totalSec % 60;
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
          };

          return (
            <div className="flex flex-col gap-2.5">
              {/* Mode 1: Favorite Tracks */}
              {displayMode === 'tracks' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-[#1DB954]">
                      <Music size={11} /> Favorite Tracks
                    </span>
                    <span>{displayTracks.length} of 3</span>
                  </div>

                  {displayTracks.length === 0 ? (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-gray-400">
                      No favorite tracks selected.
                    </div>
                  ) : (
                    displayTracks.map((track) => (
                      <a
                        key={track.id}
                        href={getSafeSpotifyTrackUrl(track)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all group/track cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={sanitizeImageUrl(track.albumArt, '/icons/brands/spotify.png')}
                            alt={track.title}
                            loading="lazy"
                            decoding="async"
                            className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/10"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate group-hover/track:text-[#1DB954] transition-colors">
                              {track.title}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate">
                              {track.artist}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-gray-400 group-hover/track:text-white transition-colors">
                          <span className="text-[10px] font-mono">
                            {formatDuration(track.durationMs)}
                          </span>
                          <ExternalLink
                            size={11}
                            className="opacity-60 group-hover/track:opacity-100"
                          />
                        </div>
                      </a>
                    ))
                  )}
                </div>
              )}

              {/* Mode 2: Favorite Playlists */}
              {displayMode === 'playlists' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-[#1DB954]">
                      <Layers size={11} /> Featured Playlists
                    </span>
                    <span>{displayPlaylists.length} of 3</span>
                  </div>

                  {displayPlaylists.length === 0 ? (
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-gray-400">
                      No featured playlists selected.
                    </div>
                  ) : (
                    displayPlaylists.map((pl) => (
                      <a
                        key={pl.id}
                        href={
                          sanitizePlatformUrl(pl.externalUrl, ['spotify.com']) ||
                          sanitizePlatformUrl(
                            pl.id
                              ? `https://open.spotify.com/playlist/${encodeURIComponent(pl.id)}`
                              : 'https://open.spotify.com',
                            ['spotify.com'],
                            'https://open.spotify.com',
                          )
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all group/pl cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {pl.coverUrl ? (
                            <img
                              src={sanitizeImageUrl(pl.coverUrl)}
                              alt={pl.name}
                              loading="lazy"
                              decoding="async"
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/10"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[#18181b] border border-white/10 flex items-center justify-center text-gray-400 shrink-0">
                              <Layers size={16} />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate group-hover/pl:text-[#1DB954] transition-colors">
                              {pl.name}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {pl.tracksCount || 0} tracks
                            </span>
                          </div>
                        </div>

                        <ExternalLink
                          size={12}
                          className="text-gray-400 opacity-60 group-hover/pl:opacity-100 shrink-0"
                        />
                      </a>
                    ))
                  )}
                </div>
              )}

              {/* Spotify Footer Stats & Profile Link */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-[10px] text-gray-400">
                <span>
                  {likedSongs.length} Liked Songs • {playlists.length} Playlists
                </span>
                {data.spotifyUrl && (
                  <a
                    href={sanitizePlatformUrl(
                      data.spotifyUrl,
                      ['spotify.com'],
                      'https://open.spotify.com',
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-semibold text-[#1DB954] hover:underline"
                  >
                    <span>Open Spotify</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          );
        })()}

      {/* SOUNDCLOUD CARD */}
      {p === 'soundcloud' && (
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Music size={13} className="text-[#FF5500]" />
              {data.topTrack || `${data.likedSongsCount || 340} Liked Songs`}
            </span>
            <span className="text-[10px] text-gray-400">
              {data.topArtist || `${data.playlistsCount || 12} Public Playlists`}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/10 text-gray-300 font-semibold">
            {data.playlistsCount || 12} Playlists
          </span>
        </div>
      )}

      {/* X.COM, FACEBOOK, EPIC GAMES */}
      {(p === 'x' || p === 'facebook' || p === 'epicgames') && (
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs">
          <span className="text-gray-300 font-semibold">
            {p === 'epicgames'
              ? `${data.gamesCount || 84} Games Owned`
              : `${data.followersCount || data.friendsCount || 480} ${p === 'facebook' ? 'Friends' : 'Followers'}`}
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <Check size={12} /> Connected
          </span>
        </div>
      )}
    </div>
  );
};
