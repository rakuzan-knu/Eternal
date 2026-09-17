import { createContext, useContext } from 'react';
import type { useCallManager } from './useCallManager';

export type CallContextValue = ReturnType<typeof useCallManager>;

export const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const context = useContext(CallContext);
  if (!context) {
    return {
      initiateCall: () => Promise.resolve(),
      acceptCall: () => Promise.resolve(),
      rejectCall: () => {},
      endCall: () => {},
      toggleMute: () => {},
      toggleDeafen: () => {},
      toggleVideo: () => {},
      toggleScreenShare: () => Promise.resolve(),
      sendP2PFile: () => Promise.resolve(),
      cancelP2PTransfer: () => {},
      registerVideoTile: () => {},
      unregisterVideoTile: () => {},
      unblockAutoplay: () => {},
      registerMediaElement: () => {},
      sendReaction: () => {},
      configureSVC: () => {},
      switchSVCMode: () => {},
      setSVCLayers: () => {},
      confirmE2eeSasMatch: () => {},
    } as unknown as CallContextValue;
  }
  return context;
}
