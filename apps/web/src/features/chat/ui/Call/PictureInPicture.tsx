import React, { useRef, useEffect } from 'react';
import { Maximize2, Mic, MicOff, PhoneOff } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { useCallStore } from '../../model/callStore';
import { useCall } from '../../model/CallContext';
import { DocumentPiP } from './DocumentPiP';
import { isDocumentPiPSupported } from '../../lib/documentPiP';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function PictureInPicture() {
  const {
    isPiP,
    callStatus,
    remoteParticipant,
    remoteStreams,
    screenShareStream,
    durationSec,
    isMuted,
    isDeafened,
    setIsPiP,
  } = useCallStore();

  const { endCall, toggleMute } = useCall();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const remoteStreamEntries = Object.entries(remoteStreams);
  const stream =
    screenShareStream || (remoteStreamEntries.length > 0 ? remoteStreamEntries[0][1] : null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!isPiP || callStatus !== 'connected') return null;

  if (isDocumentPiPSupported()) {
    return <DocumentPiP />;
  }

  const hasVideo = Boolean(
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live'),
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 sm:w-80 aspect-video rounded-2xl bg-zinc-950/90 border border-white/20 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col group animate-fadeIn">
      {/* Video Content */}
      <div className="relative flex-1 w-full h-full bg-zinc-900 flex items-center justify-center overflow-hidden">
        {stream && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isDeafened}
            className={`w-full h-full object-cover transition-opacity ${
              hasVideo ? 'opacity-100' : 'opacity-0 absolute'
            }`}
          />
        )}

        {!hasVideo && (
          <div className="flex flex-col items-center gap-2">
            <Avatar src={remoteParticipant?.avatar} size="md" />
            <p className="text-xs font-semibold text-white truncate max-w-40">
              {remoteParticipant?.displayName || remoteParticipant?.username}
            </p>
          </div>
        )}

        {/* Floating Top Controls */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl">
          <span className="text-[11px] text-gray-300 font-medium">
            {formatDuration(durationSec)}
          </span>
          <button
            onClick={() => setIsPiP(false)}
            title="Expand to Fullscreen"
            aria-label="Expand to Fullscreen"
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Floating Bottom Quick Actions */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className={`w-7 h-7 flex items-center justify-center rounded-full ${
              isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
          </button>
          <button
            onClick={endCall}
            title="End Call"
            aria-label="End Call"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white"
          >
            <PhoneOff size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
