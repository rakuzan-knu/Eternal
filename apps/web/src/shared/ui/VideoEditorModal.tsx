import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Undo2,
  Redo2,
  Sliders,
  Crop,
  Type,
  Pencil,
  Smile,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCw,
  FlipHorizontal,
  EyeOff,
  FileText,
  Send,
  Check,
} from 'lucide-react';
import VideoTrimmer from './videoEditor/VideoTrimmer';
import SendVideoModal from './videoEditor/SendVideoModal';
import CircularProgress from './CircularProgress';
import { CHAT_FONTS } from '@/features/chat/model/chatTheme';
import { preloadTextTabFonts, loadThemeFont } from '@/features/chat/lib/fontLoader';
import { emojiToUnified, APPLE_PNG_CDN } from '@/features/chat/ui/Call/TelegramAppleEmoji';
import { exportEditedVideo, getComputedVideoFilter } from './videoEditor/videoExporter';

export type VideoEditorTab = 'tune' | 'crop' | 'text' | 'draw' | 'stickers';
export type DrawToolType = 'pen' | 'arrow' | 'marker' | 'neon' | 'eraser';

export interface VideoEditorModalProps {
  file: File;
  previewUrl?: string;
  initialDuration?: number;
  initialSpoiler?: boolean;
  initialSendAsFile?: boolean;
  initialMuted?: boolean;
  initialTrim?: { start: number; end: number };
  onCancel: () => void;
  onSave: (
    editedFile: File,
    meta: {
      isSpoiler: boolean;
      sendAsFile: boolean;
      isMuted: boolean;
      trimStart: number;
      trimEnd: number;
      duration: number;
      hasCustomEdits: boolean;
    },
  ) => void;
  onSendDirectly?: (
    editedFile: File,
    caption: string,
    meta: {
      isSpoiler: boolean;
      sendAsFile: boolean;
      isMuted: boolean;
      trimStart: number;
      trimEnd: number;
      duration: number;
      hasCustomEdits: boolean;
    },
  ) => void;
}

const TUNE_SLIDERS = [
  { id: 'enhance', label: 'Enhance', min: 0, max: 100, default: 0 },
  { id: 'brightness', label: 'Brightness', min: -100, max: 100, default: 0 },
  { id: 'contrast', label: 'Contrast', min: -100, max: 100, default: 0 },
  { id: 'saturation', label: 'Saturation', min: -100, max: 100, default: 0 },
  { id: 'warmth', label: 'Warmth', min: -100, max: 100, default: 0 },
  { id: 'fade', label: 'Fade', min: 0, max: 100, default: 0 },
  { id: 'highlights', label: 'Highlights', min: 0, max: 100, default: 0 },
  { id: 'shadows', label: 'Shadows', min: 0, max: 100, default: 0 },
] as const;

const PALETTE_COLORS = [
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
];

const EMOJI_STICKERS = [
  '😀',
  '😂',
  '😍',
  '🔥',
  '🎉',
  '🚀',
  '❤️',
  '👍',
  '👏',
  '💯',
  '⚡',
  '✨',
  '🌟',
  '💡',
  '💎',
  '👑',
  '🥳',
  '😎',
  '👻',
  '🦄',
  '🥑',
  '🍕',
  '🎮',
  '🪐',
];

interface TextOverlayItem {
  id: string;
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  color: string;
  fontSize: number;
  fontFamily: string;
  align: 'left' | 'center' | 'right';
}

interface StickerOverlayItem {
  id: string;
  emoji: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number;
}

export interface DrawStroke {
  id: string;
  tool: DrawToolType;
  color: string;
  size: number;
  points: { x: number; y: number }[]; // percentage coordinates 0-100
  arrowHeadLength?: number; // 0..1 for animated arrowhead wings
}

// Color conversion helpers
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s = s / 100;
  v = v / 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const h = Math.max(0, Math.min(255, x)).toString(16);
        return h.length === 1 ? '0' + h : h;
      })
      .join('')
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

// Function to compute crop rectangle (percentages 0-100) based on ratio and video aspect
function getCropRectForRatio(
  ratioId: string,
  vAspect: number,
): { x: number; y: number; width: number; height: number } {
  if (ratioId === 'free' || ratioId === 'original') {
    return { x: 0, y: 0, width: 100, height: 100 };
  }
  const ratios: Record<string, number> = {
    square: 1,
    '3:2': 3 / 2,
    '2:3': 2 / 3,
    '4:3': 4 / 3,
    '3:4': 3 / 4,
    '5:4': 5 / 4,
    '4:5': 4 / 5,
    '7:5': 7 / 5,
    '5:7': 5 / 7,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
  };
  const targetAspect = ratios[ratioId];
  if (!targetAspect || targetAspect <= 0) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  if (targetAspect >= vAspect) {
    const hPct = Math.min(100, Math.max(10, (vAspect / targetAspect) * 100));
    return {
      x: 0,
      y: (100 - hPct) / 2,
      width: 100,
      height: hPct,
    };
  } else {
    const wPct = Math.min(100, Math.max(10, (targetAspect / vAspect) * 100));
    return {
      x: (100 - wPct) / 2,
      y: 0,
      width: wPct,
      height: 100,
    };
  }
}

// === Realistic Telegram Skeuomorphic Drawing Utensil Icons (matching Screenshot 2) ===

export const TOOL_CONFIGS: { id: DrawToolType; label: string; defaultColor: string }[] = [
  { id: 'pen', label: 'Pen', defaultColor: '#ff3b30' },
  { id: 'arrow', label: 'Arrow', defaultColor: '#ffcc00' },
  { id: 'marker', label: 'Marker', defaultColor: '#ff9500' },
  { id: 'neon', label: 'Neon', defaultColor: '#00c7be' },
  { id: 'eraser', label: 'Eraser', defaultColor: '#ff85a2' },
];

function RealisticPenIcon({ color }: { color: string }) {
  return (
    <svg
      width="74"
      height="24"
      viewBox="0 0 74 24"
      fill="none"
      className="shrink-0 drop-shadow-sm select-none"
    >
      <defs>
        <linearGradient
          id="penBarrelGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#525562" />
          <stop offset="25%" stopColor="#383a44" />
          <stop offset="65%" stopColor="#24252c" />
          <stop offset="100%" stopColor="#141519" />
        </linearGradient>
        <linearGradient
          id="penSheenGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="10"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="penRingGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="35%" stopColor={color} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Cylindrical Main Barrel */}
      <rect x="2" y="5" width="38" height="14" rx="4.5" fill="url(#penBarrelGrad)" />
      {/* Specular Cylindrical Sheen */}
      <rect x="3" y="6" width="36" height="4" rx="2" fill="url(#penSheenGrad)" />
      {/* Accent Band / Ring */}
      <rect x="40" y="5" width="4" height="14" fill={color} />
      <rect x="40" y="5" width="4" height="14" fill="url(#penRingGrad)" />
      {/* Matte Dark Grip / Ferrule Section */}
      <polygon points="44,5 53,7.5 53,16.5 44,19" fill="#18191f" />
      {/* Conical Pen Nib in Tool Color */}
      <polygon points="53,8 67,12 53,16" fill={color} />
      {/* Specular light streak on nib */}
      <polygon points="53,8 67,12 53,10.5" fill="#ffffff" fillOpacity="0.35" />
      {/* Fine metal tungsten ballpoint tip */}
      <circle cx="67.5" cy="12" r="1.1" fill="#f1f5f9" />
    </svg>
  );
}

