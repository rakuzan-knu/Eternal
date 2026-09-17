import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, RotateCcw, X, Headphones, User } from 'lucide-react';
import type { SpatialAudioManager } from '../../lib/webrtc/spatialAudio';
import type { UserSnapshot } from '@common/contracts';

interface ParticipantSpatialNode {
  userId: string;
  name: string;
  avatarUrl?: string;
  x: number; // -4.0 to +4.0
  z: number; // -4.0 to +4.0
}

interface SpatialAudioMixer2DProps {
  isOpen: boolean;
  onClose: () => void;
  spatialAudioManager: SpatialAudioManager | null;
  participants: Array<{ userId: string; user: UserSnapshot }>;
}

export function SpatialAudioMixer2D({
  isOpen,
  onClose,
  spatialAudioManager,
  participants,
}: SpatialAudioMixer2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<ParticipantSpatialNode[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Sync positions from SpatialAudioManager on mount / open
  useEffect(() => {
    if (!isOpen || !spatialAudioManager) return;

    const currentPositions = spatialAudioManager.getParticipantPositions();
    const list: ParticipantSpatialNode[] = participants.map((p, idx) => {
      const pos = currentPositions.get(p.userId);
      if (pos) {
        return {
          userId: p.userId,
          name: p.user.displayName || p.user.username || `User ${idx + 1}`,
          avatarUrl: p.user.avatar || undefined,
          x: pos.x,
          z: pos.z,
        };
      }
      // Default initial layout
      const defaultX = idx === 0 ? -2.0 : idx === 1 ? 2.0 : (idx - 1) * 1.5;
      return {
        userId: p.userId,
        name: p.user.displayName || p.user.username || `User ${idx + 1}`,
        avatarUrl: p.user.avatar || undefined,
        x: defaultX,
        z: -1.0,
      };
    });

    setNodes(list);
  }, [isOpen, spatialAudioManager, participants]);

  const handlePointerDown = (userId: string) => {
    setDraggingId(userId);
  };

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingId || !containerRef.current || !spatialAudioManager) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Coordinate normalization [-4, 4]
      const radius = rect.width / 2;
      const normX = ((clientX - centerX) / radius) * 4.0;
      const normZ = ((clientY - centerY) / radius) * 4.0;

      const clampedX = Math.max(-4.0, Math.min(4.0, normX));
      const clampedZ = Math.max(-4.0, Math.min(4.0, normZ));

      spatialAudioManager.setParticipantManualPosition(draggingId, clampedX, clampedZ);

      setNodes((prev) =>
        prev.map((n) => (n.userId === draggingId ? { ...n, x: clampedX, z: clampedZ } : n)),
      );
    },
    [draggingId, spatialAudioManager],
  );

  const handlePointerUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleReset = () => {
    if (!spatialAudioManager) return;
    spatialAudioManager.clearAllManualPositions();
    const currentPositions = spatialAudioManager.getParticipantPositions();
    setNodes((prev) =>
      prev.map((n) => {
        const p = currentPositions.get(n.userId);
        return {
          ...n,
          x: p ? p.x : 0,
          z: p ? p.z : -1,
        };
      }),
    );
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (draggingId) handlePointerMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      if (draggingId) handlePointerUp();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [draggingId, handlePointerMove, handlePointerUp]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-semibold text-white">2D Пространственный звук</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              title="Сбросить в авто-режим"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Авто</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-2 mb-4">
          Перетаскивайте иконки участников по звуковой карте, чтобы расположить их голоса в
          стерео-пространстве комнаты.
        </p>

        {/* 2D Acoustic Stage Radar */}
        <div
          ref={containerRef}
          className="relative w-full aspect-square rounded-full border border-sky-500/20 bg-slate-950/60 overflow-hidden select-none flex items-center justify-center shadow-inner"
        >
          {/* Concentric distance circles */}
          <div className="absolute w-3/4 h-3/4 rounded-full border border-dashed border-sky-500/10 pointer-events-none" />
          <div className="absolute w-1/2 h-1/2 rounded-full border border-dashed border-sky-500/20 pointer-events-none" />
          <div className="absolute w-1/4 h-1/4 rounded-full border border-dashed border-sky-500/30 pointer-events-none" />

          {/* Coordinate axis lines */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-sky-500/15 pointer-events-none" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-sky-500/15 pointer-events-none" />

          {/* Center: Listener (Headphones facing forward/up) */}
          <div className="relative z-10 flex flex-col items-center justify-center w-12 h-12 rounded-full bg-sky-500/20 border border-sky-400 text-sky-300 shadow-lg shadow-sky-500/20 pointer-events-none">
            <Headphones className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-0.5">ВЫ</span>
          </div>

          {/* Draggable Participant Nodes */}
          {nodes.map((node) => {
            // Coordinate mapping: norm [-4, 4] -> [0%, 100%]
            const leftPercent = 50 + (node.x / 4.0) * 45;
            const topPercent = 50 + (node.z / 4.0) * 45;

            return (
              <div
                key={node.userId}
                onMouseDown={() => handlePointerDown(node.userId)}
                onTouchStart={() => handlePointerDown(node.userId)}
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute z-20 flex flex-col items-center cursor-grab active:cursor-grabbing transition-transform ${
                  draggingId === node.userId ? 'scale-110' : 'hover:scale-105'
                }`}
              >
                <div className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-slate-800 flex items-center justify-center overflow-hidden shadow-md shadow-emerald-500/20">
                  {node.avatarUrl ? (
                    <img
                      src={node.avatarUrl}
                      alt={node.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-emerald-300" />
                  )}
                </div>
                <span className="text-[10px] font-medium text-slate-200 mt-1 max-w-17.5 truncate bg-slate-900/80 px-1.5 py-0.5 rounded shadow">
                  {node.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center mt-4 text-[11px] text-slate-400">
          <span>Слева: $X &lt; 0$</span>
          <span>Впереди: $Z &lt; 0$</span>
          <span>Справа: $X &gt; 0$</span>
        </div>
      </div>
    </div>
  );
}
