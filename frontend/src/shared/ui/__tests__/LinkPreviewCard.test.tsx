import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LinkPreviewCard } from '../LinkPreviewCard';
import * as useLinkPreviewModule from '@/entities/opengraph/model/useLinkPreview';

describe('LinkPreviewCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when url is null or metadata is empty', () => {
    vi.spyOn(useLinkPreviewModule, 'useLinkPreview').mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useLinkPreviewModule.useLinkPreview>);

    const { container } = render(<LinkPreviewCard url={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Discord/Telegram style card with site name, title, description and image', () => {
    vi.spyOn(useLinkPreviewModule, 'useLinkPreview').mockReturnValue({
      data: {
        url: 'https://gemini.google.com/app',
        siteName: 'Google Gemini',
        title: 'Google Gemini AI',
        description: 'Meet Gemini, Google’s AI assistant.',
        image: 'https://gemini.google.com/banner.png',
        favicon: 'https://gemini.google.com/favicon.ico',
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useLinkPreviewModule.useLinkPreview>);

    render(<LinkPreviewCard url="https://gemini.google.com/app" />);

    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
    expect(screen.getByText('Google Gemini AI')).toBeInTheDocument();
    expect(screen.getByText('Meet Gemini, Google’s AI assistant.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Google Gemini AI' })).toHaveAttribute(
      'src',
      'https://gemini.google.com/banner.png',
    );
  });
});
