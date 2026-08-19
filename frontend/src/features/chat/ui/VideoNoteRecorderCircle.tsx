import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, Trash2, Send, Play, Pause, Square, Camera, Check } from 'lucide-react';
import { RecordedPayload, RecordState } from '../model/useMediaRecorderGesture';

interface VideoNoteRecorderCircleProps {
  recordState: RecordState;
  duration: number;
  stream: MediaStream | null;
  previewPayload: RecordedPayload | null;
  dragOffset: { x: number; y: number };
  availableCameras?: { deviceId: string; label: string }[];
  activeCameraId?: string | null;
  cameraToast?: { text: string; isFading: boolean } | null;
  onToggleFacing: () => void;
  onSelectCamera?: (deviceId: string) => void;
  onDiscard: () => void;
  onPausePreview: () => void;
  onSend: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoNoteRecorderCircle({
  recordState,
  duration,
  stream,
  previewPayload,
  dragOffset,
  availableCameras = [],
  activeCameraId,
  cameraToast,
  onToggleFacing,
  onSelectCamera,
  onDiscard,
  onPausePreview,
  onSend,
}: VideoNoteRecorderCircleProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(true);
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);

  // Bind live stream
  useEffect(() => {
    if (videoRef.current && stream && recordState !== 'preview') {
      videoRef.current.srcObject = stream;
    }
  }, [stream, recordState]);

  // Radius for 60s progress ring
  const size = 260;
  const strokeWidth = 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressFraction = Math.min(1, duration / 60);
  const strokeDashoffset = circumference * (1 - progressFraction);

  const togglePreviewPlay = () => {
    if (!previewVideoRef.current) return;
    if (isPlayingPreview) {
      previewVideoRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewVideoRef.current
        .play()
        .then(() => setIsPlayingPreview(true))
        .catch(() => {});
    }
  };

  return (
    <div
      data-testid="video-note-recorder"
      className="fixed bottom-24 right-6 sm:right-10 z-50 flex flex-col items-center select-none animate-popIn"
    >
      {/* 1:1 Circular Viewport */}
      <div
        className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden border-2 border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.35)] bg-black"
        style={{
          transform: `translate(${Math.min(0, dragOffset.x * 0.3)}px, ${Math.min(0, dragOffset.y * 0.3)}px)`,
        }}
      >
        {/* Live Camera View or Preview Video */}
        {recordState !== 'preview' ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <video
            ref={previewVideoRef}
            src={previewPayload?.previewUrl}
            autoPlay
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* SVG Radial Progress Ring (60 seconds) */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#a855f7"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>

        {/* Duration Timer Capsule at Top */}
        <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none z-10">
          <div className="px-3 py-1 rounded-full bg-black/70 border border-white/10 backdrop-blur-md text-[11px] font-mono font-bold text-white flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>
              {formatDuration(
                recordState === 'preview' ? (previewPayload?.duration ?? duration) : duration,
              )}
            </span>
            <span className="text-gray-400 font-normal">/ 1:00</span>
          </div>
        </div>

        {/* Camera Switched Glass Toast */}
        {cameraToast && (
          <div className="absolute top-12 inset-x-0 flex justify-center pointer-events-none z-20">
            <div
              className={`px-3 py-1 rounded-full bg-[#181926]/90 border border-white/20 backdrop-blur-2xl text-[11px] font-medium text-white flex items-center gap-1.5 shadow-xl transition-all duration-300 ${
                cameraToast.isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-popIn'
              }`}
            >
              <Camera size={12} className="text-purple-400" />
              <span className="truncate max-w-[140px]">{cameraToast.text}</span>
            </div>
          </div>
        )}

        {/* Multi-Camera Glass Selection Menu */}
        {isCameraMenuOpen && availableCameras.length > 1 && recordState !== 'preview' && (
          <div className="absolute bottom-14 inset-x-4 z-30 rounded-2xl bg-[#14151f]/95 backdrop-blur-2xl border border-white/15 p-1.5 shadow-[0_16px_50px_rgba(0,0,0,0.85)] animate-popIn">
            <div className="text-[10px] font-semibold text-gray-400 px-2.5 py-1 uppercase tracking-wider">
              Select Camera
            </div>
            <div className="max-h-36 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
              {availableCameras.map((cam) => {
                const isActive = activeCameraId === cam.deviceId;
                return (
                  <button
                    key={cam.deviceId}
                    type="button"
                    onClick={() => {
                      onSelectCamera?.(cam.deviceId);
                      setIsCameraMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                      isActive
                        ? 'bg-purple-600/30 border border-purple-500/40 text-purple-200 shadow-sm'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Camera size={13} className={isActive ? 'text-purple-400' : 'text-gray-400'} />
                    <span className="truncate flex-1 text-left">{cam.label}</span>
                    {isActive && <Check size={12} className="text-purple-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Camera Switch / Flip Button at Bottom */}
        {recordState !== 'preview' && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center z-20">
            <button
              type="button"
              onClick={() => {
                if (availableCameras.length > 1) {
                  onToggleFacing();
                } else {
                  onToggleFacing();
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (availableCameras.length > 1) {
                  setIsCameraMenuOpen((prev) => !prev);
                }
              }}
              title={
                availableCameras.length > 1
                  ? 'Click to switch camera, right-click to choose camera'
                  : 'Flip camera'
              }
              className="w-9 h-9 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-black/90 hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        )}

        {/* Preview Play/Pause button in center when in preview mode */}
        {recordState === 'preview' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="w-12 h-12 rounded-full bg-purple-600/80 hover:bg-purple-600 text-white flex items-center justify-center shadow-2xl transition-all"
            >
              {isPlayingPreview ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>
          </div>
        )}
      </div>

      {/* Action Controls for Locked & Preview Mode */}
      {(recordState === 'locked' || recordState === 'preview') && (
        <div className="flex items-center gap-3 mt-3 p-2 rounded-full bg-[#181926]/90 border border-white/10 backdrop-blur-2xl shadow-2xl animate-fadeIn">
          <button
            type="button"
            onClick={onDiscard}
            title="Discard video note"
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
          >
            <Trash2 size={18} />
          </button>

          {recordState === 'locked' && (
            <button
              type="button"
              onClick={onPausePreview}
              title="Pause to review"
              className="w-10 h-10 rounded-full flex items-center justify-center text-purple-300 hover:bg-purple-500/20 transition-colors"
            >
              <Square size={16} className="fill-current" />
            </button>
          )}

          <button
            type="button"
            onClick={onSend}
            title="Send video note"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all active:scale-95"
          >
            <Send size={16} className="translate-x-[0.5px]" />
          </button>
        </div>
      )}
    </div>
  );
}
