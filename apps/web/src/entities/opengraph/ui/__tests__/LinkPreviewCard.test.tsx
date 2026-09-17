import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { LinkPreviewCard } from '../LinkPreviewCard';
import * as ogHook from '../../model/useLinkPreview';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';

vi.mock('../../model/useLinkPreview', () => ({
  useLinkPreview: vi.fn(),
}));

describe('LinkPreviewCard & Rich Embeds 2.0', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Skeleton and Empty States', () => {
    it('renders skeleton pulse placeholder when loading with url', () => {
      vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

      render(<LinkPreviewCard url="https://example.com" />);
      expect(screen.getByTestId('link-preview-skeleton')).toBeInTheDocument();
    });

    it('returns null when url is null and not loading or data has no title/description/image', () => {
      vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
        data: null,
        isLoading: false,
      } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

      const { container } = render(<LinkPreviewCard url={null} />);
      expect(container.firstChild).toBeNull();

      const { container: emptyContainer } = render(
        <LinkPreviewCard
          url="https://example.com"
          embedData={
            {
              url: 'https://example.com',
              type: 'generic',
              title: null,
              description: null,
              siteName: null,
              image: null,
              favicon: null,
            } as any
          }
        />,
      );
      expect(emptyContainer.firstChild).toBeNull();
    });

    it('renders directly from embedData without calling useLinkPreview', () => {
      render(
        <LinkPreviewCard
          url="https://example.com/direct"
          embedData={{
            url: 'https://example.com/direct',
            type: 'generic',
            title: 'Direct Embed Title',
            description: 'Direct Description',
            siteName: 'Example',
            image: null,
            favicon: null,
          }}
        />,
      );

      expect(screen.getByText('Direct Embed Title')).toBeInTheDocument();
    });
  });

  describe('Generic OpenGraph Card', () => {
    it('renders generic card with title, description, domain and image', () => {
      vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
        data: {
          url: 'https://example.com/post/1',
          type: 'generic',
          siteName: 'Example Site',
          title: 'Example Title',
          description: 'Example Description',
          image: 'https://example.com/og.jpg',
          favicon: 'https://example.com/favicon.ico',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

      render(<LinkPreviewCard url="https://example.com/post/1" />);

      expect(screen.getByTestId('generic-opengraph-card')).toBeInTheDocument();
      expect(screen.getByText('Example Site')).toBeInTheDocument();
      expect(screen.getByText('Example Title')).toBeInTheDocument();
      expect(screen.getByText('Example Description')).toBeInTheDocument();
      expect(screen.getByAltText('Example Title')).toBeInTheDocument();

      // Favicon onError
      const faviconImg = document.querySelector(
        'img[src="https://example.com/favicon.ico"]',
      ) as HTMLImageElement;
      fireEvent.error(faviconImg);
      expect(faviconImg.style.display).toBe('none');
    });

    it('protects against broken image: hides image container on onError', () => {
      vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
        data: {
          url: 'https://example.com/post/broken',
          type: 'generic',
          siteName: 'Example Site',
          title: 'Broken Image Post',
          description: 'Text content only fallback',
          image: 'https://example.com/broken.jpg',
          favicon: null,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

      render(<LinkPreviewCard url="https://example.com/post/broken" />);

      const img = screen.getByAltText('Broken Image Post');
      fireEvent.error(img);

      expect(screen.queryByAltText('Broken Image Post')).not.toBeInTheDocument();
      expect(screen.getByText('Broken Image Post')).toBeInTheDocument();
    });
  });

  describe('YouTube Interactive Player (Facade Pattern)', () => {
    it('renders facade thumbnail, play button, and mounts iframe on click with singleton stop', () => {
      const stopAllSpy = vi.spyOn(useActiveMediaPlaybackStore.getState(), 'stopAll');

      vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
        data: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90',
          type: 'youtube',
          siteName: 'YouTube',
          title: 'Never Gonna Give You Up',
          description: 'YouTube · Rick Astley',
          image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          favicon: 'https://www.youtube.com/favicon.ico',
          youtube: {
            videoId: 'dQw4w9WgXcQ',
            author: 'Rick Astley',
            startSeconds: 90,
            duration: '3:33',
          },
        },
        isLoading: false,
      } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

      render(<LinkPreviewCard url="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90" />);

      expect(screen.getByTestId('youtube-embed-card')).toBeInTheDocument();
      expect(screen.getByText('Never Gonna Give You Up')).toBeInTheDocument();
      expect(screen.getByText('Rick Astley')).toBeInTheDocument();
      expect(screen.getByText('Start 1:30')).toBeInTheDocument();
      expect(screen.getByText('3:33')).toBeInTheDocument();

      // Click external link
      const extLink = screen.getByTitle('Open on YouTube');
      fireEvent.click(extLink);

      // Click play to mount iframe
      const card = screen.getByTestId('youtube-embed-card');
      fireEvent.click(card.querySelector('.cursor-pointer')!);

      expect(stopAllSpy).toHaveBeenCalled();
      const iframe = screen.getByTitle('Never Gonna Give You Up');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        'src',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&start=90',
      );
    });

    it('extracts videoId from youtu.be or youtube.com search params if not provided', () => {
      vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
        data: {
          url: 'https://youtu.be/dQw4w9WgXcQ',
          type: 'youtube',
          title: 'Shortened URL Video',
          image: 'https://example.com/img.jpg',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

      const { rerender } = render(<LinkPreviewCard url="https://youtu.be/dQw4w9WgXcQ" />);
      expect(screen.getByTestId('youtube-embed-card')).toBeInTheDocument();

      // Test youtube.com?v=123
      vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
        data: {
          url: 'https://www.youtube.com/watch?v=12345678901',
          type: 'youtube',
          title: 'Param Video',
          image: 'https://example.com/img.jpg',
        },
        isLoading: false,
      } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

      rerender(<LinkPreviewCard url="https://www.youtube.com/watch?v=12345678901" />);
      expect(screen.getByTestId('youtube-embed-card')).toBeInTheDocument();
    });

    it('falls back to hqdefault on maxres error and then icon on second error', () => {
      vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
        data: {
          url: 'https://youtu.be/dQw4w9WgXcQ',
          type: 'youtube',
          title: 'Video without maxres',
          siteName: 'YouTube',
          image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          favicon: null,
          youtube: {
            videoId: 'dQw4w9WgXcQ',
          },
        },
        isLoading: false,
      } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

      render(<LinkPreviewCard url="https://youtu.be/dQw4w9WgXcQ" />);

      // Initial: maxresdefault
      let img = screen.getByAltText('Video without maxres');
      expect(img).toHaveAttribute(
        'src',
        'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      );

      // Error 1: fallback to hqdefault
      fireEvent.error(img);
      img = screen.getByAltText('Video without maxres');
      expect(img).toHaveAttribute('src', 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');

      // Error 2: fallback to icon view
      fireEvent.error(img);
      expect(screen.queryByAltText('Video without maxres')).not.toBeInTheDocument();
    });
  });

  describe('GitHub Repository Card', () => {
    it('renders repository stats with stars, forks, and language indicator and formats numbers', () => {
      vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
        data: {
          url: 'https://github.com/facebook/react',
          type: 'github',
          siteName: 'GitHub',
          title: 'facebook/react',
          description: 'The library for web and native user interfaces.',
          image: 'https://avatars.githubusercontent.com/u/69631?v=4',
          favicon: 'https://github.githubassets.com/favicons/favicon.png',
          github: {
            owner: 'facebook',
            repo: 'react',
            stars: 1200000,
            forks: 450,
            language: 'TypeScript',
            languageColor: '#3178c6',
            avatarUrl: 'https://avatars.githubusercontent.com/u/69631?v=4',
          },
        },
        isLoading: false,
      } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

      render(<LinkPreviewCard url="https://github.com/facebook/react" />);

      expect(screen.getByTestId('github-embed-card')).toBeInTheDocument();
      expect(screen.getByText('facebook/react')).toBeInTheDocument();
      expect(screen.getByText('1.2M')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();

      // Avatar error
      const avatarImg = screen.getByAltText('facebook');
      fireEvent.error(avatarImg);
      expect(avatarImg.style.display).toBe('none');
    });
  });

  describe('Audio Embed Card (Spotify & SoundCloud)', () => {
    it('renders compact audio player with cover, title, artist and toggle embed', () => {
      const stopAllSpy = vi.spyOn(useActiveMediaPlaybackStore.getState(), 'stopAll');

      vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
        data: {
          url: 'https://soundcloud.com/artist/track',
          type: 'soundcloud',
          siteName: 'SoundCloud',
          title: 'SoundCloud Track',
          description: 'Listen on SoundCloud',
          image: 'https://example.com/sc-cover.jpg',
          favicon: 'https://soundcloud.com/favicon.ico',
          audio: {
            provider: 'soundcloud',
            audioType: 'track',
            artist: 'SoundCloud Artist',
            embedUrl: 'https://w.soundcloud.com/player/?url=https://soundcloud.com/artist/track',
          },
        },
        isLoading: false,
      } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

      render(<LinkPreviewCard url="https://soundcloud.com/artist/track" />);

      expect(screen.getByTestId('audio-embed-card')).toBeInTheDocument();
      expect(screen.getByText('SoundCloud Track')).toBeInTheDocument();
      expect(screen.getByText('SoundCloud Artist')).toBeInTheDocument();
      expect(screen.getByText('SoundCloud')).toBeInTheDocument();

      // Cover error
      const coverImg = screen.getByAltText('SoundCloud Track');
      fireEvent.error(coverImg);

      // Click external link
      const extLink = screen.getByTitle('Open in new tab');
      fireEvent.click(extLink);

      // Click play to toggle expanded iframe
      const playBtn = screen.getByTitle('Play audio');
      fireEvent.click(playBtn);

      expect(stopAllSpy).toHaveBeenCalled();
      expect(screen.getByTestId('audio-embed-card-expanded')).toBeInTheDocument();
    });
  });
});
