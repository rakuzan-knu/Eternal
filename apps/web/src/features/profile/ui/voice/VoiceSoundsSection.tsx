import React, { useState } from 'react';
import { Bell, ChevronDown, ChevronRight, Volume2 } from 'lucide-react';
import {
  DISCORD_SOUND_ITEMS,
  DiscordSoundItem,
  formatRussianSoundCount,
  playSingleSound,
} from '@/features/chat/lib/soundEffectsEngine';
import { useSoundSettingsStore } from '@/features/chat/model/useSoundSettingsStore';
import { useThemeStore } from '@/shared/model/useThemeStore';

interface VoiceSoundsSectionProps {
  onNavigateToNotifications?: () => void;
}

export const VoiceSoundsSection: React.FC<VoiceSoundsSectionProps> = ({
  onNavigateToNotifications,
}) => {
  const accentColor = useThemeStore((s) => s.accentColor) || '#5865F2';
  const { soundToggles, isSoundListExpanded, setSoundToggle, toggleSoundListExpanded } =
    useSoundSettingsStore();

  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);

  const handlePlayPreview = (soundId: string) => {
    setPlayingSoundId(soundId);
    playSingleSound(soundId, () => {
      setPlayingSoundId((prev) => (prev === soundId ? null : prev));
    });
  };

  const initialSounds = DISCORD_SOUND_ITEMS.slice(0, 4);
  const hiddenSounds = DISCORD_SOUND_ITEMS.slice(4);
  const hiddenCount = hiddenSounds.length;

  const renderSoundRow = (item: DiscordSoundItem) => {
    const isChecked = soundToggles[item.id] ?? true;
    const isPlaying = playingSoundId === item.id;

    return (
      <div
        key={item.id}
        className="flex items-center justify-between py-3 border-b border-black/[0.06] dark:border-white/[0.06] transition-colors"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-gray-950 dark:text-white">{item.name}</span>
          <button
            type="button"
            onClick={() => handlePlayPreview(item.id)}
            className="text-xs font-normal text-[#00a8fc] hover:underline cursor-pointer flex items-center gap-1 w-fit transition-opacity active:opacity-75"
          >
            {isPlaying && (
              <span className="inline-block animate-pulse">
                <Volume2 size={13} className="text-[#00a8fc]" />
              </span>
            )}
            <span>{isPlaying ? 'Playing...' : 'Play sound'}</span>
          </button>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setSoundToggle(item.id, e.target.checked)}
            className="sr-only peer"
          />
          <div
            style={{
              backgroundColor: isChecked ? accentColor : undefined,
            }}
            className={`w-11 h-6 rounded-full transition-colors duration-200 ${
              isChecked ? '' : 'bg-black/15 dark:bg-zinc-700'
            } relative`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 shadow-sm ${
                isChecked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>
    );
  };

  return (
    <section
      id="sec-sounds"
      className="flex flex-col gap-4 pt-6 border-t border-black/10 dark:border-white/[0.06]"
    >
      <div>
        <h3 className="text-xl font-bold text-gray-950 dark:text-white">Sounds</h3>
      </div>

      {/* Top 4 sounds (always visible) */}
      <div className="flex flex-col">{initialSounds.map(renderSoundRow)}</div>

      {/* Collapser button */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
        <button
          type="button"
          onClick={toggleSoundListExpanded}
          className="w-full flex items-center justify-between py-2 text-left group cursor-pointer transition-colors"
        >
          <div className="pr-4 min-w-0">
            <span className="text-sm font-semibold text-gray-950 dark:text-white block">
              {isSoundListExpanded
                ? `Hide ${formatRussianSoundCount(hiddenCount)}`
                : `Show ${formatRussianSoundCount(hiddenCount)} more`}
            </span>
            {!isSoundListExpanded && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate leading-relaxed">
                Camera On, Camera Off, Voice Disconnected and other sound settings.
              </p>
            )}
          </div>

          <div className="w-8 h-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors shrink-0">
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${
                isSoundListExpanded ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </div>
        </button>
      </div>

      {/* Expanded list of 18 remaining sounds */}
      {isSoundListExpanded && (
        <div className="flex flex-col animate-fadeIn">{hiddenSounds.map(renderSoundRow)}</div>
      )}

      {/* Related Settings */}
      <div className="pt-3 flex flex-col gap-3">
        <h4 className="text-xs uppercase font-bold tracking-wide text-gray-500 dark:text-gray-400">
          Related Settings
        </h4>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            onNavigateToNotifications?.();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateToNotifications?.();
            }
          }}
          className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] border border-black/10 dark:border-white/[0.08] transition-all duration-150 flex items-center justify-between cursor-pointer group active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-3">
            <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-900 dark:text-white shrink-0 group-hover:scale-105 transition-transform">
              <Bell size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-950 dark:text-white">
                Notifications
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                Enable or disable sounds for new messages and incoming calls.
              </p>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <ChevronRight
              size={18}
              className="text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 group-hover:translate-x-0.5 transition-all"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
