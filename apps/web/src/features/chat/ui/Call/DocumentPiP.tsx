import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { useCallStore } from '../../model/callStore';
import { useCall } from '../../model/CallContext';
import { isDocumentPiPSupported } from '../../lib/documentPiP';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Document Picture-in-Picture Floating Window
 *
 * Emits an independent native floating OS window hosting a complete HTML DOM
 * with full ARIA landmarks, focus rings, keyboard navigation (Tab/Shift+Tab),
 * and interactive WebRTC call controls.
 */
export function DocumentPiP() {
  const {
    isPiP,
    callStatus,
    remoteParticipant,
    remoteStreams,
    screenShareStream,
    durationSec,
    isMuted,
    isVideoOff,
    setIsPiP,
  } = useCallStore();

  const { endCall, toggleMute, toggleVideo } = useCall();
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const remoteStreamEntries = Object.entries(remoteStreams);
  const stream =
    screenShareStream || (remoteStreamEntries.length > 0 ? remoteStreamEntries[0][1] : null);

  const hasVideo = Boolean(
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live'),
  );

  // Request Document PiP Window upon entering PiP mode
  useEffect(() => {
    if (!isPiP || callStatus !== 'connected' || !isDocumentPiPSupported()) {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
      pipWindowRef.current = null;
      setPipWindow(null);
      return;
    }

    let activeWin: Window | null = null;
    let isMounted = true;

    async function openDocPiP() {
      try {
        const win = await window.documentPictureInPicture!.requestWindow({
          width: 380,
          height: 250,
        });

        if (!isMounted) {
          win.close();
          return;
        }

        activeWin = win;
        pipWindowRef.current = win;

        // Copy parent page stylesheets and fonts to floating OS window
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            if (styleSheet.href) {
              const link = win.document.createElement('link');
              link.rel = 'stylesheet';
              link.type = styleSheet.type;
              link.media = styleSheet.media.mediaText;
              link.href = styleSheet.href;
              win.document.head.appendChild(link);
            } else if (styleSheet.cssRules) {
              const style = win.document.createElement('style');
              style.textContent = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
              win.document.head.appendChild(style);
            }
          } catch {
            // Cross-origin stylesheet ignore
          }
        });

        win.document.title = `${remoteParticipant?.displayName || 'Call'} • PiP`;
        win.document.body.style.margin = '0';
        win.document.body.style.padding = '0';
        win.document.body.style.backgroundColor = '#09090b';
        win.document.body.style.color = '#ffffff';
        win.document.body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        win.document.body.style.overflow = 'hidden';

        // Reconnect back to main application on OS window close
        win.addEventListener('pagehide', () => {
          setIsPiP(false);
          pipWindowRef.current = null;
          setPipWindow(null);
        });

        pipWindowRef.current = win;
        setPipWindow(win);
      } catch {
        // User closed permission or API fallback
        pipWindowRef.current = null;
        setIsPiP(false);
      }
    }

    void openDocPiP();

    return () => {
      isMounted = false;
      if (activeWin && !activeWin.closed) {
        activeWin.close();
      }
      pipWindowRef.current = null;
    };
  }, [isPiP, callStatus, remoteParticipant?.displayName, setIsPiP]);

  // Bind video stream inside PiP window
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, pipWindow]);

  if (!isPiP || !pipWindow || !pipWindow.document?.body) {
    return null;
  }

  return createPortal(
    <div
      role="region"
      aria-label="Picture in Picture Call"
      className="relative w-screen h-screen flex flex-col justify-between bg-zinc-950 select-none overflow-hidden"
    >
      {/* Media Layer */}
      <div className="relative flex-1 w-full h-full bg-zinc-900 flex items-center justify-center overflow-hidden">
        {stream && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity ${
              hasVideo ? 'opacity-100' : 'opacity-0 absolute'
            }`}
          />
        )}

        {!hasVideo && (
          <div className="flex flex-col items-center gap-2 p-4">
            <Avatar src={remoteParticipant?.avatar} size="lg" />
            <p className="text-sm font-semibold text-white truncate max-w-50">
              {remoteParticipant?.displayName || remoteParticipant?.username || 'Call Participant'}
            </p>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-gray-200 font-medium">{formatDuration(durationSec)}</span>
          </div>

          <button
            onClick={() => {
              pipWindow.close();
              setIsPiP(false);
            }}
            title="Expand to main window (Tab focusable)"
            aria-label="Expand to main window"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Bottom Accessible Interactive Controls */}
        <div
          role="toolbar"
          aria-label="Call Controls"
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/75 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 shadow-2xl z-20"
        >
          {/* Microphone Mute Toggle */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-pressed={isMuted}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              isMuted
                ? 'bg-rose-500 text-white'
                : 'bg-zinc-800 text-gray-200 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            title={isVideoOff ? 'Turn video on' : 'Turn video off'}
            aria-label={isVideoOff ? 'Turn video on' : 'Turn video off'}
            aria-pressed={!isVideoOff}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              isVideoOff
                ? 'bg-rose-500 text-white'
                : 'bg-zinc-800 text-gray-200 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
          </button>

          {/* End Call Button */}
          <button
            onClick={() => {
              pipWindow.close();
              endCall();
            }}
            title="End Call"
            aria-label="End Call"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      </div>
    </div>,
    pipWindow.document.body,
  );
}
