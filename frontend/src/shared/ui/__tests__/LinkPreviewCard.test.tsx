import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { LinkPreviewCard } from '../LinkPreviewCard';
import * as ogHook from '@/entities/opengraph/model/useLinkPreview';

vi.mock('@/entities/opengraph/model/useLinkPreview', () => ({
  useLinkPreview: vi.fn(),
}));

describe('LinkPreviewCard', () => {
  it('returns null when url is null or loading', () => {
    vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

    const { container } = render(<LinkPreviewCard url="https://example.com" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders preview card with title, description, favicon, and image', () => {
    vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
      data: {
        url: 'https://example.com',
        siteName: 'Example Site',
        title: 'Example Title',
        description: 'Example Description',
        image: 'https://example.com/og.jpg',
        favicon: 'https://example.com/favicon.ico',
      },
      isLoading: false,
    } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

    render(<LinkPreviewCard url="https://example.com" />);

    expect(screen.getByText('Example Site')).toBeInTheDocument();
    expect(screen.getByText('Example Title')).toBeInTheDocument();
    expect(screen.getByText('Example Description')).toBeInTheDocument();
    expect(screen.getByAltText('Example Title')).toBeInTheDocument();
  });

  it('handles image zoom toggle', () => {
    vi.spyOn(ogHook, 'useLinkPreview').mockReturnValue({
      data: {
        url: 'https://example.com',
        siteName: 'Example Site',
        title: 'Example Title',
        description: 'Example Description',
        image: 'https://example.com/og.jpg',
        favicon: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof ogHook.useLinkPreview>);

    render(<LinkPreviewCard url="https://example.com" />);

    const zoomBtn = screen.getByTitle('View full image');
    fireEvent.click(zoomBtn);

    const zoomedImgs = screen.getAllByAltText('Example Title');
    expect(zoomedImgs.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(zoomedImgs[zoomedImgs.length - 1]);
  });
});
