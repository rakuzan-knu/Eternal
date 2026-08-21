import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Volume2,
  VolumeX,
  User,
  Users,
  Heart,
  Check,
  X,
  MessageSquare,
  Repeat,
  UserPlus,
  AtSign,
  Award,
  Moon,
  BellOff,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';
import {
  NotificationPosition,
  useNotificationSettingsStore,
} from '@/shared/model/useNotificationSettingsStore';
import { playPreviewNotificationSound } from '@/shared/lib/messageNotificationSound';
import { requestPushNotificationPermission } from '@/shared/lib/browserPushNotifications';
import { fetchNotificationSettings } from '@/entities/notification/api/notificationApi';
import Avatar from '@/shared/ui/Avatar';
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
    likes,
    comments,
    reposts,
    followers,
    mentions,
    system,
    dndUntil,
    mutedActors,
    mutedActorIds,
    maxToasts,
    setEnableNotifications,
    setAllowSound,
    setVolume,
    setShowName,
    setShowText,
    setPrivateChats,
    setGroups,
    setReactions,
    setLikes,
    setComments,
    setReposts,
    setFollowers,
    setMentions,
    setSystem,
    setDoNotDisturb,
    unmuteAuthor,
    setAllSettings,
  } = useNotificationSettingsStore();

  const [hoveredCorner, setHoveredCorner] = useState<NotificationPosition | null>(null);
  const [isMutedAccordionOpen, setIsMutedAccordionOpen] = useState(false);
  const isDebouncingSoundRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchNotificationSettings()
      .then((data) => {
        if (data && typeof data === 'object') {
          setAllSettings(data);
        }
      })
      .catch(() => {});
  }, [setAllSettings]);

  const handleToggleEnableNotifications = async () => {
    const nextVal = !enableNotifications;
    setEnableNotifications(nextVal);
    if (nextVal) {
      await requestPushNotificationPermission();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);

    if (!allowSound) return;

    if (isDebouncingSoundRef.current) {
      clearTimeout(isDebouncingSoundRef.current);
    }
    isDebouncingSoundRef.current = setTimeout(() => {
      playPreviewNotificationSound(val);
    }, 150);
  };

  const isDndActive = Boolean(dndUntil && new Date(dndUntil).getTime() > Date.now());
  const formatDndTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const previewAvatar = (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 font-semibold text-white shadow-md">
      CB
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
      {/* Do Not Disturb (Quick Pause) */}
      <section>
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Do Not Disturb (Snooze)
          </h3>
          {isDndActive && (
            <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
              <Moon size={12} />
              <span>Paused until {formatDndTime(dndUntil!)}</span>
            </span>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors ${
                  isDndActive
                    ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                    : 'bg-white/5 border-white/10 text-gray-400'
                }`}
              >
                <Moon size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Quick pause alerts</h4>
                <p className="text-xs text-gray-500">
                  {isDndActive
                    ? `Muted until ${formatDndTime(dndUntil!)}. All sounds and toasts paused.`
                    : 'Temporarily silence all push notifications and sound alerts'}
                </p>
              </div>
            </div>

            {isDndActive && (
              <button
                type="button"
                onClick={() => setDoNotDisturb('off')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)]"
              >
                <Play size={12} fill="currentColor" />
                <span>Resume</span>
              </button>
            )}
          </div>

          {/* DND Presets */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { key: 'off', label: 'Off' },
              { key: '1h', label: '1 hour' },
              { key: '8h', label: '8 hours' },
              { key: 'tomorrow', label: 'Tomorrow' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setDoNotDisturb(key as any)}
                className={`py-2 px-2 text-center rounded-xl text-xs font-medium border transition-all duration-200 ${
                  key === 'off' && !isDndActive
                    ? 'bg-white/10 text-white border-white/20 shadow-sm'
                    : key !== 'off' && isDndActive
                      ? 'bg-purple-600/20 text-purple-200 border-purple-500/30 hover:bg-purple-600/30'
                      : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

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
            <Toggle checked={enableNotifications} onChange={handleToggleEnableNotifications} />
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

      {/* Notifications for Posts & Activity */}
      <section>
        <h3 className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Activity notifications
        </h3>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-rose-400">
                <Heart size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Likes</h4>
                <p className="text-xs text-gray-500">When someone likes your posts</p>
              </div>
            </div>
            <Toggle checked={likes} onChange={() => setLikes(!likes)} />
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-sky-400">
                <MessageSquare size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Comments</h4>
                <p className="text-xs text-gray-500">When someone comments on your posts</p>
              </div>
            </div>
            <Toggle checked={comments} onChange={() => setComments(!comments)} />
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-emerald-400">
                <Repeat size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Reposts</h4>
                <p className="text-xs text-gray-500">When someone reposts your publications</p>
              </div>
            </div>
            <Toggle checked={reposts} onChange={() => setReposts(!reposts)} />
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-amber-400">
                <UserPlus size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Followers</h4>
                <p className="text-xs text-gray-500">
                  When someone subscribes or sends a follow request
                </p>
              </div>
            </div>
            <Toggle checked={followers} onChange={() => setFollowers(!followers)} />
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-purple-400">
                <AtSign size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">Mentions</h4>
                <p className="text-xs text-gray-500">
                  When someone mentions you in a post or comment
                </p>
              </div>
            </div>
            <Toggle checked={mentions} onChange={() => setMentions(!mentions)} />
          </div>

          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-amber-400">
                <Award size={17} />
              </span>
              <div>
                <h4 className="text-sm font-medium text-gray-200">System & Verified</h4>
                <p className="text-xs text-gray-500">
                  Verification badges, milestones, and system updates
                </p>
              </div>
            </div>
            <Toggle checked={system} onChange={() => setSystem(!system)} />
          </div>
        </div>
      </section>

      {/* Muted Accounts Accordion */}
      <section>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <button
            type="button"
            onClick={() => setIsMutedAccordionOpen(!isMutedAccordionOpen)}
            className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-purple-400">
                <BellOff size={17} />
              </span>
              <div className="text-left">
                <h4 className="text-sm font-medium text-gray-200 flex items-center gap-2">
                  <span>Muted Accounts</span>
                  {mutedActorIds.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-600/30 text-purple-200 border border-purple-500/40">
                      {mutedActorIds.length}
                    </span>
                  )}
                </h4>
                <p className="text-xs text-gray-500">
                  Manage accounts whose notifications you muted
                </p>
              </div>
            </div>
            <div className="text-gray-400">
              {isMutedAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {isMutedAccordionOpen && (
            <div className="border-t border-white/5 p-4 divide-y divide-white/5">
              {mutedActors.length === 0 && mutedActorIds.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-500">
                  No muted accounts. When you mute notifications from an author, they will appear
                  here.
                </div>
              ) : (
                (mutedActors.length > 0
                  ? mutedActors
                  : mutedActorIds.map((id) => ({
                      id,
                      username: id,
                      displayName: null as string | null,
                      avatar: null as string | null,
                    }))
                ).map((actor) => (
                  <div
                    key={actor.id}
                    className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        size="sm"
                        src={actor.avatar}
                        name={actor.displayName || actor.username}
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {actor.displayName || actor.username}
                        </p>
                        <p className="text-[11px] text-gray-400">@{actor.username}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => unmuteAuthor(actor.id)}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors"
                    >
                      Unmute
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
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
