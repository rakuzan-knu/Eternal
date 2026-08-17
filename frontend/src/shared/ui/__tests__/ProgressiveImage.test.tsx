import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
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

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/highres.jpg');
    expect(img).toHaveAttribute('alt', 'High res scenery');
  });

  it('renders blurhash canvas placeholder when blurhash is provided', () => {
    const { container } = render(
      <ProgressiveImage
        src="https://example.com/highres.jpg"
        blurhash="LEHLk~WB2yk8pyo0adR*.7kCMdnj"
      />,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});
