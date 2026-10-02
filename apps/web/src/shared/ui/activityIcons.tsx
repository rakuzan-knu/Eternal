import React from 'react';
import {
  SteamBrandIcon,
  BattleNetBrandIcon,
  Dota2BrandIcon,
  CS2BrandIcon,
  RobloxBrandIcon,
  SpotifyBrandIcon,
  SoundCloudBrandIcon,
  DiscordGamepadIcon,
} from './BrandIcons';

export function isMusicActivity(activity: any): boolean {
  if (!activity) return false;
  return Boolean(
    activity.type === 'spotify' || activity.type === 'music' || activity.trackId || activity.artist,
  );
}

export function isGamingActivity(activity: any): boolean {
  if (!activity) return false;
  if (isMusicActivity(activity)) return false;
  return Boolean(
    activity.type === 'gaming' ||
    activity.type === 'game' ||
    activity.isSteam ||
    activity.gameId ||
    (activity.title && activity.type !== 'spotify' && activity.type !== 'music'),
  );
}

export function getActivityGameIcon(activity: any, size = 14): React.ReactNode {
  if (!activity) return null;
  const title = (activity.title || activity.appName || '').toLowerCase();
  const gameId = (activity.gameId || '').toLowerCase();
  const cover = activity.imageUrl || activity.iconUrl || activity.coverUrl;

  if (cover) {
    return (
      <img
        src={cover}
        alt=""
        className="rounded-xs object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  if (gameId === 'dota2' || title.includes('dota')) {
    return <Dota2BrandIcon size={size} className="shrink-0" />;
  }
  if (
    gameId === 'cs2' ||
    title.includes('counter-strike') ||
    title.includes('cs2') ||
    title.includes('cs:go')
  ) {
    return <CS2BrandIcon size={size} className="shrink-0" />;
  }
  if (title.includes('league of legends') || title.includes('lol')) {
    return (
      <img
        src="/icons/brands/lol.png"
        alt="LoL"
        className="object-contain shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  if (title.includes('roblox')) {
    return <RobloxBrandIcon size={size} className="shrink-0" />;
  }
  if (title.includes('battle.net') || title.includes('battlenet')) {
    return <BattleNetBrandIcon size={size} className="shrink-0" />;
  }
  if (activity.isSteam || title.includes('steam')) {
    return <SteamBrandIcon size={size} className="shrink-0" />;
  }
  return <DiscordGamepadIcon size={size} className="text-[#23a55a] shrink-0" />;
}

export function getActivityMusicCover(activity: any, size = 14): React.ReactNode {
  if (!activity) return null;
  const cover = activity.imageUrl || activity.albumArt || activity.coverUrl;
  if (cover) {
    return (
      <img
        src={cover}
        alt="Cover"
        className="rounded-xs object-cover shrink-0 shadow-xs"
        style={{ width: size, height: size }}
      />
    );
  }
  if (
    activity.source === 'soundcloud' ||
    (activity.trackId && String(activity.trackId).startsWith('sc-'))
  ) {
    return <SoundCloudBrandIcon size={size} className="shrink-0" />;
  }
  return <SpotifyBrandIcon size={size} className="shrink-0" />;
}

export function formatActivityText(
  activity: any,
  maxTitleLen = 28,
  maxSubtitleLen = 18,
): { title: string; subtitle: string; fullText: string } {
  if (!activity) return { title: '', subtitle: '', fullText: '' };
  const rawTitle = String(activity.title || activity.appName || '').trim();
  const rawSubtitle = String(activity.subtitle || activity.artist || '').trim();

  const title =
    rawTitle.length > maxTitleLen ? `${rawTitle.slice(0, maxTitleLen).trimEnd()}…` : rawTitle;

  const subtitle =
    rawSubtitle.length > maxSubtitleLen
      ? `${rawSubtitle.slice(0, maxSubtitleLen).trimEnd()}…`
      : rawSubtitle;

  const fullText = rawSubtitle ? `${rawTitle} — ${rawSubtitle}` : rawTitle;

  return { title, subtitle, fullText };
}
