import React, { useState } from 'react';
import { Play, Heart, MessageCircle, Send, CheckCheck, FileText } from 'lucide-react';
import { PressReleaseItem } from '../data/newsroomData';

/**
 * 1:1 Realistic Minimalist Feature Previews
 */
const FeatureMockup: React.FC<{ itemId: string }> = ({ itemId }) => {
  switch (itemId) {
    case 'pr-legal-hub':
      return (
        <div className="w-full h-full p-4 sm:p-5 flex items-center justify-center select-none">
          {/* 1:1 Document Card Preview of Legal / Privacy Page */}
          <div className="w-full max-w-[340px] rounded-2xl bg-[#120a2a]/90 border border-purple-500/20 shadow-2xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                <FileText size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-white tracking-wider">
                  ETERNAL PRIVACY & TERMS
                </span>
                <span className="text-[9px] text-purple-300/80 font-mono">
                  Transparency & User Rights
                </span>
              </div>
            </div>

            {/* Skeleton document lines */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full h-2 rounded bg-white/20" />
              <div className="w-5/6 h-2 rounded bg-white/10" />
              <div className="w-4/6 h-2 rounded bg-white/10" />
            </div>

            {/* Sub-section pill cards */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-lg bg-black/40 border border-purple-500/20 px-2.5 py-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-bold text-neutral-300">Data Encryption</span>
              </div>
              <div className="rounded-lg bg-black/40 border border-purple-500/20 px-2.5 py-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span className="text-[9px] font-bold text-neutral-300">Community Safety</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'pr-chat-themes':
      return (
        <div className="w-full h-full p-4 sm:p-5 flex flex-col justify-center gap-3 select-none">
          {/* Incoming Message */}
          <div className="flex items-end gap-2 max-w-[80%]">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shadow">
              E
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-[#1e1342] border border-purple-500/30 px-3.5 py-2 text-xs text-neutral-100 shadow-md">
              Check out our new neon violet chat theme! ✨
            </div>
          </div>

          {/* Outgoing Message with Gradient & Reaction */}
          <div className="flex flex-col items-end gap-1 self-end max-w-[80%]">
            <div className="rounded-2xl rounded-br-sm bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-3.5 py-2 text-xs font-medium text-white shadow-[0_4px_20px_rgba(124,58,237,0.4)] flex items-center gap-1.5">
              <span>Looks incredible, love the liquid glass glow 💜</span>
              <CheckCheck size={13} className="text-purple-200" />
            </div>
          </div>
        </div>
      );

    case 'pr-stories':
      return (
        <div className="w-full h-full p-3 sm:p-4 flex items-center justify-center select-none">
          {/* 1:1 Stories Preview Card */}
          <div className="w-full max-w-[280px] h-[135px] rounded-2xl bg-gradient-to-tr from-[#3b0764] via-[#701a75] to-[#be185d] p-3 flex flex-col justify-between shadow-2xl border border-white/20 relative overflow-hidden">
            {/* Story Progress Indicators */}
            <div className="flex items-center gap-1.5 w-full">
              <div className="h-1 flex-1 rounded-full bg-white shadow-sm" />
              <div className="h-1 flex-1 rounded-full bg-white/40" />
              <div className="h-1 flex-1 rounded-full bg-white/40" />
            </div>

            {/* Story User Header */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full ring-2 ring-white p-0.5 bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shadow">
                N
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-white drop-shadow">Nikolaj</span>
                <span className="text-[9px] text-white/80">Just now</span>
              </div>
            </div>

            {/* Floating Story Reaction */}
            <div className="self-end px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg">
              <span>🔥</span>
              <span>Stories v2</span>
            </div>
          </div>
        </div>
      );

    case 'pr-voice-video-circles':
      return (
        <div className="w-full h-full p-4 sm:p-5 flex items-center justify-center gap-4 select-none">
          {/* 1:1 Voice Note Bubble */}
          <div className="flex-1 max-w-[210px] rounded-2xl bg-[#130b2c] border border-teal-500/30 p-2.5 flex items-center gap-2.5 shadow-xl">
            <div className="w-8 h-8 rounded-full bg-teal-400 hover:scale-105 transition-transform flex items-center justify-center text-black shadow-md shrink-0">
              <Play size={13} className="fill-black ml-0.5" />
            </div>
            <div className="flex items-center gap-0.5 flex-1 h-6">
              {[6, 14, 22, 12, 18, 24, 16, 10, 20, 15, 8, 18, 12, 6].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-teal-300"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono font-bold text-teal-300">0:28</span>
          </div>

          {/* 1:1 Telegram-style Video Round Circle Mockup */}
          <div className="relative w-16 h-16 rounded-full ring-2 ring-teal-400/90 p-0.5 bg-gradient-to-tr from-teal-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.5)] shrink-0">
            <span className="text-xl">📹</span>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#07050f] flex items-center justify-center text-[7px] font-bold text-black">
              HD
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export const PressReleasesSection: React.FC<{
  heading: string;
  loadMoreText: string;
  items: PressReleaseItem[];
}> = ({ heading, loadMoreText, items }) => {
  const [visibleCount, setVisibleCount] = useState(4);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 2, items.length));
  };

  return (
    <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      {/* Section Heading */}
      <div className="flex flex-col items-center text-center mb-16">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase max-w-3xl leading-tight">
          {heading}
        </h2>
      </div>

      {/* 2-Column Grid of Press Release Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
        {items.slice(0, visibleCount).map((item) => (
          <article
            key={item.id}
            className="group rounded-[36px] bg-[#0c091e] border border-white/[0.08] hover:border-purple-500/40 p-5 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_60px_rgba(88,34,180,0.25)] cursor-pointer"
          >
            {/* Visual Thumbnail Banner */}
            <div
              className={`w-full aspect-[16/9] rounded-[26px] bg-gradient-to-br ${item.gradientClass} border border-white/[0.08] relative overflow-hidden mb-6 shadow-inner flex items-center justify-center`}
            >
              <FeatureMockup itemId={item.id} />
            </div>

            {/* Content Details */}
            <div className="flex flex-col gap-3 text-left">
              {/* Category Pill & Date */}
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-bold text-neutral-300">
                  {item.tag}
                </span>
                <span className="text-xs font-semibold text-neutral-400 font-mono">
                  {item.date}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-purple-300 transition-colors leading-snug">
                {item.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-neutral-400 font-normal leading-relaxed line-clamp-3">
                {item.description}
              </p>
            </div>
          </article>
        ))}
      </div>

      {/* Load More Button */}
      {visibleCount < items.length && (
        <div className="flex justify-center mt-12">
          <button
            type="button"
            onClick={handleLoadMore}
            className="px-8 py-3 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-black tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            {loadMoreText}
          </button>
        </div>
      )}
    </section>
  );
};
