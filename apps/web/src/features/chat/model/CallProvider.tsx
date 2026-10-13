import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { CallContext, idleCallManager, type CallContextValue } from './CallContext';
import type { IncomingCallData } from './callStore';
import { getSocket } from '@/shared/api/socket';
import { getCallSession } from '../lib/callSessionPersistence';

const CallRuntime = lazy(() => import('./CallRuntime'));

export function CallProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isChatRoute = /^\/(messages|messenger|chat\/standalone)(\/|$)/.test(pathname);
  const [activated, setActivated] = useState(() => Boolean(getCallSession()));
  const [incoming, setIncoming] = useState<IncomingCallData | null>(null);
  const [ready, setReady] = useState(false);
  const managerRef = useRef<CallContextValue | null>(null);
  const waiters = useRef<Array<(value: CallContextValue) => void>>([]);
  const publish = useCallback((value: CallContextValue) => {
    managerRef.current = value;
    setReady(true);
    waiters.current.splice(0).forEach((resolve) => resolve(value));
  }, []);
  useEffect(() => {
    if (isChatRoute) setActivated(true);
  }, [isChatRoute]);
  useEffect(() => {
    if (ready) return;
    const socket = getSocket();
    const onIncoming = (data: IncomingCallData) => {
      setIncoming(data);
      setActivated(true);
    };
    const onEnded = (data: { callId: string }) =>
      setIncoming((current) => (current?.callId === data.callId ? null : current));
    socket.on('call:incoming', onIncoming);
    socket.on('call:ended', onEnded);
    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:ended', onEnded);
    };
  }, [ready]);
  // An immediate click during module loading waits for the real manager.
  const [pendingManager] = useState(
    () =>
      ({
        ...idleCallManager,
        initiateCall: async (...args: Parameters<CallContextValue['initiateCall']>) => {
          setActivated(true);
          const ready =
            managerRef.current ??
            (await new Promise<CallContextValue>((resolve) => waiters.current.push(resolve)));
          return ready.initiateCall(...args);
        },
      }) as CallContextValue,
  );
  // Publish readiness once. Runtime callbacks can change on every render;
  // writing each manager object into parent state creates a render feedback loop.
  // Stable delegates always invoke the latest action, preserving fresh closures.
  const [readyManager] = useState(() => {
    const delegates = new Map<PropertyKey, (...args: unknown[]) => unknown>();
    return new Proxy(pendingManager, {
      get(target, key) {
        const current = managerRef.current ?? target;
        const value = Reflect.get(current, key);
        if (typeof value !== 'function') return value;
        if (!delegates.has(key))
          delegates.set(key, (...args) => {
            const latest = managerRef.current ?? target;
            return Reflect.apply(Reflect.get(latest, key), latest, args);
          });
        return delegates.get(key);
      },
    });
  });
  return (
    <CallContext.Provider value={ready ? readyManager : pendingManager}>
      {children}
      {(activated || isChatRoute) && (
        <Suspense fallback={null}>
          <CallRuntime initialIncomingCall={incoming} onReady={publish} />
        </Suspense>
      )}
    </CallContext.Provider>
  );
}
