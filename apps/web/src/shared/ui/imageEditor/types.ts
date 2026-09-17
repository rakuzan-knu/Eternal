import { Point } from '../../lib/imageEditorGeometry';

export type ToolMode = 'draw' | 'sticker' | 'text';
export type DrawTool = 'pencil' | 'marker' | 'eraser';

export interface Stroke {
  id: string;
  tool: DrawTool;
  color: string;
  size: number;
  points: Point[];
}

export interface StickerItem {
  id: string;
  emoji: string;
  x: number;
  y: number;
  fontSize: number;
}

export interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export interface Snapshot {
  baseImageSrc: string;
  baseWidth: number;
  baseHeight: number;
  strokes: Stroke[];
  stickers: StickerItem[];
  texts: TextItem[];
}
