import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  FlipHorizontal,
  RotateCw,
  Undo2,
  Redo2,
  Pencil,
  Highlighter,
  Eraser,
  Smile,
  Type,
  Pipette,
  EyeOff,
} from 'lucide-react';
import type { Theme, EmojiStyle } from 'emoji-picker-react';
import { useUndoRedoStack } from '../model/useUndoRedoStack';
import { useCanvasEditor } from './imageEditor/useCanvasEditor';
import { DrawTool, Snapshot, ToolMode } from './imageEditor/types';
import TextDraftOverlay from './imageEditor/TextDraftOverlay';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#a855f7',
  '#ffffff',
];

interface ImageEditorModalProps {
  file: File;
  initialSpoiler?: boolean;
  onCancel: () => void;
  onSave: (editedFile: File, isSpoiler?: boolean) => void;
}

export default function ImageEditorModal({
  file,
  initialSpoiler = false,
  onCancel,
  onSave,
}: ImageEditorModalProps) {
  const { current, setCurrent, commit, undo, redo, canUndo, canRedo } =
    useUndoRedoStack<Snapshot>();

  const [isSpoiler, setIsSpoiler] = useState(initialSpoiler);
  const [toolMode, setToolMode] = useState<ToolMode>('draw');
  const [drawTool, setDrawTool] = useState<DrawTool>('pencil');
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(10);

  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [pendingSticker, setPendingSticker] = useState<string | null>(null);

  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null);

  const {
    canvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleMirror,
    handleRotate,
  } = useCanvasEditor({
    current,
    commit,
    toolMode,
    drawTool,
    color,
    size,
    pendingSticker,
    setPendingSticker,
    setTextDraft,
  });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setCurrent({
        baseImageSrc: url,
        baseWidth: img.naturalWidth,
        baseHeight: img.naturalHeight,
        strokes: [],
        stickers: [],
        texts: [],
      });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, setCurrent]);

  const commitTextDraft = () => {
    if (!textDraft || !current) {
      setTextDraft(null);
      return;
    }
    if (textDraft.value.trim()) {
      commit({
        ...current,
        texts: [
          ...current.texts,
          {
            id: crypto.randomUUID(),
            text: textDraft.value,
            x: textDraft.x,
            y: textDraft.y,
            color,
            fontSize: size * 2.4,
          },
        ],
      });
    }
    setTextDraft(null);
  };

  const handleDone = () => {
    if (textDraft) commitTextDraft();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const edited = new File([blob], file.name.replace(/\.\w+$/, '.png'), { type: 'image/png' });
      onSave(edited, isSpoiler);
    }, 'image/png');
  };

  if (!current) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80">
        <p className="text-gray-400 text-sm">Loading image…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black/90 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-full text-sm font-semibold text-gray-200 bg-white/5 hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSpoiler((v) => !v)}
            title={isSpoiler ? 'Hide under spoiler: On' : 'Hide under spoiler: Off'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              isSpoiler
                ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <EyeOff size={14} className={isSpoiler ? 'text-purple-300' : 'text-gray-400'} />
            <span>Hide under spoiler</span>
          </button>

          <div className="w-px h-5 bg-white/10" />

          <button
            onClick={handleMirror}
            title="Mirror 180°"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <FlipHorizontal size={18} />
          </button>
          <button
            onClick={handleRotate}
            title="Rotate 90°"
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <RotateCw size={18} />
          </button>
        </div>

        <button
          onClick={handleDone}
          className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-lg shadow-purple-500/25 transition-all active:scale-95 cursor-pointer"
        >
          Done
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 px-6 relative">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 touch-none"
          style={{
            maxWidth: '100%',
            maxHeight: '65vh',
            width: 'auto',
            height: 'auto',
            cursor: toolMode === 'draw' ? 'crosshair' : pendingSticker ? 'copy' : 'default',
          }}
        />

        {textDraft && (
          <TextDraftOverlay
            canvasRef={canvasRef}
            draft={textDraft}
            color={color}
            fontSize={size * 2.4}
            onChange={(value) => setTextDraft((prev) => (prev ? { ...prev, value } : prev))}
            onCommit={commitTextDraft}
          />
        )}
      </div>

      <div className="flex-shrink-0 bg-[#141416]/95 backdrop-blur-2xl border-t border-white/10">
        {toolMode === 'draw' && (
          <div className="flex items-center gap-3 px-6 pt-4">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Redo2 size={18} />
            </button>

            <div className="w-px h-6 bg-white/10 mx-1" />

            {(
              [
                { key: 'pencil', icon: Pencil, label: 'Pencil' },
                { key: 'marker', icon: Highlighter, label: 'Marker' },
                { key: 'eraser', icon: Eraser, label: 'Eraser' },
              ] as { key: DrawTool; icon: typeof Pencil; label: string }[]
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setDrawTool(key)}
                title={label}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  drawTool === key
                    ? 'bg-white/15 text-white'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={16} />
              </button>
            ))}

            <input
              type="range"
              min={2}
              max={40}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="flex-1 mx-2 accent-purple-500"
            />

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c
                      ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                      : 'border-transparent'
                  }`}
                />
              ))}
              <label
                title="Custom color"
                className="relative w-6 h-6 rounded-full border border-white/20 flex items-center justify-center cursor-pointer overflow-hidden bg-white/5 hover:scale-110 transition-transform"
              >
                <Pipette size={12} className="text-gray-300 pointer-events-none" />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {toolMode === 'sticker' && (
          <div className="flex items-center justify-between px-6 pt-4">
            <p className="text-xs text-gray-400">
              {pendingSticker
                ? 'Click on the image to place it'
                : 'Pick an emoji, then click on the image'}
            </p>
            <div className="relative">
              <button
                onClick={() => setEmojiPickerOpen((v) => !v)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-500/20 border border-purple-400/30 text-purple-300 hover:bg-purple-500/30 transition-colors"
              >
                Choose emoji
              </button>
              {isEmojiPickerOpen && (
                <div className="absolute bottom-full right-0 mb-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl bg-[#1c1d29]/95 rounded-2xl overflow-hidden border border-white/10 animate-fadeIn">
                  <Suspense
                    fallback={
                      <div className="w-[300px] h-[350px] flex items-center justify-center text-gray-500 text-sm">
                        Loading…
                      </div>
                    }
                  >
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setPendingSticker(emojiData.emoji);
                        setEmojiPickerOpen(false);
                      }}
                      theme={'dark' as Theme}
                      emojiStyle={'apple' as EmojiStyle}
                      lazyLoadEmojis
                      previewConfig={{ showPreview: false }}
                      height={350}
                      width={300}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        )}

        {toolMode === 'text' && (
          <div className="flex items-center gap-4 px-6 pt-4">
            <p className="text-xs text-gray-400 flex-shrink-0">Click on the image to add text</p>
            <input
              type="range"
              min={10}
              max={40}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="flex-1 accent-purple-500"
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c
                      ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                      : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 px-6 py-4">
          {(
            [
              { key: 'draw', icon: Pencil, label: 'Draw' },
              { key: 'sticker', icon: Smile, label: 'Sticker' },
              { key: 'text', icon: Type, label: 'Text' },
            ] as { key: ToolMode; icon: typeof Pencil; label: string }[]
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setToolMode(key)}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl text-xs font-medium transition-all ${
                toolMode === key
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-md shadow-purple-500/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
