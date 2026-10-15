import React, { useCallback, useRef, useState } from 'react';
import { ParticipantTile } from './ParticipantTile';
import { ScreenShareTile } from './ScreenShareTile';
import { WebGLVideoGrid } from './WebGLVideoGrid';
import { useCallStore } from '../../model/callStore';
import { useCall } from '../../model/CallContext';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useQueryOnlineStatus } from '../../model/usePresence';
import { useDominantSpeakerTracker } from '../../lib/webrtc/dominantSpeakerHysteresis';

export interface ParticipantGridProps {
  compact?: boolean;
  className?: string;
}

export function ParticipantGrid({ compact = false, className = '' }: ParticipantGridProps = {}) {
  const {
    localStream,
    remoteStreams,
    screenShareStream,
    remoteParticipant,
    isMuted,
    isDeafened,
    isVideoOff,
    remoteVideoOff,
    isScreenSharing,
    localIsSpeaking,
    remoteIsSpeaking,
    dominantSpeakerId,
    isWebGLGridEnabled,
    remoteMutedUsers,
    remoteDeafenedUsers,
    isRemoteScreenSharing,
    remoteScreenSharerId,
    callType,
  } = useCallStore();

  const { registerVideoTile, unregisterVideoTile, registerMediaElement, toggleScreenShare } =
    useCall();
  const currentUserId = useAuthStore((s) => s.userId);
  const { data: currentUser } = useCurrentUser();

  // Keep presence and activities for remote participant updated
  useQueryOnlineStatus(remoteParticipant?.id ? [remoteParticipant.id] : []);

  useDominantSpeakerTracker(localStream, remoteStreams, currentUserId || 'me');

  const remoteStreamEntries = Object.entries(remoteStreams);

  // Identify remote screen stream with live or non-ended video tracks
  let primaryRemoteStream: MediaStream | null = null;
  if (isRemoteScreenSharing) {
    const hasUnmutedVideo = (s?: MediaStream | null) =>
      Boolean(s?.getVideoTracks().some((t) => !t.muted && t.readyState === 'live'));
    const hasLiveVideo = (s?: MediaStream | null) =>
      Boolean(s?.getVideoTracks().some((t) => t.readyState === 'live'));

    // 1. Try remoteScreenSharerId if it has unmuted or live video track
    if (remoteScreenSharerId) {
      const sharerStream = remoteStreams[remoteScreenSharerId];
      if (hasUnmutedVideo(sharerStream) || hasLiveVideo(sharerStream)) {
        primaryRemoteStream = sharerStream;
      }
    }
    // 2. Try generic 'remote' if it has unmuted or live video track
    if (!primaryRemoteStream) {
      const genericStream = remoteStreams['remote'];
      if (hasUnmutedVideo(genericStream) || hasLiveVideo(genericStream)) {
        primaryRemoteStream = genericStream;
      }
    }
    // 3. Search any entry in remoteStreams with an unmuted live video track
    if (!primaryRemoteStream) {
      const unmutedEntry = remoteStreamEntries.find(([_, s]) => hasUnmutedVideo(s));
      if (unmutedEntry) {
        primaryRemoteStream = unmutedEntry[1];
      }
    }
    // 4. Search any entry in remoteStreams with any live video track
    if (!primaryRemoteStream) {
      const liveEntry = remoteStreamEntries.find(([_, s]) => hasLiveVideo(s));
      if (liveEntry) {
        primaryRemoteStream = liveEntry[1];
      }
    }
    // 5. Fallback to any non-ended video track
    if (!primaryRemoteStream) {
      if (
        remoteScreenSharerId &&
        remoteStreams[remoteScreenSharerId]?.getVideoTracks().some((t) => t.readyState !== 'ended')
      ) {
        primaryRemoteStream = remoteStreams[remoteScreenSharerId];
      } else if (remoteStreams['remote']?.getVideoTracks().some((t) => t.readyState !== 'ended')) {
        primaryRemoteStream = remoteStreams['remote'];
      } else {
        const nonEndedEntry = remoteStreamEntries.find(([_, s]) =>
          s.getVideoTracks().some((t) => t.readyState !== 'ended'),
        );
        if (nonEndedEntry) {
          primaryRemoteStream = nonEndedEntry[1];
        }
      }
    }
    // 6. Ultimate fallback
    if (!primaryRemoteStream) {
      primaryRemoteStream =
        (remoteScreenSharerId && remoteStreams[remoteScreenSharerId]) ||
        remoteStreams['remote'] ||
        (remoteStreamEntries.length > 0 ? remoteStreamEntries[0][1] : null);
    }
  } else {
    const targetUserId = remoteParticipant?.id;
    const userStream = targetUserId ? remoteStreams[targetUserId] : null;
    const genericStream = remoteStreams['remote'];
    const streamWithLiveVideo =
      (userStream?.getVideoTracks().some((t) => t.readyState !== 'ended') ? userStream : null) ||
      (genericStream?.getVideoTracks().some((t) => t.readyState !== 'ended')
        ? genericStream
        : null) ||
      remoteStreamEntries.find(([_, s]) =>
        s.getVideoTracks().some((t) => t.readyState !== 'ended'),
      )?.[1] ||
      null;

    primaryRemoteStream =
      streamWithLiveVideo ||
      userStream ||
      genericStream ||
      (remoteStreamEntries.length > 0 ? remoteStreamEntries[0][1] : null);
  }

  const isRemoteMuted = remoteParticipant?.id
    ? Boolean(remoteMutedUsers[remoteParticipant.id])
    : false;

  const [focusedTile, setFocusedTile] = useState<'remote' | 'local'>('remote');
  const remoteTileRef = useRef<HTMLDivElement | null>(null);
  const localTileRef = useRef<HTMLDivElement | null>(null);

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

  const handleStopScreenShare = useCallback(() => {
    void toggleScreenShare();
  }, [toggleScreenShare]);

  const handleChangeSource = useCallback(async () => {
    await toggleScreenShare();
    setTimeout(() => {
      void toggleScreenShare();
    }, 300);
  }, [toggleScreenShare]);

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

  const hasLocalScreen = isScreenSharing && Boolean(screenShareStream);
  const hasRemoteScreen = isRemoteScreenSharing;
  const screenShareCount = (hasLocalScreen ? 1 : 0) + (hasRemoteScreen ? 1 : 0);

  const remoteIsVideoOff = remoteParticipant?.id
    ? (remoteVideoOff[remoteParticipant.id] ?? callType !== 'video')
    : true;

  // Render helper for Remote User Card
  const renderRemoteUserTile = () => (
    <div
      ref={remoteTileRef}
      tabIndex={focusedTile === 'remote' ? 0 : -1}
      role="group"
      aria-label={`Participant ${remoteParticipant?.displayName || remoteParticipant?.username || 'Remote'}, ${remoteIsSpeaking ? 'speaking' : 'silent'}`}
      className={`w-full h-full ${compact ? 'min-h-0 max-h-full' : 'min-h-[220px] max-h-[460px]'} aspect-video relative flex items-center justify-center rounded-2xl transition-all ${
        focusedTile === 'remote' ? 'focus:ring-2 focus:ring-indigo-400 focus:outline-none' : ''
      }`}
    >
      <ParticipantTile
        user={remoteParticipant}
        stream={primaryRemoteStream}
        isVideoOff={hasRemoteScreen || remoteIsVideoOff}
        isScreenShare={false}
        isSpeaking={remoteIsSpeaking}
        isMuted={isRemoteMuted}
        isDeafened={
          remoteParticipant?.id ? Boolean(remoteDeafenedUsers[remoteParticipant.id]) : false
        }
        isDominantSpeaker={
          remoteParticipant?.id ? dominantSpeakerId === remoteParticipant.id : false
        }
        onRegisterTile={registerVideoTile}
        onUnregisterTile={unregisterVideoTile}
        onRegisterMediaElement={registerMediaElement}
        className="w-full h-full min-h-0"
      />
    </div>
  );

  // Render helper for Local User Card
  const renderLocalUserTile = () => (
    <div
      ref={localTileRef}
      tabIndex={focusedTile === 'local' ? 0 : -1}
      role="group"
      aria-label={`Your card, ${localIsSpeaking ? 'speaking' : 'silent'}, ${isMuted ? 'muted' : 'unmuted'}`}
      className={`w-full h-full ${compact ? 'min-h-0 max-h-full' : 'min-h-[220px] max-h-[460px]'} aspect-video relative flex items-center justify-center rounded-2xl transition-all ${
        focusedTile === 'local' ? 'focus:ring-2 focus:ring-indigo-400 outline-none' : ''
      }`}
    >
      <ParticipantTile
        user={{
          id: currentUser?.id || currentUserId || 'me',
          username: currentUser?.username || 'user',
          displayName: currentUser?.displayName || currentUser?.username || 'You',
          avatar: currentUser?.avatar || null,
        }}
        stream={localStream}
        isLocal
        isMuted={isMuted}
        isDeafened={isDeafened}
        isVideoOff={isVideoOff}
        isScreenShare={false}
        isSpeaking={localIsSpeaking}
        isDominantSpeaker={dominantSpeakerId === (currentUserId || 'me')}
        className="w-full h-full min-h-0"
      />
    </div>
  );

  // Render helper for Local Screen Share Tile
  const renderLocalScreenTile = () => (
    <div
      className={`w-full h-full ${compact ? 'min-h-0 max-h-full' : 'min-h-[220px] max-h-[460px]'} aspect-video relative flex items-center justify-center`}
    >
      <ScreenShareTile
        stream={screenShareStream}
        userName={currentUser?.displayName || currentUser?.username || 'You'}
        isLocal={true}
        onStopScreenShare={handleStopScreenShare}
        onChangeSource={handleChangeSource}
        className="w-full h-full"
      />
    </div>
  );

  // Render helper for Remote Screen Share Tile
  const renderRemoteScreenTile = () => (
    <div
      className={`w-full h-full ${compact ? 'min-h-0 max-h-full' : 'min-h-[220px] max-h-[460px]'} aspect-video relative flex items-center justify-center`}
    >
      <ScreenShareTile
        stream={primaryRemoteStream}
        userName={remoteParticipant?.username || remoteParticipant?.displayName || 'Remote'}
        isLocal={false}
        className="w-full h-full"
      />
    </div>
  );

  return (
    <div
      role="region"
      aria-label="Call participants grid stage"
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden outline-none ${
        compact ? 'p-2 sm:p-3' : 'px-4 sm:px-8 pt-20 sm:pt-24 pb-28 sm:pb-32'
      } ${className}`}
    >
      {screenShareCount === 2 ? (
        <div
          className={`w-full max-w-5xl h-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center justify-center p-2 ${compact ? 'max-h-full' : 'max-h-[75vh]'}`}
        >
          {/* Top Row: Both Screen Shares */}
          {hasLocalScreen && renderLocalScreenTile()}
          {hasRemoteScreen && renderRemoteScreenTile()}

          {/* Bottom Row: Both User Cards */}
          {renderRemoteUserTile()}
          {renderLocalUserTile()}
        </div>
      ) : screenShareCount === 1 ? (
        <div
          className={`w-full max-w-6xl h-full grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-center justify-center p-2 ${compact ? 'max-h-full' : 'max-h-[75vh]'}`}
        >
          {/* Block 1: Screen Share (always first / top) */}
          {hasLocalScreen ? renderLocalScreenTile() : renderRemoteScreenTile()}

          {/* Block 2: Remote User Card */}
          {renderRemoteUserTile()}

          {/* Block 3: Local User Card */}
          {renderLocalUserTile()}
        </div>
      ) : (
        /* Default 2-Card Voice / Video Grid (both cards equal and balanced) */
        <div
          className={`w-full max-w-4xl h-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 items-center justify-center p-2 ${compact ? 'max-h-full' : 'max-h-[70vh]'}`}
        >
          {renderRemoteUserTile()}
          {renderLocalUserTile()}
        </div>
      )}
    </div>
  );
}
