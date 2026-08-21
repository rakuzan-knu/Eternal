import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Square, Send, Play, Pause, ChevronLeft, Lock } from 'lucide-react';
import { RecordedPayload, RecordState } from '../model/useMediaRecorderGesture';

interface VoiceRecorderBarProps {
  recordState: RecordState;
  duration: number;
  liveAmplitudes: number[];
  previewPayload: RecordedPayload | null;
  dragOffset: { x: number; y: number };
  onDiscard: () => void;
  onPausePreview: () => void;
  onSend: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoiceRecorderBar({
  recordState,
  duration,
  liveAmplitudes,
  previewPayload,
  dragOffset,
  onDiscard,
  onPausePreview,
  onSend,
}: VoiceRecorderBarProps) {
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, []);

  const togglePreviewPlay = () => {
    if (!audioRef.current) return;
    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlayingPreview(true))
        .catch(() => {});
    }
  };

  return (
    <div
      data-testid="voice-recorder-bar"
      className="relative flex items-center justify-between gap-3 px-4 py-2.5 mx-4 mb-2 rounded-2xl bg-[#0e0f18]/95 border border-purple-500/30 backdrop-blur-2xl shadow-[0_4px_25px_rgba(168,85,247,0.25)] select-none animate-fadeIn z-30"
    >
      {/* Left: Indicator & Timer */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {recordState !== 'preview' ? (
          <div className="relative flex items-center justify-center w-4 h-4">
            <span className="absolute w-3.5 h-3.5 rounded-full bg-red-500 animate-ping opacity-75" />
            <span className="relative w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
        ) : (
          <button
            type="button"
            onClick={togglePreviewPlay}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow"
          >
            {isPlayingPreview ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
          </button>
        )}

        <span className="text-xs font-mono font-bold text-white tracking-wider tabular-nums">
          {formatDuration(
            recordState === 'preview' ? (previewPayload?.duration ?? duration) : duration,
          )}
        </span>
      </div>

      {/* Center: Live Waveform Visualizer or Audio Preview Wave */}
      <div className="flex-1 flex items-center justify-center gap-0.5 px-2 h-7 min-w-0 overflow-hidden">
        {recordState !== 'preview'
          ? liveAmplitudes.map((amp, idx) => (
              <span
                key={idx}
                className="w-1 rounded-full bg-gradient-to-t from-purple-500 to-indigo-400 transition-all duration-75"
                style={{
                  height: `${Math.max(4, amp * 26)}px`,
                }}
              />
            ))
          : (previewPayload?.waveform ?? new Array(32).fill(0.3)).map((bar, idx) => (
              <span
                key={idx}
                className="w-1 rounded-full bg-purple-400/80 transition-all"
                style={{
                  height: `${Math.max(4, bar * 24)}px`,
                }}
              />
            ))}
      </div>

      {previewPayload && (
        <audio
          ref={audioRef}
          src={previewPayload.previewUrl}
          onEnded={() => setIsPlayingPreview(false)}
          className="hidden"
        />
      )}

      {/* Right: Holding vs Locked vs Preview Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {recordState === 'recording' && (
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {/* Slide to Cancel hint */}
            <div
              className="flex items-center gap-0.5 transition-transform"
              style={{
                transform: `translateX(${Math.min(0, dragOffset.x * 0.4)}px)`,
              }}
            >
              <ChevronLeft size={14} className="animate-pulse text-purple-400" />
              <span className="text-[11px] font-medium text-gray-300">Slide to cancel</span>
            </div>

            {/* Slide to Lock hint */}
            <div
              className="flex items-center gap-0.5 text-gray-500"
              style={{
                transform: `translateY(${Math.min(0, dragOffset.y * 0.3)}px)`,
              }}
            >
              <Lock size={12} className="text-purple-400" />
            </div>
          </div>
        )}

        {(recordState === 'locked' || recordState === 'preview') && (
          <div className="flex items-center gap-2">
            {/* Discard / Trash button */}
            <button
              type="button"
              onClick={onDiscard}
              title="Discard recording"
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
            >
              <Trash2 size={16} />
            </button>

            {/* Stop / Pause into Preview button */}
            {recordState === 'locked' && (
              <button
                type="button"
                onClick={onPausePreview}
                title="Pause to listen"
                className="w-8 h-8 flex items-center justify-center rounded-full text-purple-300 hover:bg-purple-500/20 transition-colors"
              >
                <Square size={14} className="fill-current" />
              </button>
            )}

            {/* Send button */}
            <button
              type="button"
              onClick={onSend}
              title="Send voice note"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all active:scale-95"
            >
              <Send size={14} className="translate-x-[0.5px]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
