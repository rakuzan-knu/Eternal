import { shouldReduceMotion } from '@/shared/model/useVisualEffects';
import { useEffect, useState } from 'react';

/** Keep a closing overlay only for its exit animation; rapid reopen cancels disposal. */
export function useExitPresence(open: boolean, durationMs = 160) {
  const [retained, setRetained] = useState(open);
  useEffect(() => {
    if (open) {
      setRetained(true);
      return;
    }
    const reduced = shouldReduceMotion();
    const timer = setTimeout(() => setRetained(false), reduced ? 0 : durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs]);
  return open || retained;
}
