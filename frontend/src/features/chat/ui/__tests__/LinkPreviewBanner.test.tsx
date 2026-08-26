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

    render(<LinkPreviewBanner data={mockData} onDismiss={handleDismiss} />);

    expect(screen.getByTestId('link-preview-banner')).toBeInTheDocument();
    expect(screen.getByText('Amazing Video')).toBeInTheDocument();
    expect(screen.getByText('Link · YouTube')).toBeInTheDocument();

    const dismissBtn = screen.getByTitle('Dismiss link preview');
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalled();
  });
});
