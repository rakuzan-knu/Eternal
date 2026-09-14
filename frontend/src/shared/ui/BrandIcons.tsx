import React from 'react';

interface BrandIconProps {
  size?: number;
  className?: string;
}

export const SteamBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/steam.png"
    alt="Steam"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const RiotGamesBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/riotgames.png"
    alt="Riot Games"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const BattleNetBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/battlenet.png"
    alt="Battle.net"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const Dota2BrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/dota2.png"
    alt="Dota 2"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const CS2BrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/cs2.png"
    alt="Counter-Strike 2"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const GitHubBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/github.png"
    alt="GitHub"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const SpotifyBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/spotify.png"
    alt="Spotify"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const YouTubeBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/youtube.png"
    alt="YouTube"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const TwitchBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/twitch.png"
    alt="Twitch"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const SoundCloudBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/soundcloud.png"
    alt="SoundCloud"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const RobloxBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/roblox.png"
    alt="Roblox"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const XBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/x.png"
    alt="X"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const FacebookBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/facebook.png"
    alt="Facebook"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const EpicGamesBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/epicgames.png"
    alt="Epic Games"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const MinecraftBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <img
    src="/icons/brands/minecraft.svg"
    alt="Minecraft"
    width={size}
    height={size}
    className={`object-contain shrink-0 select-none ${className}`}
    style={{ width: size, height: size }}
    loading="eager"
  />
);

export const DiscordBrandIcon: React.FC<BrandIconProps> = ({ size = 32, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <circle cx="12" cy="12" r="12" fill="#5865F2" />
    <path
      d="M18.1 6.5C16.9 6 15.7 5.6 14.4 5.4C14.2 5.7 14.1 6.1 13.9 6.4C12.6 6.2 11.3 6.2 10.1 6.4C9.9 6.1 9.7 5.7 9.6 5.4C8.3 5.6 7.1 6 5.9 6.5C3.7 9.8 3.1 13 3.4 16.1C4.9 17.2 6.3 17.8 7.7 18.2C8 17.8 8.4 17.3 8.6 16.8C8.1 16.6 7.6 16.3 7.2 16C7.3 15.9 7.4 15.8 7.5 15.7C10.4 17.1 13.6 17.1 16.5 15.7C16.6 15.8 16.7 15.9 16.8 16C16.4 16.3 15.9 16.6 15.4 16.8C15.6 17.3 16 17.8 16.3 18.2C17.7 17.8 19.1 17.2 20.6 16.1C21 12.5 20 9.3 18.1 6.5ZM8.5 14C7.7 14 7 13.3 7 12.5C7 11.7 7.7 11 8.5 11C9.3 11 10 11.7 10 12.5C10 13.3 9.3 14 8.5 14ZM15.5 14C14.7 14 14 13.3 14 12.5C14 11.7 14.7 11 15.5 11C16.3 11 17 11.7 17 12.5C17 13.3 16.3 14 15.5 14Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const DiscordGamepadIcon: React.FC<BrandIconProps> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`shrink-0 select-none ${className}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7 4C4.5 4 2.8 5.8 2.3 8.2L1.1 14.5C0.6 17 2.4 19.5 5 19.5C6.4 19.5 7.7 18.7 8.4 17.5L9.6 15.4C9.8 15.1 10.2 15 10.5 15H13.5C13.8 15 14.2 15.1 14.4 15.4L15.6 17.5C16.3 18.7 17.6 19.5 19 19.5C21.6 19.5 23.4 17 22.9 14.5L21.7 8.2C21.2 5.8 19.5 4 17 4H7ZM7.5 8C8.1 8 8.5 8.4 8.5 9V10H9.5C10.1 10 10.5 10.4 10.5 11C10.5 11.6 10.1 12 9.5 12H8.5V13C8.5 13.6 8.1 14 7.5 14C6.9 14 6.5 13.6 6.5 13V12H5.5C4.9 12 4.5 11.6 4.5 11C4.5 10.4 4.9 10 5.5 10H6.5V9C6.5 8.4 6.9 8 7.5 8ZM17 9.5C17.8 9.5 18.5 8.8 18.5 8C18.5 7.2 17.8 6.5 17 6.5C16.2 6.5 15.5 7.2 15.5 8C15.5 8.8 16.2 9.5 17 9.5ZM19 12C19.8 12 20.5 11.3 20.5 10.5C20.5 9.7 19.8 9 19 9C18.2 9 17.5 9.7 17.5 10.5C17.5 11.3 18.2 12 19 12ZM15 12C15.8 12 16.5 11.3 16.5 10.5C16.5 9.7 15.8 9 15 9C14.2 9 13.5 9.7 13.5 10.5C13.5 11.3 14.2 12 15 12ZM17 14.5C17.8 14.5 18.5 13.8 18.5 13C18.5 12.2 17.8 11.5 17 11.5C16.2 11.5 15.5 12.2 15.5 13C15.5 13.8 16.2 14.5 17 14.5Z"
    />
  </svg>
);

export const MalBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <rect width="24" height="24" rx="5" fill="#2E51A2" />
    <text
      x="12"
      y="16.5"
      fill="#FFFFFF"
      fontSize="9.5"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, sans-serif"
      textAnchor="middle"
      letterSpacing="-0.5"
    >
      MAL
    </text>
  </svg>
);

export const AniListBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <rect width="24" height="24" rx="5" fill="#02A9FF" />
    <path
      d="M13.8 6.5H16.2L19.5 17.5H17L16.2 14.8H13.8L13.8 17.5H11.4L13.8 6.5ZM14.3 12.8H15.7L15 10.2L14.3 12.8ZM5.5 17.5H9.5V15.2H7.9V6.5H5.5V17.5Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const CrunchyrollBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <rect width="24" height="24" rx="5" fill="#F47521" />
    <path
      d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4ZM10.5 16.2C8.18 16.2 6.3 14.32 6.3 12C6.3 9.68 8.18 7.8 10.5 7.8C12.82 7.8 14.7 9.68 14.7 12C14.7 14.32 12.82 16.2 10.5 16.2ZM14.2 12C14.2 13.66 12.86 15 11.2 15C9.54 15 8.2 13.66 8.2 12C8.2 10.34 9.54 9 11.2 9C12.86 9 14.2 10.34 14.2 12Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const ImdbBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <rect width="24" height="24" rx="4" fill="#F5C518" />
    <text
      x="12"
      y="16.5"
      fill="#000000"
      fontSize="8.5"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, sans-serif"
      textAnchor="middle"
      letterSpacing="-0.5"
    >
      IMDb
    </text>
  </svg>
);

export const TmdbBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
  >
    <rect width="24" height="24" rx="4" fill="#01B4E4" />
    <text
      x="12"
      y="16.5"
      fill="#FFFFFF"
      fontSize="7.5"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, sans-serif"
      textAnchor="middle"
      letterSpacing="-0.5"
    >
      TMDB
    </text>
  </svg>
);
