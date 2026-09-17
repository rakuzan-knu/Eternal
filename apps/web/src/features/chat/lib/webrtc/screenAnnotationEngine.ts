/**
 * Screen Share Live Annotation & Laser Pointer Engine
 *
 * Real-time zero-latency canvas drawing overlay atop screen shares.
 * Multiplexes normalized coordinates and drawing strokes across RTCDataChannel
 * using ArrayBufferRecyclePool to prevent V8 Garbage Collection pauses.
 */

import { globalBufferPool } from './arrayBufferPool';

export type AnnotationTool = 'laser' | 'pen' | 'arrow';

export const ANNOTATION_MSG_TYPES = {
  LASER: 0x01,
  PEN_START: 0x02,
  PEN_POINT: 0x03,
  PEN_END: 0x04,
  ARROW: 0x05,
  CLEAR: 0x06,
} as const;

export interface AnnotationPoint {
  x: number; // 0.0 - 1.0 (normalized)
  y: number; // 0.0 - 1.0 (normalized)
}

export interface AnnotationStroke {
  id: string;
  tool: 'pen' | 'arrow';
  color: string;
  width: number;
  points: AnnotationPoint[];
  timestamp: number;
}

export interface LaserPointerState {
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

export const ANNOTATION_COLORS = [
  '#ef4444', // Red
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Pink
];

export class ScreenAnnotationEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private dataChannel: RTCDataChannel | null = null;

  private currentStrokes: AnnotationStroke[] = [];
  private activeLaserPointers = new Map<string, LaserPointerState>();
  private currentDrawingStroke: AnnotationStroke | null = null;

