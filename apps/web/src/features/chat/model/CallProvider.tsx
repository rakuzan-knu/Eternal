import React from 'react';
import { useCallManager } from './useCallManager';
import { CallContext } from './CallContext';

export function CallProvider({ children }: { children: React.ReactNode }) {
  const callManager = useCallManager();

  return <CallContext.Provider value={callManager}>{children}</CallContext.Provider>;
}
