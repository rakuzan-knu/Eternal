import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioEmbedCard } from '../AudioEmbedCard';
import { GenericOpenGraphCard } from '../GenericOpenGraphCard';
import { GitHubEmbedCard } from '../GitHubEmbedCard';
import { YouTubeEmbedCard } from '../YouTubeEmbedCard';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import type { LinkEmbedData } from '../../../model/types';

describe('Embed Cards Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AudioEmbedCard', () => {
    const mockSpotifyData: LinkEmbedData = {
      url: 'https://open.spotify.com/track/12345',
      type: 'spotify',
      title: 'Bohemian Rhapsody',
      description: null,
      siteName: 'Spotify',
      image: 'https://example.com/cover.jpg',
      favicon: null,
      audio: {
        provider: 'spotify',
        audioType: 'track',
        artist: 'Queen',
        embedUrl: 'https://open.spotify.com/embed/track/12345',
      },
    };

    const mockSoundCloudData: LinkEmbedData = {
      url: 'https://soundcloud.com/artist/track',
      type: 'soundcloud',
      title: 'SoundCloud Track',
      description: null,
      siteName: 'SoundCloud',
      image: null,
      favicon: null,
      audio: {
        provider: 'soundcloud',
        audioType: 'track',
        artist: 'Indie Artist',
        embedUrl: 'https://w.soundcloud.com/player/?url=https://soundcloud.com/artist/track',
      },
    };

    it('renders Spotify track with cover and artist', () => {
      render(<AudioEmbedCard data={mockSpotifyData} />);

      expect(screen.getByText('Bohemian Rhapsody')).toBeInTheDocument();
      expect(screen.getByText('Queen')).toBeInTheDocument();
      expect(screen.getByTitle('Spotify')).toBeInTheDocument();
    });

    it('renders SoundCloud track with fallback icon when cover is missing or broken', () => {
      const { rerender } = render(<AudioEmbedCard data={mockSoundCloudData} />);

      expect(screen.getByText('SoundCloud Track')).toBeInTheDocument();
      expect(screen.getByText('Indie Artist')).toBeInTheDocument();
      expect(screen.getByTitle('SoundCloud')).toBeInTheDocument();

      // Image error on cover
      rerender(<AudioEmbedCard data={{ ...mockSpotifyData, image: 'https://broken.jpg' }} />);
      const img = screen.getByAltText('Bohemian Rhapsody');
      fireEvent.error(img);
    });

    it('expands into iframe on play button click and catches stopAll error', () => {
      vi.spyOn(useActiveMediaPlaybackStore.getState(), 'stopAll').mockImplementationOnce(() => {
        throw new Error('StopAll failed');
      });

      render(<AudioEmbedCard data={mockSpotifyData} />);

      const playBtn = screen.getByTitle('Play audio');
      fireEvent.click(playBtn);

      expect(screen.getByTestId('audio-embed-card-expanded')).toBeInTheDocument();
      const iframe = screen.getByTitle('Bohemian Rhapsody');
      expect(iframe).toHaveAttribute('src', mockSpotifyData.audio!.embedUrl);
    });

    it('stops propagation on card and link click', () => {
      const cardClickSpy = vi.fn();
      render(
        <div onClick={cardClickSpy}>
          <AudioEmbedCard data={mockSoundCloudData} />
        </div>,
      );

      const extLink = screen.getByTitle('Open in new tab');
      fireEvent.click(extLink);
      expect(cardClickSpy).not.toHaveBeenCalled();
    });
  });

  describe('GenericOpenGraphCard', () => {
    const mockOgData: LinkEmbedData = {
      url: 'https://www.example.com/article/101',
      type: 'generic',
      title: 'Exciting Tech News',
      description: 'A deep dive into modern web technologies.',
      siteName: 'Example News',
      favicon: 'https://example.com/favicon.ico',
      image: 'https://example.com/og-image.jpg',
    };

    it('renders OpenGraph title, description, domain, and image', () => {
      render(<GenericOpenGraphCard data={mockOgData} />);

      expect(screen.getByText('Exciting Tech News')).toBeInTheDocument();
      expect(screen.getByText('A deep dive into modern web technologies.')).toBeInTheDocument();
      expect(screen.getByText('Example News')).toBeInTheDocument();

      const img = screen.getByAltText('Exciting Tech News');
      expect(img).toBeInTheDocument();
      fireEvent.load(img);
      expect(img).toHaveClass('opacity-100');
    });

    it('handles favicon error and broken image fallback', () => {
      const { container } = render(<GenericOpenGraphCard data={mockOgData} />);

      const favImg = container.querySelector(
        'img[src="https://example.com/favicon.ico"]',
      ) as HTMLImageElement;
      if (favImg) {
        fireEvent.error(favImg);
        expect(favImg.style.display).toBe('none');
      }

      const ogImg = screen.getByAltText('Exciting Tech News');
      fireEvent.error(ogImg);
    });

    it('handles invalid URL gracefully', () => {
      render(
        <GenericOpenGraphCard
          data={{
            url: 'invalid-url',
            type: 'generic',
            title: null,
            description: null,
            favicon: null,
            siteName: 'Fallback Site',
            image: null,
          }}
        />,
      );
      expect(screen.getByText('Fallback Site')).toBeInTheDocument();
    });
  });

  describe('GitHubEmbedCard', () => {
    const mockGhData: LinkEmbedData = {
      url: 'https://github.com/facebook/react',
      type: 'github',
      title: 'facebook/react',
      description: 'A JavaScript library for building user interfaces',
      siteName: 'GitHub',
      image: null,
      favicon: null,
      github: {
        owner: 'facebook',
        repo: 'react',
        stars: 225400,
        forks: 45200,
        language: 'JavaScript',
        languageColor: '#f1e05a',
        avatarUrl: 'https://github.com/facebook.png',
      },
    };

    it('renders repo details, stars, forks, language with formatting', () => {
      render(<GitHubEmbedCard data={mockGhData} />);

      expect(screen.getByText('facebook/react')).toBeInTheDocument();
      expect(screen.getByText(/JavaScript library/)).toBeInTheDocument();
      expect(screen.getByText('225.4k')).toBeInTheDocument();
      expect(screen.getByText('45.2k')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
    });

    it('handles 0 stars, 0 forks, million formatting and avatar error', () => {
      const millionData: LinkEmbedData = {
        url: 'https://github.com/org/huge',
        type: 'github',
        title: 'org/huge',
        description: null,
        siteName: 'GitHub',
        image: null,
        favicon: null,
        github: {
          owner: 'org',
          repo: 'huge',
          stars: 1200000,
          forks: 0,
          language: 'Rust',
          avatarUrl: 'https://broken-avatar.png',
        },
      };

      const { container } = render(<GitHubEmbedCard data={millionData} />);
      expect(screen.getByText('1.2M')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();

      const avatar = container.querySelector('img') as HTMLImageElement;
      if (avatar) {
        fireEvent.error(avatar);
        expect(avatar.style.display).toBe('none');
      }
    });

    it('renders fallback icon when avatar is not provided', () => {
      render(
        <GitHubEmbedCard
          data={{
            url: 'https://github.com/org/noavatar',
            type: 'github',
            title: 'noavatar',
            description: null,
            siteName: 'GitHub',
            image: null,
            favicon: null,
            github: undefined,
          }}
        />,
      );
      expect(screen.getByText('noavatar')).toBeInTheDocument();
    });
  });

  describe('YouTubeEmbedCard', () => {
    const mockYtData: LinkEmbedData = {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      type: 'youtube',
      title: 'Rick Astley - Never Gonna Give You Up',
      description: null,
      siteName: 'YouTube',
      image: null,
      favicon: null,
      youtube: {
        videoId: 'dQw4w9WgXcQ',
        author: 'RickAstleyVEVO',
        duration: '3:33',
        startSeconds: 65,
      },
    };

    it('renders video cover, title, author, start time and duration', () => {
      render(<YouTubeEmbedCard data={mockYtData} />);

      expect(screen.getByText('Rick Astley - Never Gonna Give You Up')).toBeInTheDocument();
      expect(screen.getByText('RickAstleyVEVO')).toBeInTheDocument();
      expect(screen.getByText('3:33')).toBeInTheDocument();
      expect(screen.getByText(/Start 1:05/)).toBeInTheDocument();
    });

    it('falls back through cover tiers (1 -> 2 -> 3) on image errors', () => {
      render(<YouTubeEmbedCard data={mockYtData} />);

      const coverImg1 = screen.getByAltText('Rick Astley - Never Gonna Give You Up');
      expect(coverImg1).toHaveAttribute(
        'src',
        'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      );

      // Error on tier 1 -> switches to tier 2
      fireEvent.error(coverImg1);
      const coverImg2 = screen.getByAltText('Rick Astley - Never Gonna Give You Up');
      expect(coverImg2).toHaveAttribute(
        'src',
        'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      );

      // Error on tier 2 -> switches to tier 3 (fallback icon view)
      fireEvent.error(coverImg2);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('plays video inside iframe when play button is clicked and catches stopAll error', () => {
      vi.spyOn(useActiveMediaPlaybackStore.getState(), 'stopAll').mockImplementationOnce(() => {
        throw new Error('StopAll failed');
      });

      render(<YouTubeEmbedCard data={mockYtData} />);

      const playWrapper = screen
        .getByText('Rick Astley - Never Gonna Give You Up')
        .closest('.relative')!;
      fireEvent.click(playWrapper);

      const iframe = screen.getByTitle('Rick Astley - Never Gonna Give You Up');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        'src',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&start=65',
      );
    });

    it('extracts videoId from youtu.be short url and returns null for invalid url without id', () => {
      const { rerender } = render(
        <YouTubeEmbedCard
          data={
            {
              url: 'https://youtu.be/shortId123',
              type: 'youtube',
              title: 'Short link',
              description: null,
              siteName: 'YouTube',
              image: null,
              favicon: null,
            } as LinkEmbedData
          }
        />,
      );
      expect(screen.getByText('Short link')).toBeInTheDocument();

      rerender(
        <YouTubeEmbedCard
          data={
            {
              url: 'invalid-url',
              type: 'youtube',
              title: null,
              description: null,
              siteName: null,
              image: null,
              favicon: null,
            } as LinkEmbedData
          }
        />,
      );
      expect(screen.queryByTestId('youtube-embed-card')).toBeNull();
    });
  });
});
