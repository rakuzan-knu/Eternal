import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff, Video, VideoOff, Hand, PhoneOff, ExternalLink } from 'lucide-react';
import { useCallStore } from '../../model/callStore';

interface CallPiPPortalProps {
  pipWindow: Window;
  onClose: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export function CallPiPPortal({
  pipWindow,
  onClose,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: CallPiPPortalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isHandRaised, setIsHandRaised] = useState(false);

  const {
    isMuted,
    isVideoOff,
    durationSec,
    connectionQuality,
    remoteStreams,
    localStream,
    dominantSpeakerId,
    remoteParticipant,
  } = useCallStore();

  // Pick best stream to display: dominant speaker -> first remote -> local stream
  const activeStream =
    (dominantSpeakerId && remoteStreams[dominantSpeakerId]) ||
    Object.values(remoteStreams)[0] ||
    localStream;

  const hasVideoTrack =
    activeStream &&
    activeStream.getVideoTracks().length > 0 &&
    activeStream.getVideoTracks().some((t) => t.enabled);

  useEffect(() => {
    const video = videoRef.current;
    if (video && activeStream) {
      video.srcObject = activeStream;
      void video.play().catch(() => {});
    }
  }, [activeStream]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins}:${remainingSec.toString().padStart(2, '0')}`;
  };

  const content = (
    <div className="w-full h-full flex flex-col justify-between p-3 bg-zinc-950 text-white select-none font-sans overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between z-10 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionQuality === 'excellent'
                ? 'bg-emerald-400'
                : connectionQuality === 'good'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-semibold tracking-wide text-zinc-200">
            {remoteParticipant?.displayName || remoteParticipant?.username || 'Call'}
          </span>
          <span className="text-[11px] font-mono text-zinc-400">{formatDuration(durationSec)}</span>
        </div>

        <button
          onClick={() => {
            window.focus();
            onClose();
          }}
          title="Return to main window"
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Video Viewport / Avatar View */}
      <div className="relative flex-1 my-2 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 flex items-center justify-center">
        {hasVideoTrack ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center text-xl font-bold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              {(
                remoteParticipant?.displayName?.[0] ||
                remoteParticipant?.username?.[0] ||
                'U'
              ).toUpperCase()}
            </div>
            <span className="text-xs text-zinc-400">Audio connected</span>
          </div>
        )}
      </div>

      {/* Floating Control Bar */}
      <div className="flex items-center justify-center gap-2 z-10 bg-zinc-900/90 backdrop-blur-md py-2 px-3 rounded-2xl border border-white/10 shadow-xl">
        {/* Mute Toggle */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          className={`p-2.5 rounded-xl transition-all shadow-md ${
            isMuted
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* Video Toggle */}
        <button
          onClick={onToggleVideo}
          title={isVideoOff ? 'Start camera' : 'Stop camera'}
          className={`p-2.5 rounded-xl transition-all shadow-md ${
            isVideoOff
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
        </button>

        {/* Raise Hand Toggle */}
        <button
          onClick={() => setIsHandRaised(!isHandRaised)}
          title="Raise hand"
          className={`p-2.5 rounded-xl transition-all shadow-md ${
            isHandRaised
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          <Hand size={16} />
        </button>

        {/* End Call */}
        <button
          onClick={() => {
            onEndCall();
            onClose();
          }}
          title="End Call"
          className="p-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-md transition-all"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );

  return createPortal(content, pipWindow.document.body);
}
