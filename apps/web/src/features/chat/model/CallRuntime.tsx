import { useEffect } from 'react';
import { useCallManager } from './useCallManager';
import type { CallContextValue } from './CallContext';
import type { IncomingCallData } from './callStore';

export default function CallRuntime({
  initialIncomingCall,
  onReady,
}: {
  initialIncomingCall: IncomingCallData | null;
  onReady: (manager: CallContextValue) => void;
}) {
  const manager = useCallManager(initialIncomingCall);
  useEffect(() => {
    onReady(manager);
  }, [manager, onReady]);
  return null;
}
