import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Loader2,
  Cake,
  Clock,
  UserCheck,
  Headphones,
  Gamepad2,
  Eye,
  Lock,
  Globe,
  Users,
} from 'lucide-react';
import { ShowcasePrivacy, type UpdateShowcaseDto } from '@backend/common/contracts';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useShowcase, useUpdateShowcase } from '@/entities/showcase/model/useShowcase';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

const ACCENT_COLORS = [
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Kyiv',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Dubai',
  'Asia/Singapore',
  'Australia/Sydney',
];

export const ProfileShowcaseSettingsSection: React.FC = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: showcase, isLoading } = useShowcase(currentUser?.username);
  const updateMutation = useUpdateShowcase();

  const [accentColor, setAccentColor] = useState('#6366f1');
  const [privacyMeta, setPrivacyMeta] = useState<ShowcasePrivacy>(ShowcasePrivacy.PUBLIC);
  const [privacyActivity, setPrivacyActivity] = useState<ShowcasePrivacy>(ShowcasePrivacy.PUBLIC);
  const [privacyShowcase, setPrivacyShowcase] = useState<ShowcasePrivacy>(ShowcasePrivacy.PUBLIC);
  const [privacyLinks, setPrivacyLinks] = useState<ShowcasePrivacy>(ShowcasePrivacy.PUBLIC);

  const [showAge, setShowAge] = useState(false);
  const [showBirthdate, setShowBirthdate] = useState(true);
  const [showGender, setShowGender] = useState(true);
  const [showTimezone, setShowTimezone] = useState(true);
  const [pronouns, setPronouns] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  const [previewMode, setPreviewMode] = useState<'owner' | 'guest'>('guest');

  useEffect(() => {
    if (showcase) {
      setAccentColor(showcase.accentColor || '#6366f1');
      setPrivacyMeta(showcase.privacyMeta || ShowcasePrivacy.PUBLIC);
      setPrivacyActivity(showcase.privacyActivity || ShowcasePrivacy.PUBLIC);
      setPrivacyShowcase(showcase.privacyShowcase || ShowcasePrivacy.PUBLIC);
      setPrivacyLinks(showcase.privacyLinks || ShowcasePrivacy.PUBLIC);
      setShowAge(showcase.showAge ?? false);
      setShowBirthdate(showcase.showBirthdate ?? true);
      setShowGender(showcase.showGender ?? true);
      setShowTimezone(showcase.showTimezone ?? true);
      setPronouns(showcase.pronouns || '');
      setTimezone(showcase.timezone || 'UTC');
    }
  }, [showcase]);

  const handleSave = async () => {
    const payload: UpdateShowcaseDto = {
      accentColor,
      privacyMeta,
      privacyActivity,
      privacyShowcase,
      privacyLinks,
      showAge,
      showBirthdate,
      showGender,
      showTimezone,
      pronouns: pronouns.trim() || null,
      timezone,
    };

    try {
      await updateMutation.mutateAsync(payload);
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Profile Showcase Saved',
        body: 'Your profile showcase preferences and privacy settings have been updated.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    } catch {
      useMessageToastStore.getState().addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Save Failed',
        body: 'Failed to update showcase settings. Please try again.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  // Live preview visibility calculations
  const isMetaVisibleInPreview = previewMode === 'owner' || privacyMeta !== ShowcasePrivacy.PRIVATE;
  const isActivityVisibleInPreview =
    previewMode === 'owner' || privacyActivity !== ShowcasePrivacy.PRIVATE;
  const isShowcaseVisibleInPreview =
    previewMode === 'owner' || privacyShowcase !== ShowcasePrivacy.PRIVATE;

  return (
    <div className="flex flex-col gap-6 text-white animate-fadeIn">
      {/* Section Header */}
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-400" />
          Profile Showcase & Widgets
        </h3>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Configure what dynamic widgets, personal meta, and media items appear on your profile
          sidebar.
        </p>
      </div>

      {/* Interactive Live Preview Card */}
      <div className="flex flex-col gap-2 p-4 rounded-3xl bg-white/[0.02] border border-white/[0.08] relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            <Eye size={14} className="text-cyan-400" />
            Live Preview Window
          </span>

          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setPreviewMode('guest')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                previewMode === 'guest'
                  ? 'bg-white/10 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Guest Visitor
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('owner')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                previewMode === 'owner'
                  ? 'bg-white/10 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Owner View
            </button>
          </div>
        </div>

        {/* Mini Preview Box */}
        <div
          className="relative mt-2 p-3.5 rounded-2xl bg-[#121215] border border-white/[0.08] flex flex-col gap-3 transition-all duration-300"
          style={{
            boxShadow: `0 0 30px -8px ${accentColor}50`,
          }}
        >
          {/* Top Glow */}
          <div
            className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30 pointer-events-none"
            style={{ backgroundColor: accentColor }}
          />

          {/* Personal Meta Preview */}
          {isMetaVisibleInPreview ? (
            <div className="flex flex-wrap gap-1.5">
              {showBirthdate && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] text-gray-200">
                  <Cake size={12} className="text-pink-400" />
                  <span>Aug 15 {showAge ? '(25 y.o.)' : ''}</span>
                </div>
              )}
              {showGender && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] text-cyan-300">
                  <UserCheck size={12} />
                  <span>{pronouns || currentUser?.gender || 'he/him'}</span>
                </div>
              )}
              {showTimezone && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] text-emerald-300">
                  <Clock size={12} />
                  <span>18:30 ({timezone})</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-gray-500 italic p-1">
              Personal meta is hidden for guests (Private).
            </div>
          )}

          {/* Live Activity Preview */}
          {isActivityVisibleInPreview && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#1DB954]">
                  <Headphones size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white leading-none">
                    Listening on Spotify
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5">Starboy • The Weeknd</span>
                </div>
              </div>
              <div className="flex items-end gap-0.5 h-3 px-1">
                <span className="w-0.5 h-3 bg-[#1DB954] rounded-full animate-pulse" />
                <span className="w-0.5 h-2 bg-[#1DB954] rounded-full animate-pulse" />
                <span className="w-0.5 h-2.5 bg-[#1DB954] rounded-full animate-pulse" />
              </div>
            </div>
          )}

          {/* Media Showcase Preview */}
          {isShowcaseVisibleInPreview && (
            <div className="flex items-center gap-1.5 pt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-14 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[9px] text-gray-400 font-bold"
                >
                  #{i}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accent Color Theme Picker */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-bold text-gray-300">Custom Accent Glow Color:</label>
        <div className="flex items-center gap-2.5">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setAccentColor(color)}
              className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer shadow-md"
              style={{
                backgroundColor: color,
                boxShadow: accentColor === color ? `0 0 14px ${color}` : 'none',
                border: accentColor === color ? '2px solid white' : 'none',
              }}
            >
              {accentColor === color && <Check size={14} className="text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* Meta Widget Controls */}
      <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Personal Meta Options:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <div>
              <span className="text-xs font-bold text-white block">Show Birthdate</span>
              <span className="text-[10px] text-gray-500">Day & month on profile</span>
            </div>
            <input
              type="checkbox"
              checked={showBirthdate}
              onChange={(e) => setShowBirthdate(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <div>
              <span className="text-xs font-bold text-white block">Show Age</span>
              <span className="text-[10px] text-gray-500">Calculates age in years</span>
            </div>
            <input
              type="checkbox"
              checked={showAge}
              onChange={(e) => setShowAge(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <div>
              <span className="text-xs font-bold text-white block">Show Gender / Pronouns</span>
              <span className="text-[10px] text-gray-500">Display gender badge</span>
            </div>
            <input
              type="checkbox"
              checked={showGender}
              onChange={(e) => setShowGender(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <div>
              <span className="text-xs font-bold text-white block">Show Local Clock</span>
              <span className="text-[10px] text-gray-500">Timezone ticking clock</span>
            </div>
            <input
              type="checkbox"
              checked={showTimezone}
              onChange={(e) => setShowTimezone(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-300">Custom Pronouns:</label>
            <input
              type="text"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="e.g. he/him, they/them"
              maxLength={20}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-300">Timezone Location:</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="bg-[#18181b] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-white outline-none cursor-pointer"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Granular Privacy Tiers */}
      <div className="flex flex-col gap-2.5 pt-4 border-t border-white/[0.06]">
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Granular Privacy Visibility:
        </span>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
          <div>
            <span className="text-xs font-bold text-white block">Personal Meta Visibility</span>
            <span className="text-[10px] text-gray-500">Birthday, age, pronouns & clock</span>
          </div>
          <select
            value={privacyMeta}
            onChange={(e) => setPrivacyMeta(e.target.value as ShowcasePrivacy)}
            className="bg-[#18181b] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
          >
            <option value={ShowcasePrivacy.PUBLIC}>Public (Everyone)</option>
            <option value={ShowcasePrivacy.FOLLOWERS}>Followers Only</option>
            <option value={ShowcasePrivacy.PRIVATE}>Only Me</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
          <div>
            <span className="text-xs font-bold text-white block">Live Activity & Presence</span>
            <span className="text-[10px] text-gray-500">Spotify & gaming rich status</span>
          </div>
          <select
            value={privacyActivity}
            onChange={(e) => setPrivacyActivity(e.target.value as ShowcasePrivacy)}
            className="bg-[#18181b] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
          >
            <option value={ShowcasePrivacy.PUBLIC}>Public (Everyone)</option>
            <option value={ShowcasePrivacy.FOLLOWERS}>Followers Only</option>
            <option value={ShowcasePrivacy.PRIVATE}>Only Me</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
          <div>
            <span className="text-xs font-bold text-white block">Showcase & Spotlight Grid</span>
            <span className="text-[10px] text-gray-500">Top 5 Games, Anime & Cinema</span>
          </div>
          <select
            value={privacyShowcase}
            onChange={(e) => setPrivacyShowcase(e.target.value as ShowcasePrivacy)}
            className="bg-[#18181b] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
          >
            <option value={ShowcasePrivacy.PUBLIC}>Public (Everyone)</option>
            <option value={ShowcasePrivacy.FOLLOWERS}>Followers Only</option>
            <option value={ShowcasePrivacy.PRIVATE}>Only Me</option>
          </select>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>Save Showcase Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
