import React from 'react';
import {
  Play,
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  CheckCheck,
  Crown,
  Terminal,
  Shield,
  FileText,
  Sparkles,
  Globe,
} from 'lucide-react';
import { BlogPost } from '../data/blogData';

export const BlogVisualMockup: React.FC<{ type: BlogPost['previewType'] }> = ({ type }) => {
  switch (type) {
    case 'hero-letter':
      return (
        <div className="w-full h-full flex items-center justify-center p-6 text-center select-none">
          <div className="flex items-center gap-4 sm:gap-6 group-hover:scale-105 transition-transform duration-300">
            {/* White Glowing Brand Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-[26px] bg-white text-black flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.4)]">
              <span className="font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter">
                E
              </span>
            </div>
            {/* White Wordmark */}
            <span className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight drop-shadow-2xl font-sans">
              Eternal
            </span>
          </div>
        </div>
      );

    case 'messenger':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#0f0924] border border-purple-500/20 p-2.5 flex gap-2.5 overflow-hidden shadow-xl">
            {/* Mini Contact List */}
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

    case 'themes':
      return (
        <div className="w-full h-full p-4 flex flex-col justify-center gap-2.5 select-none">
          <div className="flex items-end gap-2 max-w-[80%]">
            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[8px] font-bold text-white">
              E
            </div>
            <div className="rounded-xl rounded-bl-sm bg-[#1e1342] border border-purple-500/30 px-3 py-1.5 text-xs text-neutral-100 shadow-md">
              Neon custom chat themes! 🎨
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 self-end max-w-[80%]">
            <div className="rounded-xl rounded-br-sm bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-3 py-1.5 text-xs font-medium text-white shadow-md flex items-center gap-1">
              <span>Liquid glassmorphism ✨</span>
              <CheckCheck size={12} className="text-purple-200" />
            </div>
          </div>
        </div>
      );

    case 'stories':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full max-w-[260px] h-[125px] rounded-2xl bg-gradient-to-tr from-[#3b0764] via-[#701a75] to-[#be185d] p-3 flex flex-col justify-between shadow-xl border border-white/20 relative overflow-hidden">
            <div className="flex items-center gap-1.5 w-full">
              <div className="h-1 flex-1 rounded-full bg-white shadow-sm" />
              <div className="h-1 flex-1 rounded-full bg-white/40" />
              <div className="h-1 flex-1 rounded-full bg-white/40" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full ring-2 ring-white p-0.5 bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[9px] font-bold text-white shadow">
                N
              </div>
              <span className="text-xs font-black text-white drop-shadow">Nikolaj • Stories</span>
            </div>
            <div className="self-end px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white flex items-center gap-1">
              <span>🔥</span>
              <span>24h Ephemeral</span>
            </div>
          </div>
        </div>
      );

    case 'voice-video':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center gap-3.5 select-none">
          <div className="flex-1 max-w-[190px] rounded-2xl bg-[#130b2c] border border-teal-500/30 p-2.5 flex items-center gap-2 shadow-lg">
            <div className="w-7 h-7 rounded-full bg-teal-400 flex items-center justify-center text-black shadow-md shrink-0">
              <Play size={11} className="fill-black ml-0.5" />
            </div>
            <div className="flex items-center gap-0.5 flex-1 h-5">
              {[6, 12, 18, 10, 16, 22, 14, 8, 18, 12, 6].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-teal-300"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <span className="text-[9px] font-mono font-bold text-teal-300">0:28</span>
          </div>
          <div className="relative w-13 h-13 rounded-full ring-2 ring-teal-400 p-0.5 bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
            <span className="text-lg">📹</span>
          </div>
        </div>
      );

    case 'feed':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#0a0f1d] border border-cyan-500/20 p-2.5 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
                E
              </div>
              <span className="text-[10px] font-bold text-white">Eternal Infinite Feed 🚀</span>
            </div>
            <div className="rounded-lg bg-cyan-950/40 border border-cyan-500/20 p-1.5 flex items-center justify-between">
              <span className="text-[8px] text-neutral-200">120 FPS Fluid Discovery</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400 px-1">
              <span className="flex items-center gap-1 text-[8px] text-rose-400 font-bold">
                <Heart size={9} className="fill-rose-400" /> 342
              </span>
              <span className="flex items-center gap-1 text-[8px]">
                <MessageCircle size={9} /> 48
              </span>
              <span className="flex items-center gap-1 text-[8px]">
                <Repeat2 size={9} /> 19
              </span>
              <Bookmark size={9} />
            </div>
          </div>
        </div>
      );

    case 'patch-notes':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#0c0822] border border-indigo-500/20 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
              <Terminal size={13} className="text-indigo-400" />
              <span className="text-[10px] font-mono font-bold text-white">
                RELEASE v2.4.0 • PATCH NOTES
              </span>
            </div>
            <div className="space-y-1 font-mono text-[8px] text-indigo-200/90">
              <div className="flex items-center gap-1 text-emerald-400">
                <span>+</span> <span>60% Faster Image Compression</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <span>+</span> <span>Dynamic Tab Badge Sync</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <span>+</span> <span>Argon2id Auth Hardening</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'genesis':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-gradient-to-b from-[#281347] via-[#160a2c] to-[#0a0518] border border-amber-500/30 p-3 flex flex-col items-center justify-center shadow-xl text-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center mb-1">
              <Crown size={18} className="text-black fill-black" />
            </div>
            <span className="text-[11px] font-black text-white tracking-wider uppercase">
              ETERNAL GENESIS
            </span>
            <span className="text-[8px] text-amber-300 font-mono">Origin & Vision 2026</span>
          </div>
        </div>
      );

    case 'transparency':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#120a2a] border border-purple-500/20 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <Shield size={13} className="text-purple-300" />
              <span className="text-[10px] font-bold text-white">Transparency & Policy Hub</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-md bg-black/40 border border-purple-500/20 p-1 text-[8px] text-neutral-300">
                • End-to-End Encrypted
              </div>
              <div className="rounded-md bg-black/40 border border-purple-500/20 p-1 text-[8px] text-neutral-300">
                • Zero Telemetry Tracking
              </div>
            </div>
          </div>
        </div>
      );

    case 'community-hero':
      return (
        <div className="w-full h-full p-6 flex items-center justify-center select-none bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 relative overflow-hidden group">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.2),transparent)]" />
          {/* Stylized 3D Toolkit / Screwdrivers like Discord Screenshot */}
          <div className="flex items-end justify-center gap-4 sm:gap-7 relative z-10 group-hover:scale-105 transition-transform duration-300">
            {[
              { height: 'h-24 sm:h-36', color: 'bg-indigo-600', metal: 'h-16' },
              { height: 'h-28 sm:h-44', color: 'bg-purple-600', metal: 'h-20' },
              { height: 'h-36 sm:h-52', color: 'bg-blue-600', metal: 'h-24' },
              { height: 'h-28 sm:h-44', color: 'bg-indigo-600', metal: 'h-20' },
              { height: 'h-24 sm:h-36', color: 'bg-purple-600', metal: 'h-16' },
            ].map((tool, idx) => (
              <div key={idx} className="flex flex-col items-center">
                {/* Silver Metal Tip */}
                <div
                  className={`w-1.5 ${tool.metal} bg-gradient-to-b from-neutral-200 to-neutral-400 rounded-t-sm shadow`}
                />
                {/* 3D Round Ergonomic Grip */}
                <div
                  className={`w-7 sm:w-10 ${tool.height} ${tool.color} rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.4)] border border-white/20 relative flex items-center justify-center overflow-hidden`}
                >
                  <div className="absolute top-2 w-1.5 h-full bg-white/30 rounded-full blur-[0.5px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'community-spotlight':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#130d2d] border border-purple-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs font-black text-white shadow">
                E
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white flex items-center gap-1">
                  Creator Guild • Studio{' '}
                  <Crown size={10} className="text-amber-400 fill-amber-400" />
                </span>
                <span className="text-[8px] text-purple-300 font-mono">14.2k Active Members</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[8px] font-bold px-2 py-1 rounded-lg bg-white/5 text-purple-200">
              <span>✨ Tier 3 Community Perks</span>
              <span className="text-emerald-400">● Active</span>
            </div>
          </div>
        </div>
      );

    case 'community-music':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-[#2d0f38] via-[#1a082b] to-[#0d041c] border border-pink-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-pink-300 tracking-wider uppercase">
                LIVE CREATIVE STAGE 🎙️
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[8px] font-bold animate-pulse">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-1 justify-center h-7">
              {[8, 16, 24, 12, 28, 20, 14, 26, 18, 10, 22, 14, 8].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-pink-500 to-amber-400"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      );

    case 'community-mods':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#09171b] border border-teal-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-teal-400" />
              <span className="text-[10px] font-bold text-white">AutoMod Safety Engine</span>
            </div>
            <div className="space-y-1 font-mono text-[8px] text-teal-200">
              <div className="text-emerald-400">✓ Spam Raid Shield Active</div>
              <div className="text-teal-300">✓ Link Verification Filter</div>
            </div>
          </div>
        </div>
      );

    case 'community-gaming':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#140b2b] border border-indigo-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Esports Voice Hub 🎮</span>
              <span className="text-[8px] font-mono text-indigo-300">60 FPS • 0ms</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                A
              </div>
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-bold text-white">
                K
              </div>
              <div className="w-6 h-6 rounded-full bg-pink-600 flex items-center justify-center text-[9px] font-bold text-white">
                S
              </div>
              <span className="text-[8px] text-neutral-400 font-bold">+18 in room</span>
            </div>
          </div>
        </div>
      );

    case 'community-students':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#09152b] border border-blue-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Campus & Study Lounges 📚</span>
            <div className="rounded-lg bg-blue-950/50 border border-blue-500/20 p-1.5 text-[8px] text-blue-200">
              • Shared Knowledge Base & Group Whiteboard
            </div>
          </div>
        </div>
      );

    case 'community-opensource':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#0d0c24] border border-purple-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-1.5">
              <Terminal size={12} className="text-purple-400" />
              <span className="text-[10px] font-mono font-bold text-white">Eternal Plugin SDK</span>
            </div>
            <div className="font-mono text-[8px] text-purple-200">
              $ npx @eternal/sdk build --prod
            </div>
          </div>
        </div>
      );

    case 'community-grants':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-gradient-to-b from-[#2e1c07] to-[#120902] border border-amber-500/30 p-3 flex flex-col items-center justify-center shadow-xl text-center">
            <Crown size={20} className="text-amber-400 fill-amber-400 mb-1" />
            <span className="text-[10px] font-black text-white uppercase">CREATOR GRANTS 2026</span>
            <span className="text-[8px] text-amber-300 font-mono">$500,000 Ecosystem Pool</span>
          </div>
        </div>
      );

    case 'community-wellness':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#240a17] border border-rose-500/30 p-3 flex flex-col items-center justify-center shadow-xl text-center">
            <Heart size={18} className="text-rose-400 fill-rose-400 mb-1" />
            <span className="text-[10px] font-black text-white">DIGITAL WELLBEING</span>
            <span className="text-[8px] text-rose-300">Healthy Social Boundaries</span>
          </div>
        </div>
      );

    case 'company-hero':
      return (
        <div className="w-full h-full p-6 flex items-center justify-center select-none bg-gradient-to-b from-[#180a3a] via-[#100624] to-[#07050f] relative overflow-hidden group">
          {/* Ambient space glow and stars */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.25),transparent_70%)]" />
          <div className="absolute top-8 left-12 w-2 h-2 rounded-full bg-white/40 blur-[1px] animate-pulse" />
          <div className="absolute bottom-10 right-20 w-2.5 h-2.5 rounded-full bg-purple-400/50 blur-[1px] animate-pulse" />

          {/* Floating 3D Artifacts matching Discord HQ screenshot */}
          <div className="relative w-full max-w-2xl h-56 sm:h-72 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            {/* Top Center: Giant White Glowing Eternal Logo Crest */}
            <div className="absolute top-2 w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-white/95 to-neutral-200 shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center justify-center text-5xl sm:text-7xl font-black text-[#5822b4] select-none border border-white">
              E
            </div>

            {/* Top Left: 3D Egg Mascot with Green Spots */}
            <div className="absolute top-6 left-6 sm:left-14 w-14 h-18 sm:w-18 sm:h-22 rounded-[50%] bg-gradient-to-br from-white via-neutral-100 to-neutral-300 shadow-xl border border-white/40 flex flex-col items-center justify-center rotate-[-15deg] overflow-hidden">
              <div className="absolute top-3 left-2 w-5 h-5 rounded-full bg-emerald-500 shadow-inner" />
              <div className="absolute bottom-4 right-2 w-6 h-6 rounded-full bg-emerald-500 shadow-inner" />
              <div className="absolute bottom-2 left-3 w-3 h-3 rounded-full bg-emerald-400 shadow-inner" />
            </div>

            {/* Top Center-Left: Silver Trophy */}
            <div className="absolute top-12 left-28 sm:left-40 p-2.5 rounded-2xl bg-gradient-to-br from-purple-300 to-purple-600 shadow-[0_8px_20px_rgba(0,0,0,0.5)] rotate-[10deg] border border-white/30">
              <Crown size={22} className="text-white fill-white" />
            </div>

            {/* Top Center-Right: Diamond Pickaxe / Tool */}
            <div className="absolute top-14 right-28 sm:right-40 p-2.5 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_8px_20px_rgba(0,0,0,0.5)] rotate-[-15deg] border border-white/30">
              <Sparkles size={22} className="text-white fill-white" />
            </div>

            {/* Top Right: 3D Turnip/Radish Mascot with Green Leaves */}
            <div className="absolute top-6 right-6 sm:right-14 w-12 h-14 sm:w-16 sm:h-18 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-300 shadow-xl border border-white/40 flex items-center justify-center rotate-[15deg]">
              <div className="absolute -top-3 flex gap-1">
                <div className="w-2.5 h-5 rounded-full bg-emerald-500 rotate-[-20deg]" />
                <div className="w-2.5 h-6 rounded-full bg-emerald-400" />
                <div className="w-2.5 h-5 rounded-full bg-emerald-500 rotate-[20deg]" />
              </div>
            </div>

            {/* Bottom Center: Glowing Silver Coin with E */}
            <div className="absolute bottom-3 right-16 sm:right-28 w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-purple-200 via-neutral-100 to-purple-300 shadow-[0_10px_25px_rgba(168,85,247,0.4)] border-2 border-white flex items-center justify-center rotate-[12deg]">
              <span className="text-xl sm:text-2xl font-black text-purple-700">E</span>
            </div>

            {/* Bottom Center-Left: Pink Gem Crown */}
            <div className="absolute bottom-2 left-20 sm:left-32 px-3 py-2 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-600 shadow-[0_10px_25px_rgba(244,63,94,0.4)] border border-white/30 rotate-[-8deg] flex items-center gap-1">
              <Crown size={18} className="text-white fill-amber-300" />
              <span className="text-[9px] font-black text-white uppercase tracking-wider">HQ</span>
            </div>
          </div>
        </div>
      );

    case 'company-birthday':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-gradient-to-br from-[#240e42] to-[#0b0416] relative overflow-hidden">
          <div className="flex items-center gap-4">
            {/* Mascot Astronaut */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-indigo-500 to-purple-700 p-1 shadow-xl flex items-center justify-center border-2 border-white/30 relative">
              <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-xl">
                👨‍🚀
              </div>
            </div>
            {/* Birthday Cake with Candle */}
            <div className="p-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex flex-col items-center shadow-2xl">
              <div className="text-2xl mb-1 animate-bounce">🎂</div>
              <span className="text-[9px] font-black text-white uppercase tracking-wider">
                ANNIVERSARY PACK
              </span>
              <span className="text-[8px] text-purple-300 font-mono">4K Wallpapers & Emojis</span>
            </div>
          </div>
        </div>
      );

    case 'company-architecture':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#090d24] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-blue-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white flex items-center gap-1.5">
                <Globe size={13} className="text-blue-400" /> Distributed Cloud Sync
              </span>
              <span className="text-[8px] font-mono text-emerald-400 font-bold">&lt; 50ms P99</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[8px] font-mono text-neutral-300">
              <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-500/20">
                EU-Central
              </div>
              <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-500/20">
                US-East
              </div>
              <div className="p-1.5 rounded-lg bg-blue-950/60 border border-blue-500/20">
                AP-Tokyo
              </div>
            </div>
          </div>
        </div>
      );

    case 'company-designsystem':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#19092c] border border-fuchsia-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Design System 2.0 Spec</span>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-[#5822b4] shadow" />
              <div className="w-5 h-5 rounded-lg bg-fuchsia-600 shadow" />
              <div className="w-5 h-5 rounded-lg bg-[#07050f] border border-white/20 shadow" />
              <span className="text-[8px] font-mono text-neutral-300 ml-auto">Tokens & Guides</span>
            </div>
          </div>
        </div>
      );

    case 'company-audit':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#091a18] border border-emerald-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-white">Annual Privacy Audit</span>
            </div>
            <div className="text-[8px] font-mono text-emerald-300">
              100% Zero-Telemetry Certified
            </div>
          </div>
        </div>
      );

    case 'company-team':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#0e0a24] border border-purple-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Core Engineering Culture</span>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                🇺🇦
              </div>
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white">
                🇩🇪
              </div>
              <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-[9px] font-bold text-white">
                🇺🇸
              </div>
              <span className="text-[8px] text-purple-300 font-bold ml-1">12 Timezones</span>
            </div>
          </div>
        </div>
      );

    case 'company-sustainability':
      return (
        <div className="w-full h-full p-3 flex items-center justify-center select-none">
          <div className="w-full h-full rounded-2xl bg-[#061c14] border border-emerald-500/30 p-3 flex flex-col items-center justify-center shadow-xl text-center">
            <div className="text-xl mb-0.5">🌱</div>
            <span className="text-[10px] font-black text-white uppercase">ECO-FRIENDLY CLOUD</span>
            <span className="text-[8px] text-emerald-300 font-mono">100% Green Energy Target</span>
          </div>
        </div>
      );

    case 'engineering-hero':
      return (
        <div className="w-full h-full p-6 flex items-center justify-center select-none bg-gradient-to-b from-[#1b0d42] via-[#10072b] to-[#07050f] relative overflow-hidden group">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.3),transparent_70%)]" />

          {/* 3D Cyber Console Rig (matching Discord Engineering screenshot) */}
          <div className="relative w-full max-w-2xl h-56 sm:h-72 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            {/* Center: Futuristic 3D Cyber Console Display */}
            <div className="relative w-64 sm:w-80 h-36 sm:h-44 rounded-3xl bg-gradient-to-b from-[#2a175c] via-[#150a33] to-[#0a041c] border-2 border-purple-400/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-3 flex flex-col justify-between overflow-hidden">
              {/* Neon top visor */}
              <div className="flex items-center justify-between border-b border-purple-500/30 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                </div>
                <span className="text-[9px] font-mono text-purple-200 tracking-wider">
                  ETERNAL_SDK::v2.0
                </span>
              </div>

              {/* Center Dashboard Gauges */}
              <div className="flex items-center justify-center gap-3 my-auto">
                <div className="w-12 h-12 rounded-full border-2 border-cyan-400/50 border-t-cyan-400 flex items-center justify-center">
                  <span className="text-[8px] font-mono font-bold text-cyan-300">0.8ms</span>
                </div>
                <div className="w-14 h-14 rounded-full border-2 border-purple-400/50 border-r-purple-400 flex items-center justify-center bg-purple-900/30">
                  <span className="text-[9px] font-mono font-black text-white">100k/s</span>
                </div>
              </div>

              {/* Interactive bottom bar */}
              <div className="flex items-center justify-between text-[8px] font-mono text-neutral-300">
                <span className="text-emerald-400">● WebSockets Connected</span>
                <span>Active API</span>
              </div>
            </div>

            {/* Top Left: "Link Account" Button Badge with Hand Pointer */}
            <div className="absolute top-8 left-4 sm:left-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5822b4] text-white text-[10px] font-bold shadow-xl border border-white/20 rotate-[-8deg]">
              <span>🎮 Link Account</span>
              <div className="w-3 h-3 text-white text-xs">👆</div>
            </div>

            {/* Top Center-Left: 3D Purple Mushroom Powerup */}
            <div className="absolute -top-1 left-24 sm:left-36 w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 shadow-lg border border-white/30 flex items-center justify-center text-lg rotate-12">
              🍄
            </div>

            {/* Top Right: Game Controller / App Floating Badge */}
            <div className="absolute top-6 right-6 sm:right-16 p-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-800 shadow-xl border border-white/30 rotate-[12deg] flex items-center gap-1.5">
              <span className="text-base">🎮</span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            {/* Bottom Right: Developer Avatar Badges */}
            <div className="absolute bottom-4 right-8 sm:right-20 flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-pink-500 border border-white flex items-center justify-center text-[10px]">
                👩‍💻
              </div>
              <div className="w-7 h-7 rounded-full bg-blue-500 border border-white flex items-center justify-center text-[10px]">
                👨‍💻
              </div>
            </div>
          </div>
        </div>
      );

    case 'engineering-rust':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#110826] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-purple-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-white flex items-center gap-1">
                🦀 Rust + Tokio Core
              </span>
              <span className="text-[8px] font-mono text-purple-300 font-bold">
                100k Conn / Node
              </span>
            </div>
            <div className="font-mono text-[8px] text-purple-200 bg-black/40 p-1.5 rounded-lg border border-purple-500/20">
              async fn handle_packet(stream: &mut WsStream) -&gt; Result&lt;()&gt;
            </div>
          </div>
        </div>
      );

    case 'engineering-sdk':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#09122c] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-blue-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-blue-400" />
              <span className="text-[10px] font-bold text-white">Verified App Directory</span>
            </div>
            <div className="flex items-center justify-between text-[8px] font-mono text-blue-200">
              <span>TypeScript SDK v2.0</span>
              <span className="text-emerald-400">✓ Certified</span>
            </div>
          </div>
        </div>
      );

    case 'engineering-bot':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#06191b] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-teal-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="text-[10px] font-bold text-white">Data Optimizer Bot</span>
            </div>
            <div className="text-[8px] font-mono text-teal-300">
              ⚠️ In-Memory Append Log Compaction: 99.4% Latency Reduction
            </div>
          </div>
        </div>
      );

    case 'engineering-jitter':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#20092c] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-fuchsia-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Audio Relay Tuner</span>
              <span className="text-[8px] font-mono text-emerald-400 font-bold">2ms Jitter</span>
            </div>
            <div className="flex items-center gap-1 justify-center h-5">
              {[6, 12, 18, 24, 14, 20, 10, 16, 22, 8].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-gradient-to-t from-fuchsia-500 to-cyan-400"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      );

    case 'engineering-verified':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#140826] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-purple-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Game Rich Presence API</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[8px] font-bold">
                VERIFIED
              </span>
            </div>
            <div className="text-[8px] font-mono text-purple-200">
              Playing "Cyber Arena" • In Match (4/5 Squad)
            </div>
          </div>
        </div>
      );

    case 'engineering-wasm':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#09152b] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-cyan-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-1.5">
              <Terminal size={13} className="text-cyan-400" />
              <span className="text-[10px] font-mono font-bold text-white">
                WebAssembly Sandbox
              </span>
            </div>
            <div className="font-mono text-[8px] text-cyan-200">
              wasm_instantiate(module, &amp;sandbox_env)
            </div>
          </div>
        </div>
      );

    case 'engineering-migrations':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#241306] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-amber-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Zero-Downtime Pipeline</span>
            <div className="text-[8px] font-mono text-amber-300">
              ✓ 100M Messages/Day • Dual-Write Verification 100%
            </div>
          </div>
        </div>
      );

    case 'engineering-e2e':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#071918] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-teal-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-1.5">
              <Shield size={13} className="text-teal-400" />
              <span className="text-[10px] font-bold text-white">
                Signal Protocol Double Ratchet
              </span>
            </div>
            <div className="text-[8px] font-mono text-teal-200">
              MLS End-to-End Key Exchange Verified
            </div>
          </div>
        </div>
      );

    case 'howto-hero':
      return (
        <div className="w-full h-full p-6 flex items-center justify-center select-none bg-gradient-to-r from-[#4f35a8] via-[#3a2080] to-[#25105e] relative overflow-hidden group">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_70%)]" />

          {/* 3D Mascot + Desktop App Settings Card matching Discord Screenshot 1 & 2 */}
          <div className="relative w-full max-w-2xl h-56 sm:h-72 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            {/* Left: 3D Cute Mascot in white quilted jacket */}
            <div className="absolute left-6 sm:left-14 bottom-2 flex flex-col items-center z-20">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-purple-400 to-indigo-600 border-2 border-white/40 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                {/* Mascot Cute Face */}
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-3 h-3 rounded-full bg-neutral-900 shadow" />
                  <div className="w-3 h-3 rounded-full bg-neutral-900 shadow" />
                </div>
                <div className="w-6 h-3 rounded-full bg-purple-800" />
                {/* White Quilted Jacket */}
                <div className="absolute bottom-0 w-full h-10 bg-white shadow-inner flex items-center justify-center border-t border-neutral-300">
                  <div className="w-1 h-full bg-neutral-400" />
                </div>
              </div>
            </div>

            {/* Right: Mockup of Eternal Desktop App Settings & Themes UI */}
            <div className="relative ml-16 sm:ml-28 w-64 sm:w-84 h-40 sm:h-52 rounded-3xl bg-[#120a2a] border-2 border-purple-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 flex flex-col justify-between overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[8px] font-mono text-purple-300 uppercase tracking-wider">
                  Appearance &amp; Themes
                </span>
              </div>

              {/* Theme Color Cards & Toggle preview */}
              <div className="grid grid-cols-2 gap-2 my-auto">
                <div className="h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2 flex flex-col justify-between border border-white/20 shadow">
                  <span className="text-[7px] font-bold text-white uppercase">Midnight Nebula</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-white" />
                    <span className="text-[6px] text-white/80">Active</span>
                  </div>
                </div>
                <div className="h-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 p-2 flex flex-col justify-between border border-white/20 shadow">
                  <span className="text-[7px] font-bold text-white uppercase">Sunset Glow</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-white/50" />
                    <span className="text-[6px] text-white/60">Preview</span>
                  </div>
                </div>
              </div>

              {/* Channel / Notification toggles */}
              <div className="flex items-center justify-between text-[7px] font-mono text-neutral-300 bg-white/5 px-2 py-1 rounded-lg">
                <span>🔔 Desktop Notifications</span>
                <span className="text-emerald-400 font-bold">Enabled (Quiet: 22:00)</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'howto-themes':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#190d3d] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-purple-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Theme Customizer</span>
              <span className="text-[8px] font-mono text-purple-300">OLED Pure Black</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-8 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 border border-white/20" />
              <div className="h-8 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 border border-white/20" />
              <div className="h-8 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 border border-white/20" />
            </div>
          </div>
        </div>
      );

    case 'howto-display':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#091b15] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-emerald-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Display &amp; Eye Care</span>
              <span className="text-[8px] font-mono text-emerald-400">Blue Light: ON</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
              <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                <span>Compact Spacing</span>
                <span>✓</span>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                <span>High Contrast</span>
                <span>✓</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'howto-emojis':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#20092d] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-pink-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Custom Emoji Uploader</span>
            <div className="flex items-center justify-around text-xl">
              <span className="animate-bounce">✨</span>
              <span className="animate-pulse">🚀</span>
              <span className="animate-bounce">🎉</span>
              <span className="animate-pulse">💎</span>
              <span className="animate-bounce">🔥</span>
            </div>
          </div>
        </div>
      );

    case 'howto-presence':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#0f0b29] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-indigo-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Connected Gaming Accounts</span>
              <span className="text-[8px] font-mono text-indigo-300">Live Status</span>
            </div>
            <div className="flex items-center gap-2 text-[8px] font-mono text-neutral-300">
              <div className="p-1 rounded bg-white/10">🎮 Steam: Online</div>
              <div className="p-1 rounded bg-white/10">🎯 Xbox: In Game</div>
            </div>
          </div>
        </div>
      );

    case 'howto-audio':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#09122c] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-blue-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Voice &amp; Audio Streamer</span>
              <span className="text-[8px] font-mono text-emerald-400">384kbps Stereo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-600 ring-2 ring-emerald-400 flex items-center justify-center text-[9px] font-bold text-white">
                🎤
              </div>
              <div className="w-6 h-6 rounded-full bg-indigo-600 ring-2 ring-emerald-400 flex items-center justify-center text-[9px] font-bold text-white">
                🎧
              </div>
              <span className="text-[8px] text-neutral-300 ml-auto">Krisp Noise Reduction: ON</span>
            </div>
          </div>
        </div>
      );

    case 'howto-guild':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#17092c] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-purple-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Community Guild Creator</span>
            <div className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-500/20 text-[8px] font-mono text-purple-200">
              Step 1: Choose Template • Gaming, Study, Creator
            </div>
          </div>
        </div>
      );

    case 'howto-storage':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#241306] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-amber-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Storage Optimizer</span>
            <div className="flex items-center justify-between text-[8px] font-mono text-amber-300">
              <span>Cached Media: 1.2 GB</span>
              <span className="p-1 rounded bg-amber-600 text-white font-bold">Clear Cache</span>
            </div>
          </div>
        </div>
      );

    case 'howto-2fa':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#091b16] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-emerald-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-1.5">
              <Shield size={13} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-white">
                Two-Factor Authentication (2FA)
              </span>
            </div>
            <div className="text-[8px] font-mono text-emerald-300">
              Authenticator App Code: 849 201 • Active
            </div>
          </div>
        </div>
      );

    case 'safety-hero':
      return (
        <div className="w-full h-full p-6 flex items-center justify-center select-none bg-gradient-to-r from-[#3b2075] via-[#241352] to-[#120930] relative overflow-hidden group">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_70%)]" />

          {/* 3D Glass Crystal Shields with Eternal Crest matching Discord Screenshot 1 & 2 */}
          <div className="relative w-full max-w-2xl h-56 sm:h-72 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            {/* Left Small Glass Shield */}
            <div className="absolute left-8 sm:left-16 bottom-6 w-20 h-24 sm:w-28 sm:h-32 rounded-2xl bg-gradient-to-br from-purple-500/30 to-indigo-700/40 backdrop-blur-md border border-white/30 shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex items-center justify-center transform -rotate-12 z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-400 to-white/90 shadow flex items-center justify-center">
                <Shield size={20} className="text-purple-900" />
              </div>
            </div>

            {/* Center Massive Glowing Crystal Shield */}
            <div className="relative w-36 h-44 sm:w-52 sm:h-60 rounded-3xl bg-gradient-to-b from-indigo-500/40 via-purple-600/30 to-pink-500/20 backdrop-blur-xl border-2 border-white/50 shadow-[0_25px_60px_rgba(112,50,230,0.45)] flex flex-col items-center justify-center z-20 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.4),transparent_60%)]" />
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-white via-purple-100 to-indigo-200 shadow-2xl flex flex-col items-center justify-center p-3 relative z-10 border border-white">
                <Shield size={44} className="text-purple-700 animate-pulse" />
                <span className="text-[8px] font-black text-purple-900 tracking-wider uppercase mt-1">
                  TRUST &amp; SAFETY
                </span>
              </div>
              <div className="absolute bottom-3 text-[8px] font-mono text-purple-200 uppercase tracking-widest">
                ETERNAL DEFENSE
              </div>
            </div>

            {/* Right Medium Glass Shield */}
            <div className="absolute right-8 sm:right-16 bottom-6 w-24 h-28 sm:w-32 sm:h-36 rounded-2xl bg-gradient-to-bl from-pink-500/30 to-purple-700/40 backdrop-blur-md border border-white/30 shadow-[0_15px_35px_rgba(0,0,0,0.5)] flex items-center justify-center transform rotate-12 z-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-400 to-white/90 shadow flex items-center justify-center">
                <Shield size={24} className="text-pink-900" />
              </div>
            </div>
          </div>
        </div>
      );

    case 'safety-assurance':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#120a2e] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-indigo-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Zero-Knowledge Age Gate</span>
              <span className="text-[8px] font-mono text-indigo-300">Privacy Preserving</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-[16px]">
                🛡️
              </div>
              <div className="h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-[16px]">
                🔒
              </div>
              <div className="h-10 rounded-xl bg-teal-950/80 border border-teal-500/30 flex items-center justify-center text-[16px]">
                ✨
              </div>
            </div>
          </div>
        </div>
      );

    case 'safety-guardian':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#091534] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-blue-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Guardian &amp; Sentinel AI</span>
              <span className="text-[8px] font-mono text-emerald-400">Open Source</span>
            </div>
            <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-500/20 flex items-center justify-between text-[8px] font-mono text-blue-200">
              <span>Threat Mitigation Engine</span>
              <span className="text-emerald-300 font-bold">100% Proactive</span>
            </div>
          </div>
        </div>
      );

    case 'safety-wellbeing':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#071f16] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-emerald-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Digital Well-Being Center</span>
              <span className="text-[8px] font-mono text-emerald-300">Mindfulness Active</span>
            </div>
            <div className="flex items-center justify-around text-2xl">
              <span>🌱</span>
              <span>🪴</span>
              <span>🌿</span>
              <span>🌸</span>
            </div>
          </div>
        </div>
      );

    case 'safety-transparency':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#1a0c2e] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-purple-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Transparency Report Q2 2026</span>
            <div className="grid grid-cols-2 gap-2 text-[8px] font-mono">
              <div className="p-1 rounded bg-purple-950/60 border border-purple-500/20 text-purple-300">
                Spam Takedowns: 99.8%
              </div>
              <div className="p-1 rounded bg-purple-950/60 border border-purple-500/20 text-purple-300">
                Response Time: &lt;15m
              </div>
            </div>
          </div>
        </div>
      );

    case 'safety-matrix':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#0a182e] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-sky-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">
              Voice &amp; Video Safety Matrix
            </span>
            <div className="flex items-center gap-1.5 text-[8px] font-mono text-sky-200">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>10,000 Stage Capacity • Real-time Shield Active</span>
            </div>
          </div>
        </div>
      );

    case 'safety-youth':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#241706] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-amber-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Eternal Family Center</span>
            <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-500/20 text-[8px] font-mono text-amber-200 flex items-center justify-between">
              <span>Parental Dashboard</span>
              <span className="text-amber-400 font-bold">Protected</span>
            </div>
          </div>
        </div>
      );

    case 'safety-genz':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#240a2a] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-pink-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Healthy Chat Boundaries</span>
            <div className="flex items-center justify-between text-[8px] font-mono text-pink-200">
              <span>Ghost Ping Blocker</span>
              <span className="text-emerald-400 font-bold">Enabled</span>
            </div>
          </div>
        </div>
      );

    case 'safety-antiraid':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#0c1024] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-indigo-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">AutoMod Anti-Raid System</span>
              <span className="text-[8px] font-mono text-indigo-400">&lt;50ms Response</span>
            </div>
            <div className="p-1 rounded bg-indigo-950/60 border border-indigo-500/20 text-[8px] font-mono text-indigo-200">
              ⚡ 0 Malicious Incursions • 24/7 Heuristics
            </div>
          </div>
        </div>
      );

    case 'product-hero':
      return (
        <div className="w-full h-full p-4 sm:p-6 flex items-center justify-center select-none bg-gradient-to-r from-[#170e38] via-[#24114d] to-[#3a1d17] relative overflow-hidden group">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_70%)]" />

          {/* Split Screen Composition matching Discord Screenshot 1 & 2 */}
          <div className="relative w-full max-w-2xl h-56 sm:h-72 flex items-center justify-between gap-2 sm:gap-4 group-hover:scale-105 transition-transform duration-500">
            {/* Left: Eternal #guild-chat window */}
            <div className="flex-1 h-44 sm:h-56 rounded-2xl bg-[#120a28]/90 border border-purple-500/30 shadow-2xl p-2.5 sm:p-3 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center gap-1.5 border-b border-purple-500/20 pb-1.5 text-[8px] sm:text-[10px] font-bold text-white">
                <span className="text-purple-400 font-mono">#</span>
                <span>guild-chat</span>
              </div>
              <div className="space-y-1.5 text-[7px] sm:text-[8px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-purple-500 shrink-0" />
                  <div>
                    <span className="font-bold text-purple-300">Capitan: </span>
                    <span className="text-neutral-200">anyone wanna jump in?</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-pink-500 shrink-0" />
                  <div>
                    <span className="font-bold text-pink-300">Danyboi: </span>
                    <span className="text-neutral-200">i'm free, getting on</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300">Lokydoki: </span>
                    <span className="text-neutral-200">send an invite!</span>
                  </div>
                </div>
              </div>
              <div className="h-5 rounded bg-white/5 border border-white/10 px-2 flex items-center text-[7px] text-neutral-400">
                Message #guild-chat
              </div>
            </div>

            {/* Middle: Account Connected Bridge Badge */}
            <div className="shrink-0 flex flex-col items-center gap-1 z-10">
              <div className="px-2 py-1 rounded-xl bg-purple-600/90 border border-white/30 shadow-lg text-[7px] sm:text-[8px] font-mono text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Account Connected</span>
              </div>
              <div className="w-8 h-0.5 bg-gradient-to-r from-purple-500 to-amber-500" />
            </div>

            {/* Right: In-Game Guild Combat & Chat Overlay */}
            <div className="flex-1 h-44 sm:h-56 rounded-2xl bg-gradient-to-br from-[#241306] to-[#120803] border border-amber-500/30 shadow-2xl p-2.5 sm:p-3 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center gap-2 border-b border-amber-500/20 pb-1.5 text-[7px] sm:text-[9px] font-bold text-amber-300 uppercase">
                <span>Combat Log</span>
                <span className="ml-auto px-1.5 py-0.5 rounded bg-amber-600/40 text-amber-200 text-[7px]">
                  Guild
                </span>
              </div>
              <div className="space-y-1 font-mono text-[6px] sm:text-[8px] text-emerald-300">
                <div>[Guild] [Capitan]: anyone wanna jump in?</div>
                <div className="text-purple-300">[Guild] 💬 [Danyboi]: i'm free, getting on</div>
                <div>[Guild] [Lokydoki]: send an invite!</div>
                <div className="text-amber-300">[Guild] [Capitan]: sending now ⚔️</div>
              </div>
              <div className="h-4 rounded bg-black/40 px-2 flex items-center text-[6px] text-amber-400/70">
                ⚔️ Synced Guild Channel
              </div>
            </div>
          </div>
        </div>
      );

    case 'product-changelog-aug':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#091b3d] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-blue-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Changelog • Aug 2026</span>
              <span className="text-[8px] font-mono text-cyan-300">Major Release</span>
            </div>
            <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-500/20 text-[8px] font-mono text-blue-200 flex items-center justify-between">
              <span>🚀 4K 60FPS Screen Sharing • Soundboard Deck</span>
            </div>
          </div>
        </div>
      );

    case 'product-ai-assistant':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#190933] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-purple-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Eternal Assistant AI</span>
              <span className="text-[8px] font-mono text-purple-300">On-Device LLM</span>
            </div>
            <div className="flex items-center justify-around text-2xl">
              <span>🤖</span>
              <span>✨</span>
              <span>🐹</span>
              <span>🎙️</span>
            </div>
          </div>
        </div>
      );

    case 'product-patch-july':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#0d0926] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-indigo-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Patch Notes • July 2026</span>
            <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/20 text-[8px] font-mono text-indigo-200">
              ⚡ Faster Startup • Ultra-Low Battery Drain on macOS
            </div>
          </div>
        </div>
      );

    case 'product-spatial-vr':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#20092c] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-pink-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">Spatial VR Lounges</span>
              <span className="text-[8px] font-mono text-pink-300">3D Audio</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center text-[8px] font-mono text-white/80">
              <div className="p-1 rounded bg-white/10">🕶️ VR Headset</div>
              <div className="p-1 rounded bg-white/10">🖐️ Tracking</div>
              <div className="p-1 rounded bg-white/10">🌌 Spatial</div>
            </div>
          </div>
        </div>
      );

    case 'product-changelog-june':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#081a38] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-sky-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Changelog • June 2026</span>
            <div className="p-1.5 rounded-lg bg-sky-950/60 border border-sky-500/20 text-[8px] font-mono text-sky-200">
              -50% Memory Consumption on 100k+ Member Servers
            </div>
          </div>
        </div>
      );

    case 'product-soundboard':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#071d17] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-emerald-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Voice Channel Soundboard</span>
            <div className="flex items-center justify-around text-xl">
              <span className="p-1 rounded-lg bg-emerald-800/60">🎺</span>
              <span className="p-1 rounded-lg bg-purple-800/60">🎉</span>
              <span className="p-1 rounded-lg bg-pink-800/60">🥁</span>
              <span className="p-1 rounded-lg bg-amber-800/60">🔔</span>
            </div>
          </div>
        </div>
      );

    case 'product-4k-stream':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#240a20] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-rose-500/30 p-3 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white">4K 60FPS AV1 Screen Share</span>
              <span className="text-[8px] font-mono text-rose-400">Ultra-Low Latency</span>
            </div>
            <div className="p-1 rounded bg-rose-950/60 border border-rose-500/20 text-[8px] font-mono text-rose-200">
              Crisp 2160p Stream • Hardware Encoded
            </div>
          </div>
        </div>
      );

    case 'product-handoff':
      return (
        <div className="w-full h-full p-4 flex items-center justify-center select-none bg-[#241706] relative overflow-hidden">
          <div className="w-full h-full rounded-2xl border border-amber-500/30 p-3 flex flex-col justify-between shadow-xl">
            <span className="text-[10px] font-bold text-white">Cross-Device Call Handoff</span>
            <div className="flex items-center justify-between text-[8px] font-mono text-amber-300">
              <span>📱 Phone</span>
              <span>⟷ 0ms ⟷</span>
              <span>💻 PC Desktop</span>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
