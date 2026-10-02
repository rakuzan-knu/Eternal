import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Film,
  Trash2,
  Sliders,
  Sparkles,
  Info,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import {
  useThemeStore,
  WallpaperConfig,
  rehydrateWallpaperBlob,
} from '@/shared/model/useThemeStore';
import { idbSet, idbDelete } from '@/shared/lib/indexedDbStorage';
import { playToggleSound, playPresetSelectSound } from '@/shared/lib/themeSoundFx';
import { detectMediaLuminance } from '@/shared/lib/themeContrastEngine';
import { triggerCircularRippleTransition } from '@/features/chat/lib/themeRippleTransition';

const IDB_WALLPAPER_KEY = 'app_custom_wallpaper_blob';

export function WallpaperThemesSection() {
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const themeMode = useThemeStore((s) => s.themeMode);
  const soundFxEnabled = useThemeStore((s) => s.soundFxEnabled);
  const setWallpaper = useThemeStore((s) => s.setWallpaper);
  const activateWallpaper = useThemeStore((s) => s.activateWallpaper);
  const updateWallpaperSettings = useThemeStore((s) => s.updateWallpaperSettings);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const rehydrateAttemptsRef = useRef(0);

  const handleThumbnailError = () => {
    if (rehydrateAttemptsRef.current < 2) {
      rehydrateAttemptsRef.current += 1;
      void rehydrateWallpaperBlob();
    }
  };

  const isWallpaperActive = themeMode === 'wallpaper' && Boolean(wallpaper?.url);

  const handleActivateWallpaper = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (soundFxEnabled) playPresetSelectSound();
    triggerCircularRippleTransition({ x: e.clientX, y: e.clientY }, () => {
      activateWallpaper();
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      if (soundFxEnabled) playToggleSound();

      const isVideo = file.type.startsWith('video/');
      const isGif = file.type === 'image/gif';
      const isAnimated = isVideo || isGif;
      const mediaType: 'image' | 'gif' | 'video' = isVideo ? 'video' : isGif ? 'gif' : 'image';

      // Auto-detect contrast luminance of the uploaded media
      const detectedThemeMode = await detectMediaLuminance(file);

      // Save blob to IndexedDB to survive restarts without hitting localStorage 5MB quota
      await idbSet(IDB_WALLPAPER_KEY, file);

      // Create new blob object URL
      const objectUrl = URL.createObjectURL(file);

      const newWallpaper: WallpaperConfig = {
        id: `wall-${Date.now()}`,
        name: file.name,
        url: objectUrl,
        dimming: wallpaper?.dimming ?? 0.7,
        blur: isAnimated ? 0 : (wallpaper?.blur ?? 0),
        isAnimated,
        mediaType,
        themeMode: detectedThemeMode,
      };

      if (soundFxEnabled) playPresetSelectSound();

      // Trigger buttery 60 FPS circular ripple wave as soon as file explorer closes
      const origin = {
        x: typeof window !== 'undefined' ? Math.round(window.innerWidth / 2) : 0,
        y: typeof window !== 'undefined' ? Math.round(window.innerHeight / 2) : 0,
      };

      triggerCircularRippleTransition(origin, () => {
        setWallpaper(newWallpaper);
        activateWallpaper();
      });
    } catch (err) {
      console.error('Failed to save wallpaper to IndexedDB:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveWallpaper = async () => {
    if (soundFxEnabled) playToggleSound();
    try {
      await idbDelete(IDB_WALLPAPER_KEY);
    } catch {
      // Ignore
    }
    setWallpaper(null);
  };

  const handleDimmingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWallpaperSettings({ dimming: parseFloat(e.target.value) });
  };

  const handleBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateWallpaperSettings({ blur: parseInt(e.target.value, 10) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 flex items-center gap-2">
            <Film size={16} className="text-cyan-500 dark:text-cyan-400" />
            Background Wallpapers & Animated GIF / Video
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Set a custom image, animated WebP/GIF, or looped video background
          </p>
        </div>

        {wallpaper && (
          <div className="flex items-center gap-2">
            {!isWallpaperActive ? (
              <button
                type="button"
                onClick={handleActivateWallpaper}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.02] active:scale-95"
              >
                <Check size={14} strokeWidth={2.5} />
                <span>Use this wallpaper</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-500 dark:text-cyan-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Active wallpaper</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleRemoveWallpaper}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 text-xs font-medium border border-red-500/20 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Remove wallpaper</span>
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Box or Active Wallpaper Preview */}
      {!wallpaper ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-white/15 hover:border-cyan-500 dark:hover:border-cyan-400/50 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white cursor-pointer group outline-none"
        >
          <div className="w-12 h-12 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload size={20} className="text-cyan-500 dark:text-cyan-400" />
          </div>
          <div className="flex flex-col items-center text-center px-4">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {isUploading ? 'Uploading media...' : 'Click to select a background file'}
            </span>
            <span className="text-[11px] text-gray-500 mt-0.5">
              Supports PNG, JPG, WebP, animated GIF, and MP4 video
            </span>
          </div>
        </button>
      ) : (
        <div className="p-4 bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {/* Interactive Thumbnail */}
            <div
              onClick={!isWallpaperActive ? handleActivateWallpaper : undefined}
              role={!isWallpaperActive ? 'button' : undefined}
              tabIndex={!isWallpaperActive ? 0 : undefined}
              title={!isWallpaperActive ? 'Click to activate this background' : 'Active wallpaper'}
              className={`w-28 h-18 rounded-xl overflow-hidden bg-black relative shrink-0 transition-all duration-200 ${
                isWallpaperActive
                  ? 'ring-2 ring-cyan-500 dark:ring-cyan-400 shadow-lg shadow-cyan-500/25 border border-cyan-400/50'
                  : 'border border-black/15 dark:border-white/20 hover:border-cyan-500 hover:ring-2 hover:ring-cyan-400/50 cursor-pointer group/thumb'
              }`}
            >
              {wallpaper.mediaType === 'video' ? (
                <video
                  src={wallpaper.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={handleThumbnailError}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={wallpaper.url}
                  alt={wallpaper.name}
                  onError={handleThumbnailError}
                  className="w-full h-full object-cover"
                />
              )}
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono uppercase text-white font-bold backdrop-blur-sm z-10">
                {wallpaper.mediaType}
              </span>
              {!isWallpaperActive && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-cyan-300 text-[11px] font-bold transition-opacity backdrop-blur-[1px] gap-1 z-20">
                  <Check size={14} strokeWidth={2.5} />
                  <span>Activate</span>
                </div>
              )}
            </div>

            {/* Info & Replace Button */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {wallpaper.name}
                </span>
                {isWallpaperActive && (
                  <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/15 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {wallpaper.isAnimated
                  ? 'Animated background (blur disabled for 60 FPS)'
                  : 'Static image background'}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium text-left mt-0.5 cursor-pointer hover:underline"
              >
                Replace file...
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-black/10 dark:border-white/[0.06]">
            {/* Dimming Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  Background Dimming
                </span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono font-semibold">
                  {Math.round(wallpaper.dimming * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.05"
                value={wallpaper.dimming}
                onChange={handleDimmingChange}
                className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 dark:accent-cyan-400"
              />
              <span className="text-[10px] text-gray-500">
                Ensures sharp text contrast and interface readability
              </span>
            </div>

            {/* Blur Slider (enabled only for static images) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-medium ${
                    wallpaper.isAnimated
                      ? 'text-gray-400 dark:text-gray-600'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Background Blur
                </span>
                <span
                  className={`font-mono font-semibold ${
                    wallpaper.isAnimated
                      ? 'text-gray-400 dark:text-gray-600'
                      : 'text-cyan-600 dark:text-cyan-400'
                  }`}
                >
                  {wallpaper.isAnimated ? 'Off' : `${wallpaper.blur}px`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                disabled={wallpaper.isAnimated}
                value={wallpaper.blur}
                onChange={handleBlurChange}
                className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 dark:accent-cyan-400 disabled:opacity-40"
              />
              <span className="text-[10px] text-amber-500/90 dark:text-amber-400/90">
                {wallpaper.isAnimated
                  ? 'Disabled for animated GIF/video to maintain 60 FPS'
                  : 'Softly blurs complex backgrounds to focus on content'}
              </span>
            </div>

            {/* Solid Substrate Contrast Selector (when Glass opacity -> 0%) */}
            <div className="flex flex-col gap-2 pt-3 border-t border-black/10 dark:border-white/[0.06] sm:col-span-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1.5">
                  <Sliders size={13} className="text-cyan-500 dark:text-cyan-400" />
                  Base Panel Tone at 0% Glass Opacity
                </span>
                <span className="text-[11px] text-cyan-600 dark:text-cyan-400/90 font-mono font-semibold">
                  {wallpaper.themeMode === 'light' ? 'Light (#f8fafc)' : 'Dark (#121216)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (soundFxEnabled) playToggleSound();
                    updateWallpaperSettings({ themeMode: 'dark' });
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    wallpaper.themeMode !== 'light'
                      ? 'bg-black/10 dark:bg-white/15 border-cyan-500 dark:border-cyan-400/80 text-gray-900 dark:text-white shadow-sm'
                      : 'bg-black/[0.03] dark:bg-white/[0.03] border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Moon
                    size={13}
                    className={
                      wallpaper.themeMode !== 'light' ? 'text-cyan-500 dark:text-cyan-400' : ''
                    }
                  />
                  <span>Dark (Black)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (soundFxEnabled) playToggleSound();
                    updateWallpaperSettings({ themeMode: 'light' });
                  }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    wallpaper.themeMode === 'light'
                      ? 'bg-black/10 dark:bg-white/15 border-cyan-500 dark:border-cyan-400/80 text-gray-900 dark:text-white shadow-sm'
                      : 'bg-black/[0.03] dark:bg-white/[0.03] border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Sun
                    size={13}
                    className={
                      wallpaper.themeMode === 'light' ? 'text-amber-500 dark:text-amber-400' : ''
                    }
                  />
                  <span>Light (White)</span>
                </button>
              </div>
              <span className="text-[10px] text-gray-500">
                Automatically detected from media luminance. Used when glass opacity is set to 0%.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
