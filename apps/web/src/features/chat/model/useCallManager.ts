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
import type { UserSnapshot, ZkpCallProof, WebTransportSessionResponse } from '@common/contracts';
import { ZKPIdentityManager } from '../lib/webrtc/zkpIdentity';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { apiClient } from '@/shared/api/httpClient';
import { usePushToTalk } from './usePushToTalk';
import { MultiTabCallCoordinator } from '../lib/webrtc/multiTabCallCoordinator';
import { triggerHaptic, cancelHaptic } from '../lib/webrtc/hapticFeedback';

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

  // Auto ICE-Restart sender callback
  const handleSendIceRestart = useCallback(
    (offer: RTCSessionDescriptionInit) => {
      const currentCallId = useCallStore.getState().callId;
      const currentRemote = useCallStore.getState().remoteParticipant;
      if (!currentCallId || !socket) return;
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

  const webRTC = useWebRTC({
    onSendIceRestart: handleSendIceRestart,
    onConnectionFailed: handleConnectionFailed,
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
            if (!multiTabCoordinatorRef.current?.shouldSuppressRingtone()) {
              multiTabCoordinatorRef.current?.announceRinging();
              playIncomingRingtone();
            }
          });
      } else {
        playIncomingRingtone();
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
      setCallStatus('connected');
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
        const answer = await webRTCRef.current.handleRemoteIceRestart(data.sdpOffer);
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
      const convId = useCallStore.getState().conversationId;
      stopRingtone();
      playCallEndSound();
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

    const handleMute = (_data: { callId: string; userId: string; isMuted: boolean }) => {
      // Remote participant mute state updated
    };

    const handleVideoToggle = (_data: { callId: string; userId: string; isVideoOff: boolean }) => {
      // Remote participant video state updated
    };

    const handleRelayAssigned = (data: {
      callId: string;
      relaySessionId: string;
      relayUserId: string;
      isInitiator: boolean;
    }) => {
      useCallStore.getState().setIsPeerRelayActive(true, data.relaySessionId);
    };

    socket.on(WS_EVENTS.CALL_INCOMING, handleIncoming);
    socket.on(WS_EVENTS.CALL_ACCEPTED, handleAccepted);
    socket.on(WS_EVENTS.CALL_ICE_CANDIDATE, handleIceCandidate);
    socket.on(WS_EVENTS.CALL_ICE_RESTART, handleRemoteIceRestart);
    socket.on(WS_EVENTS.CALL_ICE_RESTART_ANSWER, handleIceRestartAnswer);
    socket.on(WS_EVENTS.CALL_ENDED, handleEnded);
    socket.on(WS_EVENTS.CALL_MUTE, handleMute);
    socket.on(WS_EVENTS.CALL_VIDEO_TOGGLE, handleVideoToggle);
    socket.on(WS_EVENTS.CALL_RELAY_ASSIGNED, handleRelayAssigned);

    return () => {
      socket.off(WS_EVENTS.CALL_INCOMING, handleIncoming);
      socket.off(WS_EVENTS.CALL_ACCEPTED, handleAccepted);
      socket.off(WS_EVENTS.CALL_ICE_CANDIDATE, handleIceCandidate);
      socket.off(WS_EVENTS.CALL_ICE_RESTART, handleRemoteIceRestart);
      socket.off(WS_EVENTS.CALL_ICE_RESTART_ANSWER, handleIceRestartAnswer);
      socket.off(WS_EVENTS.CALL_ENDED, handleEnded);
      socket.off(WS_EVENTS.CALL_MUTE, handleMute);
      socket.off(WS_EVENTS.CALL_VIDEO_TOGGLE, handleVideoToggle);
      socket.off(WS_EVENTS.CALL_RELAY_ASSIGNED, handleRelayAssigned);
    };
  }, [socket, setIncomingCall, setCallStatus, resetCall, queryClient]);

  const initiateCall = useCallback(
    async (params: {
      conversationId: string;
      callType: 'audio' | 'video';
      remoteUser: UserSnapshot;
    }) => {
      try {
        setDurationSec(0);
        setCallStatus('calling');
        useCallStore.setState({
          callType: params.callType,
          conversationId: params.conversationId,
          remoteParticipant: params.remoteUser,
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

    stopRingtone();
    playCallEndSound();
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
    resetCall();
  }, [socket, webRTC, resetCall, queryClient]);

  const toggleMute = useCallback(() => {
    const currentCallId = useCallStore.getState().callId;
    const newMuted = !useCallStore.getState().isMuted;
    setIsMuted(newMuted);
    webRTC.toggleMuteTrack(newMuted);
    triggerHaptic(newMuted ? 'mute' : 'unmute');

    if (currentCallId) {
      socket.emit(newMuted ? WS_EVENTS.CALL_MUTE : WS_EVENTS.CALL_UNMUTE, {
        callId: currentCallId,
        isMuted: newMuted,
      });
    }
  }, [socket, webRTC, setIsMuted]);

  const toggleDeafen = useCallback(() => {
    const currentCallId = useCallStore.getState().callId;
    const currentDeafened = useCallStore.getState().isDeafened;
    const nextDeafened = !currentDeafened;
    setIsDeafened(nextDeafened);

    if (nextDeafened) {
      setIsMuted(true);
      webRTC.toggleMuteTrack(true);
    }

    const remoteStreams = useCallStore.getState().remoteStreams;
    Object.values(remoteStreams).forEach((stream) => {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !nextDeafened;
      });
    });

    triggerHaptic(nextDeafened ? 'mute' : 'unmute');

    if (currentCallId) {
      socket.emit(nextDeafened ? WS_EVENTS.CALL_MUTE : WS_EVENTS.CALL_UNMUTE, {
        callId: currentCallId,
        isMuted: true,
      });
    }
  }, [socket, webRTC, setIsDeafened, setIsMuted]);

  const toggleVideo = useCallback(() => {
    const currentCallId = useCallStore.getState().callId;
    const newVideoOff = !useCallStore.getState().isVideoOff;
    setIsVideoOff(newVideoOff);
    webRTC.toggleVideoTrack(newVideoOff);
    triggerHaptic('cameraToggle');

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
        if (currentCallId) {
          socket.emit(WS_EVENTS.CALL_SCREEN_SHARE_START, {
            callId: currentCallId,
            isSharing: true,
          });
        }
      } catch {
        // User cancelled screen share picker
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
