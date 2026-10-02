import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Check,
  Loader2,
  Headphones,
  Eye,
  Flame,
  Globe,
  Users,
  Lock,
  ChevronDown,
  Pipette,
  Gamepad2,
  Tv,
  Film,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShowcasePrivacy, type UpdateShowcaseDto } from '@backend/common/contracts';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useShowcase, useUpdateShowcase } from '@/entities/showcase/model/useShowcase';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

export const ACCENT_COLORS = [
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

interface PrivacyOption {
  value: ShowcasePrivacy;
  label: string;
  icon: React.ElementType;
  iconColor: string;
}

export const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: ShowcasePrivacy.PUBLIC,
    label: 'Public (Everyone)',
    icon: Globe,
    iconColor: 'text-blue-400',
  },
  {
    value: ShowcasePrivacy.FOLLOWERS,
    label: 'Followers Only',
    icon: Users,
    iconColor: 'text-emerald-400',
  },
  {
    value: ShowcasePrivacy.PRIVATE,
    label: 'Only Me',
    icon: Lock,
    iconColor: 'text-rose-400',
  },
];

interface CustomPrivacySelectProps {
  value: ShowcasePrivacy;
  onChange: (val: ShowcasePrivacy) => void;
  id?: string;
}

export const CustomPrivacySelect: React.FC<CustomPrivacySelectProps> = ({
  value,
  onChange,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = PRIVACY_OPTIONS.find((opt) => opt.value === value) || PRIVACY_OPTIONS[0];
  const SelectedIcon = selectedOption.icon;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left" id={id}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all text-xs font-semibold text-white cursor-pointer shadow-xs active:scale-[0.98]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <SelectedIcon size={13} className={selectedOption.iconColor} />
        <span>{selectedOption.label}</span>
        <ChevronDown
          size={13}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-1.5 z-50 min-w-[170px] rounded-2xl bg-[#151518]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-1.5 flex flex-col gap-0.5"
            role="listbox"
          >
            {PRIVACY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 text-white font-semibold shadow-xs'
                      : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={13} className={opt.iconColor} />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check size={13} className="text-white shrink-0 ml-2" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ProfileShowcaseSettingsSection: React.FC = () => {
  const { data: currentUser } = useCurrentUser();
  const { data: showcase, isLoading } = useShowcase(currentUser?.username);
  const updateMutation = useUpdateShowcase();

  const [accentColor, setAccentColor] = useState('#6366f1');
  const [privacyMeta, setPrivacyMeta] = useState<ShowcasePrivacy>(ShowcasePrivacy.PUBLIC);
  const [privacyActivity, setPrivacyActivity] = useState<ShowcasePrivacy>(ShowcasePrivacy.PUBLIC);
  const [privacyShowcase, setPrivacyShowcase] = useState<ShowcasePrivacy>(ShowcasePrivacy.PUBLIC);
  const [privacyLinks, setPrivacyLinks] = useState<ShowcasePrivacy>(ShowcasePrivacy.PUBLIC);

  // Preserved personal info state loaded from backend
  const [showAge, setShowAge] = useState(false);
  const [showBirthdate, setShowBirthdate] = useState(true);
  const [showGender, setShowGender] = useState(true);
  const [showTimezone, setShowTimezone] = useState(true);
  const [pronouns, setPronouns] = useState('');
  const [timezone, setTimezone] = useState('UTC');

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

  const isCustomColor = !ACCENT_COLORS.some((c) => c.toLowerCase() === accentColor.toLowerCase());

  return (
    <div className="flex flex-col gap-6 text-white animate-fadeIn">
      {/* Section Header */}
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-400" />
          Profile Showcase & Widgets
        </h3>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Configure dynamic widgets, accent glow styling, and granular visibility tiers on your
          profile.
        </p>
      </div>

      {/* Interactive Live Preview Card */}
      <div className="flex flex-col gap-2 p-4 rounded-3xl bg-white/[0.02] border border-white/8 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            <Eye size={14} className="text-cyan-400" />
            Live Preview Window
          </span>
        </div>

        {/* Mini Preview Box representing actual widgets */}
        <div
          className="relative mt-2 p-3.5 rounded-2xl bg-[#121215] border border-white/8 flex flex-col gap-3 transition-all duration-300"
          style={{
            boxShadow: `0 0 32px -8px ${accentColor}50`,
          }}
        >
          {/* Top Ambient Glow */}
          <div
            className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-35 pointer-events-none transition-colors duration-300"
            style={{ backgroundColor: accentColor }}
          />

          {/* 1. Miniature Music / Audio Status Card */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/8">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: `${accentColor}18`,
                  borderColor: `${accentColor}35`,
                  color: accentColor,
                }}
              >
                <Headphones size={15} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-white leading-none truncate">
                  Listening to music
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 truncate">
                  Starboy • The Weeknd
                </span>
              </div>
            </div>

            {/* Animated Equalizer Wave */}
            <div className="flex items-end gap-1 h-3.5 px-1 shrink-0">
              <span
                className="w-0.5 h-3.5 rounded-full animate-pulse"
                style={{ backgroundColor: accentColor }}
              />
              <span
                className="w-0.5 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: accentColor, animationDelay: '150ms' }}
              />
              <span
                className="w-0.5 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: accentColor, animationDelay: '300ms' }}
              />
            </div>
          </div>

          {/* 2. Miniature Favorite Widget Card */}
          <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/8 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Flame size={11} /> Favorite
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/20">
                ★ 9.7
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white leading-tight">ELDEN RING</span>
                <span className="text-[9px] text-gray-400">Favorite Title</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/8 text-gray-300">
                  🎮 Teammates
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/8 text-gray-300">
                  🏆 100%
                </span>
              </div>
            </div>
          </div>

          {/* 3. Miniature Spotlight Grid (Clean 5-Slot Layout) */}
          <div className="flex flex-col gap-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-white/10 text-white border border-white/10">
                  <Gamepad2 size={10} /> Games
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg text-gray-400">
                  <Tv size={10} /> Anime
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg text-gray-400">
                  <Film size={10} /> Cinema
                </span>
              </div>
              <span className="text-[9px] text-gray-500">Top 5 Slots</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[
                { title: 'Dota 2', rating: '9.2' },
                { title: 'Apex', rating: '9.8' },
                { title: 'GTA V', rating: '9.4' },
                { title: 'Cyberpunk', rating: '9.4' },
              ].map((item, idx) => (
                <div
                  key={item.title}
                  className="relative aspect-[3/4] rounded-lg bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 flex flex-col justify-between p-1 overflow-hidden group shadow-xs"
                >
                  <span className="self-start text-[8px] font-bold px-1 py-0.2 rounded bg-black/60 backdrop-blur-xs text-amber-300 border border-amber-400/30">
                    ★ {item.rating}
                  </span>
                  <span className="text-[9px] font-semibold text-white/90 truncate leading-none pb-0.5">
                    {item.title}
                  </span>
                </div>
              ))}

              {/* Slot 5: Empty Slot */}
              <div className="relative aspect-[3/4] rounded-lg border border-dashed border-white/15 bg-white/[0.01] flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-gray-300 hover:border-white/30 transition-all cursor-pointer">
                <Plus size={12} />
                <span className="text-[8px] font-medium">Slot 5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accent Color Theme Picker (Preset swatches + Discord-style Custom RGB circle) */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-bold text-gray-300">Custom Accent Glow Color:</label>
        <div className="flex items-center gap-2.5 flex-wrap">
          {ACCENT_COLORS.map((color) => {
            const isSelected = accentColor.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => setAccentColor(color)}
                className="w-8 h-8 rounded-full transition-all hover:scale-110 flex items-center justify-center cursor-pointer shadow-md"
                style={{
                  backgroundColor: color,
                  boxShadow: isSelected ? `0 0 14px ${color}` : 'none',
                  border: isSelected ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                }}
                title={`Preset: ${color}`}
              >
                {isSelected && <Check size={14} className="text-white drop-shadow" />}
              </button>
            );
          })}

          {/* 9th Discord-style Custom RGB Color Swatch */}
          <div className="relative group">
            <label
              title={isCustomColor ? `Custom Color: ${accentColor}` : 'Pick custom RGB color'}
              className="relative w-8 h-8 rounded-full transition-all hover:scale-110 flex items-center justify-center cursor-pointer shadow-md overflow-hidden"
              style={{
                background: isCustomColor
                  ? accentColor
                  : 'conic-gradient(from 180deg at 50% 50%, #ff4b4b, #ffb020, #00d26a, #00d4ff, #5865f2, #eb459e, #ff4b4b)',
                boxShadow: isCustomColor ? `0 0 14px ${accentColor}` : 'none',
                border: isCustomColor ? '2px solid white' : '1.5px solid rgba(255,255,255,0.25)',
              }}
            >
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full p-0 border-0"
                aria-label="Custom RGB color picker"
              />
              {isCustomColor ? (
                <Check size={14} className="text-white drop-shadow pointer-events-none" />
              ) : (
                <Pipette
                  size={13}
                  className="text-white drop-shadow opacity-90 group-hover:opacity-100 pointer-events-none"
                />
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Granular Privacy Tiers with Custom Animated Selects */}
      <div className="flex flex-col gap-2.5 pt-4 border-t border-white/6">
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Privacy Visibility:
        </span>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/8 hover:border-white/12 transition-colors">
          <div>
            <span className="text-xs font-bold text-white block">
              Personal Information Visibility
            </span>
            <span className="text-[10px] text-gray-500">Birthday, age, pronouns & clock</span>
          </div>
          <CustomPrivacySelect
            value={privacyMeta}
            onChange={setPrivacyMeta}
            id="privacy-select-meta"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/8 hover:border-white/12 transition-colors">
          <div>
            <span className="text-xs font-bold text-white block">Live Activity & Presence</span>
            <span className="text-[10px] text-gray-500">Music & gaming rich status</span>
          </div>
          <CustomPrivacySelect
            value={privacyActivity}
            onChange={setPrivacyActivity}
            id="privacy-select-activity"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/8 hover:border-white/12 transition-colors">
          <div>
            <span className="text-xs font-bold text-white block">Showcase & Spotlight Grid</span>
            <span className="text-[10px] text-gray-500">Top 5 Games, Anime & Cinema</span>
          </div>
          <CustomPrivacySelect
            value={privacyShowcase}
            onChange={setPrivacyShowcase}
            id="privacy-select-showcase"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-white/6">
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
