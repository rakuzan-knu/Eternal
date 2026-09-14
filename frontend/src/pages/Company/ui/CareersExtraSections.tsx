import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Layers,
  Award,
  Sparkles,
  Clock,
  Compass,
  Heart,
  ArrowUpRight,
} from 'lucide-react';
import { EarlyTeamPerk, FunClub, FAQItem, CareersTranslations } from '../data/careersData';

/**
 * 3D Icon Badges for Experience Life at Eternal Section
 */
export const ExperienceIconBadge: React.FC<{ type: EarlyTeamPerk['iconType'] }> = ({ type }) => {
  switch (type) {
    case 'stack':
      return (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-400 p-0.5 shadow-[0_10px_25px_rgba(99,102,241,0.4)] flex items-center justify-center">
          <div className="w-full h-full bg-[#15102a] rounded-2xl flex items-center justify-center">
            <Layers className="w-6 h-6 text-cyan-300" />
          </div>
        </div>
      );
    case 'portfolio':
      return (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-600 to-amber-400 p-0.5 shadow-[0_10px_25px_rgba(244,63,94,0.4)] flex items-center justify-center">
          <div className="w-full h-full bg-[#15102a] rounded-2xl flex items-center justify-center">
            <Award className="w-6 h-6 text-amber-300" />
          </div>
        </div>
      );
    case 'perks':
      return (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-400 p-0.5 shadow-[0_10px_25px_rgba(16,185,129,0.4)] flex items-center justify-center">
          <div className="w-full h-full bg-[#15102a] rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-emerald-300" />
          </div>
        </div>
      );
    case 'schedule':
      return (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-pink-500 p-0.5 shadow-[0_10px_25px_rgba(168,85,247,0.4)] flex items-center justify-center">
          <div className="w-full h-full bg-[#15102a] rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-300" />
          </div>
        </div>
      );
    case 'growth':
      return (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-500 p-0.5 shadow-[0_10px_25px_rgba(59,130,246,0.4)] flex items-center justify-center">
          <div className="w-full h-full bg-[#15102a] rounded-2xl flex items-center justify-center">
            <Compass className="w-6 h-6 text-blue-300" />
          </div>
        </div>
      );
    case 'culture':
      return (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-400 p-0.5 shadow-[0_10px_25px_rgba(236,72,153,0.4)] flex items-center justify-center">
          <div className="w-full h-full bg-[#15102a] rounded-2xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-pink-300 fill-pink-300/30" />
          </div>
        </div>
      );
  }
};

/**
 * 1. Experience Life at Eternal (Why Join the Early Team - 6 Cards Grid)
 */
export const ExperienceSection: React.FC<{
  heading: string;
  subtitle: string;
  perks: EarlyTeamPerk[];
}> = ({ heading, subtitle, perks }) => {
  return (
    <section className="py-24 px-6 lg:px-12 max-w-6xl mx-auto w-full relative z-10 select-text">
      {/* Heading */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-5 leading-tight">
          {heading}
        </h2>
        <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-medium">
          {subtitle}
        </p>
      </div>

      {/* 2-Column Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {perks.map((perk) => (
          <div
            key={perk.id}
            className="p-8 sm:p-10 rounded-[32px] bg-[#120f24] hover:bg-[#191433] border border-white/[0.08] hover:border-purple-500/40 shadow-xl transition-all duration-200 flex flex-col gap-6 text-left group"
          >
            {/* Top Icon */}
            <div>
              <ExperienceIconBadge type={perk.iconType} />
            </div>

            {/* Title & Description */}
            <div className="flex flex-col gap-2.5">
              <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-purple-200 transition-colors">
                {perk.title}
              </h3>
              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
                {perk.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/**
 * 2. When It’s Time for Fun, Find Your Party Here (Clubs & Community Hangouts Carousel)
 */
export const FunPartySection: React.FC<{
  heading: string;
  subtitle: string;
  clubs: FunClub[];
}> = ({ heading, subtitle, clubs }) => {
  const [startIndex, setStartIndex] = useState(0);

  const prev = () => {
    setStartIndex((i) => (i - 1 + clubs.length) % clubs.length);
  };

  const next = () => {
    setStartIndex((i) => (i + 1) % clubs.length);
  };

  return (
    <section className="py-24 px-6 lg:px-12 max-w-6xl mx-auto w-full relative z-10 select-none">
      {/* Heading */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-5 leading-tight">
          {heading}
        </h2>
        <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-medium">
          {subtitle}
        </p>
      </div>

      {/* Clubs Cards Grid & Carousel */}
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <div
              key={club.id}
              className="p-8 rounded-[32px] bg-[#120f24] hover:bg-[#181330] border border-white/[0.08] hover:border-purple-500/40 shadow-xl transition-all duration-200 flex flex-col items-center text-center gap-4 group cursor-pointer"
            >
              {/* Club Avatar Bubble */}
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-tr ${club.grad} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform duration-200 border-2 border-white/20`}
              >
                <span>{club.icon}</span>
              </div>

              {/* Title & Tag */}
              <div className="flex flex-col gap-1">
                <h4 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                  {club.title}
                </h4>
                <span className="text-xs font-semibold text-neutral-400">{club.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * 3. FAQ Section with Interactive Expandable Accordion
 */
export const FAQSection: React.FC<{
  heading: string;
  subtitle: string;
  items: FAQItem[];
  seeAllText: string;
}> = ({ heading, subtitle, items, seeAllText }) => {
  const [openIndexes, setOpenIndexes] = useState<number[]>([0]);
  const [showAll, setShowAll] = useState(false);

  const toggle = (index: number) => {
    setOpenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const displayedItems = showAll ? items : items.slice(0, 4);

  return (
    <section className="py-24 px-6 lg:px-12 max-w-6xl mx-auto w-full relative z-10 select-text">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Heading & Subtitle */}
        <div className="lg:col-span-5 flex flex-col gap-4 text-left lg:sticky lg:top-32">
          <h2 className="text-5xl sm:text-6xl font-black text-white tracking-tight uppercase">
            {heading}
          </h2>
          <p className="text-base text-neutral-300 leading-relaxed font-medium">{subtitle}</p>

          {!showAll && items.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-4 px-6 py-3 rounded-full bg-white text-black font-bold text-xs hover:bg-purple-200 transition-all w-fit cursor-pointer shadow-lg active:scale-95"
            >
              {seeAllText}
            </button>
          )}
        </div>

        {/* Right Column: Interactive Accordion List */}
        <div className="lg:col-span-7 flex flex-col divide-y divide-white/[0.1]">
          {displayedItems.map((item, index) => {
            const isOpen = openIndexes.includes(index);
            return (
              <div key={index} className="py-6 flex flex-col gap-3">
                {/* Question Row */}
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex items-center justify-between gap-4 text-left w-full group cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-lg sm:text-xl font-bold text-white group-hover:text-purple-300 transition-colors leading-snug">
                    {item.question}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] group-hover:bg-purple-600/40 flex items-center justify-center text-white shrink-0 transition-colors">
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </div>
                </button>

                {/* Expandable Answer */}
                {isOpen && (
                  <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal pt-2 animate-fadeIn">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
