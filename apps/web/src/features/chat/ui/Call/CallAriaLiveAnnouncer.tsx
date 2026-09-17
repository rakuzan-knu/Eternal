import React, { useEffect, useState, useRef } from 'react';
import { useCallStore } from '../../model/callStore';

/**
 * ARIA Live Regions Announcer for Screen Reader Accessibility (WCAG 2.2 Level AAA)
 *
 * Provides non-visual audible cues for blind and visually impaired users:
 * - aria-live="polite": non-urgent status transitions (mic/cam toggles, quality changes)
 * - aria-live="assertive": urgent events (incoming calls, connection drops, reconnects)
 */
export function CallAriaLiveAnnouncer() {
  const {
    callStatus,
    isMuted,
    isVideoOff,
    isScreenSharing,
    connectionQuality,
    isReconnecting,
    reconnectCountdown,
    reconnectRestored,
    isSatelliteModeEnabled,
    dominantSpeakerId,
  } = useCallStore();

  const [politeAnnouncement, setPoliteAnnouncement] = useState<string>('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState<string>('');

  const prevMutedRef = useRef(isMuted);
  const prevVideoOffRef = useRef(isVideoOff);
  const prevScreenShareRef = useRef(isScreenSharing);
  const prevQualityRef = useRef(connectionQuality);
  const prevStatusRef = useRef(callStatus);
  const prevReconnectingRef = useRef(isReconnecting);

  // 1. Periodic incoming call announcement for screen readers
  useEffect(() => {
    if (callStatus !== 'ringing') return;

    setAssertiveAnnouncement('Incoming call ringing. Press Answer to accept or Decline to reject.');
    const interval = setInterval(() => {
      setAssertiveAnnouncement(
        `Incoming call is still ringing. Select Answer to connect or Decline to dismiss.`,
      );
    }, 6000);

    return () => clearInterval(interval);
  }, [callStatus]);

  // 2. Call status transitions (connected, ended, rejected)
  useEffect(() => {
    if (prevStatusRef.current === callStatus) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = callStatus;

    if (callStatus === 'connected' && prev === 'ringing') {
      setAssertiveAnnouncement('Call connected successfully. Audio stream is now live.');
    } else if (callStatus === 'ended' && prev !== 'idle') {
      setAssertiveAnnouncement('Call ended.');
    }
  }, [callStatus]);

  // 3. Microphone mute/unmute state changes
  useEffect(() => {
    if (prevMutedRef.current !== isMuted) {
      prevMutedRef.current = isMuted;
      setPoliteAnnouncement(isMuted ? 'Microphone muted' : 'Microphone unmuted');
    }
  }, [isMuted]);

  // 4. Video enable/disable state changes
  useEffect(() => {
    if (prevVideoOffRef.current !== isVideoOff) {
      prevVideoOffRef.current = isVideoOff;
      setPoliteAnnouncement(isVideoOff ? 'Camera turned off' : 'Camera turned on');
    }
  }, [isVideoOff]);

  // 5. Screen sharing state changes
  useEffect(() => {
    if (prevScreenShareRef.current !== isScreenSharing) {
      prevScreenShareRef.current = isScreenSharing;
      setPoliteAnnouncement(isScreenSharing ? 'Screen sharing started' : 'Screen sharing stopped');
    }
  }, [isScreenSharing]);

  // 6. Network quality changes
  useEffect(() => {
    if (prevQualityRef.current !== connectionQuality && callStatus === 'connected') {
      prevQualityRef.current = connectionQuality;
      setPoliteAnnouncement(`Network connection quality changed to ${connectionQuality}`);
    }
  }, [connectionQuality, callStatus]);

  // 7. Reconnection alerts
  useEffect(() => {
    if (isReconnecting && !prevReconnectingRef.current) {
      setAssertiveAnnouncement(
        `Warning: Call connection interrupted. Attempting automatic reconnection, ${reconnectCountdown} seconds remaining.`,
      );
    } else if (!isReconnecting && prevReconnectingRef.current && reconnectRestored) {
      setAssertiveAnnouncement('Call connection restored successfully.');
    }
    prevReconnectingRef.current = isReconnecting;
  }, [isReconnecting, reconnectCountdown, reconnectRestored]);

  // 8. Satellite mode changes
  useEffect(() => {
    if (isSatelliteModeEnabled) {
      setPoliteAnnouncement('Satellite and extreme network delay optimization enabled.');
    }
  }, [isSatelliteModeEnabled]);

  // 9. Dominant speaker switch
  const prevDominantSpeakerRef = useRef(dominantSpeakerId);
  useEffect(() => {
    if (prevDominantSpeakerRef.current !== dominantSpeakerId && dominantSpeakerId) {
      prevDominantSpeakerRef.current = dominantSpeakerId;
      setPoliteAnnouncement('Active speaker switched.');
    }
  }, [dominantSpeakerId]);

  return (
    <div className="sr-only" aria-hidden="false">
      {/* Polite live region for peripheral state transitions */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {politeAnnouncement}
      </div>

      {/* Assertive live region for critical interruptions and incoming rings */}
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertiveAnnouncement}
      </div>
    </div>
  );
}
