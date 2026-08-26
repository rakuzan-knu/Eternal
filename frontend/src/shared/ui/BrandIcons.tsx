import React from 'react';

interface BrandIconProps {
  size?: number;
  className?: string;
}

export const SpotifyBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-[0_2px_8px_rgba(29,185,84,0.4)] ${className}`}
  >
    <circle cx="12" cy="12" r="12" fill="#1DB954" />
    <path
      d="M17.5 10.8C14 8.7 8.2 8.5 4.8 9.5C4.3 9.7 3.7 9.3 3.6 8.8C3.4 8.3 3.8 7.7 4.3 7.6C8.3 6.4 14.7 6.6 18.8 9C19.3 9.3 19.4 9.9 19.1 10.4C18.8 10.8 18 11 17.5 10.8ZM17.4 13.5C17.1 13.9 16.6 14.1 16.2 13.8C13.4 12.1 9.1 11.6 5.8 12.6C5.3 12.7 4.9 12.5 4.7 12C4.6 11.5 4.8 11.1 5.3 10.9C9.1 9.8 13.8 10.3 17 12.3C17.5 12.5 17.6 13.1 17.4 13.5ZM16.1 16.1C15.9 16.4 15.5 16.5 15.2 16.3C12.9 14.9 9.9 14.5 6.1 15.4C5.7 15.5 5.4 15.2 5.3 14.9C5.2 14.5 5.5 14.2 5.8 14.1C10 13.1 13.3 13.5 15.9 15.1C16.3 15.3 16.3 15.8 16.1 16.1Z"
      fill="#000000"
    />
  </svg>
);

export const SteamBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-[0_2px_8px_rgba(23,26,33,0.6)] ${className}`}
  >
    <defs>
      <linearGradient id="steamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#171a21" />
        <stop offset="50%" stopColor="#1b2838" />
        <stop offset="100%" stopColor="#2a475e" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="12" fill="url(#steamGrad)" />
    <path
      d="M12 2C6.5 2 2 6.5 2 12C2 15.6 3.9 18.8 6.8 20.6L10.3 15.6C10.1 15.1 10 14.6 10 14C10 11.8 11.8 10 14 10C16.2 10 18 11.8 18 14C18 16.2 16.2 18 14 18C13.4 18 12.9 17.9 12.4 17.7L7.4 21.2C8.8 21.7 10.4 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM14 11.5C15.4 11.5 16.5 12.6 16.5 14C16.5 15.4 15.4 16.5 14 16.5C12.6 16.5 11.5 15.4 11.5 14C11.5 12.6 12.6 11.5 14 11.5Z"
      fill="#66C0F4"
    />
  </svg>
);

export const DiscordBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-[0_2px_8px_rgba(88,101,242,0.4)] ${className}`}
  >
    <rect width="24" height="24" rx="12" fill="#5865F2" />
    <path
      d="M18.1 6.5C16.9 6 15.7 5.6 14.4 5.4C14.2 5.7 14.1 6.1 13.9 6.4C12.6 6.2 11.3 6.2 10.1 6.4C9.9 6.1 9.7 5.7 9.6 5.4C8.3 5.6 7.1 6 5.9 6.5C3.7 9.8 3.1 13 3.4 16.1C4.9 17.2 6.3 17.8 7.7 18.2C8 17.8 8.4 17.3 8.6 16.8C8.1 16.6 7.6 16.3 7.2 16C7.3 15.9 7.4 15.8 7.5 15.7C10.4 17.1 13.6 17.1 16.5 15.7C16.6 15.8 16.7 15.9 16.8 16C16.4 16.3 15.9 16.6 15.4 16.8C15.6 17.3 16 17.8 16.3 18.2C17.7 17.8 19.1 17.2 20.6 16.1C21 12.5 20 9.3 18.1 6.5ZM8.5 14C7.7 14 7 13.3 7 12.5C7 11.7 7.7 11 8.5 11C9.3 11 10 11.7 10 12.5C10 13.3 9.3 14 8.5 14ZM15.5 14C14.7 14 14 13.3 14 12.5C14 11.7 14.7 11 15.5 11C16.3 11 17 11.7 17 12.5C17 13.3 16.3 14 15.5 14Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const TwitchBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 drop-shadow-[0_2px_8px_rgba(145,70,255,0.4)] ${className}`}
  >
    <rect width="24" height="24" rx="12" fill="#9146FF" />
    <path
      d="M5.5 5L4.5 8V18H7.5V20.5H10L12.5 18H15L19.5 13.5V5H5.5ZM18 12.5L15.5 15H12L9.5 17.5V15H7V6.5H18V12.5ZM15.5 8.5H14V12.5H15.5V8.5ZM11.5 8.5H10V12.5H11.5V8.5Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const GitHubBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <circle cx="12" cy="12" r="12" fill="#24292e" />
    <path
      d="M12 4C7.58 4 4 7.58 4 12C4 15.54 6.29 18.53 9.47 19.59C9.87 19.66 10.02 19.42 10.02 19.21C10.02 19.02 10.01 18.39 10.01 17.62C7.78 18.1 7.31 16.67 7.31 16.67C6.95 15.74 6.42 15.5 6.42 15.5C5.69 15 6.48 15.01 6.48 15.01C7.29 15.07 7.71 15.84 7.71 15.84C8.43 17.07 9.6 16.71 10.06 16.51C10.13 15.99 10.34 15.63 10.57 15.43C8.79 15.23 6.92 14.54 6.92 11.47C6.92 10.6 7.23 9.88 7.74 9.32C7.66 9.12 7.38 8.3 7.82 7.21C7.82 7.21 8.49 6.99 10.01 8.02C10.65 7.84 11.33 7.75 12.01 7.75C12.69 7.75 13.37 7.84 14.01 8.02C15.53 6.99 16.2 7.21 16.2 7.21C16.64 8.3 16.36 9.12 16.28 9.32C16.79 9.88 17.1 10.6 17.1 11.47C17.1 14.55 15.22 15.23 13.43 15.43C13.72 15.68 13.98 16.17 13.98 16.92C13.98 18 13.97 18.87 13.97 19.21C13.97 19.42 14.11 19.67 14.52 19.59C17.7 18.53 20 15.54 20 12C20 7.58 16.42 4 12 4Z"
      fill="#FFFFFF"
    />
  </svg>
);

export const EpicGamesBrandIcon: React.FC<BrandIconProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <rect width="24" height="24" rx="12" fill="#121212" />
    <path
      d="M12 3.5L5.5 6.5V17.5L12 20.5L18.5 17.5V6.5L12 3.5ZM16.5 15.8L12 18.2L7.5 15.8V8.2L12 5.8L16.5 8.2V15.8Z"
      fill="#FFFFFF"
    />
  </svg>
);
