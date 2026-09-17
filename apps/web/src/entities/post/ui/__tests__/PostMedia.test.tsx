import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostMedia } from '../PostMedia';
import { PostMedia as PostMediaType } from '../../model/types';

vi.mock('../VideoPlayer', () => ({
  VideoPlayer: ({ src }: { src: string }) => <div data-testid="video-player">{src}</div>,
}));

vi.mock('../MediaCarousel', () => ({
  MediaCarousel: ({ media }: { media: PostMediaType[] }) => (
    <div data-testid="media-carousel">{media.length} items</div>
  ),
}));

vi.mock('@/shared/ui/ProgressiveImage', () => ({
  ProgressiveImage: ({ src }: { src: string }) => <img data-testid="progressive-img" src={src} />,
}));

describe('PostMedia', () => {
  it('returns null if media array is empty or undefined', () => {
    const { container } = render(<PostMedia media={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders single image properly', () => {
    const media: PostMediaType[] = [{ type: 'image', url: 'https://example.com/photo.jpg' }];
    render(<PostMedia media={media} />);
    const img = screen.getByTestId('progressive-img');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('renders single video player', () => {
    const media: PostMediaType[] = [{ type: 'video', url: 'https://example.com/video.mp4' }];
    render(<PostMedia media={media} />);
    expect(screen.getByTestId('video-player')).toHaveTextContent('https://example.com/video.mp4');
  });

  it('renders carousel when multiple items include a video', () => {
    const media: PostMediaType[] = [
      { type: 'image', url: 'https://example.com/1.jpg' },
      { type: 'video', url: 'https://example.com/2.mp4' },
    ];
    render(<PostMedia media={media} />);
    expect(screen.getByTestId('media-carousel')).toBeInTheDocument();
  });

  it('renders grid with overflow badge when more than 4 images', () => {
    const media: PostMediaType[] = [
      { type: 'image', url: 'https://example.com/1.jpg' },
      { type: 'image', url: 'https://example.com/2.jpg' },
      { type: 'image', url: 'https://example.com/3.jpg' },
      { type: 'image', url: 'https://example.com/4.jpg' },
      { type: 'image', url: 'https://example.com/5.jpg' },
      { type: 'image', url: 'https://example.com/6.jpg' },
    ];
    render(<PostMedia media={media} />);
    expect(screen.getAllByTestId('progressive-img')).toHaveLength(4);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
