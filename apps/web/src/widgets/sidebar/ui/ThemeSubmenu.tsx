import React from 'react';
import { Moon, Sun, Laptop, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { triggerCircularRippleTransition } from '@/features/chat/lib/themeRippleTransition';
import { playToggleSound } from '@/shared/lib/themeSoundFx';
import { MenuItem } from './MenuItem';
import { HoverFlyout } from './HoverFlyout';

export function ThemeMenuItem() {
  const syncWithSystem = useThemeStore((s) => s.syncWithSystem);
  const setSyncWithSystem = useThemeStore((s) => s.setSyncWithSystem);
  const solidTheme = useThemeStore((s) => s.solidTheme);
  const setSolidTheme = useThemeStore((s) => s.setSolidTheme);
  const themeMode = useThemeStore((s) => s.themeMode);
  const previousThemeSnapshot = useThemeStore((s) => s.previousThemeSnapshot);
  const restorePreviousTheme = useThemeStore((s) => s.restorePreviousTheme);
  const soundFxEnabled = useThemeStore((s) => s.soundFxEnabled);

  const isSystemActive = syncWithSystem;
  const isDarkActive =
    !syncWithSystem &&
    themeMode === 'solid' &&
    (solidTheme === 'dark' || solidTheme === 'midnight' || solidTheme === 'ash');
  const isLightActive = !syncWithSystem && themeMode === 'solid' && solidTheme === 'light';
  const isPreviousActive =
    !syncWithSystem &&
    !isDarkActive &&
    !isLightActive &&
    Boolean(previousThemeSnapshot && themeMode === previousThemeSnapshot.themeMode);

  const handleSelectSystem = (e: React.MouseEvent) => {
    if (soundFxEnabled) playToggleSound();
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      setSyncWithSystem(true);
    });
  };

  const handleSelectDark = (e: React.MouseEvent) => {
    if (soundFxEnabled) playToggleSound();
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      setSolidTheme('dark');
    });
  };

  const handleSelectLight = (e: React.MouseEvent) => {
    if (soundFxEnabled) playToggleSound();
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      setSolidTheme('light');
    });
  };

  const handleRestorePrevious = (e: React.MouseEvent) => {
    if (soundFxEnabled) playToggleSound();
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      restorePreviousTheme();
    });
  };

  return (
    <HoverFlyout
      trigger={({ toggle }) => (
        <MenuItem icon={Moon} label="Change appearance" hasChevron onClick={toggle} />
      )}
    >
      <div className="flex flex-col gap-1 p-1">
        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 select-none">
          Theme
        </div>

        {/* System */}
        <button
          type="button"
          onClick={handleSelectSystem}
          className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${
            isSystemActive
              ? 'text-purple-700 dark:text-white font-semibold'
              : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white'
          }`}
        >
          {isSystemActive && (
            <motion.div
              layoutId="activeThemeSubmenuPill"
              className="absolute inset-0 rounded-xl bg-purple-500/20 border border-purple-500/30 shadow-sm pointer-events-none"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <Laptop
            size={16}
            className={`relative z-10 transition-colors ${
              isSystemActive
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          />
          <span className="flex-1 text-left relative z-10">System</span>
          <AnimatePresence>
            {isSystemActive && (
              <motion.span
                key="check-system"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="shrink-0 relative z-10 flex items-center"
              >
                <Check size={16} className="text-purple-600 dark:text-purple-400" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Dark */}
        <button
          type="button"
          onClick={handleSelectDark}
          className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${
            isDarkActive
              ? 'text-purple-700 dark:text-white font-semibold'
              : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white'
          }`}
        >
          {isDarkActive && (
            <motion.div
              layoutId="activeThemeSubmenuPill"
              className="absolute inset-0 rounded-xl bg-purple-500/20 border border-purple-500/30 shadow-sm pointer-events-none"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <Moon
            size={16}
            className={`relative z-10 transition-colors ${
              isDarkActive
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          />
          <span className="flex-1 text-left relative z-10">Dark</span>
          <AnimatePresence>
            {isDarkActive && (
              <motion.span
                key="check-dark"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="shrink-0 relative z-10 flex items-center"
              >
                <Check size={16} className="text-purple-600 dark:text-purple-400" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Light */}
        <button
          type="button"
          onClick={handleSelectLight}
          className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${
            isLightActive
              ? 'text-purple-700 dark:text-white font-semibold'
              : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white'
          }`}
        >
          {isLightActive && (
            <motion.div
              layoutId="activeThemeSubmenuPill"
              className="absolute inset-0 rounded-xl bg-purple-500/20 border border-purple-500/30 shadow-sm pointer-events-none"
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            />
          )}
          <Sun
            size={16}
            className={`relative z-10 transition-colors ${
              isLightActive
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          />
          <span className="flex-1 text-left relative z-10">Light</span>
          <AnimatePresence>
            {isLightActive && (
              <motion.span
                key="check-light"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="shrink-0 relative z-10 flex items-center"
              >
                <Check size={16} className="text-purple-600 dark:text-purple-400" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Previous Theme */}
        {previousThemeSnapshot && (
          <>
            <div className="h-px bg-black/10 dark:bg-white/10 my-1" />
            <button
              type="button"
              onClick={handleRestorePrevious}
              className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${
                isPreviousActive
                  ? 'text-purple-700 dark:text-white font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white'
              }`}
            >
              {isPreviousActive && (
                <motion.div
                  layoutId="activeThemeSubmenuPill"
                  className="absolute inset-0 rounded-xl bg-purple-500/20 border border-purple-500/30 shadow-sm pointer-events-none"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <RotateCcw
                size={16}
                className={`relative z-10 transition-colors ${
                  isPreviousActive
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              />
              <div className="flex flex-col text-left min-w-0 flex-1 relative z-10">
                <span className="truncate text-xs font-semibold">Previous theme</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {previousThemeSnapshot.label}
                </span>
              </div>
              <AnimatePresence>
                {isPreviousActive && (
                  <motion.span
                    key="check-prev"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="shrink-0 relative z-10 flex items-center"
                  >
                    <Check size={16} className="text-purple-600 dark:text-purple-400" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </>
        )}
      </div>
    </HoverFlyout>
  );
}
