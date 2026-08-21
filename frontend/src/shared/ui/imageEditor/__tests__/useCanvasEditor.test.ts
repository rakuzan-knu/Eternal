import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasEditor } from '../useCanvasEditor';
import { Snapshot } from '../types';
import React from 'react';

describe('useCanvasEditor', () => {
  const initialSnapshot: Snapshot = {
    baseImageSrc: 'data:image/png;base64,mock',
    baseWidth: 500,
    baseHeight: 500,
    strokes: [],
    stickers: [],
    texts: [],
  };

  it('initializes and handles stroke lifecycle', () => {
    const commit = vi.fn();
    const setPendingSticker = vi.fn();
    const setTextDraft = vi.fn();

    const { result } = renderHook(() =>
      useCanvasEditor({
        current: initialSnapshot,
        commit,
        toolMode: 'draw',
        drawTool: 'pencil',
        color: '#ff0000',
        size: 5,
        pendingSticker: null,
        setPendingSticker,
        setTextDraft,
      }),
    );

    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 500 }) as DOMRect;
    Object.defineProperty(result.current.canvasRef, 'current', {
      value: canvas,
      writable: true,
    });

    act(() => {
      result.current.handlePointerDown({
        clientX: 10,
        clientY: 10,
      } as unknown as React.PointerEvent<HTMLCanvasElement>);
    });

    act(() => {
      result.current.handlePointerMove({
        clientX: 50,
        clientY: 50,
      } as unknown as React.PointerEvent<HTMLCanvasElement>);
    });

    act(() => {
      result.current.handlePointerUp();
    });

    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({
        strokes: [
          expect.objectContaining({
            tool: 'pencil',
            color: '#ff0000',
          }),
        ],
      }),
    );
  });
});