function RealisticArrowIcon({ color }: { color: string }) {
  return (
    <svg
      width="74"
      height="24"
      viewBox="0 0 74 24"
      fill="none"
      className="shrink-0 drop-shadow-sm select-none"
    >
      <defs>
        <linearGradient
          id="arrowBarrelGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#525562" />
          <stop offset="25%" stopColor="#383a44" />
          <stop offset="65%" stopColor="#24252c" />
          <stop offset="100%" stopColor="#141519" />
        </linearGradient>
        <linearGradient
          id="arrowSheenGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="10"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="arrowRingGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="35%" stopColor={color} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Barrel */}
      <rect x="2" y="5" width="38" height="14" rx="4.5" fill="url(#arrowBarrelGrad)" />
      <rect x="3" y="6" width="36" height="4" rx="2" fill="url(#arrowSheenGrad)" />
      {/* Accent Band */}
      <rect x="40" y="5" width="4" height="14" fill={color} />
      <rect x="40" y="5" width="4" height="14" fill="url(#arrowRingGrad)" />
      {/* Dark ferrule collar */}
      <polygon points="44,6 48,7.5 48,16.5 44,18" fill="#18191f" />
      {/* Bold Crisp Arrow Glyphs: stem & arrowhead pointing right */}
      <rect x="49" y="10.5" width="12" height="3" rx="1" fill={color} />
      <polygon points="59,6 71,12 59,18 62,12" fill={color} />
    </svg>
  );
}

function RealisticMarkerIcon({ color }: { color: string }) {
  return (
    <svg
      width="74"
      height="24"
      viewBox="0 0 74 24"
      fill="none"
      className="shrink-0 drop-shadow-sm select-none"
    >
      <defs>
        <linearGradient
          id="markerBarrelGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#525562" />
          <stop offset="25%" stopColor="#383a44" />
          <stop offset="65%" stopColor="#24252c" />
          <stop offset="100%" stopColor="#141519" />
        </linearGradient>
        <linearGradient
          id="markerSheenGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="10"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="markerRingGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="35%" stopColor={color} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {/* Chonky Marker Barrel */}
      <rect x="2" y="4" width="36" height="16" rx="4.5" fill="url(#markerBarrelGrad)" />
      <rect x="3" y="5" width="34" height="4.5" rx="2" fill="url(#markerSheenGrad)" />
      {/* Accent Band */}
      <rect x="38" y="4" width="4" height="16" fill={color} />
      <rect x="38" y="4" width="4" height="16" fill="url(#markerRingGrad)" />
      {/* Dark ferrule collar */}
      <polygon points="42,4.5 50,6.5 50,17.5 42,19.5" fill="#18191f" />
      {/* Authentic Chisel Highlighter Wedge (angled ~45°) */}
      <polygon points="50,9 65,6 68,13.5 50,15.5" fill={color} />
      {/* Top angled reflective facet of chisel */}
      <polygon points="50,9 65,6 62,8.5 50,11" fill="#ffffff" fillOpacity="0.3" />
    </svg>
  );
}

function RealisticNeonIcon({ color }: { color: string }) {
  return (
    <svg
      width="74"
      height="24"
      viewBox="0 0 74 24"
      fill="none"
      className="shrink-0 drop-shadow-sm select-none"
    >
      <defs>
        <linearGradient
          id="neonBarrelGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#525562" />
          <stop offset="25%" stopColor="#383a44" />
          <stop offset="65%" stopColor="#24252c" />
          <stop offset="100%" stopColor="#141519" />
        </linearGradient>
        <linearGradient
          id="neonSheenGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="10"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="neonRingGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="35%" stopColor={color} />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
        </linearGradient>
        <filter
          id="neonAuraFilter"
          x="42"
          y="-4"
          width="34"
          height="32"
          filterUnits="userSpaceOnUse"
        >
          <feGaussianBlur stdDeviation="3.2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Barrel */}
      <rect x="2" y="5" width="36" height="14" rx="4.5" fill="url(#neonBarrelGrad)" />
      <rect x="3" y="6" width="34" height="4" rx="2" fill="url(#neonSheenGrad)" />
      {/* Accent Band */}
      <rect x="38" y="5" width="4" height="14" fill={color} />
      <rect x="38" y="5" width="4" height="14" fill="url(#neonRingGrad)" />
      {/* Dark neck */}
      <polygon points="42,5.5 49,7.5 49,16.5 42,18.5" fill="#18191f" />
      {/* Glowing Neon rounded bulb tip with Gaussian aura */}
      <rect x="49" y="8" width="16" height="8" rx="4" fill={color} filter="url(#neonAuraFilter)" />
      {/* Inner luminous white filament */}
      <rect x="51" y="9.5" width="12" height="4" rx="2" fill="#ffffff" fillOpacity="0.9" />
    </svg>
  );
}

function RealisticEraserIcon() {
  return (
    <svg
      width="74"
      height="24"
      viewBox="0 0 74 24"
      fill="none"
      className="shrink-0 drop-shadow-sm select-none"
    >
      <defs>
        <linearGradient
          id="eraserBarrelGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#525562" />
          <stop offset="25%" stopColor="#383a44" />
          <stop offset="65%" stopColor="#24252c" />
          <stop offset="100%" stopColor="#141519" />
        </linearGradient>
        <linearGradient
          id="eraserSheenGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="10"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="eraserFerruleGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="30%" stopColor="#94a3b8" />
          <stop offset="70%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient
          id="eraserRubberGrad"
          x1="0"
          y1="4"
          x2="0"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="45%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      {/* Barrel */}
      <rect x="2" y="5" width="36" height="14" rx="4.5" fill="url(#eraserBarrelGrad)" />
      <rect x="3" y="6" width="34" height="4" rx="2" fill="url(#eraserSheenGrad)" />
      {/* Metal Ferrule Band with Crimps */}
      <rect x="38" y="5" width="6" height="14" fill="url(#eraserFerruleGrad)" />
      <line x1="40" y1="5" x2="40" y2="19" stroke="#334155" strokeWidth="0.8" />
      <line x1="42" y1="5" x2="42" y2="19" stroke="#334155" strokeWidth="0.8" />
      {/* Pink Rubber Eraser Block */}
      <rect x="44" y="5.5" width="18" height="13" rx="2.5" fill="url(#eraserRubberGrad)" />
      {/* Top subtle highlight on rubber */}
      <rect x="45" y="6.5" width="16" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.25" />
    </svg>
  );
}

