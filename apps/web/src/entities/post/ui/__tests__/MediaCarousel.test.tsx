import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MediaCarousel } from '../MediaCarousel';
import type { PostMedia } from '../../model/types';

describe('MediaCarousel', () => {
  const mockMedia: PostMedia[] = [
    { id: 'm1', url: 'https://example.com/photo1.jpg', type: 'IMAGE' },
    {
      id: 'm2',
      url: 'https://example.com/video.mp4',
      type: 'video',
      poster: 'https://example.com/poster.jpg',
    },
    { id: 'm3', url: 'https://example.com/photo2.jpg', type: 'image' },
  ];

  it('renders media items, videos with poster, and allows navigation between them', () => {
    const { container } = render(<MediaCarousel media={mockMedia} />);
    const images = container.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);

    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();

    const nextButton = container.querySelector('button .lucide-chevron-right')?.parentElement;
    expect(nextButton).toBeInTheDocument();

    const prevButton = container.querySelector('button .lucide-chevron-left')?.parentElement;
    expect(prevButton).toBeInTheDocument();

    if (nextButton) {
      fireEvent.click(nextButton);
    }
    if (prevButton) {
      fireEvent.click(prevButton);
    }

    const dotButtons = container.querySelectorAll('.absolute.bottom-3 button');
    if (dotButtons.length > 0) {
      fireEvent.click(dotButtons[1]);
    }
  });

  it('renders single media without carousel navigation buttons', () => {
    const { container } = render(<MediaCarousel media={[mockMedia[0]]} />);
    const nextButton = container.querySelector('button .lucide-chevron-right');
    expect(nextButton).not.toBeInTheDocument();
  });

  it('renders uppercase VIDEO type without poster', () => {
    const { container } = render(
      <MediaCarousel media={[{ id: 'm4', url: 'https://vid.mp4', type: 'VIDEO' }]} />,
    );
    expect(container.querySelector('video')).toBeInTheDocument();
  });
});
