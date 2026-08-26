import React, { useState, useEffect } from 'react';
import { Cake, Clock, UserCheck, Sparkles, Pencil } from 'lucide-react';
import type { ProfileShowcaseDto } from '@backend/common/contracts';

interface PersonalMetaWidgetProps {
  showcase: ProfileShowcaseDto;
  isOwner: boolean;
  onEditClick?: () => void;
}

export const PersonalMetaWidget: React.FC<PersonalMetaWidgetProps> = ({
  showcase,
  isOwner,
  onEditClick,
}) => {
  const [liveClock, setLiveClock] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const tz = showcase.timezone || 'UTC';
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        setLiveClock(`${formatter.format(now)} (${tz})`);
      } catch {
        const now = new Date();
        const hh = String(now.getUTCHours()).padStart(2, '0');
        const mm = String(now.getUTCMinutes()).padStart(2, '0');
        const ss = String(now.getUTCSeconds()).padStart(2, '0');
        setLiveClock(`${hh}:${mm}:${ss} (UTC)`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [showcase.timezone]);

  const hasBirthOrAge = Boolean(showcase.birthDate || showcase.age !== null);
  const hasGenderOrPronouns = Boolean(showcase.gender || showcase.pronouns);
  const hasTimezone = Boolean(showcase.showTimezone);

  if (!isOwner && !hasBirthOrAge && !hasGenderOrPronouns && !hasTimezone) {
    return null;
  }

  const accent = showcase.accentColor || '#6366f1';

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-4.5 transition-all duration-300 hover:border-white/[0.16] shadow-xl group"
      style={{
        boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`,
      }}
    >
      {/* Subtle radial glow reflecting accent */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-35"
        style={{ backgroundColor: accent }}
      />

      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3.5">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Personal Meta
          </span>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={onEditClick}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Edit Personal Meta"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* Badges Grid */}
      <div className="flex flex-wrap gap-2">
        {/* Birthday & Age */}
        {hasBirthOrAge && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-gray-200">
            <Cake size={14} className="text-pink-400 shrink-0" />
            <span className="font-medium">
              {showcase.birthDate ? showcase.birthDate : ''}
              {showcase.age !== null && showcase.age !== undefined ? ` (${showcase.age} y.o.)` : ''}
            </span>
          </div>
        )}

        {/* Zodiac Sign */}
        {showcase.zodiacSign && (
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-amber-300">
            <Sparkles size={13} className="shrink-0" />
            <span>{showcase.zodiacSign}</span>
          </div>
        )}

        {/* Gender & Pronouns */}
        {hasGenderOrPronouns && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-gray-200">
            <UserCheck size={14} className="text-cyan-400 shrink-0" />
            <span className="font-medium">
              {[showcase.gender, showcase.pronouns].filter(Boolean).join(' • ')}
            </span>
          </div>
        )}

        {/* Live Local Clock */}
        {hasTimezone && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xs text-emerald-300/90 w-full sm:w-auto">
            <Clock size={14} className="text-emerald-400 shrink-0" />
            <span className="font-mono text-[11px] font-semibold tracking-wide">
              {liveClock || 'Loading local time...'}
            </span>
          </div>
        )}
      </div>

      {isOwner && !hasBirthOrAge && !hasGenderOrPronouns && (
        <button
          type="button"
          onClick={onEditClick}
          className="w-full mt-2 py-2 border border-dashed border-white/10 rounded-2xl text-xs text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-1.5 bg-white/[0.01]"
        >
          <Pencil size={12} />
          <span>Configure birthday, pronouns & timezone</span>
        </button>
      )}
    </div>
  );
};
