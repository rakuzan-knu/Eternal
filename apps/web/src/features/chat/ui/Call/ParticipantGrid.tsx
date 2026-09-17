import React from 'react';
import { ParticipantTile } from './ParticipantTile';
import { WebGLVideoGrid } from './WebGLVideoGrid';
import { useCallStore } from '../../model/callStore';
import { useCall } from '../../model/CallContext';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useDominantSpeakerTracker } from '../../lib/webrtc/dominantSpeakerHysteresis';

export function ParticipantGrid() {
  const {
    localStream,
    remoteStreams,
    screenShareStream,
    remoteParticipant,
    isMuted,
    isVideoOff,
    isScreenSharing,
    localIsSpeaking,
    remoteIsSpeaking,
    dominantSpeakerId,
    isWebGLGridEnabled,
  } = useCallStore();

  const { registerVideoTile, unregisterVideoTile, registerMediaElement } = useCall();
  const currentUserId = useAuthStore((s) => s.userId);

  useDominantSpeakerTracker(localStream, remoteStreams, currentUserId || 'me');

  const remoteStreamEntries = Object.entries(remoteStreams);
  const primaryRemoteStream =
    screenShareStream || (remoteStreamEntries.length > 0 ? remoteStreamEntries[0][1] : null);

  const [focusedTile, setFocusedTile] = React.useState<'remote' | 'local'>('remote');
  const remoteTileRef = React.useRef<HTMLDivElement | null>(null);
  const localTileRef = React.useRef<HTMLDivElement | null>(null);

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedTile('local');
      localTileRef.current?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedTile('remote');
      remoteTileRef.current?.focus();
    }
  };

  if (isWebGLGridEnabled || remoteStreamEntries.length > 6) {
    return (
      <div
        role="region"
        aria-label="WebGL Virtualized Video Grid"
        className="relative w-full h-full flex items-center justify-center p-2 sm:p-4 pt-14 sm:pt-16 pb-20 sm:pb-24 overflow-hidden"
      >
        <div className="w-full h-full max-w-6xl max-h-[82vh] relative flex items-center justify-center">
          <WebGLVideoGrid className="w-full h-full min-h-0" />
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Call participants grid stage"
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
      className="relative w-full h-full flex items-center justify-center p-2 sm:p-4 pt-14 sm:pt-16 pb-20 sm:pb-24 overflow-hidden outline-none"
    >
      {/* 1:1 Stage: Remote Video / Screen Share as Full Canvas */}
      <div
        ref={remoteTileRef}
        tabIndex={focusedTile === 'remote' ? 0 : -1}
        role="group"
        aria-label={`Participant ${remoteParticipant?.displayName || remoteParticipant?.username || 'Remote'}, ${remoteIsSpeaking ? 'speaking' : 'silent'}`}
        className={`w-full h-full max-w-6xl max-h-[82vh] relative flex items-center justify-center rounded-2xl transition-all ${
          focusedTile === 'remote' ? 'focus:ring-2 focus:ring-indigo-400 focus:outline-none' : ''
        }`}
      >
        <ParticipantTile
          user={remoteParticipant}
          stream={primaryRemoteStream}
          isScreenShare={Boolean(screenShareStream)}
          isSpeaking={remoteIsSpeaking}
          isDominantSpeaker={
            remoteParticipant?.id ? dominantSpeakerId === remoteParticipant.id : false
          }
          onRegisterTile={registerVideoTile}
          onUnregisterTile={unregisterVideoTile}
          onRegisterMediaElement={registerMediaElement}
          className="w-full h-full min-h-0"
        />

        {/* Local Stream Inset Window (Floating Self-Preview) */}
        <div
          ref={localTileRef}
          tabIndex={focusedTile === 'local' ? 0 : -1}
          role="group"
          aria-label={`Your video feed, ${localIsSpeaking ? 'speaking' : 'silent'}, ${isMuted ? 'muted' : 'unmuted'}`}
          className={`absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 w-24 xs:w-28 sm:w-40 md:w-52 aspect-video shadow-2xl rounded-xl overflow-hidden transition-all duration-200 hover:scale-105 ${
            focusedTile === 'local' ? 'ring-2 ring-indigo-400 outline-none' : ''
          }`}
        >
          <ParticipantTile
            user={{
              id: currentUserId || 'me',
              username: 'You',
              displayName: 'You',
              avatar: null,
            }}
            stream={localStream}
            isLocal
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenShare={isScreenSharing}
            isSpeaking={localIsSpeaking}
            isDominantSpeaker={dominantSpeakerId === (currentUserId || 'me')}
            className="w-full h-full border-2 border-white/20 shadow-2xl bg-zinc-950/90"
          />
        </div>
      </div>
    </div>
  );
}
