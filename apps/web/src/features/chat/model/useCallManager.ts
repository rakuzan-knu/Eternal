import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { useCallStore, type IncomingCallData } from './callStore';
import { useWebRTC } from './useWebRTC';
import { useWakeLock } from './useWakeLock';
import { getSocket } from '@/shared/api/socket';
import { WS_EVENTS } from '@backend/messenger/events/ws-events';
import {
  playIncomingRingtone,
  playOutgoingRingtone,
  playCallEndSound,
  stopRingtone,
} from '../lib/callRingtone';
import { showBrowserPushNotification } from '@/shared/lib/browserPushNotifications';
import type {
  UserSnapshot,
  ZkpCallProof,
  WebTransportSessionResponse,
  CallSessionView,
} from '@common/contracts';
import { ZKPIdentityManager } from '../lib/webrtc/zkpIdentity';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { apiClient } from '@/shared/api/httpClient';
import { usePushToTalk } from './usePushToTalk';
import { MultiTabCallCoordinator } from '../lib/webrtc/multiTabCallCoordinator';
import { triggerHaptic, cancelHaptic } from '../lib/webrtc/hapticFeedback';
import { playActionSound } from './useSoundSettingsStore';
import { globalSpeakerMixerManager } from '../lib/webrtc/perSpeakerMixer';
import { getCallSession, clearCallSession, saveCallSession } from '../lib/callSessionPersistence';

