import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Volume2, VolumeX, User, Users, Heart, Check, X } from 'lucide-react';
import {
  NotificationPosition,
  useNotificationSettingsStore,
} from '@/shared/model/useNotificationSettingsStore';
import { playPreviewNotificationSound } from '@/shared/lib/messageNotificationSound';
import ScreenLocationMonitor from './ScreenLocationMonitor';

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors duration-200 ${
      checked ? 'bg-white' : 'bg-[#333]'
    }`}
  >
    <div
      className={`w-4 h-4 rounded-full transition-transform duration-200 ${
        checked ? 'bg-black translate-x-5' : 'bg-gray-400 translate-x-0'
      }`}
    />
  </button>
);

export default function NotificationsTab() {
  const {
    enableNotifications,
    allowSound,
    volume,
    showName,
    showText,
    privateChats,
    groups,
    reactions,
    maxToasts,
    setEnableNotifications,
    setAllowSound,
    setVolume,
    setShowName,
    setShowText,
    setPrivateChats,
    setGroups,
    setReactions,
  } = useNotificationSettingsStore();

  const [hoveredCorner, setHoveredCorner] = useState<NotificationPosition | null>(null);
  const isDebouncingSoundRef = useRef<NodeJS.Timeout | null>(null);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);

    if (isDebouncingSoundRef.current) {
      clearTimeout(isDebouncingSoundRef.current);
    }
    isDebouncingSoundRef.current = setTimeout(() => {
      if (allowSound) {
        playPreviewNotificationSound(val);
      }
    }, 150);
  };

  const previewAvatar = showName ? (
    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-lg shadow-md">
      🐰
    </div>
  ) : (
    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-lg shadow-md tracking-wider">
      E
    </div>
  );

  const previewTitle = showName ? 'Cool Bunny' : 'Eternal';
  const previewBody = showName
    ? showText
      ? "It's morning in Tokyo 😎"
      : 'You have a new message'
    : 'You have a new message';

  return (
    <div className="animate-fadeIn flex flex-col gap-6 text-white pb-6">
      {/* Global Settings */}
      <section>
        <h3 className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Global settings
        </h3>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-200">
                <Bell size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Enable notifications</h4>
                <p className="text-xs text-gray-500">Receive push notifications on site</p>
              </div>
            </div>
            <Toggle
              checked={enableNotifications}
              onChange={() => setEnableNotifications(!enableNotifications)}
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-200">
                {allowSound ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Audio signals</h4>
                <p className="text-xs text-gray-500">Play sound notifications</p>
              </div>
            </div>
            <Toggle checked={allowSound} onChange={() => setAllowSound(!allowSound)} />
          </div>
        </div>
      </section>

      {/* Volume Control */}
      <section>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Volume
          </h3>
          <span className="text-xs font-semibold text-sky-400">{volume}%</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              const nextAllow = !allowSound;
              setAllowSound(nextAllow);
              if (nextAllow) playPreviewNotificationSound(volume);
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {volume === 0 || !allowSound ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            disabled={!allowSound}
            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer transition-opacity ${
              allowSound ? 'accent-white bg-white/20' : 'bg-white/10 opacity-40 cursor-not-allowed'
            }`}
          />
        </div>
      </section>

      {/* Live Preview Card */}
      <section>
        <h3 className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Push Message Preview
        </h3>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md shadow-2xl">
          {/* Toast Card Mock */}
          <div className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-[#171b22]/95 px-4 py-3 shadow-lg">
            <div className="flex-shrink-0">{previewAvatar}</div>
            <div className="min-w-0 flex-1 pr-6 relative">
              <p className="truncate text-sm font-semibold text-white">{previewTitle}</p>
              <p className="truncate text-[13px] leading-5 text-gray-300">{previewBody}</p>
            </div>
            <span className="text-gray-500 hover:text-white transition-colors cursor-pointer">
              <X size={15} />
            </span>
          </div>

          {/* Interactive Checkboxes (Pills) */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => setShowName(!showName)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                showName
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  showName ? 'bg-black border-black text-white' : 'border-gray-500'
                }`}
              >
                {showName && <Check size={10} strokeWidth={3} />}
              </span>
              <span>Name</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!showName) {
                  setShowName(true);
                  setShowText(true);
                } else {
                  setShowText(!showText);
                }
              }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                showText
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  showText ? 'bg-black border-black text-white' : 'border-gray-500'
                }`}
              >
                {showText && <Check size={10} strokeWidth={3} />}
              </span>
              <span>Text</span>
            </button>
          </div>
        </div>
      </section>

      {/* Notifications for Chats */}
      <section>
        <h3 className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Notifications for chats
        </h3>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-200">
                <User size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Private chats</h4>
                <p className="text-xs text-gray-500">Direct 1-on-1 messages</p>
              </div>
            </div>
            <Toggle checked={privateChats} onChange={() => setPrivateChats(!privateChats)} />
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-200">
                <Users size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Groups</h4>
                <p className="text-xs text-gray-500">Group chat messages</p>
              </div>
            </div>
            <Toggle checked={groups} onChange={() => setGroups(!groups)} />
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-200">
                <Heart size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Reactions</h4>
                <p className="text-xs text-gray-500">Reactions to your messages</p>
              </div>
            </div>
            <Toggle checked={reactions} onChange={() => setReactions(!reactions)} />
          </div>
        </div>
      </section>

      {/* Screen Location & Toast Count */}
      <ScreenLocationMonitor hoveredCorner={hoveredCorner} onHoverCorner={setHoveredCorner} />

      {/* Floating Screen Corner Live Hover Preview Portal */}
      {hoveredCorner &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`fixed z-[400] flex flex-col gap-2 w-[min(380px,calc(100vw-2.5rem))] pointer-events-none transition-all duration-300 animate-fadeIn ${
              hoveredCorner === 'top-left'
                ? 'top-5 left-5'
                : hoveredCorner === 'top-right'
                  ? 'top-5 right-5'
                  : hoveredCorner === 'bottom-left'
                    ? 'bottom-5 left-5 flex-col-reverse'
                    : 'bottom-5 right-5 flex-col-reverse'
            }`}
          >
            {Array.from({ length: maxToasts }).map((_, index) => (
              <div
                key={index}
                className="relative flex min-h-[76px] items-center gap-3 rounded-[22px] border border-white/10 bg-[#171b22]/95 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-300"
              >
                <div className="flex-shrink-0">{previewAvatar}</div>
                <div className="min-w-0 flex-1 pr-6">
                  <p className="truncate text-sm font-semibold text-white">{previewTitle}</p>
                  <p className="truncate text-[13px] leading-5 text-gray-300">
                    {showName
                      ? showText
                        ? index === 0
                          ? "It's morning in Tokyo 😎"
                          : 'This is a sample notification'
                        : 'You have a new message'
                      : 'You have a new message'}
                  </p>
                </div>
                <div className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={14} />
                </div>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
