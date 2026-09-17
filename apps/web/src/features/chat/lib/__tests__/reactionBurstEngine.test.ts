import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  reactionBurstEngine,
  triggerReactionBurst,
  triggerFlyingReaction,
} from '../reactionBurstEngine';

describe('reactionBurstEngine', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    vi.useFakeTimers();
    mockCtx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 20 }),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      textAlign: 'left',
      textBaseline: 'alphabetic',
      shadowColor: '',
      shadowBlur: 0,
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockCtx),
      width: 800,
      height: 600,
      style: {},
      parentElement: {
        getBoundingClientRect: () => ({ width: 800, height: 600 }),
      },
    } as unknown as HTMLCanvasElement;

    reactionBurstEngine.attachCanvas(mockCanvas);
  });

  afterEach(() => {
    reactionBurstEngine.detachCanvas();
    vi.useRealTimers();
  });

  it('triggers burst with varied emojis and renders frames', () => {
    const testEmojis = [
      '😈',
      '👿',
      '💔',
      '⚡',
      '🍾',
      '😭',
      '😢',
      '🥺',
      '🤯',
      '🤬',
      '👻',
      '🕊️',
      '🎄',
      '☃️',
      '❄️',
      '🦄',
      '💊',
      '💋',
      '😘',
      '🥰',
      '😴',
      '💤',
      '🐳',
      '🐋',
      '🌊',
      '❤️',
      '❤️‍🔥',
      '💖',
      '💗',
      '🔥',
      '🎉',
      '🥳',
      '🏆',
      '⭐',
      '🌟',
      '💯',
      '🫡',
      '👍',
      '👎',
      '💎',
      '🚀',
      '😍',
      '✨',
    ];

    for (const emoji of testEmojis) {
      triggerReactionBurst(200, 300, emoji);
    }

    // Step through animation frames to draw all particle types
    for (let i = 0; i < 80; i++) {
      act(() => {
        vi.advanceTimersByTime(16);
      });
    }

    expect(mockCtx.clearRect).toHaveBeenCalled();
  });

  it('triggers flying reaction and calls onComplete when finished', () => {
    const onComplete = vi.fn();
    triggerFlyingReaction({ x: 50, y: 500 }, { x: 400, y: 100 }, '❤️', onComplete);

    for (let i = 0; i < 60; i++) {
      act(() => {
        vi.advanceTimersByTime(16);
      });
    }

    expect(onComplete).toHaveBeenCalled();
  });
});

function act(callback: () => void) {
  callback();
}
