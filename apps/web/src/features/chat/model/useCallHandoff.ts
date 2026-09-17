import { useCallback, useEffect, useState } from 'react';
import { getSocket } from '@/shared/api/socket';
import { WS_EVENTS } from '@backend/messenger/events/ws-events';
import { useCallStore } from './callStore';
import type { CallSessionView } from '@common/contracts';

export interface RemoteActiveCallInfo {
  callId: string;
  conversationId: string;
  type?: 'audio' | 'video';
  initiatorName?: string;
}

export function useCallHandoff() {
  const [remoteCall, setRemoteCall] = useState<RemoteActiveCallInfo | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const { callStatus, callId, resetCall, setActiveCall, setCallStatus } = useCallStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for announcement that another device of the same user is in a call
    const handleHandoffAnnounce = (data: {
      callId: string;
      conversationId: string;
      type?: 'audio' | 'video';
      initiatorName?: string;
    }) => {
      // Only show banner if this device is NOT already in a call
      if (useCallStore.getState().callStatus === 'idle') {
        setRemoteCall(data);
      }
    };

    // If a call is ended anywhere, dismiss banner
    const handleCallEnded = (data: { callId: string }) => {
      setRemoteCall((current) => (current?.callId === data.callId ? null : current));
    };

    // This device was the one active in the call, and user transferred it to another device
    const handleHandoffComplete = (data: { callId: string; reason: string }) => {
      if (useCallStore.getState().callId === data.callId) {
        // Gracefully release local media without ending the call for others
        resetCall();
        setTransferError('Call transferred to your other device');
        setTimeout(() => setTransferError(null), 4000);
      }
    };

    socket.on(WS_EVENTS.CALL_HANDOFF_ANNOUNCE, handleHandoffAnnounce);
    socket.on(WS_EVENTS.CALL_ENDED, handleCallEnded);
    socket.on(WS_EVENTS.CALL_HANDOFF_COMPLETE, handleHandoffComplete);

    return () => {
      socket.off(WS_EVENTS.CALL_HANDOFF_ANNOUNCE, handleHandoffAnnounce);
      socket.off(WS_EVENTS.CALL_ENDED, handleCallEnded);
      socket.off(WS_EVENTS.CALL_HANDOFF_COMPLETE, handleHandoffComplete);
    };
  }, [resetCall]);

  const requestHandoff = useCallback(
    async (targetCallId?: string): Promise<boolean> => {
      const targetId = targetCallId || remoteCall?.callId;
      if (!targetId) return false;

      const socket = getSocket();
      if (!socket) {
        setTransferError('Network connection unavailable');
        return false;
      }

      setIsTransferring(true);
      setTransferError(null);

      return new Promise<boolean>((resolve) => {
        socket.emit(
          WS_EVENTS.CALL_HANDOFF_REQUEST,
          { callId: targetId },
          (res: { status: string; call?: CallSessionView; error?: string }) => {
            setIsTransferring(false);

            if (res.status === 'ok' && res.call) {
              setRemoteCall(null);
              // Setup local call state to connect
              setActiveCall(res.call);
              setCallStatus('calling');
              resolve(true);
            } else {
              setTransferError(res.error || 'Failed to transfer call');
              resolve(false);
            }
          },
        );
      });
    },
    [remoteCall, setActiveCall, setCallStatus],
  );

  const dismissHandoff = useCallback(() => {
    setRemoteCall(null);
  }, []);

  return {
    remoteCall: callStatus === 'idle' && !callId ? remoteCall : null,
    isTransferring,
    transferError,
    requestHandoff,
    dismissHandoff,
  };
}
