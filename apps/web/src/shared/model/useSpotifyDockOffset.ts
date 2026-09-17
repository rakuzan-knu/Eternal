import { useEffect, useState } from 'react';
import { useSpotifyPlayerStore } from './useSpotifyPlayerStore';

export interface SpotifyDockOffsetResult {
  /** True if dock is currently active and rendered on screen */
  isDockActive: boolean;
  /** True if dock is in minimized pill mode */
  isDockMinimized: boolean;
  /**
   * Additional bottom offset in pixels:
   * - Full dock: 100px (desktop >=640px) or 84px (mobile <640px)
   * - Minimized dock: 42px (desktop >=640px) or 38px (mobile <640px)
   * - Closed/Hidden: 0px
   */
  dockOffset: number;
  /**
   * Total padding-bottom to apply to composer / bottom chat element:
   * (dockOffset + defaultPadding)
   * - Full dock: 108px (desktop) or 92px (mobile)
   * - Minimized dock: 50px (desktop) or 46px (mobile)
   * - Closed/Hidden: 8px (default pb-2)
   */
  composerPaddingBottom: number;
}

/**
 * Hook to dynamically calculate bottom spacing offset needed by chat components
 * (input bar, action buttons, message lists) based on SpotifyBottomDock visibility
 * and minimization state.
 *
 * Smooth CSS transitions can be applied with:
 * `transition-[padding-bottom] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`
 */
export function useSpotifyDockOffset(defaultPadding = 8): SpotifyDockOffsetResult {
  const isDockVisible = useSpotifyPlayerStore((s) => s.isDockVisible);
  const isDockMinimized = useSpotifyPlayerStore((s) => s.isDockMinimized);
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isGameModeOpen = useSpotifyPlayerStore((s) => s.isGameModeOpen);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDockActive = Boolean(isDockVisible && currentTrack && !isGameModeOpen);

  let dockOffset = 0;
  if (isDockActive) {
    if (isDockMinimized) {
      // Minimized pill is 36px (sm) / 32px (mobile) tall at bottom-0.
      // Offset provides ~14px clean breather gap between the pill and composer buttons.
      dockOffset = isMobile ? 38 : 42;
    } else {
      // Full dock is 72px (sm) / 64px (mobile) tall at bottom-5 (20px) / bottom-3 (12px).
      // Minimize/close buttons cluster protrudes ~10px above the dock container.
      // Offset provides a comfortable gap above the dock and its control buttons.
      dockOffset = isMobile ? 84 : 100;
    }
  }

  const composerPaddingBottom = dockOffset + defaultPadding;

  return {
    isDockActive,
    isDockMinimized,
    dockOffset,
    composerPaddingBottom,
  };
}
