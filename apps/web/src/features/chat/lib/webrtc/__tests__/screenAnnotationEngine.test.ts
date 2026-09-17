import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScreenAnnotationEngine, ANNOTATION_MSG_TYPES } from '../screenAnnotationEngine';

describe('ScreenAnnotationEngine (Screen Share Drawing & Laser Overlay)', () => {
  let engine: ScreenAnnotationEngine;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let mockDataChannel: {
    readyState: string;
    send: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockContext = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      arc: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 1280,
      height: 720,
    } as unknown as HTMLCanvasElement;

    mockDataChannel = {
      readyState: 'open',
      send: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    engine = new ScreenAnnotationEngine(mockCanvas);
    engine.bindDataChannel(mockDataChannel as unknown as RTCDataChannel);
  });

  it('correctly encodes and decodes normalized coordinates', () => {
    const encoded0 = ScreenAnnotationEngine.encodeCoordinate(0.0);
    expect(encoded0).toBe(0);

    const encoded1 = ScreenAnnotationEngine.encodeCoordinate(1.0);
    expect(encoded1).toBe(65535);

    const encodedHalf = ScreenAnnotationEngine.encodeCoordinate(0.5);
    const decodedHalf = ScreenAnnotationEngine.decodeCoordinate(encodedHalf);
    expect(decodedHalf).toBeCloseTo(0.5, 4);
  });

  it('records pen stroke and transmits binary packet over DataChannel', () => {
    engine.startPenStroke(0.1, 0.2, '#ef4444', 4);
    expect(engine.getStrokesCount()).toBe(1);
    expect(mockDataChannel.send).toHaveBeenCalled();

    const sentBuf = mockDataChannel.send.mock.calls[0][0] as Uint8Array;
    expect(sentBuf[0]).toBe(ANNOTATION_MSG_TYPES.PEN_START);

    engine.addPenPoint(0.15, 0.25);
    expect(mockDataChannel.send).toHaveBeenCalledTimes(2);

    engine.endPenStroke();
    expect(mockDataChannel.send).toHaveBeenCalledTimes(3);
  });

  it('records arrow vectors and broadcasts coordinates', () => {
    engine.addArrow(0.1, 0.1, 0.8, 0.8, '#10b981', 5);
    expect(engine.getStrokesCount()).toBe(1);
    expect(mockDataChannel.send).toHaveBeenCalled();

    const sentBuf = mockDataChannel.send.mock.calls[0][0] as Uint8Array;
    expect(sentBuf[0]).toBe(ANNOTATION_MSG_TYPES.ARROW);
  });

  it('broadcasts and renders laser pointer with fading trail', () => {
    engine.broadcastLaserPointer(0.5, 0.5);
    expect(mockDataChannel.send).toHaveBeenCalled();

    engine.drawCanvas();
    expect(mockContext.createRadialGradient).toHaveBeenCalled();
    expect(mockContext.arc).toHaveBeenCalled();
  });

  it('clears all strokes locally and broadcasts clear command', () => {
    engine.startPenStroke(0.1, 0.1);
    expect(engine.getStrokesCount()).toBe(1);

    engine.clearAll();
    expect(engine.getStrokesCount()).toBe(0);

    const lastCall = mockDataChannel.send.mock.calls[
      mockDataChannel.send.mock.calls.length - 1
    ][0] as Uint8Array;
    expect(lastCall[0]).toBe(ANNOTATION_MSG_TYPES.CLEAR);
  });
});
