import { useEffect } from 'react';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { cursorVfxEngine } from '@/shared/lib/cursorVfxEngine';

/**
 * Global Cursor VFX Overlay Component.
 * Automatically synchronizes store preferences with the hardware-accelerated
 * Canvas Cursor VFX Engine.
 */
export function CursorVfxOverlay() {
  const customCursorEnabled = useThemeStore((s) => s.customCursorEnabled);
  const customCursorId = useThemeStore((s) => s.customCursorId);
  const customCursorVariant = useThemeStore((s) => s.customCursorVariant);
  const cursorVfxEnabled = useThemeStore((s) => s.cursorVfxEnabled);
  const cursorVfxTrail = useThemeStore((s) => s.cursorVfxTrail);
  const cursorVfxClick = useThemeStore((s) => s.cursorVfxClick);
  const cursorVfxHover = useThemeStore((s) => s.cursorVfxHover);

  useEffect(() => {
    cursorVfxEngine.configure({
      enabled: customCursorEnabled && cursorVfxEnabled,
      trail: cursorVfxTrail,
      click: cursorVfxClick,
      hover: cursorVfxHover,
      presetId: customCursorId,
      variantId: customCursorVariant,
    });

    return () => {
      // In case of unmount, turn off VFX engine
      cursorVfxEngine.configure({ enabled: false });
    };
  }, [
    customCursorEnabled,
    customCursorId,
    customCursorVariant,
    cursorVfxEnabled,
    cursorVfxTrail,
    cursorVfxClick,
    cursorVfxHover,
  ]);

  return null;
}