  private animFrameId: number | null = null;
  private isDestroyed = false;

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.attachCanvas(canvas);
    }
  }

  public attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.startRenderLoop();
  }

  public bindDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
    channel.addEventListener('message', this.handleDataChannelMessage);
  }

  public unbindDataChannel(): void {
    if (this.dataChannel) {
      this.dataChannel.removeEventListener('message', this.handleDataChannelMessage);
      this.dataChannel = null;
    }
  }

  /**
   * Encodes a normalized point into 2-byte uint16 (0..65535)
   */
  public static encodeCoordinate(norm: number): number {
    return Math.max(0, Math.min(65535, Math.round(norm * 65535)));
  }

  /**
   * Decodes a 2-byte uint16 into normalized float (0.0..1.0)
   */
  public static decodeCoordinate(encoded: number): number {
    return encoded / 65535;
  }

  // --- Drawing Actions ---

  public startPenStroke(
    normX: number,
    normY: number,
    color: string = '#ef4444',
    width: number = 3,
  ): void {
    const stroke: AnnotationStroke = {
      id: Math.random().toString(36).substring(2, 9),
      tool: 'pen',
      color,
      width,
      points: [{ x: normX, y: normY }],
      timestamp: Date.now(),
    };
    this.currentDrawingStroke = stroke;
    this.currentStrokes.push(stroke);

    this.sendBinaryPacket(ANNOTATION_MSG_TYPES.PEN_START, normX, normY, color, width);
  }

  public addPenPoint(normX: number, normY: number): void {
    if (!this.currentDrawingStroke) return;

    this.currentDrawingStroke.points.push({ x: normX, y: normY });
    this.sendBinaryPacket(
      ANNOTATION_MSG_TYPES.PEN_POINT,
      normX,
      normY,
      this.currentDrawingStroke.color,
      this.currentDrawingStroke.width,
    );
  }

  public endPenStroke(): void {
    if (!this.currentDrawingStroke) return;
    this.currentDrawingStroke = null;
    this.sendBinaryPacket(ANNOTATION_MSG_TYPES.PEN_END, 0, 0);
  }

  public addArrow(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string = '#ef4444',
    width: number = 3,
  ): void {
    const stroke: AnnotationStroke = {
      id: Math.random().toString(36).substring(2, 9),
      tool: 'arrow',
      color,
      width,
      points: [
        { x: startX, y: startY },
        { x: endX, y: endY },
      ],
      timestamp: Date.now(),
    };
    this.currentStrokes.push(stroke);

    this.sendBinaryPacket(ANNOTATION_MSG_TYPES.ARROW, startX, startY, color, width, endX, endY);
  }

  public broadcastLaserPointer(normX: number, normY: number, color: string = '#ef4444'): void {
    this.activeLaserPointers.set('local', {
      x: normX,
      y: normY,
      color,
      timestamp: Date.now(),
    });

    this.sendBinaryPacket(ANNOTATION_MSG_TYPES.LASER, normX, normY, color);
  }

  public clearAll(): void {
    this.currentStrokes = [];
    this.currentDrawingStroke = null;
    this.activeLaserPointers.clear();
    this.sendBinaryPacket(ANNOTATION_MSG_TYPES.CLEAR, 0, 0);
  }

  // --- Network Transmission (Zero-GC ArrayBuffer Recycling) ---

  private sendBinaryPacket(
    msgType: number,
    normX: number,
    normY: number,
    color: string = '#ef4444',
    width: number = 3,
    endX: number = 0,
    endY: number = 0,
  ): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;

    // Allocate 12-byte recycled buffer from pool
    const buf = globalBufferPool.acquire(12);

    const colorIndex = Math.max(0, ANNOTATION_COLORS.indexOf(color));
    const encodedX = ScreenAnnotationEngine.encodeCoordinate(normX);
    const encodedY = ScreenAnnotationEngine.encodeCoordinate(normY);
    const encodedEndX = ScreenAnnotationEngine.encodeCoordinate(endX);
    const encodedEndY = ScreenAnnotationEngine.encodeCoordinate(endY);

    buf[0] = msgType;
    buf[1] = (encodedX >> 8) & 0xff;
    buf[2] = encodedX & 0xff;
    buf[3] = (encodedY >> 8) & 0xff;
    buf[4] = encodedY & 0xff;
    buf[5] = colorIndex & 0xff;
    buf[6] = Math.max(1, Math.min(20, Math.round(width))) & 0xff;
    buf[7] = (encodedEndX >> 8) & 0xff;
    buf[8] = encodedEndX & 0xff;
    buf[9] = (encodedEndY >> 8) & 0xff;
    buf[10] = encodedEndY & 0xff;
    buf[11] = 0x00; // Reserved

    try {
      this.dataChannel.send(buf);
    } catch {
      // DataChannel transmit error ignore
    } finally {
      globalBufferPool.release(buf);
    }
  }

  private handleDataChannelMessage = (event: MessageEvent): void => {
    let data: Uint8Array;

    if (event.data instanceof ArrayBuffer) {
      data = new Uint8Array(event.data);
    } else if (ArrayBuffer.isView(event.data)) {
      data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
    } else {
      return;
    }

    if (data.byteLength < 5) return;

    const msgType = data[0];
    const normX = ScreenAnnotationEngine.decodeCoordinate((data[1] << 8) | data[2]);
    const normY = ScreenAnnotationEngine.decodeCoordinate((data[3] << 8) | data[4]);
    const colorIndex = data[5] !== undefined ? data[5] : 0;
    const color = ANNOTATION_COLORS[colorIndex] || '#ef4444';
    const width = data[6] !== undefined ? data[6] : 3;

    switch (msgType) {
      case ANNOTATION_MSG_TYPES.LASER:
        this.activeLaserPointers.set('remote', {
          x: normX,
          y: normY,
          color,
          timestamp: Date.now(),
        });
        break;

      case ANNOTATION_MSG_TYPES.PEN_START:
        this.currentDrawingStroke = {
          id: Math.random().toString(36).substring(2, 9),
          tool: 'pen',
          color,
          width,
          points: [{ x: normX, y: normY }],
          timestamp: Date.now(),
        };
        this.currentStrokes.push(this.currentDrawingStroke);
        break;

      case ANNOTATION_MSG_TYPES.PEN_POINT:
        if (this.currentDrawingStroke) {
          this.currentDrawingStroke.points.push({ x: normX, y: normY });
        }
        break;

      case ANNOTATION_MSG_TYPES.PEN_END:
        this.currentDrawingStroke = null;
        break;

      case ANNOTATION_MSG_TYPES.ARROW:
        if (data.byteLength >= 11) {
          const endX = ScreenAnnotationEngine.decodeCoordinate((data[7] << 8) | data[8]);
          const endY = ScreenAnnotationEngine.decodeCoordinate((data[9] << 8) | data[10]);
          this.currentStrokes.push({
            id: Math.random().toString(36).substring(2, 9),
            tool: 'arrow',
            color,
            width,
            points: [
              { x: normX, y: normY },
              { x: endX, y: endY },
            ],
            timestamp: Date.now(),
          });
        }
        break;

      case ANNOTATION_MSG_TYPES.CLEAR:
        this.currentStrokes = [];
        this.currentDrawingStroke = null;
        this.activeLaserPointers.clear();
        break;
    }
  };

  // --- Render Pipeline ---

  private startRenderLoop(): void {
    const render = () => {
      if (this.isDestroyed) return;
      this.drawCanvas();
      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  public drawCanvas(): void {
    if (!this.canvas || !this.ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Draw all saved strokes
    for (const stroke of this.currentStrokes) {
      if (stroke.points.length < 1) continue;

      this.ctx.strokeStyle = stroke.color;
      this.ctx.fillStyle = stroke.color;
      this.ctx.lineWidth = stroke.width;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      if (stroke.tool === 'pen') {
        this.ctx.beginPath();
        const p0 = stroke.points[0];
        this.ctx.moveTo(p0.x * w, p0.y * h);

        for (let i = 1; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          this.ctx.lineTo(p.x * w, p.y * h);
        }
        this.ctx.stroke();
      } else if (stroke.tool === 'arrow' && stroke.points.length >= 2) {
        const from = stroke.points[0];
        const to = stroke.points[1];
        this.drawArrow(from.x * w, from.y * h, to.x * w, to.y * h, stroke.width);
      }
    }

    // 2. Draw active laser pointers with fading trail
    const now = Date.now();
    this.activeLaserPointers.forEach((laser, key) => {
      const elapsed = now - laser.timestamp;
      if (elapsed > 1800) {
        this.activeLaserPointers.delete(key);
        return;
      }

      const alpha = Math.max(0, 1 - elapsed / 1800);
      const px = laser.x * w;
      const py = laser.y * h;

      this.ctx!.save();
      this.ctx!.globalAlpha = alpha;

      // Outer pulsating glow
      const gradient = this.ctx!.createRadialGradient(px, py, 2, px, py, 14);
      gradient.addColorStop(0, laser.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      this.ctx!.fillStyle = gradient;
      this.ctx!.beginPath();
      this.ctx!.arc(px, py, 14, 0, Math.PI * 2);
      this.ctx!.fill();

      // Inner solid laser core
      this.ctx!.fillStyle = '#ffffff';
      this.ctx!.beginPath();
      this.ctx!.arc(px, py, 3, 0, Math.PI * 2);
      this.ctx!.fill();

      this.ctx!.restore();
    });
  }

  private drawArrow(fromX: number, fromY: number, toX: number, toY: number, width: number): void {
    if (!this.ctx) return;

    const headlen = Math.max(12, width * 4);
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    // Arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headlen * Math.cos(angle - Math.PI / 6),
      toY - headlen * Math.sin(angle - Math.PI / 6),
    );
    this.ctx.lineTo(
      toX - headlen * Math.cos(angle + Math.PI / 6),
      toY - headlen * Math.sin(angle + Math.PI / 6),
    );
    this.ctx.closePath();
    this.ctx.fill();
  }

  public getStrokesCount(): number {
    return this.currentStrokes.length;
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.unbindDataChannel();
    this.canvas = null;
    this.ctx = null;
    this.currentStrokes = [];
    this.activeLaserPointers.clear();
  }
}
