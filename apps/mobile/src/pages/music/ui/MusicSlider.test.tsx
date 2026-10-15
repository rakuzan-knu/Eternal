// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { MusicSlider } from './MusicSlider.web';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
it('exposes native range semantics and commits the selected playback position', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const seek = vi.fn();
  await act(async () =>
    root.render(
      <MusicSlider
        accessibilityLabel="Playback position"
        accessibilityValue={{ text: '0:10' }}
        minimumValue={0}
        maximumValue={180000}
        step={1000}
        value={10000}
        onSlidingComplete={seek}
      />,
    ),
  );
  const input = container.querySelector('input');
  if (!input) throw new Error('Missing range input');
  expect(input.type).toBe('range');
  expect(input.min).toBe('0');
  expect(input.max).toBe('180000');
  expect(input.step).toBe('1000');
  expect(input.getAttribute('aria-valuetext')).toBe('0:10');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '25000');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(seek).toHaveBeenCalledWith(25000);
  await act(async () => root.unmount());
});
