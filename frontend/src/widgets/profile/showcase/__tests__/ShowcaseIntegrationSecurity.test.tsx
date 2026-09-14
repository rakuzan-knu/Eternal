import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ShowcaseIntegrationCard } from '../ShowcaseIntegrationCard';

describe('ShowcaseIntegrationCard Security (CWE-79 & CWE-601 Hardening)', () => {
  describe('YouTube Platform Integration', () => {
    it('sanitizes external channel links and prevents arbitrary open redirect / javascript XSS', () => {
      const maliciousData = {
        username: 'victimChannel',
        url: 'javascript:alert("xss")',
        showSubscribersCount: true,
        subscribersCount: 15000,
      };

      const { container } = render(
        <ShowcaseIntegrationCard platform="youtube" data={maliciousData} isOwner={false} />,
      );

      const channelLink = container.querySelector('a[href*="youtube.com"]');
      expect(channelLink).not.toBeNull();
      // Should fallback to genuine YouTube profile URL instead of javascript:alert
      expect(channelLink?.getAttribute('href')).toBe('https://www.youtube.com/@victimChannel');
      expect(channelLink?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(channelLink?.getAttribute('target')).toBe('_blank');
    });

    it('rejects domain spoofs in channel URL and video URLs', () => {
      const spoofData = {
        username: 'spoofedUser',
        url: 'https://youtube.com.attacker.com/fake',
        videos: [
          {
            id: 'v123',
            title: 'Malicious Video',
            url: 'https://attacker-video.com/phishing',
            thumbnailUrl: 'javascript:stealCredentials()',
          },
        ],
      };

      const { container } = render(
        <ShowcaseIntegrationCard platform="youtube" data={spoofData} isOwner={false} />,
      );

      const links = container.querySelectorAll('a');
      links.forEach((link) => {
        const href = link.getAttribute('href') || '';
        expect(href).not.toContain('attacker.com');
        expect(href).not.toContain('phishing');
        expect(href).not.toContain('javascript:');
      });

      const img = container.querySelector('img');
      expect(img?.getAttribute('src')).not.toContain('javascript:');
    });
  });

  describe('Twitch Platform Integration', () => {
    it('prevents open redirect and DOM XSS in live stream and channel links', () => {
      const maliciousTwitchData = {
        username: 'twitchStreamer',
        displayName: 'Twitch Streamer',
        isLive: true,
        streamTitle: 'Live Gaming',
        url: 'https://fake-twitch-login.com/redirect',
        avatarUrl: 'data:text/html,<script>alert(1)</script>',
      };

      const { container } = render(
        <ShowcaseIntegrationCard platform="twitch" data={maliciousTwitchData} isOwner={false} />,
      );

      const streamLink = container.querySelector('a');
      expect(streamLink?.getAttribute('href')).toBe('https://twitch.tv/twitchStreamer');
      expect(streamLink?.getAttribute('rel')).toBe('noopener noreferrer');

      const avatarImg = container.querySelector('img');
      expect(avatarImg?.getAttribute('src')).toBe('/icons/brands/twitch.png');
    });

    it('sanitizes offline Twitch channel links and images', () => {
      const offlineData = {
        username: 'offlineUser',
        displayName: 'Offline User',
        isLive: false,
        url: 'javascript:void(0)',
        avatarUrl: 'javascript:alert(1)',
      };

      const { container } = render(
        <ShowcaseIntegrationCard platform="twitch" data={offlineData} isOwner={false} />,
      );

      const channelLink = container.querySelector('a');
      expect(channelLink?.getAttribute('href')).toBe('https://twitch.tv/offlineUser');

      const avatarImg = container.querySelector('img');
      expect(avatarImg?.getAttribute('src')).toBe('/icons/brands/twitch.png');
    });
  });

  describe('Roblox Platform Integration', () => {
    it('sanitizes Roblox profile links, collectible URLs, and avatar image schemes', () => {
      const robloxData = {
        userId: '12345678',
        username: 'RobloxGamer',
        displayName: 'Roblox Gamer',
        url: 'https://evil-roblox.com/login',
        avatarUrl: 'vbscript:evil()',
        items: [
          {
            assetId: '987654',
            name: 'Valkyrie Helm',
            url: 'https://phishing-roblox.com/item/987654',
            iconUrl: 'javascript:exploit()',
          },
        ],
      };

      const { container } = render(
        <ShowcaseIntegrationCard platform="roblox" data={robloxData} isOwner={false} />,
      );

      const links = container.querySelectorAll('a');
      links.forEach((link) => {
        const href = link.getAttribute('href') || '';
        expect(href).not.toContain('evil-roblox.com');
        expect(href).not.toContain('phishing-roblox.com');
        expect(href).not.toContain('javascript:');
      });

      const images = container.querySelectorAll('img');
      images.forEach((img) => {
        const src = img.getAttribute('src') || '';
        expect(src).not.toContain('vbscript:');
        expect(src).not.toContain('javascript:');
      });
    });
  });

  describe('GitHub Platform Integration', () => {
    it('sanitizes pinned repository links and prevents redirects outside github.com', () => {
      const githubData = {
        username: 'octocat',
        pinnedRepo: {
          name: 'safe-project',
          url: 'https://github.com.evil-proxy.org/octocat/safe-project',
          description: 'A test project',
          stars: 42,
          forks: 5,
        },
      };

      const { container } = render(
        <ShowcaseIntegrationCard platform="github" data={githubData} isOwner={false} />,
      );

      const repoLink = container.querySelector('a[href*="github.com/octocat/safe-project"]');
      expect(repoLink).not.toBeNull();
      expect(repoLink?.getAttribute('href')).toBe('https://github.com/octocat/safe-project');
      expect(repoLink?.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  describe('Spotify Platform Integration', () => {
    it('sanitizes playlist and profile links ensuring genuine spotify.com origins', () => {
      const spotifyData = {
        displayMode: 'playlists',
        spotifyUrl: 'https://open.spotify.com.attacker.com/user/ayate',
        playlists: [
          {
            id: 'playlist123',
            name: 'Synthwave Essentials',
            externalUrl: 'https://phishing-spotify.com/playlist123',
            coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
          },
        ],
      };

      const { container } = render(
        <ShowcaseIntegrationCard platform="spotify" data={spotifyData} isOwner={false} />,
      );

      const links = container.querySelectorAll('a');
      links.forEach((link) => {
        const href = link.getAttribute('href') || '';
        expect(href).not.toContain('attacker.com');
        expect(href).not.toContain('phishing-spotify.com');
        expect(href).toMatch(/^https:\/\/(?:open\.)?spotify\.com(?:\/|$)/);
      });
    });
  });
});
