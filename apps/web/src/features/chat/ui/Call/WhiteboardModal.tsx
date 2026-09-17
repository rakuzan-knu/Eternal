import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer,
  PenTool,
  Square,
  Circle,
  Diamond,
  ArrowUpRight,
  Minus,
  Type,
  StickyNote,
  Eraser,
  Undo2,
  Redo2,
  Download,
  Trash2,
  Layers,
  X,
  Check,
} from 'lucide-react';
import type {
  WhiteboardCRDTEngine,
  WhiteboardElement,
  WhiteboardToolType,
  ParticipantCursor,
} from '../../lib/webrtc/whiteboardCRDT';

interface WhiteboardModalProps {
  engine: WhiteboardCRDTEngine | null;
  isOpen: boolean;
  onClose: () => void;
  isOverlay?: boolean;
  onToggleOverlay?: (overlay: boolean) => void;
}

const COLORS = [
  '#ffffff', // White
  '#38bdf8', // Sky Cyan
  '#a855f7', // Purple/Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber/Gold
  '#f43f5e', // Rose/Red
  '#ec4899', // Pink
  '#94a3b8', // Slate Grey
];

const STICKY_COLORS = [
  { bg: '#fef08a', text: '#713f12', border: '#fde047', label: 'Yellow' },
  { bg: '#fbcfe8', text: '#831843', border: '#f472b6', label: 'Pink' },
  { bg: '#a7f3d0', text: '#064e3b', border: '#34d399', label: 'Mint' },
  { bg: '#bae6fd', text: '#0c4a6e', border: '#38bdf8', label: 'Blue' },
  { bg: '#ddd6fe', text: '#4c1d95', border: '#a78bfa', label: 'Lavender' },
];

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({
  engine,
  isOpen,
  onClose,
  isOverlay = false,
  onToggleOverlay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeTool, setActiveTool] = useState<WhiteboardToolType>('pen');
  const [activeColor, setActiveColor] = useState<string>('#38bdf8');
  const [activeStickyColorIndex, setActiveStickyColorIndex] = useState<number>(0);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [cursors, setCursors] = useState<ParticipantCursor[]>([]);

  // Editing sticky/text element
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Drawing state
  const isDrawingRef = useRef(false);
  const currentElementRef = useRef<WhiteboardElement | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Subscribe to engine elements and cursors
  useEffect(() => {
    if (!engine || !isOpen) return;

    const unsubElements = engine.subscribeElements((elems) => {
      setElements(elems);
    });

    const unsubCursors = engine.subscribeCursors((curList) => {
      setCursors(curList);
    });

    return () => {
      unsubElements();
      unsubCursors();
    };
  }, [engine, isOpen]);

  // Render canvas loop
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // If not in transparent overlay mode, render subtle dark dot grid
    if (!isOverlay) {
      ctx.fillStyle = '#0f111a';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      const gridSize = 24;
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Render all elements
    const allElements = currentElementRef.current
      ? [...elements, currentElementRef.current]
      : elements;

    allElements.forEach((el) => {
      ctx.save();
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (el.type) {
        case 'pen': {
          if (el.points && el.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(el.points[0]?.x ?? el.x, el.points[0]?.y ?? el.y);
            // Smooth curve
            for (let i = 1; i < el.points.length - 1; i++) {
              const pt1 = el.points[i];
              const pt2 = el.points[i + 1];
              if (!pt1 || !pt2) continue;
              const xc = (pt1.x + pt2.x) / 2;
              const yc = (pt1.y + pt2.y) / 2;
              ctx.quadraticCurveTo(pt1.x, pt1.y, xc, yc);
            }
            const last = el.points[el.points.length - 1];
            if (last) {
              ctx.lineTo(last.x, last.y);
            }
            ctx.stroke();
          }
          break;
        }

        case 'rectangle': {
          if (el.fillColor) {
            ctx.fillStyle = el.fillColor;
            ctx.fillRect(el.x, el.y, el.width, el.height);
          }
          ctx.strokeRect(el.x, el.y, el.width, el.height);
          break;
        }

        case 'circle': {
          ctx.beginPath();
          const rx = Math.abs(el.width / 2);
          const ry = Math.abs(el.height / 2);
          const cx = el.x + el.width / 2;
          const cy = el.y + el.height / 2;
          ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
          if (el.fillColor) {
            ctx.fillStyle = el.fillColor;
            ctx.fill();
          }
          ctx.stroke();
          break;
        }

        case 'diamond': {
          ctx.beginPath();
          const midX = el.x + el.width / 2;
          const midY = el.y + el.height / 2;
          ctx.moveTo(midX, el.y);
          ctx.lineTo(el.x + el.width, midY);
          ctx.lineTo(midX, el.y + el.height);
          ctx.lineTo(el.x, midY);
          ctx.closePath();
          if (el.fillColor) {
            ctx.fillStyle = el.fillColor;
            ctx.fill();
          }
          ctx.stroke();
          break;
        }

        case 'line': {
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.lineTo(el.x + el.width, el.y + el.height);
          ctx.stroke();
          break;
        }

        case 'arrow': {
          const fromX = el.x;
          const fromY = el.y;
          const toX = el.x + el.width;
          const toY = el.y + el.height;
          const angle = Math.atan2(toY - fromY, toX - fromX);
          const headLen = Math.max(10, el.strokeWidth * 3);

          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.stroke();

          // Arrow head
          ctx.beginPath();
          ctx.moveTo(toX, toY);
          ctx.lineTo(
            toX - headLen * Math.cos(angle - Math.PI / 6),
            toY - headLen * Math.sin(angle - Math.PI / 6),
          );
          ctx.lineTo(
            toX - headLen * Math.cos(angle + Math.PI / 6),
            toY - headLen * Math.sin(angle + Math.PI / 6),
          );
          ctx.closePath();
          ctx.fillStyle = el.strokeColor;
          ctx.fill();
          break;
        }

        case 'sticky': {
          // Miro-style sticky note
          ctx.fillStyle = el.fillColor || '#fef08a';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 4;

          const radius = 6;
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, el.width, el.height, radius);
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = el.strokeColor || '#fde047';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Author badge top right
          if (el.authorName) {
            ctx.font = '10px Inter, sans-serif';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillText(el.authorName, el.x + 8, el.y + 16);
          }

          // Text content
          if (el.text) {
            ctx.font = '500 13px Inter, sans-serif';
            ctx.fillStyle = '#1c1917';
            const lines = el.text.split('\n');
            lines.slice(0, 5).forEach((ln, idx) => {
              ctx.fillText(ln, el.x + 10, el.y + 36 + idx * 18, el.width - 20);
            });
          }
          break;
        }

        case 'text': {
          if (el.text) {
            ctx.font = '600 16px Inter, sans-serif';
            ctx.fillStyle = el.strokeColor;
            ctx.fillText(el.text, el.x, el.y);
          }
          break;
        }
      }

      ctx.restore();
    });
  }, [elements, isOverlay]);

  // Adjust canvas resolution to window/screen size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      redrawCanvas();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redrawCanvas]);

  // Redraw when elements change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas, elements]);

  // Mouse / pointer drawing handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !engine) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const author = engine?.getAuthor() || { id: 'self', name: 'Me' };

    if (activeTool === 'select') {
      // Find element near click to edit text/sticky notes
      const clicked = [...elements].reverse().find((el) => {
        const minX = Math.min(el.x, el.x + el.width);
        const maxX = Math.max(el.x, el.x + el.width);
        const minY = Math.min(el.y, el.y + el.height);
        const maxY = Math.max(el.y, el.y + el.height);
        return x >= minX - 10 && x <= maxX + 10 && y >= minY - 10 && y <= maxY + 10;
      });
      if (clicked && (clicked.type === 'sticky' || clicked.type === 'text')) {
        setEditingId(clicked.id);
        setEditingText(clicked.text || '');
      }
      return;
    }

    if (activeTool === 'eraser') {
      // Find element near click and delete
      const clicked = [...elements].reverse().find((el) => {
        return (
          x >= Math.min(el.x, el.x + el.width) - 10 &&
          x <= Math.max(el.x, el.x + el.width) + 10 &&
          y >= Math.min(el.y, el.y + el.height) - 10 &&
          y <= Math.max(el.y, el.y + el.height) + 10
        );
      });
      if (clicked) {
        engine.deleteElement(clicked.id);
      }
      return;
    }

    if (activeTool === 'sticky') {
      const stickyColor = STICKY_COLORS[activeStickyColorIndex] || STICKY_COLORS[0]!;
      const newSticky: WhiteboardElement = {
        id: `sticky-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'sticky',
        x,
        y,
        width: 150,
        height: 130,
        strokeColor: stickyColor.border,
        fillColor: stickyColor.bg,
        strokeWidth: 1,
        text: 'New Note',
        authorId: author.id,
        authorName: author.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      engine.addElement(newSticky);
      setEditingId(newSticky.id);
      setEditingText('New Note');
      setActiveTool('select');
      return;
    }

    if (activeTool === 'text') {
      const newText: WhiteboardElement = {
        id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'text',
        x,
        y,
        width: 120,
        height: 32,
        strokeColor: activeColor,
        strokeWidth: 2,
        text: 'Text',
        authorId: author.id,
        authorName: author.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      engine.addElement(newText);
      setEditingId(newText.id);
      setEditingText('Text');
      setActiveTool('select');
      return;
    }

    // Freehand or geometric shapes
    isDrawingRef.current = true;
    const newEl: WhiteboardElement = {
      id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: activeTool,
      x,
      y,
      width: 0,
      height: 0,
      points: activeTool === 'pen' ? [{ x, y }] : undefined,
      strokeColor: activeColor,
      strokeWidth,
      authorId: author.id,
      authorName: author.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    currentElementRef.current = newEl;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !engine) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Broadcast cursor position
    engine.sendCursor(x, y, activeTool);

    if (!isDrawingRef.current || !currentElementRef.current) return;

    const curr = currentElementRef.current;
    if (curr.type === 'pen') {
      curr.points?.push({ x, y });
    } else {
      curr.width = x - curr.x;
      curr.height = y - curr.y;
    }

    redrawCanvas();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current || !currentElementRef.current || !engine) {
      isDrawingRef.current = false;
      currentElementRef.current = null;
      return;
    }

    const finished = currentElementRef.current;
    engine.addElement(finished);

    isDrawingRef.current = false;
    currentElementRef.current = null;
    redrawCanvas();
  };

  // Keyboard tool shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (showClearConfirm) {
          setShowClearConfirm(false);
        } else {
          onClose();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        engine?.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        engine?.redo();
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool('pen');
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTool('sticky');
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveTool('rectangle');
      } else if (e.key === 'c' || e.key === 'C') {
        setActiveTool('circle');
      } else if (e.key === 'a' || e.key === 'A') {
        setActiveTool('arrow');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, engine, onClose, showClearConfirm]);

  // Export board as PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="CRDT Interactive Whiteboard"
      className={`fixed inset-0 z-40 flex flex-col transition-all duration-200 select-none ${
        isOverlay ? 'pointer-events-none bg-black/20' : 'bg-[#0f111a]'
      }`}
    >
      {/* Top Floating Control Bar */}
      <div
        role="toolbar"
        aria-label="Whiteboard top controls"
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl pointer-events-auto text-white"
      >
        <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
          <PenTool className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide">P2P Whiteboard</span>
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono border border-cyan-500/30">
            CRDT
          </span>
        </div>

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => engine?.undo()}
          disabled={!engine?.canUndo()}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => engine?.redo()}
          disabled={!engine?.canRedo()}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Mode Toggle: Full vs Overlay */}
        <button
          type="button"
          onClick={() => onToggleOverlay?.(!isOverlay)}
          title={isOverlay ? 'Switch to Full Board' : 'Switch to Screen Share Overlay'}
          aria-label="Toggle Overlay Mode"
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
            isOverlay
              ? 'bg-purple-600/40 border-purple-400 text-purple-200'
              : 'bg-neutral-800 border-white/10 text-neutral-300 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isOverlay ? 'Overlay: ON' : 'Board: Full'}</span>
        </button>

        {/* Export & Clear */}
        <button
          type="button"
          onClick={handleExportPNG}
          title="Export as PNG"
          aria-label="Export as PNG"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowClearConfirm(true)}
          title="Clear Board"
          aria-label="Clear Board"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Close Whiteboard"
          aria-label="Close Whiteboard"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Clear Board Confirm Dialog */}
      {showClearConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm Clear Board"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl bg-neutral-900 border border-rose-500/40 shadow-2xl pointer-events-auto flex items-center gap-4 text-white"
        >
          <span className="text-xs text-neutral-200">Clear all elements for everyone?</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                engine?.clearBoard();
                setShowClearConfirm(false);
              }}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-xs font-semibold rounded-lg"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          aria-label="Interactive collaborative whiteboard canvas"
          className={`w-full h-full block ${
            activeTool === 'select'
              ? 'cursor-default'
              : activeTool === 'eraser'
                ? 'cursor-cell'
                : 'cursor-crosshair'
          } ${isOverlay ? 'pointer-events-auto' : ''}`}
        />

        {/* Live Participant Cursors */}
        {cursors.map((c) => (
          <div
            key={c.userId}
            className="absolute top-0 left-0 pointer-events-none transition-transform duration-75 ease-out z-30 flex items-start gap-1"
            style={{
              transform: `translate3d(${c.x}px, ${c.y}px, 0)`,
            }}
          >
            <MousePointer
              className="w-4 h-4 drop-shadow-md"
              style={{ color: c.color, fill: c.color }}
            />
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded shadow-lg text-white font-mono truncate max-w-30"
              style={{ backgroundColor: c.color }}
            >
              {c.userName}
            </span>
          </div>
        ))}
      </div>

      {/* Floating Bottom Tools Dock */}
      <div
        role="toolbar"
        aria-label="Whiteboard drawing tools"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-full bg-neutral-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl pointer-events-auto"
      >
        {/* Tool Selectors */}
        <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
          {[
            { id: 'select', icon: MousePointer, label: 'Select (V)' },
            { id: 'pen', icon: PenTool, label: 'Pen (P)' },
            { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
            { id: 'circle', icon: Circle, label: 'Circle (C)' },
            { id: 'diamond', icon: Diamond, label: 'Diamond (D)' },
            { id: 'arrow', icon: ArrowUpRight, label: 'Arrow (A)' },
            { id: 'line', icon: Minus, label: 'Line (L)' },
            { id: 'text', icon: Type, label: 'Text (T)' },
            { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
            { id: 'eraser', icon: Eraser, label: 'Eraser (E)' },
          ].map((tool) => {
            const Icon = tool.icon;
            const isCurrent = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id as WhiteboardToolType)}
                title={tool.label}
                aria-label={tool.label}
                className={`p-2 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)] scale-105'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Color Swatches */}
        {activeTool !== 'sticky' && activeTool !== 'eraser' && (
          <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
            {COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setActiveColor(col)}
                title={`Color ${col}`}
                aria-label={`Color ${col}`}
                className={`w-5 h-5 rounded-full transition-transform border ${
                  activeColor === col
                    ? 'scale-125 border-white ring-2 ring-cyan-500/50'
                    : 'border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        )}

        {/* Sticky Color Swatches */}
        {activeTool === 'sticky' && (
          <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
            {STICKY_COLORS.map((sc, idx) => (
              <button
                key={sc.bg}
                type="button"
                onClick={() => setActiveStickyColorIndex(idx)}
                title={sc.label}
                aria-label={sc.label}
                className={`w-5 h-5 rounded-md transition-transform border ${
                  activeStickyColorIndex === idx
                    ? 'scale-125 border-white ring-2 ring-purple-500/50'
                    : 'border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: sc.bg }}
              />
            ))}
          </div>
        )}

        {/* Stroke Width Selector */}
        {activeTool !== 'sticky' && activeTool !== 'select' && activeTool !== 'eraser' && (
          <div className="flex items-center gap-1.5">
            {[2, 4, 8].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setStrokeWidth(w)}
                title={`Stroke width ${w}px`}
                aria-label={`Stroke width ${w}px`}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-mono font-medium transition-colors ${
                  strokeWidth === w
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Note Edit Modal / Overlay */}
      {editingId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Sticky Note"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="relative w-full max-w-sm p-4 rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl text-white space-y-3">
            <h4 className="text-xs font-semibold text-neutral-300">Edit Note</h4>
            <textarea
              autoFocus
              rows={4}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none font-sans"
              placeholder="Type note content..."
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  engine?.updateElement(editingId, { text: editingText });
                  setEditingId(null);
                }}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