export default function VideoEditorModal({
  file,
  previewUrl,
  initialDuration = 0,
  initialSpoiler = false,
  initialSendAsFile = false,
  initialMuted = false,
  initialTrim,
  onCancel,
  onSave,
  onSendDirectly,
}: VideoEditorModalProps) {
  // Stable video URL management (avoids premature StrictMode revocation)
  const [createdUrl] = useState<string | null>(() =>
    !previewUrl ? URL.createObjectURL(file) : null,
  );
  const videoSrc = previewUrl || createdUrl || '';
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [naturalAspect, setNaturalAspect] = useState(16 / 9);

  // Trim state
  const [trimStart, setTrimStart] = useState(initialTrim?.start ?? 0);
  const [trimEnd, setTrimEnd] = useState(initialTrim?.end ?? initialDuration ?? 0);

  // Options state
  const [isSpoiler, setIsSpoiler] = useState(initialSpoiler);
  const [sendAsFile, setSendAsFile] = useState(initialSendAsFile);
  const [isMuted, setIsMuted] = useState(initialMuted);

  // Active tab in sidebar
  const [activeTab, setActiveTab] = useState<VideoEditorTab>('tune');

  // Tune sliders
  const [quality, setQuality] = useState<'1080p' | '720p' | '480p' | '360p'>('1080p');
  const [tuneValues, setTuneValues] = useState<Record<string, number>>({
    enhance: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    fade: 0,
    highlights: 0,
    shadows: 0,
  });

  // Crop & Transform state
  const [aspectRatio, setAspectRatio] = useState('free');
  const [rotation, setRotation] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Text overlays state
  const [texts, setTexts] = useState<TextOverlayItem[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(40);
  const [fontFamily, setFontFamily] = useState<string>(CHAT_FONTS[0].fontFamily);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [newTextInput, setNewTextInput] = useState('');

  // Stickers state
  const [stickers, setStickers] = useState<StickerOverlayItem[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  // Dragging state for text & stickers
  const [dragItem, setDragItem] = useState<{
    type: 'text' | 'sticker';
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Drawing state: strokes stored in ref as single source of truth to avoid closure desync
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<DrawStroke[]>([]);
  const redoStrokesRef = useRef<DrawStroke[]>([]);
  const [strokeVersion, setStrokeVersion] = useState(0);
  const [drawTool, setDrawTool] = useState<DrawToolType>('pen');
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawSize, setDrawSize] = useState(12);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<DrawStroke | null>(null);

  // Telegram Color Mixer state
  const [isColorMixerOpen, setIsColorMixerOpen] = useState(false);
  const [pickerHue, setPickerHue] = useState(0);
  const [pickerSat, setPickerSat] = useState(100);
  const [pickerVal, setPickerVal] = useState(100);
  const satValRef = useRef<HTMLDivElement>(null);
  const [isDraggingSatVal, setIsDraggingSatVal] = useState(false);

  // Send Video modal toggle & export progress
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Discard Changes confirmation modal state
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  // Clean up locally created URL only on unmount
  useEffect(() => {
    return () => {
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [createdUrl]);

  // Preload application fonts on mount
  useEffect(() => {
    preloadTextTabFonts();
  }, []);

  // Video metadata loaded
  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    const d = v.duration;
    if (d && !isNaN(d) && isFinite(d)) {
      setDuration(d);
      if (!initialTrim?.end || initialTrim.end === 0) {
        setTrimEnd(d);
      }
    }
    if (v.videoWidth && v.videoHeight) {
      setNaturalAspect(v.videoWidth / v.videoHeight);
    }
  };

  // Keep playback within [trimStart, trimEnd]
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const t = e.currentTarget.currentTime;
    setCurrentTime(t);
    if (trimEnd > 0 && t >= trimEnd) {
      if (videoRef.current) {
        videoRef.current.currentTime = trimStart;
      }
    }
  };

  // Play / Pause toggle
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < trimStart || v.currentTime >= trimEnd) {
        v.currentTime = trimStart;
      }
      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, [trimStart, trimEnd]);

  // Seek handler from trimmer
  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Compute CSS filter for real-time video adjustments
  const computedFilter = getComputedVideoFilter(tuneValues);

  // Redraw all strokes onto canvas directly from strokesRef to eliminate desync
  const redrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const all = currentStrokeRef.current
      ? [...strokesRef.current, currentStrokeRef.current]
      : strokesRef.current;

    for (const stroke of all) {
      if (!stroke || stroke.points.length < 2) continue;
      ctx.save();

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.size * 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(
          (stroke.points[0].x / 100) * canvas.width,
          (stroke.points[0].y / 100) * canvas.height,
        );
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(
            (stroke.points[i].x / 100) * canvas.width,
            (stroke.points[i].y / 100) * canvas.height,
          );
        }
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.globalCompositeOperation = 'source-over';

      if (stroke.tool === 'marker') {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size * 2.2;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'bevel';
        ctx.beginPath();
        ctx.moveTo(
          (stroke.points[0].x / 100) * canvas.width,
          (stroke.points[0].y / 100) * canvas.height,
        );
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(
            (stroke.points[i].x / 100) * canvas.width,
            (stroke.points[i].y / 100) * canvas.height,
          );
        }
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (stroke.tool === 'neon') {
        // Pass 1: Outer glowing aura
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = Math.max(12, stroke.size * 2.5);
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(
          (stroke.points[0].x / 100) * canvas.width,
          (stroke.points[0].y / 100) * canvas.height,
        );
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(
            (stroke.points[i].x / 100) * canvas.width,
            (stroke.points[i].y / 100) * canvas.height,
          );
        }
        ctx.stroke();

        // Pass 2: Bright white core
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, stroke.size * 0.45);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      // Pen or Arrow main stroke
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(
        (stroke.points[0].x / 100) * canvas.width,
        (stroke.points[0].y / 100) * canvas.height,
      );
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(
          (stroke.points[i].x / 100) * canvas.width,
          (stroke.points[i].y / 100) * canvas.height,
        );
      }
      ctx.stroke();

      // If Arrow tool: draw arrowhead wings
      if (stroke.tool === 'arrow') {
        const progress = stroke.arrowHeadLength ?? 1;
        if (progress > 0 && stroke.points.length >= 2) {
          const lastIdx = stroke.points.length - 1;
          const pLast = {
            x: (stroke.points[lastIdx].x / 100) * canvas.width,
            y: (stroke.points[lastIdx].y / 100) * canvas.height,
          };
          // Scan backward to find earlier point at least 6px away to ensure stable direction angle
          let prevIdx = lastIdx - 1;
          while (prevIdx > 0) {
            const p = {
              x: (stroke.points[prevIdx].x / 100) * canvas.width,
              y: (stroke.points[prevIdx].y / 100) * canvas.height,
            };
            if (Math.hypot(pLast.x - p.x, pLast.y - p.y) >= 6) {
              break;
            }
            prevIdx--;
          }
          const pPrev = {
            x: (stroke.points[prevIdx].x / 100) * canvas.width,
            y: (stroke.points[prevIdx].y / 100) * canvas.height,
          };
          const dx = pLast.x - pPrev.x;
          const dy = pLast.y - pPrev.y;
          const angle = dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx);

          const wingLength = Math.max(16, stroke.size * 3.2) * progress;
          const wingAngle = Math.PI / 6; // 30 degrees

          const leftX = pLast.x - wingLength * Math.cos(angle - wingAngle);
          const leftY = pLast.y - wingLength * Math.sin(angle - wingAngle);
          const rightX = pLast.x - wingLength * Math.cos(angle + wingAngle);
          const rightY = pLast.y - wingLength * Math.sin(angle + wingAngle);

          ctx.beginPath();
          ctx.moveTo(leftX, leftY);
          ctx.lineTo(pLast.x, pLast.y);
          ctx.lineTo(rightX, rightY);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas, strokeVersion, activeTab]);

  // Drawing canvas pointer handlers
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTab !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    const rect = canvas.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    // Reset redo history when a new stroke begins
    redoStrokesRef.current = [];

    const newStroke: DrawStroke = {
      id: crypto.randomUUID(),
      tool: drawTool,
      color: drawColor,
      size: drawSize,
      points: [{ x: xPct, y: yPct }],
      arrowHeadLength: drawTool === 'arrow' ? 0 : 1,
    };
    currentStrokeRef.current = newStroke;
    setIsDrawing(true);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStrokeRef.current) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    currentStrokeRef.current.points.push({ x: xPct, y: yPct });
    redrawCanvas();
  };

  const handleCanvasPointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    if (!isDrawing || !currentStrokeRef.current) return;
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    setIsDrawing(false);

    // If single tap / click dot, add slight secondary point so it renders correctly
    if (stroke.points.length === 1) {
      stroke.points.push({
        x: stroke.points[0].x + 0.05,
        y: stroke.points[0].y + 0.05,
      });
    }

    if (stroke.points.length >= 2) {
      // Synchronously push to ref so redrawCanvas always has the stroke immediately
      strokesRef.current.push(stroke);
      setStrokeVersion((v) => v + 1);

      if (stroke.tool === 'arrow') {
        // Smoothly animate the arrowhead sprouting out (240ms ease-out) without disappearing
        stroke.arrowHeadLength = 0;
        const start = performance.now();
        const durationMs = 240;
        const animate = (now: number) => {
          const elapsed = now - start;
          const p = Math.min(1, elapsed / durationMs);
          stroke.arrowHeadLength = 1 - (1 - p) * (1 - p);
          redrawCanvas();
          if (p < 1) {
            requestAnimationFrame(animate);
          } else {
            stroke.arrowHeadLength = 1;
            redrawCanvas();
          }
        };
        requestAnimationFrame(animate);
      } else {
        redrawCanvas();
      }
    } else {
      redrawCanvas();
    }
  };

  // Window-level safety release so mouse released outside canvas always commits
  useEffect(() => {
    if (!isDrawing) return;
    const onWindowPointerUp = () => {
      if (currentStrokeRef.current) {
        handleCanvasPointerUp();
      }
    };
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    return () => {
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
    };
  }, [isDrawing]);

  // Interactive Dragging for Text & Stickers
  useEffect(() => {
    if (!dragItem) return;

    const onPointerMove = (ev: PointerEvent) => {
      if (!videoContainerRef.current) return;
      const rect = videoContainerRef.current.getBoundingClientRect();
      const deltaX = ((ev.clientX - dragItem.startClientX) / rect.width) * 100;
      const deltaY = ((ev.clientY - dragItem.startClientY) / rect.height) * 100;

      const newX = Math.max(4, Math.min(96, dragItem.startX + deltaX));
      const newY = Math.max(4, Math.min(96, dragItem.startY + deltaY));

      if (dragItem.type === 'text') {
        setTexts((prev) =>
          prev.map((t) => (t.id === dragItem.id ? { ...t, x: newX, y: newY } : t)),
        );
      } else if (dragItem.type === 'sticker') {
        setStickers((prev) =>
          prev.map((s) => (s.id === dragItem.id ? { ...s, x: newX, y: newY } : s)),
        );
      }
    };

    const onPointerUp = () => {
      setDragItem(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragItem]);

  // Color Mixer 2D Sat/Val pointer events
  useEffect(() => {
    if (!isDraggingSatVal) return;

    const updateFromClient = (clientX: number, clientY: number) => {
      if (!satValRef.current) return;
      const rect = satValRef.current.getBoundingClientRect();
      const s = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const v = Math.max(0, Math.min(100, (1 - (clientY - rect.top) / rect.height) * 100));
      setPickerSat(s);
      setPickerVal(v);
      const [r, g, b] = hsvToRgb(pickerHue, s, v);
      setDrawColor(rgbToHex(r, g, b));
    };

    const onMove = (e: PointerEvent) => updateFromClient(e.clientX, e.clientY);
    const onUp = () => setIsDraggingSatVal(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDraggingSatVal, pickerHue]);

  // Add text overlay
  const handleAddText = () => {
    if (!newTextInput.trim()) return;
    const newText: TextOverlayItem = {
      id: crypto.randomUUID(),
      text: newTextInput.trim(),
      x: 50,
      y: 50,
      color: textColor,
      fontSize,
      fontFamily,
      align: textAlign,
    };
    setTexts((prev) => [...prev, newText]);
    setNewTextInput('');
    setSelectedTextId(newText.id);
  };

  // Add static Apple emoji sticker overlay
  const handleAddSticker = (emoji: string) => {
    const newSticker: StickerOverlayItem = {
      id: crypto.randomUUID(),
      emoji,
      x: 50,
      y: 50,
      size: 48,
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  // Select font from CHAT_FONTS with lazy loading
  const handleSelectFont = (font: (typeof CHAT_FONTS)[0]) => {
    loadThemeFont(font.fontFamily, font.googleFontName);
    setFontFamily(font.fontFamily);
    if (selectedTextId) {
      setTexts((prev) =>
        prev.map((t) => (t.id === selectedTextId ? { ...t, fontFamily: font.fontFamily } : t)),
      );
    }
  };

  // Active crop rectangle
  const cropRect = getCropRectForRatio(aspectRatio, naturalAspect);
  const isCropped = aspectRatio !== 'free' && aspectRatio !== 'original';

  // Check if any video modifications were applied
  const hasCustomEdits =
    tuneValues.enhance !== 0 ||
    tuneValues.brightness !== 0 ||
    tuneValues.contrast !== 0 ||
    tuneValues.saturation !== 0 ||
    tuneValues.warmth !== 0 ||
    tuneValues.fade !== 0 ||
    tuneValues.highlights !== 0 ||
    tuneValues.shadows !== 0 ||
    quality !== '1080p' ||
    rotation !== 0 ||
    rotationAngle !== 0 ||
    isFlipped ||
    isCropped ||
    trimStart > 0 ||
    (duration > 0 && trimEnd < duration - 0.1) ||
    texts.length > 0 ||
    stickers.length > 0 ||
    strokesRef.current.length > 0 ||
    isMuted !== initialMuted;

  const canCapture =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof (HTMLCanvasElement.prototype as any).captureStream === 'function';

  // Real video export worker
  const doExport = async (): Promise<File> => {
    if (!hasCustomEdits || !canCapture) {
      return file;
    }
    setIsExporting(true);
    setExportProgress(0);
    try {
      const exported = await exportEditedVideo({
        videoElement: videoRef.current,
        originalFile: file,
        trimStart,
        trimEnd: trimEnd || duration,
        isMuted,
        filterString: computedFilter,
        rotation,
        rotationAngle,
        isFlipped,
        cropRect: isCropped ? cropRect : undefined,
        drawCanvas: drawCanvasRef.current,
        texts,
        stickers: stickers.map((s) => ({
          ...s,
          imageUrl: `${APPLE_PNG_CDN}/${emojiToUnified(s.emoji)}.png`,
        })),
        quality,
        onProgress: (pct) => setExportProgress(pct),
      });
      return exported;
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Save / Done
  const handleSave = () => {
    if (!hasCustomEdits || !canCapture) {
      onSave(file, {
        isSpoiler,
        sendAsFile,
        isMuted,
        trimStart,
        trimEnd: trimEnd || duration,
        duration,
        hasCustomEdits,
      });
      return;
    }
    doExport().then((finalFile) => {
      onSave(finalFile, {
        isSpoiler,
        sendAsFile,
        isMuted,
        trimStart,
        trimEnd: trimEnd || duration,
        duration,
        hasCustomEdits,
      });
    });
  };

  // Handle direct send from modal
  const handleSendDirect = (caption: string) => {
    if (!hasCustomEdits || !canCapture) {
      if (onSendDirectly) {
        onSendDirectly(file, caption, {
          isSpoiler,
          sendAsFile,
          isMuted,
          trimStart,
          trimEnd: trimEnd || duration,
          duration,
          hasCustomEdits,
        });
      } else {
        onSave(file, {
          isSpoiler,
          sendAsFile,
          isMuted,
          trimStart,
          trimEnd: trimEnd || duration,
          duration,
          hasCustomEdits,
        });
      }
      return;
    }
    doExport().then((finalFile) => {
      if (onSendDirectly) {
        onSendDirectly(finalFile, caption, {
          isSpoiler,
          sendAsFile,
          isMuted,
          trimStart,
          trimEnd: trimEnd || duration,
          duration,
          hasCustomEdits,
        });
      } else {
        onSave(finalFile, {
          isSpoiler,
          sendAsFile,
          isMuted,
          trimStart,
          trimEnd: trimEnd || duration,
          duration,
          hasCustomEdits,
        });
      }
    });
  };

  const [pickR, pickG, pickB] = hexToRgb(drawColor);

  // Check if any custom edits were performed compared to initial state
  const hasUserChanges = useCallback((): boolean => {
    // 1. Drawing strokes
    if (strokesRef.current.length > 0) return true;
    // 2. Text overlays or unsubmitted text
    if (texts.length > 0 || newTextInput.trim().length > 0) return true;
    // 3. Sticker overlays
    if (stickers.length > 0) return true;
    // 4. Crop aspect ratio
    if (aspectRatio !== 'free' && aspectRatio !== 'original') return true;
    // 5. Rotation or flip
    if (rotation !== 0 || rotationAngle !== 0 || isFlipped) return true;
    // 6. Tune sliders
    if (Object.values(tuneValues).some((v) => v !== 0)) return true;
    // 7. Video quality
    if (quality !== '1080p') return true;
    // 8. Sound mute
    if (isMuted !== initialMuted) return true;
    // 9. Spoiler flag
    if (isSpoiler !== initialSpoiler) return true;
    // 10. Send as file flag
    if (sendAsFile !== initialSendAsFile) return true;
    // 11. Trimmer changed
    if (initialTrim?.start !== undefined) {
      if (Math.abs(trimStart - initialTrim.start) > 0.05) return true;
      if (initialTrim.end > 0 && Math.abs(trimEnd - initialTrim.end) > 0.1) return true;
    } else {
      if (trimStart > 0.05) return true;
      if (duration > 0 && trimEnd > 0 && trimEnd < duration - 0.25) return true;
    }

    return false;
  }, [
    texts,
    newTextInput,
    stickers,
    aspectRatio,
    rotation,
    rotationAngle,
    isFlipped,
    tuneValues,
    quality,
    isMuted,
    initialMuted,
    isSpoiler,
    initialSpoiler,
    sendAsFile,
    initialSendAsFile,
    trimStart,
    trimEnd,
    initialTrim,
    duration,
  ]);

  // Request close: opens Discard Changes dialog if edits exist, or closes immediately if untouched
  const handleRequestClose = useCallback(() => {
    // If Discard Modal is open, close it (cancel discard)
    if (isDiscardModalOpen) {
      setIsDiscardModalOpen(false);
      return;
    }
    // If Send Modal is open, close it
    if (isSendModalOpen) {
      setIsSendModalOpen(false);
      return;
    }
    // If Color Mixer is open, close it
    if (isColorMixerOpen) {
      setIsColorMixerOpen(false);
      return;
    }

    if (hasUserChanges()) {
      setIsDiscardModalOpen(true);
    } else {
      onCancel();
    }
  }, [isDiscardModalOpen, isSendModalOpen, isColorMixerOpen, hasUserChanges, onCancel]);

  // Global Escape key handler with capture: true
  // Prevents ChatThread and background chat from closing and preserves attachment in composer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // 1. If Discard Changes dialog is already open:
        // "если нажмёшь в нём Cancel или Esc повторно то оно закроеться и если ещё раз нажмёшь то откроется снова"
        if (isDiscardModalOpen) {
          setIsDiscardModalOpen(false);
          return;
        }

        // 2. If Send Video modal is open, close it
        if (isSendModalOpen) {
          setIsSendModalOpen(false);
          return;
        }

        // 3. If Color Mixer is open, close it
        if (isColorMixerOpen) {
          setIsColorMixerOpen(false);
          return;
        }

        // 4. Otherwise request close
        if (hasUserChanges()) {
          setIsDiscardModalOpen(true);
        } else {
          onCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isDiscardModalOpen, isSendModalOpen, isColorMixerOpen, hasUserChanges, onCancel]);

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      data-modal-open="true"
      data-video-editor-open="true"
      className="fixed inset-0 z-[9999] flex bg-[#0c0d12]/95 backdrop-blur-2xl text-white select-none animate-fadeIn overflow-hidden"
      onClick={handleRequestClose}
    >
      <div className="relative flex flex-col w-full h-full" onClick={(e) => e.stopPropagation()}>
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 h-13 border-b border-white/10 shrink-0 z-20">
          <button
            type="button"
            onClick={handleRequestClose}
            className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X size={20} />
          </button>

          <h1 className="text-base font-bold text-white tracking-wide">Edit</h1>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
              title="Undo"
              disabled={
                strokesRef.current.length === 0 && texts.length === 0 && stickers.length === 0
              }
              onClick={() => {
                if (strokesRef.current.length > 0) {
                  const popped = strokesRef.current.pop();
                  if (popped) {
                    redoStrokesRef.current.push(popped);
                  }
                  setStrokeVersion((v) => v + 1);
                  redrawCanvas();
                } else if (texts.length > 0) {
                  setTexts((p) => p.slice(0, -1));
                } else if (stickers.length > 0) {
                  setStickers((p) => p.slice(0, -1));
                }
              }}
            >
              <Undo2 size={18} />
            </button>
            <button
              type="button"
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
              title="Redo"
              disabled={redoStrokesRef.current.length === 0}
              onClick={() => {
                if (redoStrokesRef.current.length > 0) {
                  const restored = redoStrokesRef.current.pop();
                  if (restored) {
                    strokesRef.current.push(restored);
                  }
                  setStrokeVersion((v) => v + 1);
                  redrawCanvas();
                }
              }}
            >
              <Redo2 size={18} />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left/Center Preview Area with Video & Trimmer */}
          <div className="flex-1 flex flex-col items-center justify-between p-3 sm:p-5 relative min-w-0">
            {/* Center Video Frame */}
            <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
              <div
                ref={videoContainerRef}
                className="relative max-h-full max-w-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl transition-transform duration-150 select-none"
                style={{
                  transform: `rotate(${rotation + rotationAngle}deg) scaleX(${isFlipped ? -1 : 1})`,
                }}
              >
                <video
                  ref={videoRef}
                  src={videoSrc}
                  muted={isMuted}
                  playsInline
                  autoPlay
                  preload="auto"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  style={{
                    filter: computedFilter,
                    maxHeight: '62vh',
                  }}
                  className="w-auto h-auto max-w-full object-contain rounded-xl block mx-auto cursor-pointer"
                  onClick={togglePlay}
                />

                {/* Play button overlay when paused */}
                {!isPlaying && activeTab !== 'draw' && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xs flex items-center justify-center text-white pointer-events-auto transition-transform active:scale-95 shadow-xl border border-white/20 z-30"
                    title="Play video"
                    aria-label="Play video"
                  >
                    <Play size={26} className="ml-1 fill-white" />
                  </button>
                )}

                {/* Telegram-style Crop Mask & Animating Grid (Screenshot 1) */}
                {activeTab === 'crop' && (
                  <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
                    {/* Top Mask */}
                    <div
                      className="absolute top-0 inset-x-0 bg-black/65 backdrop-blur-[1px] transition-all duration-300 ease-out"
                      style={{ height: `${cropRect.y}%` }}
                    />
                    {/* Bottom Mask */}
                    <div
                      className="absolute bottom-0 inset-x-0 bg-black/65 backdrop-blur-[1px] transition-all duration-300 ease-out"
                      style={{ height: `${100 - (cropRect.y + cropRect.height)}%` }}
                    />
                    {/* Left Mask */}
                    <div
                      className="absolute inset-y-0 left-0 bg-black/65 backdrop-blur-[1px] transition-all duration-300 ease-out"
                      style={{
                        top: `${cropRect.y}%`,
                        height: `${cropRect.height}%`,
                        width: `${cropRect.x}%`,
                      }}
                    />
                    {/* Right Mask */}
                    <div
                      className="absolute inset-y-0 right-0 bg-black/65 backdrop-blur-[1px] transition-all duration-300 ease-out"
                      style={{
                        top: `${cropRect.y}%`,
                        height: `${cropRect.height}%`,
                        width: `${100 - (cropRect.x + cropRect.width)}%`,
                      }}
                    />

                    {/* Active Crop Box with 3x3 Grid & 4 Corner Dots */}
                    <div
                      className="absolute border border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out"
                      style={{
                        left: `${cropRect.x}%`,
                        top: `${cropRect.y}%`,
                        width: `${cropRect.width}%`,
                        height: `${cropRect.height}%`,
                      }}
                    >
                      {/* 3x3 Grid lines */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                        <div className="border-r border-b border-white/35" />
                        <div className="border-r border-b border-white/35" />
                        <div className="border-b border-white/35" />
                        <div className="border-r border-b border-white/35" />
                        <div className="border-r border-b border-white/35" />
                        <div className="border-b border-white/35" />
                        <div className="border-r border-b border-white/35" />
                        <div className="border-r border-b border-white/35" />
                        <div />
                      </div>

                      {/* 4 Corner Round White Handles (matching Screenshot 1) */}
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white rounded-full shadow-md" />
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white rounded-full shadow-md" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white rounded-full shadow-md" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white rounded-full shadow-md" />
                    </div>
                  </div>
                )}

                {/* Drawing Layer Canvas */}
                <canvas
                  ref={drawCanvasRef}
                  width={1280}
                  height={720}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  className={`absolute inset-0 w-full h-full z-20 ${
                    activeTab === 'draw'
                      ? 'cursor-crosshair pointer-events-auto'
                      : 'pointer-events-none'
                  }`}
                />

                {/* Interactive Draggable Text Overlays Layer */}
                {texts.map((t) => {
                  const isSelected = selectedTextId === t.id;
                  return (
                    <div
                      key={t.id}
                      onPointerDown={(e) => {
                        if (activeTab === 'draw') return;
                        e.stopPropagation();
                        setSelectedTextId(t.id);
                        setDragItem({
                          type: 'text',
                          id: t.id,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          startX: t.x,
                          startY: t.y,
                        });
                      }}
                      style={{
                        left: `${t.x}%`,
                        top: `${t.y}%`,
                        color: t.color,
                        fontSize: `${t.fontSize}px`,
                        fontFamily: t.fontFamily,
                        textAlign: t.align,
                      }}
                      className={`absolute z-30 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] cursor-grab active:cursor-grabbing select-none -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded touch-none transition-shadow ${
                        isSelected
                          ? 'border border-dashed border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                          : 'hover:border hover:border-white/30'
                      }`}
                    >
                      {t.text}

                      {/* Small delete button when selected */}
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTexts((prev) => prev.filter((item) => item.id !== t.id));
                            setSelectedTextId(null);
                          }}
                          className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-[10px] shadow cursor-pointer"
                          title="Delete text"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Interactive Draggable Stickers Layer with Static Apple Emojis */}
                {stickers.map((s) => {
                  const unified = emojiToUnified(s.emoji);
                  const isSelected = selectedStickerId === s.id;
                  return (
                    <div
                      key={s.id}
                      onPointerDown={(e) => {
                        if (activeTab === 'draw') return;
                        e.stopPropagation();
                        setSelectedStickerId(s.id);
                        setDragItem({
                          type: 'sticker',
                          id: s.id,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          startX: s.x,
                          startY: s.y,
                        });
                      }}
                      style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: `${s.size}px`,
                        height: `${s.size}px`,
                      }}
                      className={`absolute z-30 select-none cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-1/2 active:scale-105 transition-transform touch-none p-1 rounded-xl ${
                        isSelected
                          ? 'border border-dashed border-white/80 shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                          : ''
                      }`}
                    >
                      <img
                        src={`${APPLE_PNG_CDN}/${unified}.png`}
                        alt={s.emoji}
                        className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
                        draggable={false}
                      />

                      {/* Delete button when selected */}
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStickers((prev) => prev.filter((item) => item.id !== s.id));
                            setSelectedStickerId(null);
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-[10px] shadow cursor-pointer"
                          title="Delete sticker"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Controls Bar (Trimmer in normal mode, or Fine Rotation in crop mode) */}
            {activeTab === 'crop' ? (
              <div className="w-full flex items-center justify-between gap-4 mt-3 z-20 max-w-xl px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10">
                {/* Rotate 90° button on left */}
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw size={18} />
                </button>

                {/* Degree Ruler / Fine Slider in center */}
                <div className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="flex items-center justify-between w-full text-[11px] text-gray-400 font-mono px-1">
                    <span>-45°</span>
                    <span className="text-[#a898f8] font-bold text-xs">{rotationAngle}°</span>
                    <span>+45°</span>
                  </div>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    value={rotationAngle}
                    onChange={(e) => setRotationAngle(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#8774e1]"
                  />
                </div>

                {/* Flip button on right */}
                <button
                  type="button"
                  onClick={() => setIsFlipped((prev) => !prev)}
                  className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Flip"
                >
                  <FlipHorizontal size={18} />
                </button>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center gap-3 sm:gap-4 mt-3 z-20 max-w-2xl px-2">
                {/* Mute Button */}
                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg active:scale-90 transition-all cursor-pointer ${
                    isMuted ? 'bg-red-500/80 hover:bg-red-500' : 'bg-white/10 hover:bg-white/20'
                  }`}
                  title={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                {/* Video Timeline Trimmer */}
                <div className="flex-1 min-w-0">
                  <VideoTrimmer
                    duration={duration}
                    currentTime={currentTime}
                    trimStart={trimStart}
                    trimEnd={trimEnd}
                    onTrimChange={(s, e) => {
                      setTrimStart(s);
                      setTrimEnd(e);
                    }}
                    onSeek={handleSeek}
                    videoSrc={videoSrc}
                  />
                </div>

                {/* Play / Pause Purple Button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#8774e1] hover:bg-[#7763db] active:scale-90 text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#8774e1]/30 transition-all cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="translate-x-0.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Right Sidebar Tools */}
          <div className="w-72 sm:w-80 border-l border-white/10 bg-[#14151f]/80 backdrop-blur-2xl flex flex-col shrink-0 relative">
            {/* 5 Tab Navigation Icons */}
            <div className="flex items-center justify-around border-b border-white/10 py-2.5 px-2">
              <button
                type="button"
                onClick={() => setActiveTab('tune')}
                className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                  activeTab === 'tune'
                    ? 'text-[#a898f8] bg-[#8774e1]/15'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Tune"
              >
                <Sliders size={20} />
                {activeTab === 'tune' && (
                  <div className="absolute -bottom-2.5 inset-x-2 h-0.5 bg-[#8774e1] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                  activeTab === 'crop'
                    ? 'text-[#a898f8] bg-[#8774e1]/15'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Crop"
              >
                <Crop size={20} />
                {activeTab === 'crop' && (
                  <div className="absolute -bottom-2.5 inset-x-2 h-0.5 bg-[#8774e1] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                  activeTab === 'text'
                    ? 'text-[#a898f8] bg-[#8774e1]/15'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Text"
              >
                <Type size={20} />
                {activeTab === 'text' && (
                  <div className="absolute -bottom-2.5 inset-x-2 h-0.5 bg-[#8774e1] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('draw')}
                className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                  activeTab === 'draw'
                    ? 'text-[#a898f8] bg-[#8774e1]/15'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Draw"
              >
                <Pencil size={20} />
                {activeTab === 'draw' && (
                  <div className="absolute -bottom-2.5 inset-x-2 h-0.5 bg-[#8774e1] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stickers')}
                className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                  activeTab === 'stickers'
                    ? 'text-[#a898f8] bg-[#8774e1]/15'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Stickers"
              >
                <Smile size={20} />
                {activeTab === 'stickers' && (
                  <div className="absolute -bottom-2.5 inset-x-2 h-0.5 bg-[#8774e1] rounded-full" />
                )}
              </button>
            </div>

            {/* Sidebar Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
              {/* Tab 1: Tune */}
              {activeTab === 'tune' && (
                <div className="flex flex-col gap-4">
                  {/* Quality Preset */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span className="font-semibold">Quality</span>
                      <span className="text-[#a898f8] font-bold">{quality}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                      {(['360p', '480p', '720p', '1080p'] as const).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuality(q)}
                          className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${
                            quality === q
                              ? 'bg-[#8774e1] text-white font-bold shadow'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="flex flex-col gap-3.5 pt-2">
                    {TUNE_SLIDERS.map((slider) => (
                      <div key={slider.id} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <span>{slider.label}</span>
                          <span className="text-gray-400 text-[11px]">{tuneValues[slider.id]}</span>
                        </div>
                        <input
                          type="range"
                          min={slider.min}
                          max={slider.max}
                          value={tuneValues[slider.id]}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setTuneValues((prev) => ({ ...prev, [slider.id]: val }));
                          }}
                          className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#8774e1]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Crop & Aspect Ratio (matching Screenshot 1) */}
              {activeTab === 'crop' && (
                <div className="flex flex-col gap-3.5">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Aspect ratio
                  </div>

                  {/* Top 3 Aspect Options: Free, Original, Square */}
                  <div className="flex flex-col gap-1">
                    {/* 1. Free */}
                    <button
                      type="button"
                      onClick={() => setAspectRatio('free')}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        aspectRatio === 'free'
                          ? 'bg-white/15 text-white font-semibold'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>Free</span>
                    </button>

                    {/* 2. Original */}
                    <button
                      type="button"
                      onClick={() => setAspectRatio('original')}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        aspectRatio === 'original'
                          ? 'bg-white/15 text-white font-semibold'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Original</span>
                    </button>

                    {/* 3. Square */}
                    <button
                      type="button"
                      onClick={() => setAspectRatio('square')}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        aspectRatio === 'square'
                          ? 'bg-white/15 text-white font-semibold'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect
                          x="4"
                          y="4"
                          width="16"
                          height="16"
                          rx="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>Square</span>
                    </button>
                  </div>

                  {/* Two Parallel Columns: Landscape (left) & Portrait (right) */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                    {/* Left Column (Landscape) */}
                    <div className="flex flex-col gap-1">
                      {[
                        { id: '3:2', label: '3:2', h: 12 },
                        { id: '4:3', label: '4:3', h: 13.5 },
                        { id: '5:4', label: '5:4', h: 14.5 },
                        { id: '7:5', label: '7:5', h: 13 },
                        { id: '16:9', label: '16:9', h: 10 },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAspectRatio(item.id)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            aspectRatio === item.id
                              ? 'bg-white/15 text-white font-semibold'
                              : 'text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect
                              x="3"
                              y={(24 - item.h) / 2}
                              width="18"
                              height={item.h}
                              rx="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Right Column (Portrait) */}
                    <div className="flex flex-col gap-1">
                      {[
                        { id: '2:3', label: '2:3', w: 12 },
                        { id: '3:4', label: '3:4', w: 13.5 },
                        { id: '4:5', label: '4:5', w: 14.5 },
                        { id: '5:7', label: '5:7', w: 13 },
                        { id: '9:16', label: '9:16', w: 10 },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAspectRatio(item.id)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            aspectRatio === item.id
                              ? 'bg-white/15 text-white font-semibold'
                              : 'text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect
                              x={(24 - item.w) / 2}
                              y="3"
                              width={item.w}
                              height="18"
                              rx="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Text */}
              {activeTab === 'text' && (
                <div className="flex flex-col gap-4">
                  {/* Color Palette */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
                    {PALETTE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTextColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full shrink-0 border-2 transition-transform cursor-pointer ${
                          textColor === c
                            ? 'scale-125 border-white shadow-lg'
                            : 'border-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Font Size Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span>Size</span>
                      <span className="text-[#a898f8]">{fontSize}</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={80}
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#8774e1]"
                    />
                  </div>

                  {/* Font Family Selection */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
                      <span>Font</span>
                      <span className="text-[10px] text-gray-500">{CHAT_FONTS.length} styles</span>
                    </div>
                    <div className="flex flex-col gap-1 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                      {CHAT_FONTS.map((font) => (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => handleSelectFont(font)}
                          onMouseEnter={() => loadThemeFont(font.fontFamily, font.googleFontName)}
                          style={{ fontFamily: font.fontFamily }}
                          className={`px-3 py-2 rounded-xl text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            fontFamily === font.fontFamily
                              ? 'bg-[#8774e1]/30 text-[#a898f8] font-bold border border-[#8774e1]/40'
                              : 'text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="truncate">{font.name}</span>
                          <span className="text-xs opacity-60 ml-2 shrink-0">
                            {font.sampleText || 'Ag'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add Text Input */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <input
                      type="text"
                      placeholder="Type text..."
                      value={newTextInput}
                      onChange={(e) => setNewTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-purple-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddText}
                      disabled={!newTextInput.trim()}
                      className="w-full py-2 rounded-xl bg-[#8774e1] text-white text-xs font-semibold hover:bg-[#7763db] transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      Add Text
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: Draw (matching Screenshot 2, 4 & 5) */}
              {activeTab === 'draw' && (
                <div className="flex flex-col gap-4">
                  {/* Colors Palette & Color Wheel */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
                    {PALETTE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setDrawColor(c);
                          setIsColorMixerOpen(false);
                        }}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full shrink-0 transition-transform cursor-pointer ${
                          drawColor === c && !isColorMixerOpen
                            ? 'scale-120 ring-2 ring-white ring-offset-2 ring-offset-[#14151f] shadow-md'
                            : 'hover:scale-105 opacity-90 hover:opacity-100'
                        }`}
                      />
                    ))}

                    {/* Rainbow Color Wheel button (Screenshot 4 & 5) */}
                    <button
                      type="button"
                      onClick={() => setIsColorMixerOpen((p) => !p)}
                      title="Custom Color"
                      className={`w-6 h-6 rounded-full shrink-0 p-0.5 transition-transform cursor-pointer ${
                        isColorMixerOpen
                          ? 'scale-125 ring-2 ring-white shadow-lg'
                          : 'hover:scale-110'
                      }`}
                      style={{
                        background:
                          'conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                      }}
                    />
                  </div>

                  {/* Telegram-style Custom Color Mixer (Screenshot 5) */}
                  {isColorMixerOpen && (
                    <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-black/40 border border-white/10 animate-fadeIn">
                      {/* 1. Rainbow Hue Slider */}
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={pickerHue}
                        onChange={(e) => {
                          const h = parseInt(e.target.value, 10);
                          setPickerHue(h);
                          const [r, g, b] = hsvToRgb(h, pickerSat, pickerVal);
                          setDrawColor(rgbToHex(r, g, b));
                        }}
                        className="w-full h-3 rounded-full appearance-none cursor-pointer"
                        style={{
                          background:
                            'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                        }}
                      />

                      {/* 2. 2D Saturation / Value Gradient Box & Hex / RGB display */}
                      <div className="flex gap-2.5 items-stretch">
                        <div
                          ref={satValRef}
                          onPointerDown={(e) => {
                            setIsDraggingSatVal(true);
                            const rect = e.currentTarget.getBoundingClientRect();
                            const s = Math.max(
                              0,
                              Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
                            );
                            const v = Math.max(
                              0,
                              Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100),
                            );
                            setPickerSat(s);
                            setPickerVal(v);
                            const [r, g, b] = hsvToRgb(pickerHue, s, v);
                            setDrawColor(rgbToHex(r, g, b));
                          }}
                          className="flex-1 h-20 rounded-xl relative cursor-crosshair overflow-hidden touch-none"
                          style={{
                            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${pickerHue}, 100%, 50%))`,
                          }}
                        >
                          <div
                            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
                            style={{
                              left: `${pickerSat}%`,
                              top: `${100 - pickerVal}%`,
                              backgroundColor: drawColor,
                            }}
                          />
                        </div>

                        {/* HEX & RGB labels */}
                        <div className="w-24 flex flex-col justify-center gap-1.5 text-right font-mono">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                              HEX
                            </span>
                            <input
                              type="text"
                              value={drawColor}
                              onChange={(e) => setDrawColor(e.target.value)}
                              className="w-full text-right text-xs bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white outline-none focus:border-purple-400"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                              RGB
                            </span>
                            <span className="text-[11px] text-gray-200">
                              {pickR}, {pickG}, {pickB}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Brush Size Slider (Colored track with drawColor, matching Screenshot 2) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span>Size</span>
                      <span className="text-gray-400 font-mono text-xs">{drawSize}</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={36}
                      value={drawSize}
                      onChange={(e) => setDrawSize(parseInt(e.target.value, 10))}
                      style={{
                        accentColor: drawColor,
                        background: `linear-gradient(to right, ${drawColor} 0%, ${drawColor} ${
                          ((drawSize - 2) / (36 - 2)) * 100
                        }%, rgba(255,255,255,0.15) ${
                          ((drawSize - 2) / (36 - 2)) * 100
                        }%, rgba(255,255,255,0.15) 100%)`,
                      }}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* 5 Lifelike Telegram Drawing Tools (matching Screenshot 2) */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="text-xs font-semibold text-gray-400 mb-0.5">Tool</div>

                    {TOOL_CONFIGS.map((t) => {
                      const isSelected = drawTool === t.id;
                      const activeColor = isSelected ? drawColor : t.defaultColor;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setDrawTool(t.id)}
                          className={`w-full flex items-center gap-3.5 px-3 py-2 rounded-2xl transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'bg-[#23252a] text-white font-semibold shadow-sm'
                              : 'text-gray-300 hover:bg-white/5 font-medium'
                          }`}
                        >
                          {t.id === 'pen' && <RealisticPenIcon color={activeColor} />}
                          {t.id === 'arrow' && <RealisticArrowIcon color={activeColor} />}
                          {t.id === 'marker' && <RealisticMarkerIcon color={activeColor} />}
                          {t.id === 'neon' && <RealisticNeonIcon color={activeColor} />}
                          {t.id === 'eraser' && <RealisticEraserIcon />}
                          <span className="text-sm font-medium">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Clear Canvas */}
                  <button
                    type="button"
                    onClick={() => {
                      strokesRef.current = [];
                      setStrokeVersion((v) => v + 1);
                      redrawCanvas();
                    }}
                    className="w-full py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium text-red-300 hover:text-red-200 transition-colors cursor-pointer"
                  >
                    Clear Drawing
                  </button>
                </div>
              )}

              {/* Tab 5: Stickers / Static Apple Emoji */}
              {activeTab === 'stickers' && (
                <div className="flex flex-col gap-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Click emoji to add
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                    {EMOJI_STICKERS.map((emoji) => {
                      const unified = emojiToUnified(emoji);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleAddSticker(emoji)}
                          className="h-12 rounded-xl bg-white/5 hover:bg-white/15 p-2 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                        >
                          <img
                            src={`${APPLE_PNG_CDN}/${unified}.png`}
                            alt={emoji}
                            className="w-7 h-7 object-contain pointer-events-none select-none"
                            loading="lazy"
                            draggable={false}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Row & Floating Telegram Purple Checkmark Button (Screenshot 2) */}
            <div className="border-t border-white/10 p-3 sm:p-4 flex flex-col gap-2 shrink-0 bg-black/20">
              {/* Option Toggles */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSpoiler((p) => !p)}
                  className={`flex-1 py-1.5 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSpoiler
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                  }`}
                  title="Toggle spoiler"
                >
                  <EyeOff size={14} />
                  <span>Spoiler</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSendAsFile((p) => !p)}
                  className={`flex-1 py-1.5 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    sendAsFile
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                  }`}
                  title="Send as file"
                >
                  <FileText size={14} />
                  <span>As file</span>
                </button>
              </div>

              {/* Done and Send Buttons with floating round checkmark (matching Screenshot 2) */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isExporting}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>Done</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(true)}
                  disabled={isExporting}
                  className="flex-1 py-2.5 rounded-xl bg-[#8774e1] hover:bg-[#7763db] active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#8774e1]/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>Send...</span>
                </button>

                {/* Floating Checkmark Icon Button in bottom right corner (Screenshot 2) */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isExporting}
                  title="Apply changes"
                  className="w-10 h-10 rounded-full bg-[#8774e1] hover:bg-[#7763db] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-[#8774e1]/40 shrink-0 transition-transform cursor-pointer disabled:opacity-50"
                >
                  <Check size={20} className="stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Send Video Confirmation Modal */}
      {isSendModalOpen && (
        <SendVideoModal
          videoSrc={videoSrc}
          isSpoiler={isSpoiler}
          sendAsFile={sendAsFile}
          isMuted={isMuted}
          onToggleSpoiler={() => setIsSpoiler((p) => !p)}
          onToggleSendAsFile={() => setSendAsFile((p) => !p)}
          onToggleMute={() => setIsMuted((p) => !p)}
          onClose={() => setIsSendModalOpen(false)}
          onSend={handleSendDirect}
          uploadProgress={exportProgress}
          isUploading={isExporting}
        />
      )}

      {/* Discard Changes Confirmation Modal (matching user screenshot) */}
      {isDiscardModalOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsDiscardModalOpen(false)}
        >
          <div
            className="w-full max-w-[340px] bg-[#222428] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/80 flex flex-col gap-3 animate-scaleIn select-none"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-title"
            aria-describedby="discard-desc"
          >
            <h2 id="discard-title" className="text-lg font-bold text-white tracking-wide">
              Discard Changes
            </h2>
            <p id="discard-desc" className="text-sm text-gray-300 leading-relaxed">
              Are you sure you want to discard your changes?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDiscardModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold tracking-wider text-[#8774e1] hover:text-[#a898f8] hover:bg-[#8774e1]/10 active:scale-95 transition-all cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDiscardModalOpen(false);
                  onCancel();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold tracking-wider text-[#8774e1] hover:text-[#a898f8] hover:bg-[#8774e1]/10 active:scale-95 transition-all cursor-pointer"
              >
                DISCARD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export processing overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 animate-fadeIn">
          <CircularProgress percent={exportProgress} size={64} />
          <span className="text-sm font-semibold text-white tracking-wide">
            Saving video ({exportProgress}%)...
          </span>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
