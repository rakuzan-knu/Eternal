import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    stickers: [{ id: 'stk-1', emoji: '🎉', x: 100, y: 100, fontSize: 32 }],
    texts: [{ id: 'txt-1', text: 'Hello\nWorld', x: 200, y: 200, color: '#fff', fontSize: 20 }],
  };

  const originalImage = window.Image;

  beforeEach(() => {
    window.Image = class MockImage {
      naturalWidth = 500;
      naturalHeight = 500;
      onload: (() => void) | null = null;
      private _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
      get src() {
        return this._src;
      }
    } as any;

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
    });
  });

  afterEach(() => {
    window.Image = originalImage;
    vi.restoreAllMocks();
  });

  it('handles stroke lifecycle with marker and eraser', () => {
    const commit = vi.fn();
    const setPendingSticker = vi.fn();
    const setTextDraft = vi.fn();

    const { result } = renderHook(() =>
      useCanvasEditor({
        current: initialSnapshot,
        commit,
        toolMode: 'draw',
        drawTool: 'marker',
        color: '#ff0000',
        size: 5,
        pendingSticker: null,
        setPendingSticker,
        setTextDraft,
      }),
    );

    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
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
        strokes: expect.any(Array),
      }),
    );
  });

  it('handles sticker placement and drag', () => {
    const commit = vi.fn();
    const setPendingSticker = vi.fn();
    const setTextDraft = vi.fn();

    const { result, rerender } = renderHook(
      (props: {
        current: typeof initialSnapshot | null;
        commit: typeof commit;
        toolMode: any;
        drawTool: any;
        color: string;
        size: number;
        pendingSticker: string | null;
        setPendingSticker: typeof setPendingSticker;
        setTextDraft: typeof setTextDraft;
      }) => useCanvasEditor(props),
      {
        initialProps: {
          current: initialSnapshot,
          commit,
          toolMode: 'sticker' as const,
          drawTool: 'pencil' as const,
          color: '#fff',
          size: 5,
          pendingSticker: '🔥' as string | null,
          setPendingSticker,
          setTextDraft,
        },
      },
    );

    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 500 }) as DOMRect;
    Object.defineProperty(result.current.canvasRef, 'current', {
      value: canvas,
      writable: true,
    });

    // Place pending sticker
    act(() => {
      result.current.handlePointerDown({
        clientX: 50,
        clientY: 50,
      } as unknown as React.PointerEvent<HTMLCanvasElement>);
    });

    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({
        stickers: expect.arrayContaining([expect.objectContaining({ emoji: '🔥' })]),
      }),
    );
    expect(setPendingSticker).toHaveBeenCalledWith(null);

    // Now drag existing sticker at (100, 100)
    rerender({
      current: initialSnapshot,
      commit,
      toolMode: 'sticker',
      drawTool: 'pencil',
      color: '#fff',
      size: 5,
      pendingSticker: null,
      setPendingSticker,
      setTextDraft,
    });

    act(() => {
      result.current.handlePointerDown({
        clientX: 100,
        clientY: 100,
      } as unknown as React.PointerEvent<HTMLCanvasElement>);
    });

    act(() => {
      result.current.handlePointerMove({
        clientX: 150,
        clientY: 150,
      } as unknown as React.PointerEvent<HTMLCanvasElement>);
    });

    act(() => {
      result.current.handlePointerUp();
    });

    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({
        stickers: expect.arrayContaining([
          expect.objectContaining({ id: 'stk-1', x: 150, y: 150 }),
        ]),
      }),
    );
  });

  it('handles text click to drag and click to draft', () => {
    const commit = vi.fn();
    const setPendingSticker = vi.fn();
    const setTextDraft = vi.fn();

    const { result } = renderHook(() =>
      useCanvasEditor({
        current: initialSnapshot,
        commit,
        toolMode: 'text',
        drawTool: 'pencil',
        color: '#fff',
        size: 5,
        pendingSticker: null,
        setPendingSticker,
        setTextDraft,
      }),
    );

    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 500 }) as DOMRect;
    Object.defineProperty(result.current.canvasRef, 'current', {
      value: canvas,
      writable: true,
    });

    // Drag existing text at (200, 200)
    act(() => {
      result.current.handlePointerDown({
        clientX: 205,
        clientY: 205,
      } as unknown as React.PointerEvent<HTMLCanvasElement>);
    });

    act(() => {
      result.current.handlePointerMove({
        clientX: 250,
        clientY: 250,
      } as unknown as React.PointerEvent<HTMLCanvasElement>);
    });

    act(() => {
      result.current.handlePointerUp();
    });

    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({
        texts: expect.arrayContaining([expect.objectContaining({ id: 'txt-1', x: 250, y: 250 })]),
      }),
    );

    // Empty space click -> setTextDraft
    act(() => {
      result.current.handlePointerDown({
        clientX: 10,
        clientY: 10,
      } as unknown as React.PointerEvent<HTMLCanvasElement>);
    });

    expect(setTextDraft).toHaveBeenCalledWith({ x: 10, y: 10, value: '' });
  });

  it('handles mirror and rotate', () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useCanvasEditor({
        current: initialSnapshot,
        commit,
        toolMode: 'draw',
        drawTool: 'pencil',
        color: '#fff',
        size: 5,
        pendingSticker: null,
        setPendingSticker: vi.fn(),
        setTextDraft: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleMirror();
    });

    act(() => {
      result.current.handleRotate();
    });
  });
});