export function useCallManager() {
  const socket = getSocket();
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const multiTabCoordinatorRef = useRef<MultiTabCallCoordinator | null>(null);
  const acceptCallRef = useRef<(() => Promise<void>) | null>(null);
  const rejectCallRef = useRef<((reason?: string) => void) | null>(null);
  const endCallRef = useRef<(() => void) | null>(null);
  const toggleMuteRef = useRef<(() => void) | null>(null);

  const {
    setCallStatus,
    setIncomingCall,
    clearIncomingCall,
    setActiveCall,
    setIsMuted,
    setIsDeafened,
    setIsVideoOff,
    incrementDuration,
    setDurationSec,
    setAvailableDevices,
    resetCall,
  } = useCallStore();

  // Screen Wake Lock API keeps device awake during call
  const callStatus = useCallStore((s) => s.callStatus);
  useWakeLock(callStatus === 'connected' || callStatus === 'calling');

  // Real-time speaking status broadcast via WebSocket (Discord Tier-2)
  const localIsSpeaking = useCallStore((s) => s.localIsSpeaking);
  useEffect(() => {
    const currentCallId = useCallStore.getState().callId;
    if (!currentCallId || !socket) return;
    socket.emit(WS_EVENTS.CALL_SPEAKING, {
      callId: currentCallId,
      isSpeaking: localIsSpeaking,
    });
  }, [localIsSpeaking, socket]);

  // Auto ICE-Restart sender callback
  const handleSendIceRestart = useCallback(
    (offer: RTCSessionDescriptionInit) => {
      const currentCallId = useCallStore.getState().callId;
      const currentRemote = useCallStore.getState().remoteParticipant;
      if (!currentCallId || !socket) return;
      if (useCallStore.getState().isScreenSharing) {
        socket.emit(WS_EVENTS.CALL_SCREEN_SHARE_START, {
          callId: currentCallId,
          isSharing: true,
        });
      }
      socket.emit(WS_EVENTS.CALL_ICE_RESTART, {
        callId: currentCallId,
        sdpOffer: offer,
        targetUserId: currentRemote?.id,
      });
    },
    [socket],
  );

  const closeConnectionRef = useRef<(() => void) | null>(null);

  const handleConnectionFailed = useCallback(() => {
    const currentCallId = useCallStore.getState().callId;
    if (currentCallId && socket) {
      socket.emit(WS_EVENTS.CALL_END, {
        callId: currentCallId,
        reason: 'CONNECTION_LOST',
      });
    }
    stopRingtone();
    playCallEndSound();
    closeConnectionRef.current?.();
    resetCall();
  }, [socket, resetCall]);

  const handleScreenShareStopped = useCallback(() => {
    const currentCallId = useCallStore.getState().callId;
    if (currentCallId && socket) {
      socket.emit(WS_EVENTS.CALL_SCREEN_SHARE_STOP, {
        callId: currentCallId,
        isSharing: false,
      });
    }
  }, [socket]);

  const webRTC = useWebRTC({
    onSendIceRestart: handleSendIceRestart,
    onConnectionFailed: handleConnectionFailed,
    onScreenShareStopped: handleScreenShareStopped,
  });

  const webRTCRef = useRef(webRTC);
  webRTCRef.current = webRTC;

  const negotiateWebTransport = useCallback(async (targetCallId: string) => {
    try {
      const res = await apiClient.post<WebTransportSessionResponse>('/calls/webtransport-session', {
        callId: targetCallId,
      });
      if (res.data?.endpointUrl && res.data.sessionTicket && webRTCRef.current.webTransportClient) {
        await webRTCRef.current.webTransportClient.connect(
          res.data.endpointUrl,
          res.data.sessionTicket,
        );
      }
    } catch {
      // Fallback to WebSocket transparently
    }
  }, []);
  const negotiateWebTransportRef = useRef(negotiateWebTransport);
  negotiateWebTransportRef.current = negotiateWebTransport;
  closeConnectionRef.current = webRTC.closeConnection;

  // Real-time in-call activity sync (Music & Gaming)
  const currentCallId = useCallStore((s) => s.callId);
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isMusicPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const localUserId = useAuthStore((s) => s.userId);
  const localPresence = usePresenceStore((s) =>
    localUserId ? s.userActivities[localUserId] : null,
  );
  const lastPublishedActivityKeyRef = useRef<string>('');

  const publishCurrentActivity = useCallback(() => {
    const activeCallId = useCallStore.getState().callId;
    const activeCallStatus = useCallStore.getState().callStatus;
    if (activeCallStatus !== 'connected' || !activeCallId || !socket?.connected) return;

    const spotifyState = useSpotifyPlayerStore.getState();
    const myId = useAuthStore.getState().userId;
    const myPresence = myId ? usePresenceStore.getState().userActivities[myId] : null;

    let activity: any = null;
    if (spotifyState.isPlaying && spotifyState.currentTrack) {
      activity = {
        type: 'spotify',
        title: spotifyState.currentTrack.title,
        subtitle: spotifyState.currentTrack.artist,
        artist: spotifyState.currentTrack.artist,
        imageUrl: spotifyState.currentTrack.albumArt || null,
        trackId: spotifyState.currentTrack.id,
        isPlaying: true,
      };
    } else if (
      myPresence &&
      (myPresence.title || myPresence.type === 'gaming' || myPresence.isSteam)
    ) {
      const isPresenceMusic =
        myPresence.type === 'spotify' ||
        myPresence.type === 'music' ||
        Boolean(myPresence.trackId) ||
        Boolean(myPresence.artist);
      activity = {
        ...myPresence,
        type: isPresenceMusic ? 'spotify' : myPresence.type,
      };
    }

    const activityKey = activity
      ? `${activity.type || ''}:${activity.title || ''}:${activity.trackId || ''}:${activity.artist || ''}`
      : 'none';
    if (lastPublishedActivityKeyRef.current === activityKey) {
      return;
    }
    lastPublishedActivityKeyRef.current = activityKey;

    socket.emit(WS_EVENTS.CALL_ACTIVITY, {
      callId: activeCallId,
      activity,
    });
    webRTCRef.current.sendCallActivity?.(activity);
  }, [socket]);

  useEffect(() => {
    if (callStatus === 'connected' && currentCallId) {
      publishCurrentActivity();
    }
  }, [
    callStatus,
    currentCallId,
    isMusicPlaying,
    currentTrack?.id,
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.albumArt,
    localPresence?.title,
    localPresence?.trackId,
    localPresence?.type,
    publishCurrentActivity,
  ]);

  // Initialize Push-to-Talk (PTT) with software audio release tail
  const ptt = usePushToTalk({ toggleMuteTrack: webRTC.toggleMuteTrack });

  // Enumerate devices on mount
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;

    const updateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');
        setAvailableDevices({ audioInputs, videoInputs, audioOutputs });
      } catch {
        // devices enumeration error
      }
    };

    void updateDevices();
    navigator.mediaDevices.addEventListener?.('devicechange', updateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', updateDevices);
    };
  }, [setAvailableDevices]);

  // Duration timer during connected call
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        incrementDuration();
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callStatus, incrementDuration]);

  // Auto-reconnect to ongoing active call after page reload (Discord-style)
  useEffect(() => {
    const saved = getCallSession();
    if (!saved || !saved.callId) return;

    let cancelled = false;

    const attemptAutoReconnect = async () => {
      try {
        // 1. Verify with server if call is still active with at least 1 other user
        const { data: checkRes } = await apiClient.get<{
          active: boolean;
          call?: CallSessionView;
          activeParticipantsCount: number;
        }>(`/calls/${saved.callId}/active-check`);

        if (cancelled) return;

        if (!checkRes?.active || !checkRes.call || checkRes.activeParticipantsCount <= 0) {
          clearCallSession();
          return;
        }

        const call = checkRes.call;
        const currentUserId = useAuthStore.getState().userId;
        const otherParticipants = (call.participants || []).filter(
          (p) => p.userId !== currentUserId,
        );
        const remoteUser = saved.remoteParticipant || otherParticipants[0]?.user || null;

        // Restore call state in store
        const elapsedSec = Math.max(
          0,
          Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000),
        );

        useCallStore.setState({
          callId: call.id,
          conversationId: call.conversationId,
          callType: saved.callType,
          remoteParticipant: remoteUser,
          activeCall: call,
          callStatus: 'connected',
          isReconnecting: true,
          reconnectCountdown: 15,
          isMuted: saved.isMuted,
          isVideoOff: saved.isVideoOff,
          isDeafened: saved.isDeafened,
          durationSec: elapsedSec,
        });

        // Initialize multi-tab coordinator for this call
        if (!multiTabCoordinatorRef.current) {
          multiTabCoordinatorRef.current = new MultiTabCallCoordinator({
            onRemoteCommand: (command) => {
              if (command === 'ACCEPT') void acceptCallRef.current?.();
              else if (command === 'DECLINE') rejectCallRef.current?.('DECLINED');
              else if (command === 'END') endCallRef.current?.();
              else if (command === 'MUTE') toggleMuteRef.current?.();
            },
          });
        }
        void multiTabCoordinatorRef.current.coordinateCall(call.id, currentUserId || undefined);

        // 2. Wait for socket to connect if not yet connected
        const targetSocket = socket || getSocket();
        if (!targetSocket.connected) {
          await new Promise<void>((resolve) => {
            const onConnect = () => {
              targetSocket.off('connect', onConnect);
              resolve();
            };
            targetSocket.on('connect', onConnect);
            setTimeout(resolve, 4000);
          });
        }

        if (cancelled) return;

        // 3. Acquire local media (preserving user's mute/video settings)
        globalSpeakerMixerManager.resumeAll();
        webRTCRef.current.resumeAudioContext?.();
        await webRTCRef.current.acquireLocalMedia(saved.callType);

        if (saved.isMuted) {
          webRTCRef.current.toggleMuteTrack(true);
        }
        if (saved.isVideoOff) {
          void webRTCRef.current.toggleVideoTrack(true);
        }

        // 4. Create fresh offer and candidates
        const targetUserId = remoteUser?.id || otherParticipants[0]?.userId;
        const gatheredCandidates: RTCIceCandidateInit[] = [];

        const offer = await webRTCRef.current.createOffer(
          saved.callType,
          (candidate) => {
            targetSocket.emit(WS_EVENTS.CALL_ICE_CANDIDATE, {
              callId: call.id,
              candidate: candidate.toJSON(),
              targetUserId,
            });
          },
          targetUserId,
        );

        if (cancelled) return;

        // 5. Emit CALL_RECONNECT with offer to notify peer
        targetSocket.emit(
          WS_EVENTS.CALL_RECONNECT,
          {
            callId: call.id,
            sdpOffer: offer,
            iceCandidates: gatheredCandidates,
          },
          (ack?: { status: string; active?: boolean }) => {
            if (ack && ack.active === false) {
              clearCallSession();
              webRTCRef.current.closeConnection();
              resetCall();
            }
          },
        );
      } catch (err) {
        console.error('[useCallManager] auto-reconnect failed:', err);
        clearCallSession();
        resetCall();
      }
    };

    void attemptAutoReconnect();

    return () => {
      cancelled = true;
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = async (data: IncomingCallData) => {
      // If we are already on an active call, auto-reject or busy
      const currentStatus = useCallStore.getState().callStatus;
      if (currentStatus !== 'idle') {
        socket.emit(WS_EVENTS.CALL_REJECT, {
          callId: data.callId,
          reason: 'MISSED',
        });
        return;
      }

      if (data.zkpProof) {
        try {
          const verifyResult = await ZKPIdentityManager.verifyProof(data.zkpProof);
          if (verifyResult.valid) {
            useCallStore.setState({ zkpProof: data.zkpProof });
          }
        } catch {
          // Ignore verification error
        }
      }

      const normalizedCallType =
        String(data.callType).toLowerCase() === 'video' ? 'video' : 'audio';
      const incomingData: IncomingCallData = { ...data, callType: normalizedCallType };

      setIncomingCall(incomingData);

      // Multi-tab leader election and ringtone suppression
      if (data.callId) {
        if (!multiTabCoordinatorRef.current) {
          multiTabCoordinatorRef.current = new MultiTabCallCoordinator({
            onRemoteCommand: (command) => {
              if (command === 'ACCEPT') void acceptCallRef.current?.();
              else if (command === 'DECLINE') rejectCallRef.current?.('DECLINED');
              else if (command === 'END') endCallRef.current?.();
              else if (command === 'MUTE') toggleMuteRef.current?.();
            },
          });
        }
        const currentUserId = useAuthStore.getState().userId;
        void multiTabCoordinatorRef.current
          .coordinateCall(data.callId, currentUserId || undefined)
          .then(() => {
            const currentIncoming = useCallStore.getState().incomingCall;
            const currentStatus = useCallStore.getState().callStatus;
            if (currentIncoming?.callId === data.callId && currentStatus === 'ringing') {
              if (!multiTabCoordinatorRef.current?.shouldSuppressRingtone()) {
                multiTabCoordinatorRef.current?.announceRinging();
                playIncomingRingtone();
              }
            } else {
              stopRingtone();
            }
          });
      } else {
        const currentStatus = useCallStore.getState().callStatus;
        if (currentStatus === 'ringing') {
          playIncomingRingtone();
        }
      }
      triggerHaptic('incomingCall');

      // Background notification when tab is unfocused/hidden
      if (typeof document !== 'undefined' && document.hidden) {
        void showBrowserPushNotification({
          title: `Incoming ${normalizedCallType === 'video' ? 'Video' : 'Voice'} Call`,
          body: `${data.caller.displayName || data.caller.username} is calling you...`,
          icon: data.caller.avatar,
          url: `/chat?conv=${data.conversationId}&callId=${data.callId}`,
          tag: `incoming-call-${data.callId}`,
        });
      }
    };

    const handleAccepted = async (data: {
      callId: string;
      accepterId: string;
      sdpAnswer?: RTCSessionDescriptionInit;
      iceCandidates?: RTCIceCandidateInit[];
      e2eeEphemeralKey?: string;
      e2eeBindingSignature?: string;
    }) => {
      cancelHaptic();
      stopRingtone();
      playActionSound('user_join');
      setCallStatus('connected');
      if (data.accepterId) {
        useCallStore
          .getState()
          .setRemoteVideoOff(data.accepterId, useCallStore.getState().callType !== 'video');
      }
      if (data.sdpAnswer) {
        await webRTCRef.current.handleAnswer(data.sdpAnswer);
      }
      // Initiator step 2: complete the ECDH handshake now that the callee's
      // ephemeral key arrived (no-op when E2EE was not negotiated).
      if (data.e2eeEphemeralKey) {
        await webRTCRef.current.completeE2eeHandshake(
          data.e2eeEphemeralKey,
          data.e2eeBindingSignature,
          data.accepterId,
          data.callId,
        );
      }
      if (data.iceCandidates && Array.isArray(data.iceCandidates)) {
        for (const candidate of data.iceCandidates) {
          await webRTCRef.current.addIceCandidate(candidate);
        }
      }
      if (data.callId) {
        void negotiateWebTransportRef.current(data.callId);
      }
      publishCurrentActivity();
    };

    const handleIceCandidate = async (data: {
      callId: string;
      candidate: RTCIceCandidateInit;
      senderUserId: string;
    }) => {
      if (data.candidate) {
        await webRTCRef.current.addIceCandidate(data.candidate);
      }
    };

    const handleRemoteIceRestart = async (data: {
      callId: string;
      sdpOffer: RTCSessionDescriptionInit;
      senderUserId: string;
    }) => {
      if (data.callId !== useCallStore.getState().callId) return;
      try {
        const answer = await webRTCRef.current.handleRemoteIceRestart(
          data.sdpOffer,
          data.senderUserId,
        );
        socket.emit(WS_EVENTS.CALL_ICE_RESTART_ANSWER, {
          callId: data.callId,
          sdpAnswer: answer,
          targetUserId: data.senderUserId,
        });
      } catch (err) {
        console.warn('Handling remote ICE restart failed', err);
      }
    };

    const handleIceRestartAnswer = async (data: {
      callId: string;
      sdpAnswer: RTCSessionDescriptionInit;
    }) => {
      if (data.callId !== useCallStore.getState().callId) return;
      try {
        await webRTCRef.current.handleIceRestartAnswer(data.sdpAnswer);
      } catch (err) {
        console.warn('Applying ICE restart answer failed', err);
      }
    };

    const handleEnded = (_data: { callId: string; reason?: string; durationMs?: number }) => {
      clearCallSession();
      const convId = useCallStore.getState().conversationId;
      stopRingtone();
      playActionSound('user_leave');
      webRTCRef.current.closeConnection();
      multiTabCoordinatorRef.current?.stop();
      multiTabCoordinatorRef.current = null;
      if (convId) {
        // Only invalidate the conversation list — the CALL_LOG newMessage WS event
        // will update the messages cache. Invalidating messages here causes a race
        // where the refetch runs before the CALL_LOG arrives, making it disappear.
        void queryClient.invalidateQueries({
          queryKey: [CONVERSATIONS_KEY],
        });
      }
      resetCall();
    };

    const handleMute = (data: {
      callId: string;
      userId: string;
      isMuted: boolean;
      isDeafened?: boolean;
    }) => {
      if (data?.userId) {
        useCallStore.getState().setRemoteParticipantMuted(data.userId, Boolean(data.isMuted));
        if (data.isDeafened !== undefined) {
          useCallStore
            .getState()
            .setRemoteParticipantDeafened(data.userId, Boolean(data.isDeafened));
        } else if (!data.isMuted) {
          useCallStore.getState().setRemoteParticipantDeafened(data.userId, false);
        }
        if (data.isMuted) {
          useCallStore.getState().setRemoteIsSpeaking(false);
        }
      }
    };

    const handleSpeaking = (data: { callId: string; userId: string; isSpeaking: boolean }) => {
      const currentCallId = useCallStore.getState().callId;
      if (!data?.callId || data.callId !== currentCallId) return;
      useCallStore.getState().setRemoteIsSpeaking(Boolean(data.isSpeaking));
    };

    const handleVideoToggle = (data: { callId: string; userId: string; isVideoOff: boolean }) => {
      const currentCallId = useCallStore.getState().callId;
      if (!data?.callId || data.callId !== currentCallId) return;
      useCallStore.getState().setRemoteVideoOff(data.userId, data.isVideoOff);
      webRTCRef.current.ensureReceiverTracks(data.userId);
    };

    const handleCallActivity = (data: { callId: string; userId: string; activity: any }) => {
      const activeCallId = useCallStore.getState().callId;
      if (!data?.callId || data.callId !== activeCallId) return;
      if (data.userId) {
        const normalized = data.activity
          ? {
              ...data.activity,
              type:
                data.activity.type === 'music' || data.activity.trackId
                  ? 'spotify'
                  : data.activity.type,
            }
          : null;
        useCallStore.getState().setParticipantActivity(data.userId, normalized);
        if (normalized) {
          usePresenceStore.getState().setUserActivity(data.userId, normalized);
        }
      }
    };

    const handleParticipantJoined = (data: { callId: string }) => {
      const activeCallId = useCallStore.getState().callId;
      if (!data?.callId || data.callId !== activeCallId) return;
      publishCurrentActivity();
    };

    const handleRelayAssigned = (data: {
      callId: string;
      relaySessionId: string;
      relayUserId: string;
      isInitiator: boolean;
    }) => {
      useCallStore.getState().setIsPeerRelayActive(true, data.relaySessionId);
    };

    const handleRemoteScreenShareStart = (data: { callId: string; userId: string }) => {
      if (data.callId === useCallStore.getState().callId) {
        useCallStore.getState().setIsRemoteScreenSharing(true, data.userId);
        playActionSound('stream_start');
        webRTCRef.current.ensureReceiverTracks(data.userId);
      }
    };

    const handleRemoteScreenShareStop = (data: { callId: string; userId: string }) => {
      if (data.callId === useCallStore.getState().callId) {
        useCallStore.getState().setIsRemoteScreenSharing(false, null);
        playActionSound('stream_stop');

        // Clean up stopped screen video tracks from remote stream entries
        // Note: Do not call track.stop() on remote receiver tracks! That permanently breaks WebRTC receivers.
        const remoteStreams = useCallStore.getState().remoteStreams;
        const targetStream = remoteStreams[data.userId];
        if (targetStream) {
          targetStream.getVideoTracks().forEach((track) => {
            targetStream.removeTrack(track);
          });
          useCallStore
            .getState()
            .setRemoteStream(data.userId, new MediaStream(targetStream.getTracks()));
        }
        const genericStream = remoteStreams['remote'];
        if (genericStream) {
          genericStream.getVideoTracks().forEach((track) => {
            genericStream.removeTrack(track);
          });
          useCallStore
            .getState()
            .setRemoteStream('remote', new MediaStream(genericStream.getTracks()));
        }

        webRTCRef.current.ensureReceiverTracks(data.userId);
      }
    };

    const handleRemoteReconnect = async (data: {
      callId: string;
      userId: string;
      sdpOffer?: RTCSessionDescriptionInit;
      iceCandidates?: RTCIceCandidateInit[];
    }) => {
      const currentCallId = useCallStore.getState().callId;
      if (!data?.callId || data.callId !== currentCallId) return;

      playActionSound('user_join');

      if (data.sdpOffer) {
        try {
          // Reset PeerConnection without destroying existing local media tracks
          webRTCRef.current.resetPeerConnectionOnly();

          const currentCallType = useCallStore.getState().callType;
          const gatheredCandidates: RTCIceCandidateInit[] = [];

          const answer = await webRTCRef.current.handleOffer(
            data.sdpOffer,
            currentCallType,
            (candidate) => {
              socket.emit(WS_EVENTS.CALL_ICE_CANDIDATE, {
                callId: data.callId,
                candidate: candidate.toJSON(),
                targetUserId: data.userId,
              });
            },
            data.userId,
          );

          if (data.iceCandidates && Array.isArray(data.iceCandidates)) {
            for (const cand of data.iceCandidates) {
              await webRTCRef.current.addIceCandidate(cand);
            }
          }

          socket.emit(WS_EVENTS.CALL_RECONNECT_ANSWER, {
            callId: data.callId,
            sdpAnswer: answer,
            targetUserId: data.userId,
            iceCandidates: gatheredCandidates,
          });
        } catch (err) {
          console.warn('[useCallManager] handleRemoteReconnect failed:', err);
        }
      }
    };

    const handleReconnectAnswer = async (data: {
      callId: string;
      sdpAnswer: RTCSessionDescriptionInit;
      iceCandidates?: RTCIceCandidateInit[];
    }) => {
      if (data.callId !== useCallStore.getState().callId) return;
      try {
        await webRTCRef.current.handleAnswer(data.sdpAnswer);
        if (data.iceCandidates && Array.isArray(data.iceCandidates)) {
          for (const cand of data.iceCandidates) {
            await webRTCRef.current.addIceCandidate(cand);
          }
        }
      } catch (err) {
        console.warn('[useCallManager] handleReconnectAnswer failed:', err);
      }
    };

    socket.on(WS_EVENTS.CALL_INCOMING, handleIncoming);
    socket.on(WS_EVENTS.CALL_ACCEPTED, handleAccepted);
    socket.on(WS_EVENTS.CALL_ICE_CANDIDATE, handleIceCandidate);
    socket.on(WS_EVENTS.CALL_ICE_RESTART, handleRemoteIceRestart);
    socket.on(WS_EVENTS.CALL_ICE_RESTART_ANSWER, handleIceRestartAnswer);
    socket.on(WS_EVENTS.CALL_RECONNECT, handleRemoteReconnect);
    socket.on(WS_EVENTS.CALL_RECONNECT_ANSWER, handleReconnectAnswer);
    socket.on(WS_EVENTS.CALL_ENDED, handleEnded);
    socket.on(WS_EVENTS.CALL_MUTE, handleMute);
    socket.on(WS_EVENTS.CALL_UNMUTE, handleMute);
    socket.on(WS_EVENTS.CALL_SPEAKING, handleSpeaking);
    socket.on(WS_EVENTS.CALL_VIDEO_TOGGLE, handleVideoToggle);
    socket.on(WS_EVENTS.CALL_SCREEN_SHARE_START, handleRemoteScreenShareStart);
    socket.on(WS_EVENTS.CALL_SCREEN_SHARE_STOP, handleRemoteScreenShareStop);
    socket.on(WS_EVENTS.CALL_RELAY_ASSIGNED, handleRelayAssigned);
    socket.on(WS_EVENTS.CALL_ACTIVITY, handleCallActivity);
    socket.on(WS_EVENTS.CALL_PARTICIPANT_JOINED, handleParticipantJoined);

    return () => {
      socket.off(WS_EVENTS.CALL_INCOMING, handleIncoming);
      socket.off(WS_EVENTS.CALL_ACCEPTED, handleAccepted);
      socket.off(WS_EVENTS.CALL_ICE_CANDIDATE, handleIceCandidate);
      socket.off(WS_EVENTS.CALL_ICE_RESTART, handleRemoteIceRestart);
      socket.off(WS_EVENTS.CALL_ICE_RESTART_ANSWER, handleIceRestartAnswer);
      socket.off(WS_EVENTS.CALL_RECONNECT, handleRemoteReconnect);
      socket.off(WS_EVENTS.CALL_RECONNECT_ANSWER, handleReconnectAnswer);
      socket.off(WS_EVENTS.CALL_ENDED, handleEnded);
      socket.off(WS_EVENTS.CALL_MUTE, handleMute);
      socket.off(WS_EVENTS.CALL_UNMUTE, handleMute);
      socket.off(WS_EVENTS.CALL_SPEAKING, handleSpeaking);
      socket.off(WS_EVENTS.CALL_VIDEO_TOGGLE, handleVideoToggle);
      socket.off(WS_EVENTS.CALL_SCREEN_SHARE_START, handleRemoteScreenShareStart);
      socket.off(WS_EVENTS.CALL_SCREEN_SHARE_STOP, handleRemoteScreenShareStop);
      socket.off(WS_EVENTS.CALL_RELAY_ASSIGNED, handleRelayAssigned);
      socket.off(WS_EVENTS.CALL_ACTIVITY, handleCallActivity);
      socket.off(WS_EVENTS.CALL_PARTICIPANT_JOINED, handleParticipantJoined);
    };
  }, [socket, setIncomingCall, setCallStatus, resetCall, queryClient, publishCurrentActivity]);

  const initiateCall = useCallback(
    async (params: {
      conversationId: string;
      callType: 'audio' | 'video';
      remoteUser: UserSnapshot;
    }) => {
      try {
        globalSpeakerMixerManager.resumeAll();
        webRTCRef.current.resumeAudioContext?.();
        setDurationSec(0);
        setCallStatus('calling');
        useCallStore.setState({
          callType: params.callType,
          conversationId: params.conversationId,
          remoteParticipant: params.remoteUser,
          isVideoOff: params.callType !== 'video',
          remoteVideoOff: params.remoteUser?.id
            ? { [params.remoteUser.id]: params.callType !== 'video' }
            : {},
        });

        playOutgoingRingtone();

        const gatheredCandidates: RTCIceCandidateInit[] = [];
        const offer = await webRTC.createOffer(
          params.callType,
          (candidate) => {
            const currentCallId = useCallStore.getState().callId;
            if (currentCallId) {
              socket.emit(WS_EVENTS.CALL_ICE_CANDIDATE, {
                callId: currentCallId,
                candidate: candidate.toJSON(),
                targetUserId: params.remoteUser.id,
              });
            } else {
              gatheredCandidates.push(candidate.toJSON());
            }
          },
          params.remoteUser.id,
        );

        const { isGhostMode } = useCallStore.getState();
        let zkpProof: ZkpCallProof | null = null;
        if (isGhostMode) {
          const currentUserId = useAuthStore.getState().userId;
          if (currentUserId) {
            const cred = await ZKPIdentityManager.deriveCredential(currentUserId);
            zkpProof = await ZKPIdentityManager.generateProof(cred, 20);
            useCallStore.setState({ zkpProof });
          }
        }

        // Ephemeral ECDH public for the E2EE handshake (F1). Generated once per
        // call; the callee answers with its own key; the server only relays.
        const e2eeBundle = await webRTCRef.current.prepareE2eeOffer();

        socket.emit(
          WS_EVENTS.CALL_INITIATE,
          {
            conversationId: params.conversationId,
            callType: params.callType.toUpperCase(),
            sdpOffer: offer,
            iceCandidates: gatheredCandidates,
            ...(zkpProof ? { zkpProof, isGhostMode: true } : {}),
            ...(e2eeBundle
              ? {
                  e2eeEphemeralKey: e2eeBundle.publicKey,
                  ...(e2eeBundle.signature ? { e2eeBindingSignature: e2eeBundle.signature } : {}),
                }
              : {}),
          },
          (res: { status: string; callId?: string; call?: any; error?: string }) => {
            if (res?.status === 'ok' && res.callId) {
              useCallStore.setState({ callId: res.callId });
              if (res.call) {
                setActiveCall(res.call, params.remoteUser);
              }
              void negotiateWebTransport(res.callId);
            } else {
              stopRingtone();
              playCallEndSound();
              webRTC.closeConnection();
              resetCall();
            }
          },
        );
      } catch {
        stopRingtone();
        playCallEndSound();
        webRTC.closeConnection();
        resetCall();
      }
    },
    [
      socket,
      webRTC,
      setDurationSec,
      setCallStatus,
      setActiveCall,
      resetCall,
      negotiateWebTransport,
    ],
  );

  const acceptCall = useCallback(async () => {
    stopRingtone();
    globalSpeakerMixerManager.resumeAll();
    webRTCRef.current.resumeAudioContext?.();
    if (multiTabCoordinatorRef.current && multiTabCoordinatorRef.current.shouldSuppressRingtone()) {
      multiTabCoordinatorRef.current.sendSlaveAction('ACCEPT');
      return;
    }

    const currentIncoming = useCallStore.getState().incomingCall;
    if (!currentIncoming) return;

    const callType = String(currentIncoming.callType).toLowerCase() === 'video' ? 'video' : 'audio';

    stopRingtone();
    clearIncomingCall();
    setDurationSec(0);
    useCallStore.setState({
      callId: currentIncoming.callId,
      conversationId: currentIncoming.conversationId,
      callType,
      remoteParticipant: currentIncoming.caller,
      callStatus: 'connected',
      isVideoOff: callType !== 'video',
      remoteVideoOff: currentIncoming.caller?.id
        ? { [currentIncoming.caller.id]: callType !== 'video' }
        : {},
    });

    try {
      const gatheredCandidates: RTCIceCandidateInit[] = [];
      // Callee step: derive the E2EE session from the initiator key BEFORE
      // creating the PeerConnection, so receivers attach encrypted from the
      // first frame. Null when the initiator negotiated no E2EE.
      const ownE2eeBundle = await webRTCRef.current.acceptE2eeOffer(
        currentIncoming.e2eeEphemeralKey,
        currentIncoming.e2eeBindingSignature,
        currentIncoming.callerId,
        currentIncoming.callId,
      );
      const answer = await webRTCRef.current.handleOffer(
        currentIncoming.sdpOffer as RTCSessionDescriptionInit,
        callType,
        (candidate) => {
          socket.emit(WS_EVENTS.CALL_ICE_CANDIDATE, {
            callId: currentIncoming.callId,
            candidate: candidate.toJSON(),
            targetUserId: currentIncoming.callerId,
          });
        },
        currentIncoming.callerId,
      );

      // Process any candidates attached to the incoming call payload
      if (currentIncoming.iceCandidates && Array.isArray(currentIncoming.iceCandidates)) {
        for (const cand of currentIncoming.iceCandidates) {
          await webRTCRef.current.addIceCandidate(cand as RTCIceCandidateInit);
        }
      }

      socket.emit(
        WS_EVENTS.CALL_ACCEPT,
        {
          callId: currentIncoming.callId,
          sdpAnswer: answer,
          iceCandidates: gatheredCandidates,
          ...(ownE2eeBundle
            ? {
                e2eeEphemeralKey: ownE2eeBundle.publicKey,
                ...(ownE2eeBundle.signature
                  ? { e2eeBindingSignature: ownE2eeBundle.signature }
                  : {}),
              }
            : {}),
        },
        (res: { status: string; call?: any }) => {
          if (res?.call) {
            setActiveCall(res.call, currentIncoming.caller);
          }
          void negotiateWebTransportRef.current(currentIncoming.callId);
        },
      );
      setCallStatus('connected');
    } catch (err) {
      console.error('[useCallManager] acceptCall error:', err);
      playCallEndSound();
      webRTCRef.current.closeConnection();
      resetCall();
    }
  }, [socket, clearIncomingCall, setDurationSec, setCallStatus, setActiveCall, resetCall]);

  const rejectCall = useCallback(
    (reason = 'DECLINED') => {
      if (multiTabCoordinatorRef.current && !multiTabCoordinatorRef.current.isLeader()) {
        multiTabCoordinatorRef.current.sendSlaveAction('DECLINE');
        return;
      }

      const currentIncoming = useCallStore.getState().incomingCall;
      const conversationId =
        currentIncoming?.conversationId || useCallStore.getState().conversationId;

      clearCallSession();
      stopRingtone();
      clearIncomingCall();
      if (currentIncoming) {
        socket.emit(WS_EVENTS.CALL_REJECT, {
          callId: currentIncoming.callId,
          reason,
        });
      }

      if (conversationId) {
        void queryClient.invalidateQueries({
          queryKey: [CONVERSATIONS_KEY],
        });
      }

      multiTabCoordinatorRef.current?.stop();
      multiTabCoordinatorRef.current = null;
      resetCall();
    },
    [socket, clearIncomingCall, resetCall, queryClient],
  );

  // Listen to Service Worker Push Notification Action Buttons (Accept / Decline)
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('eternal_calls');

    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'CALL_ACCEPTED_FROM_PUSH') {
        void acceptCall();
      } else if (msg.type === 'CALL_DECLINED_FROM_PUSH') {
        rejectCall('DECLINED');
      }
    };

    return () => {
      channel.close();
    };
  }, [acceptCall, rejectCall]);

  const endCall = useCallback(() => {
    if (multiTabCoordinatorRef.current && !multiTabCoordinatorRef.current.isLeader()) {
      multiTabCoordinatorRef.current.sendSlaveAction('END');
      return;
    }

    const currentCallId = useCallStore.getState().callId;
    const conversationId = useCallStore.getState().conversationId;
    const durationSec = useCallStore.getState().durationSec;

    clearCallSession();
    stopRingtone();
    playActionSound('disconnect');
    cancelHaptic();
    triggerHaptic('callEnded');

    if (currentCallId) {
      socket.emit(WS_EVENTS.CALL_END, {
        callId: currentCallId,
        reason: 'ENDED_BY_USER',
        durationMs: durationSec * 1000,
      });
    }

    if (conversationId) {
      void queryClient.invalidateQueries({
        queryKey: [CONVERSATIONS_KEY],
      });
    }

    webRTC.closeConnection();
    multiTabCoordinatorRef.current?.stop();
    multiTabCoordinatorRef.current = null;
    wasMutedBeforeDeafenRef.current = false;
    resetCall();
  }, [socket, webRTC, resetCall, queryClient]);

  const wasMutedBeforeDeafenRef = useRef(false);

  const toggleMute = useCallback(() => {
    const currentCallId = useCallStore.getState().callId;
    const currentMuted = useCallStore.getState().isMuted;
    const currentDeafened = useCallStore.getState().isDeafened;

    // Discord behavior: clicking mute while deafened un-deafens and un-mutes you
    if (currentDeafened) {
      setIsDeafened(false);
      setIsMuted(false);
      wasMutedBeforeDeafenRef.current = false;
      useCallStore.getState().setLocalIsSpeaking(false);
      webRTC.toggleMuteTrack(false);

      const remoteStreams = useCallStore.getState().remoteStreams;
      Object.values(remoteStreams).forEach((stream) => {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      });

      playActionSound('undeafen');
      triggerHaptic('unmute');

      if (currentCallId) {
        socket.emit(WS_EVENTS.CALL_UNMUTE, {
          callId: currentCallId,
          isMuted: false,
          isDeafened: false,
        });
      }
      return;
    }

    const newMuted = !currentMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      useCallStore.getState().setLocalIsSpeaking(false);
    }
    webRTC.toggleMuteTrack(newMuted);
    playActionSound(newMuted ? 'mute' : 'unmute');
    triggerHaptic(newMuted ? 'mute' : 'unmute');

    if (currentCallId) {
      socket.emit(newMuted ? WS_EVENTS.CALL_MUTE : WS_EVENTS.CALL_UNMUTE, {
        callId: currentCallId,
        isMuted: newMuted,
        isDeafened: false,
      });
    }
  }, [socket, webRTC, setIsMuted, setIsDeafened]);

  const toggleDeafen = useCallback(() => {
    const currentCallId = useCallStore.getState().callId;
    const currentDeafened = useCallStore.getState().isDeafened;
    const currentMuted = useCallStore.getState().isMuted;
    const nextDeafened = !currentDeafened;

    if (nextDeafened) {
      // Entering deafen mode: remember current mute state, then mute both
      wasMutedBeforeDeafenRef.current = currentMuted;
      setIsDeafened(true);
      setIsMuted(true);
      useCallStore.getState().setLocalIsSpeaking(false);
      webRTC.toggleMuteTrack(true);

      const remoteStreams = useCallStore.getState().remoteStreams;
      Object.values(remoteStreams).forEach((stream) => {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      });

      triggerHaptic('mute');
      playActionSound('deafen');

      if (currentCallId) {
        socket.emit(WS_EVENTS.CALL_MUTE, {
          callId: currentCallId,
          isMuted: true,
          isDeafened: true,
        });
      }
    } else {
      // Exiting deafen mode (turning sound back on)
      setIsDeafened(false);

      const remoteStreams = useCallStore.getState().remoteStreams;
      Object.values(remoteStreams).forEach((stream) => {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      });

      // Discord behavior: restore mute state before deafen
      // If user was already muted before deafening, stay muted; otherwise unmute
      const shouldBeMuted = wasMutedBeforeDeafenRef.current;
      setIsMuted(shouldBeMuted);
      webRTC.toggleMuteTrack(shouldBeMuted);

      triggerHaptic(shouldBeMuted ? 'mute' : 'unmute');
      playActionSound('undeafen');

      if (currentCallId) {
        socket.emit(shouldBeMuted ? WS_EVENTS.CALL_MUTE : WS_EVENTS.CALL_UNMUTE, {
          callId: currentCallId,
          isMuted: shouldBeMuted,
          isDeafened: false,
        });
      }
    }
  }, [socket, webRTC, setIsDeafened, setIsMuted]);

  const toggleVideo = useCallback(async () => {
    const currentCallId = useCallStore.getState().callId;
    const newVideoOff = !useCallStore.getState().isVideoOff;
    setIsVideoOff(newVideoOff);
    playActionSound(newVideoOff ? 'camera_off' : 'camera_on');
    triggerHaptic('cameraToggle');

    const success = await webRTC.toggleVideoTrack(newVideoOff);
    if (!success && !newVideoOff) {
      setIsVideoOff(true);
      return;
    }

    if (currentCallId) {
      socket.emit(WS_EVENTS.CALL_VIDEO_TOGGLE, {
        callId: currentCallId,
        isVideoOff: newVideoOff,
      });
    }
  }, [socket, webRTC, setIsVideoOff]);

  const toggleScreenShare = useCallback(async () => {
    const currentCallId = useCallStore.getState().callId;
    const currentlySharing = useCallStore.getState().isScreenSharing;
    triggerHaptic('screenShare');
    if (currentlySharing) {
      playActionSound('stream_stop');
      await webRTC.stopScreenShare();
      if (currentCallId) {
        socket.emit(WS_EVENTS.CALL_SCREEN_SHARE_STOP, {
          callId: currentCallId,
          isSharing: false,
        });
      }
    } else {
      try {
        await webRTC.startScreenShare();
        playActionSound('stream_start');
        if (currentCallId) {
          socket.emit(WS_EVENTS.CALL_SCREEN_SHARE_START, {
            callId: currentCallId,
            isSharing: true,
          });
        }
      } catch (err) {
        console.warn('[ScreenShare] startScreenShare cancelled or failed:', err);
      }
    }
  }, [socket, webRTC]);

  acceptCallRef.current = acceptCall;
  rejectCallRef.current = rejectCall;
  endCallRef.current = endCall;
  toggleMuteRef.current = toggleMute;

  return useMemo(
    () => ({
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleDeafen,
      toggleVideo,
      toggleScreenShare,
      sendP2PFile: webRTC.sendP2PFile,
      cancelP2PTransfer: webRTC.cancelP2PTransfer,
      registerVideoTile: webRTC.registerVideoTile,
      unregisterVideoTile: webRTC.unregisterVideoTile,
      syncPlayEngine: webRTC.syncPlayEngine,
      whiteboardEngine: webRTC.whiteboardEngine,
      superResEngine: webRTC.superResEngine,
      webCodecsManager: webRTC.webCodecsManager,
      peerRelayManager: webRTC.peerRelayManager,
      chaosEngine: webRTC.chaosEngine,
      unblockAutoplay: webRTC.unblockAutoplay,
      registerMediaElement: webRTC.registerMediaElement,
      reactionEngine: webRTC.reactionEngine,
      sendReaction: webRTC.sendReaction,
      broadcastSoundboard: webRTC.broadcastSoundboard,
      ptt,
      multiTabCoordinator: multiTabCoordinatorRef.current,
      confirmE2eeSasMatch: webRTC.confirmE2eeSasMatch,
      configureSVC: webRTC.configureSVC,
      switchSVCMode: webRTC.switchSVCMode,
      setSVCLayers: webRTC.setSVCLayers,
      callExternalStore: webRTC.callExternalStore,
    }),
    // Actions are stable useCallback refs; engines are stable useRef.current values.
    // Only re-create when socket or core callbacks change (very rare).
    [
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleDeafen,
      toggleVideo,
      toggleScreenShare,
      webRTC.sendP2PFile,
      webRTC.cancelP2PTransfer,
      webRTC.registerVideoTile,
      webRTC.unregisterVideoTile,
      webRTC.unblockAutoplay,
      webRTC.registerMediaElement,
      webRTC.sendReaction,
      webRTC.broadcastSoundboard,
      webRTC.configureSVC,
      webRTC.switchSVCMode,
      webRTC.setSVCLayers,
      webRTC.confirmE2eeSasMatch,
      webRTC.callExternalStore,
      webRTC.chaosEngine,
      webRTC.peerRelayManager,
      webRTC.reactionEngine,
      webRTC.superResEngine,
      webRTC.syncPlayEngine,
      webRTC.webCodecsManager,
      webRTC.whiteboardEngine,
      ptt,
    ],
  );
}
