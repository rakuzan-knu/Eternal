import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { LinkPreviewBanner } from '../LinkPreviewBanner';
import type { LinkEmbedData } from '@/entities/opengraph/model/types';

describe('LinkPreviewBanner', () => {
  it('renders title, site name, thumbnail and triggers onDismiss when X is clicked', () => {
    const mockData: LinkEmbedData = {
      url: 'https://youtube.com/watch?v=123',
      type: 'youtube',
      title: 'Amazing Video',
      description: 'Check this video',
      siteName: 'YouTube',
      image: 'https://img.youtube.com/vi/123/hqdefault.jpg',
      favicon: null,
    };

    const handleDismiss = vi.fn();

    const { container } = render(<LinkPreviewBanner data={mockData} onDismiss={handleDismiss} />);

    expect(screen.getByTestId('link-preview-banner')).toBeInTheDocument();
    expect(screen.getByText('Amazing Video')).toBeInTheDocument();
    expect(screen.getByText('Link · YouTube')).toBeInTheDocument();

    const img = container.querySelector('img')!;
    fireEvent.error(img);

    const dismissBtn = screen.getByTitle('Dismiss link preview');
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalled();
  });

  it('handles invalid URL string and different embed types (github, spotify, generic)', () => {
    const invalidUrlData: LinkEmbedData = {
      url: 'not-a-valid-url',
      type: 'generic',
      title: null,
      description: null,
      siteName: 'FallbackSite',
      image: null,
      favicon: null,
    };

    const { rerender } = render(<LinkPreviewBanner data={invalidUrlData} onDismiss={vi.fn()} />);
    expect(screen.getByText('FallbackSite')).toBeInTheDocument();

    // Github type
    rerender(
      <LinkPreviewBanner
        data={{ ...invalidUrlData, type: 'github', url: 'https://github.com/repo' }}
        onDismiss={vi.fn()}
      />,
    );

    // Audio type
    rerender(
      <LinkPreviewBanner
        data={{ ...invalidUrlData, type: 'spotify', url: 'https://spotify.com/track/1' }}
        onDismiss={vi.fn()}
      />,
    );

    // Youtube type without image
    rerender(
      <LinkPreviewBanner
        data={{
          ...invalidUrlData,
          type: 'youtube',
          url: 'https://youtube.com/watch?v=abc',
          image: null,
        }}
        onDismiss={vi.fn()}
      />,
    );
  });
});
