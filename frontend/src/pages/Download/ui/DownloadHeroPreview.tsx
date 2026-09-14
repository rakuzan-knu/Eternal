import React from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  Headphones,
  Radio,
  Video,
  MonitorUp,
  PhoneOff,
  Smile,
  MessageSquare,
  Users,
  Grid,
  Signal,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { BrandMascotAnimated3D } from '../../Brand/ui/BrandIllustrations';
import { DropdownDeveloperMascot } from '../../Privacy/ui/PrivacyIllustrations';

export const DownloadHeroPreview: React.FC = () => {
  return (
    <div className="relative w-full max-w-5xl mx-auto pt-6 select-none">
      {/* 3D Developer Mascot on Top Right with Levitation */}
      <div className="hidden lg:block absolute -top-12 -right-8 pointer-events-none z-30 drop-shadow-2xl">
        <DropdownDeveloperMascot className="w-28 h-28 xl:w-36 xl:h-36" />
      </div>

      {/* 3D Cyber-Wumpus Mascot on Bottom Left */}
      <div className="hidden lg:block absolute -bottom-10 -left-12 pointer-events-none z-40 drop-shadow-2xl">
        <BrandMascotAnimated3D className="w-36 h-36 xl:w-44 xl:h-44" />
      </div>

      {/* Main Desktop App Frame */}
      <div className="rounded-[32px] sm:rounded-[38px] bg-[#0c091e]/95 border-2 border-purple-500/30 shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden relative backdrop-blur-2xl">
        {/* Window Title Bar */}
        <div className="h-9 bg-[#07050f] border-b border-white/[0.08] px-4 flex items-center justify-between text-xs text-neutral-400 font-mono">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Eternal • Gametime Live
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[10px]">v2.4.0</span>
          </div>
        </div>

        {/* Desktop Interface Body */}
        <div className="grid grid-cols-12 min-h-[380px] sm:min-h-[460px] bg-[#090615]">
          {/* Server / Channel Left Sidebar */}
          <div className="hidden md:flex md:col-span-4 lg:col-span-3 border-r border-white/[0.08] bg-[#0d0920] p-3.5 flex-col justify-between">
            <div className="flex flex-col gap-3">
              {/* Guild Header */}
              <div className="p-3 rounded-2xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-sm text-white shadow-md">
                    E
                  </div>
                  <span className="font-black text-xs text-white">Eternal Squad</span>
                </div>
                <Sparkles size={13} className="text-yellow-400" />
              </div>

              {/* Channels List */}
              <div className="flex flex-col gap-1 text-[11px] text-neutral-300 font-medium">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Text Channels
                </div>
                <div className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] text-white flex items-center gap-2">
                  <span className="text-purple-400 font-bold">#</span>
                  <span>announcements</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-xl hover:bg-white/[0.03] text-neutral-300 flex items-center gap-2">
                  <span className="text-purple-400 font-bold">#</span>
                  <span>general-chat</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-xl hover:bg-white/[0.03] text-neutral-300 flex items-center gap-2">
                  <span className="text-purple-400 font-bold">#</span>
                  <span>gaming-clips</span>
                </div>

                <div className="px-2.5 py-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Voice Lounges
                </div>
                <div className="px-2.5 py-1.5 rounded-xl bg-green-950/40 border border-green-800/40 text-green-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 size={12} className="text-green-400" />
                    <span className="font-bold">Gametime & Music</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full bg-green-500/20 text-[9px] font-bold">
                    LIVE
                  </span>
                </div>
              </div>
            </div>

            {/* User Bottom Bar */}
            <div className="p-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  N
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white">Nikolaj</span>
                  <span className="text-[9px] text-green-400">Online</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-neutral-400">
                <Mic size={13} />
                <Headphones size={13} />
              </div>
            </div>
          </div>

          {/* Main Stage: Live Streaming & Video Feeds */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9 p-4 sm:p-6 flex flex-col justify-between gap-4 bg-gradient-to-br from-[#0c091e] to-[#07050f]">
            {/* Top Stream Tile: 3D Gaming / Cyber Screen */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-amber-700/40 via-orange-900/30 to-purple-950/40 border border-purple-500/30 aspect-video flex items-center justify-center shadow-inner">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.15),transparent_70%)]" />

              {/* Stream Title Tag */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2 text-xs font-bold text-white">
                <Radio size={12} className="text-red-400 animate-pulse" />
                <span>Cyberpunk Arena 2077</span>
              </div>

              {/* Center Game Graphic Mockup */}
              <div className="flex flex-col items-center gap-2 text-center p-6 select-none">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-2xl font-black text-white shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                  🎮
                </div>
                <span className="text-base sm:text-lg font-black text-white tracking-tight">
                  Live Game Broadcast • 60 FPS 4K
                </span>
              </div>
            </div>

            {/* Bottom 4 Participant Video Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* User 1 */}
              <div className="p-3 rounded-2xl bg-[#140f2e] border border-green-500/40 flex flex-col items-center gap-1.5 shadow-md">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  N
                </div>
                <span className="text-[11px] font-bold text-white">Nikolaj</span>
                <span className="text-[9px] text-green-400 font-mono">Speaking...</span>
              </div>

              {/* User 2 */}
              <div className="p-3 rounded-2xl bg-[#140f2e] border border-white/[0.08] flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  M
                </div>
                <span className="text-[11px] font-bold text-white">Mihal</span>
                <span className="text-[9px] text-neutral-400 font-mono">Muted</span>
              </div>

              {/* User 3 */}
              <div className="p-3 rounded-2xl bg-[#140f2e] border border-white/[0.08] flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
                  I
                </div>
                <span className="text-[11px] font-bold text-white">Ilya</span>
                <span className="text-[9px] text-neutral-400 font-mono">Listening</span>
              </div>

              {/* User 4 */}
              <div className="p-3 rounded-2xl bg-[#140f2e] border border-white/[0.08] flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-xs font-bold text-white">
                  E
                </div>
                <span className="text-[11px] font-bold text-white">Elena</span>
                <span className="text-[9px] text-neutral-400 font-mono">Listening</span>
              </div>
            </div>

            {/* Bottom Stream Action Controls Bar */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <div className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/10 text-white cursor-pointer transition-colors">
                <Mic size={15} />
              </div>
              <div className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/10 text-white cursor-pointer transition-colors">
                <Video size={15} />
              </div>
              <div className="p-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/10 text-white cursor-pointer transition-colors">
                <MonitorUp size={15} />
              </div>
              <div className="p-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-lg transition-colors">
                <PhoneOff size={15} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
