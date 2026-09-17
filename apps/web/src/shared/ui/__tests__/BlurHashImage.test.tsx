import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BlurHashImage } from '../BlurHashImage';

describe('BlurHashImage', () => {
  it('renders image and handles load state transition', () => {
    const { container } = render(
      <BlurHashImage src="https://example.com/poster.jpg" alt="Reel thumbnail" />,
    );

    const img = container.querySelector('img')!;
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/poster.jpg');
    expect(img).toHaveAttribute('alt', 'Reel thumbnail');

    fireEvent.load(img);
    expect(img).toHaveClass('opacity-100');
  });

  it('draws blurhash to canvas when hash is provided', () => {
    const mockCtx = {
      createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(32 * 32 * 4) }),
      putImageData: vi.fn(),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);

    const { container } = render(
      <BlurHashImage
        src="https://example.com/poster.jpg"
        blurhash="LEHLk~WB2yk8pyo0adR*.7kCMdnj"
      />,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(mockCtx.createImageData).toHaveBeenCalledWith(32, 32);
    expect(mockCtx.putImageData).toHaveBeenCalled();
  });

  it('handles invalid blurhash without throwing', () => {
    expect(() => {
      render(<BlurHashImage src="https://example.com/poster.jpg" blurhash="invalid-hash" />);
    }).not.toThrow();
  });
});
