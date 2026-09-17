import React from 'react';
import {
  GitHubBrandIcon,
  SteamBrandIcon,
  SpotifyBrandIcon,
  YouTubeBrandIcon,
  TwitchBrandIcon,
  RobloxBrandIcon,
} from '@/shared/ui/BrandIcons';

export interface PlatformConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  accentColor: string;
  placeholder: string;
  description: string;
  authProviderName: string;
}

export const PLATFORMS_LIST: PlatformConfig[] = [
  {
    id: 'steam',
    name: 'Steam',
    icon: <SteamBrandIcon size={38} />,
    accentColor: '#1b2838',
    placeholder: 'Steam ID',
    description: 'Display Steam level, games count, and featured Dota 2 or CS2 ranks.',
    authProviderName: 'Steam OpenID',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: <GitHubBrandIcon size={38} />,
    accentColor: '#24292e',
    placeholder: 'github_username',
    description:
      'Sync your profile card, public repositories count, and feature a pinned repository.',
    authProviderName: 'GitHub OAuth',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: <SpotifyBrandIcon size={38} />,
    accentColor: '#1DB954',
    placeholder: 'Spotify Username',
    description: 'Showcase liked songs count, playlists, and top tracks with audio previews.',
    authProviderName: 'Spotify OAuth',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: <YouTubeBrandIcon size={38} />,
    accentColor: '#FF0000',
    placeholder: 'YouTube Channel',
    description: 'Showcase subscribers count, total views, and feature 3 video uploads.',
    authProviderName: 'Google OAuth',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: <TwitchBrandIcon size={38} />,
    accentColor: '#9146FF',
    placeholder: 'Twitch Channel',
    description: 'Display live streaming status, game category, viewers, and followers count.',
    authProviderName: 'Twitch OAuth',
  },
  {
    id: 'roblox',
    name: 'Roblox',
    icon: <RobloxBrandIcon size={38} />,
    accentColor: '#000000',
    placeholder: 'Roblox Username',
    description:
      'Display 3D avatar bust, friends count, 5 inventory collectibles, and 5 favorite places.',
    authProviderName: 'Roblox Open Cloud',
  },
];
