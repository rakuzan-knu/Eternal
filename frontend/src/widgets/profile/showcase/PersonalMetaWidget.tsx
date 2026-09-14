import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Cake,
  Clock,
  UserCheck,
  Sparkles,
  Pencil,
  MapPin,
  Home,
  Heart,
  Briefcase,
  GraduationCap,
  Languages,
  Users,
} from 'lucide-react';
import type { ProfileShowcaseDto } from '@backend/common/contracts';
import { MiniProfileHoverCard } from '@/entities/profile/ui/MiniProfileHoverCard';
import { MarqueeText } from '@/shared/ui/MarqueeText';
import { sanitizeImageUrl } from '@/shared/lib/urlSecurity';
import {
  getLanguageFlag,
  formatRelationshipDuration,
  getTimePhaseAndOffset,
  RELATIONSHIP_CONFIG,
} from '@/entities/showcase/lib/personalInfoUtils';

export const RELATIONSHIP_LABELS = RELATIONSHIP_CONFIG;

function formatBirthDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(Date.UTC(year, month, day));
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

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
  const [liveTimeOnly, setLiveTimeOnly] = useState<string>('');

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
        const timeStr = formatter.format(now);
        setLiveTimeOnly(timeStr);
        setLiveClock(`${timeStr} (${tz})`);
      } catch {
        const now = new Date();
        const hh = String(now.getUTCHours()).padStart(2, '0');
        const mm = String(now.getUTCMinutes()).padStart(2, '0');
        const ss = String(now.getUTCSeconds()).padStart(2, '0');
        setLiveTimeOnly(`${hh}:${mm}:${ss}`);
        setLiveClock(`${hh}:${mm}:${ss} (UTC)`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [showcase.timezone]);

  const pInfo = showcase.personalInfo;
  const toggles = (pInfo?.toggles as Record<string, boolean | undefined>) || {};

  // Granular display toggle checks: strictly require === true so default is OFF initially
  const showRelationship = toggles.showRelationship === true && Boolean(pInfo?.relationshipStatus);
  const showLivesIn = toggles.showLivesIn === true && Boolean(pInfo?.livesIn);
  const showHometown = toggles.showHometown === true && Boolean(pInfo?.hometown);
  const showWorkplace = toggles.showWorkplace === true && Boolean(pInfo?.workplace);
  const showEducation = toggles.showEducation === true && Boolean(pInfo?.education);
  const showLanguages =
    toggles.showLanguages === true &&
    Boolean(Array.isArray(pInfo?.languages) ? pInfo.languages.length > 0 : pInfo?.languages);
  const showFamily =
    toggles.showFamily === true &&
    Boolean(
      (Array.isArray(pInfo?.familyMembers) && pInfo.familyMembers.length > 0) || pInfo?.family,
    );

  const effectiveGender = (pInfo?.gender as string) || showcase.gender || null;
  const showGender = showcase.showGender === true && Boolean(effectiveGender);
  const showPronouns = toggles.showPronouns === true && Boolean(showcase.pronouns);
  const showBirthdate = showcase.showBirthdate === true && Boolean(showcase.birthDate);
  const showAge = showcase.showAge === true && showcase.age !== null && showcase.age !== undefined;
  const showZodiac =
    (showcase.showZodiac === true || toggles.showZodiac === true) && Boolean(showcase.zodiacSign);
  const showClock = showcase.showTimezone === true;

  const hasAnyData =
    showRelationship ||
    showLivesIn ||
    showHometown ||
    showWorkplace ||
    showEducation ||
    showLanguages ||
    showFamily ||
    showGender ||
    showPronouns ||
    showBirthdate ||
    showAge ||
    showZodiac ||
    showClock;

  // Zero-state handling:
  // If no fields are enabled, collapse completely so empty card is not displayed initially
  if (!hasAnyData) {
    return null;
  }

  const accent = showcase.accentColor || '#6366f1';
  const relMeta = pInfo?.relationshipStatus ? RELATIONSHIP_CONFIG[pInfo.relationshipStatus] : null;
  const anniversaryText = formatRelationshipDuration(pInfo?.relationshipSince);
  const timeContext = getTimePhaseAndOffset(showcase.timezone || 'UTC');

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-[#121216]/90 border border-white/[0.08] p-4.5 transition-all duration-300 hover:border-white/[0.16] shadow-xl group"
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
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06] mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          <h4 className="text-xs font-bold text-gray-200 tracking-wide">Personal information</h4>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={onEditClick}
            className="opacity-70 group-hover:opacity-100 p-1.5 rounded-xl hover:bg-white/[0.08] text-gray-400 hover:text-white transition-all cursor-pointer"
            title="Edit Personal Information"
            aria-label="Edit Personal Information"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* Structured Facebook & Discord-Style Information List */}
      <div className="flex flex-col gap-2">
        {/* 1. Relationship Status & Anniversary */}
        {showRelationship && (
          <div className="flex items-start gap-2.5 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03] group/row">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-400 text-sm">
              <span>{relMeta?.icon || '❤️'}</span>
            </div>
            <div className="text-xs text-gray-300 leading-snug min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-white">
                  {relMeta?.label || pInfo?.relationshipStatus}
                </span>
                {pInfo?.partner && (
                  <span className="text-gray-400 font-normal">
                    with{' '}
                    {pInfo.partnerUserId ? (
                      <MiniProfileHoverCard username={pInfo.partner.replace(/^@/, '')}>
                        <Link
                          to={`/${pInfo.partner.replace(/^@/, '')}`}
                          className="text-rose-300 font-semibold hover:underline"
                        >
                          {pInfo.partner}
                        </Link>
                      </MiniProfileHoverCard>
                    ) : (
                      <span className="text-rose-300 font-semibold">{pInfo.partner}</span>
                    )}
                  </span>
                )}
                {anniversaryText && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/25 font-medium">
                    <Heart size={9} className="fill-rose-400 text-rose-400" />
                    {anniversaryText}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Current City / Lives in */}
        {showLivesIn && (
          <div className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03] group/row">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-400">
              <MapPin size={13} />
            </div>
            <div className="text-xs text-gray-300 leading-snug min-w-0 flex-1 flex items-center gap-1 overflow-hidden">
              <span className="text-gray-400 shrink-0">Lives in </span>
              <MarqueeText
                text={pInfo?.livesIn || ''}
                containerClassName="min-w-0 flex-1"
                className="font-semibold text-white truncate"
              />
            </div>
          </div>
        )}

        {/* 3. Hometown / Originally from */}
        {showHometown && (
          <div className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03] group/row">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
              <Home size={13} />
            </div>
            <div className="text-xs text-gray-300 leading-snug min-w-0 flex-1 flex items-center gap-1 overflow-hidden">
              <span className="text-gray-400 shrink-0">Originally from </span>
              <MarqueeText
                text={pInfo?.hometown || ''}
                containerClassName="min-w-0 flex-1"
                className="font-semibold text-white truncate"
              />
            </div>
          </div>
        )}

        {/* 4. Workplace */}
        {showWorkplace && (
          <div className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03] group/row">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
              <Briefcase size={13} />
            </div>
            <div className="text-xs text-gray-300 leading-snug min-w-0 flex-1 truncate flex items-center gap-1.5">
              <span className="text-gray-400">Works at </span>
              <Link
                to={`/search?q=${encodeURIComponent(pInfo?.workplace || '')}`}
                className="font-semibold text-white hover:text-blue-300 hover:underline transition-colors"
                title={`Search hub for ${pInfo?.workplace}`}
              >
                {pInfo?.workplace}
              </Link>
              {pInfo?.workplaceRole && (
                <span className="text-gray-400">
                  {' '}
                  as <span className="text-gray-200">{pInfo.workplaceRole}</span>
                </span>
              )}
              {pInfo?.workplaceStatus && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/25">
                  {pInfo.workplaceStatus}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 5. Education */}
        {showEducation && (
          <div className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03] group/row">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
              <GraduationCap size={13} />
            </div>
            <div className="text-xs text-gray-300 leading-snug min-w-0 flex-1 truncate flex items-center gap-1.5">
              <span className="text-gray-400">Studied at </span>
              <Link
                to={`/search?q=${encodeURIComponent(pInfo?.education || '')}`}
                className="font-semibold text-white hover:text-indigo-300 hover:underline transition-colors"
                title={`Search community for ${pInfo?.education}`}
              >
                {pInfo?.education}
              </Link>
              {pInfo?.educationStatus && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  {pInfo.educationStatus}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 6. Birthdate & Age */}
        {(showBirthdate || showAge) && (
          <div className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03] group/row">
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0 text-pink-400">
              <Cake size={13} />
            </div>
            <div className="text-xs text-gray-300 leading-snug min-w-0 flex-1 truncate">
              {showBirthdate && (
                <span className="font-semibold text-white">
                  {showcase.birthDate ? formatBirthDate(showcase.birthDate) : ''}
                </span>
              )}
              {showAge && (
                <span className="text-gray-400 font-medium">
                  {showBirthdate ? ' ' : ''}({showcase.age} y.o.)
                </span>
              )}
            </div>
          </div>
        )}

        {/* 7. Family Members with HoverCard & Profile Links */}
        {showFamily && (
          <div className="flex flex-col gap-1 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 text-teal-400">
                <Users size={13} />
              </div>
              <span className="text-xs text-gray-400 font-medium">Family</span>
            </div>

            {/* List of family members */}
            {Array.isArray(pInfo?.familyMembers) && pInfo.familyMembers.length > 0 ? (
              <div className="flex flex-col gap-1.5 mt-1 ml-9">
                {pInfo.familyMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {member.username ? (
                        <MiniProfileHoverCard username={member.username}>
                          <Link to={`/${member.username}`} className="relative shrink-0 block">
                            {member.avatarUrl ? (
                              <img
                                src={sanitizeImageUrl(member.avatarUrl)}
                                alt={member.name || member.customName || 'Relative'}
                                className="w-6 h-6 rounded-full object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-[10px] flex items-center justify-center border border-teal-500/30">
                                {(member.name || member.customName || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </Link>
                        </MiniProfileHoverCard>
                      ) : (
                        <div className="relative shrink-0">
                          {member.avatarUrl ? (
                            <img
                              src={sanitizeImageUrl(member.avatarUrl)}
                              alt={member.name || member.customName || 'Relative'}
                              className="w-6 h-6 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-700 text-gray-300 font-bold text-[10px] flex items-center justify-center border border-white/10">
                              {(member.name || member.customName || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col min-w-0 leading-tight">
                        <div className="flex items-center gap-1.5">
                          {member.username ? (
                            <MiniProfileHoverCard username={member.username}>
                              <Link
                                to={`/${member.username}`}
                                className="text-xs font-semibold text-white hover:text-teal-300 transition-colors truncate"
                              >
                                {member.name || member.customName || 'Relative'}
                              </Link>
                            </MiniProfileHoverCard>
                          ) : (
                            <span className="text-xs font-semibold text-white truncate">
                              {member.name || member.customName || 'Relative'}
                            </span>
                          )}
                          {member.isConfirmed === false && (
                            <span className="text-[9px] px-1 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                              Pending
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">{member.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pInfo?.family ? (
              <div className="text-xs text-white font-medium ml-9">{pInfo.family}</div>
            ) : null}
          </div>
        )}

        {/* 8. Gender & Pronouns */}
        {(showGender || showPronouns) && (
          <div className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03] group/row">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
              <UserCheck size={13} />
            </div>
            <div className="text-xs text-gray-300 leading-snug min-w-0 flex-1 truncate">
              {showGender && (
                <span className="font-semibold text-white capitalize">{effectiveGender}</span>
              )}
              {showGender && showPronouns && <span className="text-gray-500 mx-1">•</span>}
              {showPronouns && (
                <span className="text-cyan-300 font-medium">{showcase.pronouns}</span>
              )}
            </div>
          </div>
        )}

        {/* 9. Languages with Flags */}
        {showLanguages && (
          <div className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03] group/row">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 text-violet-400">
              <Languages size={13} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
              <span className="text-xs text-gray-400">Speaks:</span>
              {Array.isArray(pInfo?.languages) ? (
                pInfo.languages.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium text-white shadow-xs"
                  >
                    <span>{getLanguageFlag(lang)}</span>
                    <span>{lang}</span>
                  </span>
                ))
              ) : (
                <span className="font-semibold text-white text-xs">{pInfo?.languages}</span>
              )}
            </div>
          </div>
        )}

        {/* 10. Zodiac Sign */}
        {showZodiac && (
          <div className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03] group/row">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
              <Sparkles size={13} />
            </div>
            <div className="text-xs text-gray-300 leading-snug min-w-0 flex-1 flex items-center gap-1 overflow-hidden">
              <span className="text-gray-400 shrink-0">Zodiac: </span>
              <MarqueeText
                text={showcase.zodiacSign || ''}
                containerClassName="min-w-0 flex-1"
                className="font-semibold text-amber-300 truncate"
              />
            </div>
          </div>
        )}

        {/* 11. Live Local Clock with Slack/GitHub context */}
        {showClock && (
          <div className="flex items-center gap-2.5 py-1 px-1.5 rounded-xl transition-all hover:bg-white/[0.03] group/row">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
              <Clock size={13} />
            </div>
            <div className="text-xs text-gray-300 leading-snug min-w-0 flex-1 flex items-center justify-between gap-2 overflow-hidden">
              <div className="flex items-center gap-1.5 min-w-0 shrink-0">
                <span className="text-gray-400 shrink-0">Local time:</span>
                <span className="font-mono font-semibold text-emerald-400 tracking-tight shrink-0">
                  {liveTimeOnly || liveClock || 'Loading local time...'}
                </span>
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium shrink-0 max-w-[130px] min-w-0 shadow-xs">
                <span className="shrink-0">{timeContext.phaseIcon}</span>
                <MarqueeText
                  text={timeContext.relativeOffset}
                  containerClassName="min-w-0 flex-1"
                  className="text-[10px] text-emerald-300 font-medium whitespace-nowrap"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State for Owner */}
      {isOwner && !hasAnyData && (
        <button
          type="button"
          onClick={onEditClick}
          className="w-full mt-2 py-3 px-3.5 border border-dashed border-white/10 hover:border-indigo-500/40 rounded-2xl text-xs text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2 bg-white/[0.01] hover:bg-white/[0.04] cursor-pointer group/zero"
        >
          <Pencil
            size={12}
            className="text-indigo-400 group-hover/zero:scale-110 transition-transform"
          />
          <span>Your personal information is hidden or empty. Customize showcase</span>
        </button>
      )}
    </div>
  );
};

export const PersonalInformationWidget = PersonalMetaWidget;
