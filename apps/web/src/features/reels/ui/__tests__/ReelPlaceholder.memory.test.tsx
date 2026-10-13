import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReelPlaceholder } from '../ReelPlaceholder';
import { DEFAULT_SEED_REELS } from '@/entities/reel';

describe('ReelPlaceholder preview lifetime', () => {
  it('keeps distant reels as source-free shells', () => {
    const { container } = render(
      <ReelPlaceholder
        reel={{ ...DEFAULT_SEED_REELS[0], thumbnailUrl: '/thumbnail.jpg' }}
        showPreview={false}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('does not decode BlurHash canvases for distant reels', () => {
    const { container } = render(
      <ReelPlaceholder reel={DEFAULT_SEED_REELS[0]} showPreview={false} />,
    );
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('removes a nearby thumbnail when it moves out of the preview window', () => {
    const reel = { ...DEFAULT_SEED_REELS[0], thumbnailUrl: '/thumbnail.jpg' };
    const view = render(<ReelPlaceholder reel={reel} showPreview />);
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/thumbnail.jpg');
    expect(view.container.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    view.rerender(<ReelPlaceholder reel={reel} showPreview={false} />);
    expect(view.container.querySelector('img')).toBeNull();
  });
});
