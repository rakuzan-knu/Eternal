import React from 'react';
import { Heart, MessageCircle, Repeat2, Bookmark, Crown, CheckCheck } from 'lucide-react';
import { BlogUpdateItem } from '../data/newsroomData';

/**
 * 1:1 Clean Minimalist Blog Visual Previews
 */
const BlogTopicMockup: React.FC<{ itemId: string }> = ({ itemId }) => {
  switch (itemId) {
    case 'blog-messenger-launch':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          {/* Mini Messenger UI Mockup */}
          <div className="w-full h-full rounded-2xl bg-[#0f0924] border border-purple-500/20 p-2.5 flex gap-2.5 overflow-hidden shadow-xl">
            {/* Mini Sidebar with Chat Contacts */}
            <div className="w-1/3 flex flex-col gap-1.5 border-r border-white/10 pr-2">
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-purple-600/30">
                <div className="relative">
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[8px] font-bold text-white">
                    N
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-black" />
                </div>
                <div className="w-10 h-1.5 bg-white/70 rounded" />
              </div>
              <div className="flex items-center gap-1.5 p-1">
                <div className="w-5 h-5 rounded-full bg-indigo-600/60 flex items-center justify-center text-[8px] font-bold text-neutral-300">
                  E
                </div>
                <div className="w-8 h-1.5 bg-white/30 rounded" />
              </div>
              <div className="flex items-center gap-1.5 p-1">
                <div className="w-5 h-5 rounded-full bg-pink-600/60 flex items-center justify-center text-[8px] font-bold text-neutral-300">
                  M
                </div>
                <div className="w-9 h-1.5 bg-white/30 rounded" />
              </div>
            </div>

            {/* Mini Active Chat Panel */}
            <div className="flex-1 flex flex-col justify-between py-0.5">
              <div className="flex flex-col gap-1.5">
                <div className="self-start rounded-xl bg-white/10 px-2 py-1 text-[9px] text-neutral-200">
                  Messenger is live! 💬
                </div>
                <div className="self-end rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-2 py-1 text-[9px] text-white flex items-center gap-1">
                  <span>WebSockets 0ms</span>
                  <CheckCheck size={10} />
                </div>
              </div>
              <div className="w-full h-4 rounded-lg bg-black/40 border border-white/5 px-2 flex items-center">
                <div className="w-12 h-1 bg-neutral-500/60 rounded" />
              </div>
            </div>
          </div>
        </div>
      );

    case 'blog-infinite-feed':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          {/* Mini Feed Post Card */}
          <div className="w-full h-full rounded-2xl bg-[#0a0f1d] border border-cyan-500/20 p-2.5 flex flex-col justify-between shadow-xl">
            {/* Post Author Header */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[9px] font-bold text-white shadow">
                E
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-white">Eternal Platform</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 flex items-center justify-center text-[6px] text-black font-black">
                    ✓
                  </span>
                </div>
                <span className="text-[8px] text-cyan-300/80">@eternal • 10m</span>
              </div>
            </div>

            {/* Post Content Snippet */}
            <div className="rounded-lg bg-cyan-950/40 border border-cyan-500/20 p-2 flex items-center justify-between">
              <span className="text-[9px] text-neutral-200 font-medium">
                Infinite Feed Algorithm 🚀
              </span>
              <span className="text-[8px] text-cyan-400 font-mono">120 FPS</span>
            </div>

            {/* Metric Action Icons */}
            <div className="flex items-center justify-between text-neutral-400 px-1">
              <span className="flex items-center gap-1 text-[9px] text-rose-400 font-bold">
                <Heart size={10} className="fill-rose-400" /> 342
              </span>
              <span className="flex items-center gap-1 text-[9px]">
                <MessageCircle size={10} /> 48
              </span>
              <span className="flex items-center gap-1 text-[9px]">
                <Repeat2 size={10} /> 19
              </span>
              <Bookmark size={10} />
            </div>
          </div>
        </div>
      );

    case 'blog-genesis':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          {/* Cosmic Genesis Artwork Mockup */}
          <div className="w-full h-full rounded-2xl bg-gradient-to-b from-[#281347] via-[#160a2c] to-[#0a0518] border border-amber-500/30 p-3 flex flex-col items-center justify-center shadow-xl relative overflow-hidden">
            {/* Glowing Aura */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15),transparent_70%)]" />

            <div className="relative z-10 w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center mb-1.5">
              <Crown size={22} className="text-black fill-black" />
            </div>

            <span className="relative z-10 text-xs font-black text-white tracking-widest uppercase">
              ETERNAL GENESIS
            </span>
            <span className="relative z-10 text-[9px] text-amber-300 font-mono mt-0.5">
              Origin & Vision 2026
            </span>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export const BlogUpdatesSection: React.FC<{
  heading: string;
  items: BlogUpdateItem[];
}> = ({ heading, items }) => {
  return (
    <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      {/* Section Title */}
      <div className="flex flex-col items-center text-center mb-16">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase max-w-3xl leading-tight">
          {heading}
        </h2>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {items.map((item) => (
          <article
            key={item.id}
            className="group rounded-[32px] bg-[#0c091e] border border-white/[0.08] hover:border-purple-500/40 p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(88,34,180,0.25)] cursor-pointer text-left"
          >
            {/* Visual Thumbnail */}
            <div
              className={`w-full aspect-[4/3] rounded-[22px] bg-gradient-to-br ${item.gradientClass} border border-white/[0.08] relative overflow-hidden mb-5 shadow-inner flex items-center justify-center`}
            >
              <BlogTopicMockup itemId={item.id} />
            </div>

            {/* Content */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {item.category}
              </span>
              <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-neutral-400 font-normal leading-relaxed line-clamp-3">
                {item.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
