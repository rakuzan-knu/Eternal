import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MediaCarousel } from '../MediaCarousel';
import type { PostMedia } from '../../model/types';

describe('MediaCarousel', () => {
  const mockMedia: PostMedia[] = [
    { id: 'm1', url: 'https://example.com/photo1.jpg', type: 'IMAGE' },
    { id: 'm2', url: 'https://example.com/photo2.jpg', type: 'IMAGE' },
  ];

  it('renders media items and allows navigation between them', () => {
    const { container } = render(<MediaCarousel media={mockMedia} />);
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(2);

    const nextButton = container.querySelector('button .lucide-chevron-right')?.parentElement;
    expect(nextButton).toBeInTheDocument();

    if (nextButton) {
      fireEvent.click(nextButton);
    }
  });

  it('renders single media without carousel navigation buttons', () => {
    const { container } = render(<MediaCarousel media={[mockMedia[0]]} />);
    const nextButton = container.querySelector('button .lucide-chevron-right');
    expect(nextButton).not.toBeInTheDocument();
  });
});
