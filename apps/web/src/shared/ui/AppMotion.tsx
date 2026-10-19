import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useVisualEffects } from '@/shared/model/useVisualEffects';

export function AppMotion({ children }: { children: ReactNode }) {
  const motion = useVisualEffects((state) => state.motion);
  return (
    <MotionConfig
      reducedMotion={motion === 'full' ? 'never' : motion === 'reduced' ? 'always' : 'user'}
    >
      <>{children}</>
    </MotionConfig>
  );
}
