import React from 'react';
import { MessageSquare, Home, Bell, Check, Sparkles } from 'lucide-react';
import { useThemeStore, SOLID_THEME_COLORS, GRADIENT_PRESETS } from '@/shared/model/useThemeStore';

export function ThemeLivePreviewCard() {
  const themeMode = useThemeStore((s) => s.themeMode);
  const solidTheme = useThemeStore((s) => s.solidTheme);
  const customSolidColor = useThemeStore((s) => s.customSolidColor);
  const accentColor = useThemeStore((s) => s.accentColor);
  const textOnAccent = useThemeStore((s) => s.textOnAccent);
  const gradientPresetId = useThemeStore((s) => s.gradientPresetId);
  const customGradient = useThemeStore((s) => s.customGradient);
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const glassmorphismOpacity = useThemeStore((s) => s.glassmorphismOpacity);

  // Determine preview background
  let previewBg = SOLID_THEME_COLORS[solidTheme] || '#070709';
  if (solidTheme === 'custom' && customSolidColor) {
    previewBg = customSolidColor;
  }
  if (themeMode === 'gradient') {
    if (gradientPresetId === 'custom') {
      previewBg = `linear-gradient(${customGradient.angle}deg, ${customGradient.from}, ${customGradient.to})`;
    } else {
      const preset = GRADIENT_PRESETS.find((p) => p.id === gradientPresetId);
      if (preset) previewBg = preset.gradient;
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase tracking-wider">
          Theme Preview
        </span>
      </div>

      <div
        className="w-full h-44 rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden relative shadow-2xl flex select-none transition-all duration-300"
        style={{ background: previewBg }}
      >
        {/* Optional Wallpaper Background in Preview */}
        {themeMode === 'wallpaper' && wallpaper?.url && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {wallpaper.mediaType === 'video' ? (
              <video
                src={wallpaper.url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{
                  filter: wallpaper.blur ? `blur(${wallpaper.blur}px)` : undefined,
                }}
              />
            ) : (
              <img
                src={wallpaper.url}
                alt="Wallpaper Preview"
                className="w-full h-full object-cover"
                style={{
                  filter: wallpaper.blur ? `blur(${wallpaper.blur}px)` : undefined,
                }}
              />
            )}
            <div className="absolute inset-0 bg-black" style={{ opacity: wallpaper.dimming }} />
          </div>
        )}

        {/* Mini Mock Interface */}
        <div className="w-full h-full flex relative z-10 p-3 gap-3">
          {/* Mini Sidebar */}
          <div
            className="w-14 rounded-xl border border-white/10 flex flex-col items-center py-2.5 gap-3 shrink-0"
            style={{
              backgroundColor: `rgba(22, 23, 29, ${glassmorphismOpacity})`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm"
              style={{
                backgroundColor: accentColor,
                color: textOnAccent,
              }}
            >
              E
            </div>
            <div className="flex flex-col gap-2 text-gray-400">
              <div
                className="p-1.5 rounded-lg text-white"
                style={{ backgroundColor: `${accentColor}33` }}
              >
                <Home size={12} style={{ color: accentColor }} />
              </div>
              <div className="p-1.5 rounded-lg hover:text-white">
                <MessageSquare size={12} />
              </div>
              <div className="p-1.5 rounded-lg hover:text-white">
                <Bell size={12} />
              </div>
            </div>
          </div>

          {/* Mini Main Content / Chat Mock */}
          <div
            className="flex-1 rounded-xl border border-white/10 flex flex-col justify-between p-3"
            style={{
              backgroundColor: `rgba(18, 19, 24, ${glassmorphismOpacity})`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500" />
                <span className="text-xs font-semibold text-white">#general-chat</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-medium">Online</span>
              </div>
            </div>

            {/* Chat Messages Mock */}
            <div className="flex flex-col gap-2 my-auto">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-white/20 shrink-0" />
                <div className="bg-white/10 rounded-xl px-2.5 py-1 text-[11px] text-gray-200">
                  Hey! How do you like the new interface theme?
                </div>
              </div>

              <div className="flex items-end justify-end gap-1.5">
                <div
                  className="rounded-xl px-2.5 py-1 text-[11px] font-medium shadow-md"
                  style={{
                    backgroundColor: accentColor,
                    color: textOnAccent,
                  }}
                >
                  Looks amazing! 🔥
                </div>
              </div>
            </div>

            {/* Mini Input Box */}
            <div className="h-6 rounded-lg bg-white/[0.06] border border-white/10 px-2 flex items-center text-[10px] text-gray-400">
              Send a message...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
