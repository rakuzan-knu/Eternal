import { globalShortcut } from 'electron';
import type { CallAction, CallScope } from '../shared/ipcContract';
import { createNativePtt } from './nativePtt';

const muteAccelerator = 'CommandOrControl+Shift+M';

export function createCallShortcuts(isFocused: () => boolean = () => true) {
  const active = new Set<CallScope>();
  const pending = new Map<CallScope, (action: CallAction) => void>();
  const queued = new Map<CallScope, CallAction>();
  let pttScope: CallScope | undefined;
  const emit = (scope: CallScope, action: CallAction) => {
    const waiter = pending.get(scope);
    if (waiter) waiter(action);
    else queued.set(scope, action);
  };
  const nativePtt = createNativePtt(isFocused, (pressed) => {
    if (pttScope) emit(pttScope, pressed ? 'ptt-down' : 'ptt-up');
  });
  let registered = false;
  const release = (scope: CallScope) => pending.get(scope)?.('none');
  const reset = () => {
    nativePtt.stop();
    pttScope = undefined;
    for (const scope of active) release(scope);
    active.clear();
    queued.clear();
    if (registered) globalShortcut.unregister(muteAccelerator);
    registered = false;
  };
  return {
    setActive(scope: CallScope, enabled: boolean) {
      if (enabled) active.add(scope);
      else {
        active.delete(scope);
        if (pttScope === scope) {
          nativePtt.stop();
          pttScope = undefined;
        }
        release(scope);
        queued.delete(scope);
      }
      if (!active.size) reset();
      else if (!registered) {
        registered = globalShortcut.register(muteAccelerator, () => {
          const target = pending.has('call') ? 'call' : pending.has('mesh') ? 'mesh' : undefined;
          if (target) emit(target, 'mute');
        });
        if (!registered) console.warn('Desktop mute shortcut is unavailable');
      }
    },
    wait(scope: CallScope): Promise<CallAction> {
      if (!active.has(scope)) throw new Error('No active desktop call');
      if (pending.has(scope)) throw new Error('Call action request already pending');
      const action = queued.get(scope);
      if (action) {
        queued.delete(scope);
        return Promise.resolve(action);
      }
      return new Promise((resolve) => {
        const timeout = setTimeout(() => finish('none'), 15000);
        const finish = (action: CallAction) => {
          clearTimeout(timeout);
          pending.delete(scope);
          resolve(action);
        };
        pending.set(scope, finish);
      });
    },
    async configurePushToTalk(scope: CallScope, enabled: boolean, key: string) {
      if (!active.has(scope)) throw new Error('No active desktop call');
      if (!enabled && pttScope !== scope) return false;
      nativePtt.stop();
      if (pttScope) queued.delete(pttScope);
      pttScope = enabled ? scope : undefined;
      return nativePtt.configure(enabled, key);
    },
    releasePushToTalk() {
      nativePtt.release();
      if (pttScope) emit(pttScope, 'ptt-reset');
    },
    reset,
  };
}
