import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import ReactionBurstCanvas from '../ReactionBurstCanvas';
import { reactionBurstEngine } from '../../lib/reactionBurstEngine';
import React from 'react';

describe('ReactionBurstCanvas', () => {
  it('attaches canvas on mount, handles window resize, and detaches on unmount', () => {
    const attachSpy = vi.spyOn(reactionBurstEngine, 'attachCanvas');
    const detachSpy = vi.spyOn(reactionBurstEngine, 'detachCanvas');
    const resizeSpy = vi.spyOn(reactionBurstEngine, 'resize');

    const { unmount, container } = render(<ReactionBurstCanvas />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(attachSpy).toHaveBeenCalledWith(canvas);

    window.dispatchEvent(new Event('resize'));
    expect(resizeSpy).toHaveBeenCalled();

    unmount();
    expect(detachSpy).toHaveBeenCalled();
  });
});
