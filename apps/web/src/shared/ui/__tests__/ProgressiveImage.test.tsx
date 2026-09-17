import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ProgressiveImage } from '../ProgressiveImage';

describe('ProgressiveImage', () => {
  it('renders image with src and alt', () => {
    const { container } = render(
      <ProgressiveImage
        src="https://example.com/highres.jpg"
        alt="High res scenery"
        aspectRatio={16 / 9}
      />,
    );

    const img = container.querySelector('img')!;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/highres.jpg');
    expect(img).toHaveAttribute('alt', 'High res scenery');

    // Trigger onLoad
    fireEvent.load(img);
    expect(img).toHaveClass('opacity-100');
  });

  it('renders blurhash canvas placeholder and draws blurhash imageData', () => {
    const mockCtx = {
      createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(32 * 32 * 4) }),
      putImageData: vi.fn(),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);

    const { container } = render(
      <ProgressiveImage
        src="https://example.com/highres.jpg"
        blurhash="LEHLk~WB2yk8pyo0adR*.7kCMdnj"
      />,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(mockCtx.createImageData).toHaveBeenCalledWith(32, 32);
    expect(mockCtx.putImageData).toHaveBeenCalled();
  });

  it('handles invalid blurhash gracefully', () => {
    const { container } = render(
      <ProgressiveImage src="https://example.com/highres.jpg" blurhash="invalid" />,
    );
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('handles null canvas 2d context gracefully', () => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);
    const { container } = render(
      <ProgressiveImage
        src="https://example.com/highres.jpg"
        blurhash="LEHLk~WB2yk8pyo0adR*.7kCMdnj"
      />,
    );
    expect(container.querySelector('img')).toBeInTheDocument();
  });
});
