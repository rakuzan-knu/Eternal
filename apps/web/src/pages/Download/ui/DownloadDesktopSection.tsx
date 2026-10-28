import React from 'react';
import {
  Search,
  Plus,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Mic,
  Send,
  Play,
  CheckCheck,
  Folder,
  MessageSquare,
  Home,
  Compass,
  Bell,
  PlusSquare,
} from 'lucide-react';

export const DownloadDesktopSection: React.FC<{
  heading: string;
  subtitle: string;
  macosLabel: string;
  windowsLabel: string;
  linuxLabel: string;
  unavailableLabel: string;
}> = ({ heading, subtitle, macosLabel, windowsLabel, linuxLabel, unavailableLabel }) => {
  return (
    <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Column: Heading, Subtitle & 3 OS Dropdown Buttons */}
        <div className="lg:col-span-5 flex flex-col gap-8 text-left">
          <div className="flex flex-col gap-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight">
              {heading}
            </h2>
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
              {subtitle}
            </p>
          </div>

          <ul className="flex flex-wrap items-center gap-3.5">
            {[macosLabel, windowsLabel, linuxLabel].map((label) => (
              <li key={label} className="rounded-2xl border border-white/15 px-5 py-3">
                <span className="block text-sm font-semibold text-white">{label}</span>
                <span className="text-sm text-neutral-300">{unavailableLabel}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Column: Tall Mint Green Rounded Card with 1:1 Eternal Messenger Desktop Mockup */}
        <div
          aria-hidden="true"
          inert
          className="lg:col-span-7 rounded-[44px] bg-gradient-to-br from-[#38f2a5] via-[#20d885] to-[#10b981] p-4 sm:p-7 lg:p-9 shadow-[0_30px_90px_rgba(32,216,133,0.35)] relative overflow-hidden select-none"
        >
          {/* Internal Desktop Window Mockup with Full Messenger UI */}
          <div className="rounded-[28px] bg-[#09090b] border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col h-[560px] sm:h-[620px]">
            {/* Top Mac Window Bar */}
            <div className="h-9 bg-[#111114] border-b border-white/[0.08] px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
                <span className="font-bold text-white">Eternal Messenger</span>
                <span className="text-neutral-500">•</span>
                <span className="text-[11px] text-neutral-400">Nikolaj Agh</span>
              </div>
              <div className="w-10" />
            </div>

            {/* Messenger Layout: 1. Railway Rail + 2. Chats Panel + 3. Active Chat View */}
            <div className="grid grid-cols-12 flex-1 bg-[#09090b] overflow-hidden">
              {/* 1. Left Railway Rail */}
              <div className="hidden sm:flex col-span-1 bg-[#121216] border-r border-white/[0.06] flex-col items-center justify-between py-4">
                <div className="flex flex-col items-center gap-4">
                  {/* Eternal Logo Icon */}
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center font-black text-sm text-white shadow-md">
                    E
                  </div>
                  {/* Rail Navigation Icons */}
                  <div className="flex flex-col gap-3.5 text-neutral-400 mt-2">
                    <div className="p-1.5 hover:text-white transition-colors cursor-pointer">
                      <Home size={18} />
                    </div>
                    <div className="p-1.5 hover:text-white transition-colors cursor-pointer">
                      <Search size={18} />
                    </div>
                    <div className="p-1.5 hover:text-white transition-colors cursor-pointer">
                      <Compass size={18} />
                    </div>
                    {/* Active Message Tab */}
                    <div className="p-1.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                      <MessageSquare size={18} />
                    </div>
                    <div className="p-1.5 hover:text-white transition-colors cursor-pointer">
                      <Bell size={18} />
                    </div>
                    <div className="p-1.5 hover:text-white transition-colors cursor-pointer">
                      <PlusSquare size={18} />
                    </div>
                  </div>
                </div>

                {/* Bottom User Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white border border-white/20">
                  N
                </div>
              </div>

              {/* 2. Chats List Panel */}
              <div className="col-span-5 sm:col-span-4 bg-[#0e0e12] border-r border-white/[0.06] p-3 flex flex-col gap-3 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-white tracking-tight">Chats</span>
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Plus size={15} className="cursor-pointer hover:text-white" />
                  </div>
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-neutral-400">
                  <Search size={13} className="text-neutral-500 shrink-0" />
                  <span className="truncate text-[11px]">Search in Messenger</span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <span className="px-2.5 py-1 rounded-full bg-[#5822b4] text-white">All</span>
                  <span className="px-2 py-1 rounded-full bg-white/[0.04] text-neutral-400 hover:text-white flex items-center gap-1">
                    <Folder size={10} />
                    <span>Unread</span>
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white/[0.04] text-neutral-400 hover:text-white flex items-center gap-1">
                    <Folder size={10} />
                    <span>Groups</span>
                  </span>
                </div>

                {/* Conversations List */}
                <div
                  role="region"
                  aria-label="Conversation preview"
                  className="flex flex-col gap-1 overflow-y-auto pr-0.5"
                >
                  {/* Chat 1 (Active / Selected) */}
                  <div className="p-2.5 rounded-2xl bg-white/[0.08] border border-purple-500/30 flex items-center gap-2.5 cursor-pointer">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center font-bold text-xs text-white">
                        N
                      </div>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#0e0e12]" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate">Nikolaj Agh</span>
                        <span className="text-[9px] text-purple-300 font-medium">14:20</span>
                      </div>
                      <p className="text-[10px] text-neutral-300 truncate font-medium">
                        Ready for the public rollout! 🚀
                      </p>
                    </div>
                  </div>

                  {/* Chat 2 */}
                  <div className="p-2.5 rounded-2xl hover:bg-white/[0.03] flex items-center gap-2.5 cursor-pointer transition-colors">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center font-bold text-xs text-white">
                        E
                      </div>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#0e0e12]" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate">Elena Rostova</span>
                        <span className="text-[9px] text-neutral-500">13:58</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate">
                        🎙️ Voice message (0:42)
                      </p>
                    </div>
                  </div>

                  {/* Chat 3 */}
                  <div className="p-2.5 rounded-2xl hover:bg-white/[0.03] flex items-center gap-2.5 cursor-pointer transition-colors">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                        M
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate">Mihal Core</span>
                        <span className="text-[9px] text-neutral-500">12:15</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate">
                        Check out the new design system
                      </p>
                    </div>
                  </div>

                  {/* Chat 4 (Group) */}
                  <div className="p-2.5 rounded-2xl hover:bg-white/[0.03] flex items-center gap-2.5 cursor-pointer transition-colors">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-xs text-white">
                        👥
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate">
                          Core Engineers
                        </span>
                        <span className="text-[9px] text-neutral-500">11:40</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate">
                        Ilya: Pushed the latest build
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Right Active Chat Feed */}
              <div className="col-span-7 sm:col-span-7 bg-[#070709] p-4 flex flex-col justify-between overflow-hidden">
                {/* Chat Header */}
                <div className="pb-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center font-bold text-xs text-white">
                        N
                      </div>
                      <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-[#070709]" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-xs text-white">Nikolaj Agh</span>
                      <span className="text-[9px] text-green-400 font-medium">Online</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-neutral-400">
                    <Phone size={15} className="cursor-pointer hover:text-white" />
                    <Video size={15} className="cursor-pointer hover:text-white" />
                    <MoreVertical size={15} className="cursor-pointer hover:text-white" />
                  </div>
                </div>

                {/* Message Stream */}
                <div
                  role="region"
                  aria-label="Message preview"
                  className="flex flex-col gap-3 py-3 overflow-y-auto"
                >
                  {/* Date Pill */}
                  <div className="self-center px-3 py-0.5 rounded-full bg-white/[0.04] text-[9px] font-bold text-neutral-400">
                    Today, August 28
                  </div>

                  {/* Received Message 1 */}
                  <div className="flex items-start gap-2 max-w-[85%] self-start text-left">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-1">
                      N
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="p-3 rounded-2xl rounded-tl-sm bg-[#16161c] border border-white/[0.08] text-neutral-200 text-xs leading-relaxed shadow-md">
                        Hey team! Just updated our messenger architecture with WebRTC & WebSockets.
                        Check it out!
                      </div>
                      {/* Reaction Badges */}
                      <div className="flex items-center gap-1 pl-1">
                        <span className="px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-800/40 text-[10px] text-purple-300 font-bold flex items-center gap-1">
                          🔥 <span>3</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-800/40 text-[10px] text-purple-300 font-bold flex items-center gap-1">
                          💜 <span>2</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Received Message 2 (Audio Voice Note) */}
                  <div className="flex items-start gap-2 max-w-[85%] self-start text-left">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-1">
                      N
                    </div>
                    <div className="p-2.5 rounded-2xl rounded-tl-sm bg-[#16161c] border border-white/[0.08] flex items-center gap-3 shadow-md">
                      <div className="w-7 h-7 rounded-full bg-[#5822b4] flex items-center justify-center text-white shrink-0">
                        <Play size={12} className="fill-white ml-0.5" />
                      </div>
                      {/* Stylized Audio Waveform */}
                      <div className="flex items-center gap-0.5 h-6">
                        {[40, 70, 90, 60, 100, 80, 50, 95, 75, 45, 85, 65, 90, 40, 70].map(
                          (h, idx) => (
                            <div
                              key={idx}
                              style={{ height: `${h}%` }}
                              className={`w-1 rounded-full ${
                                idx < 6 ? 'bg-purple-400' : 'bg-neutral-600'
                              }`}
                            />
                          ),
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">0:42</span>
                    </div>
                  </div>

                  {/* Sent Message 1 */}
                  <div className="flex flex-col items-end max-w-[85%] self-end text-right">
                    <div className="p-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#5822b4] to-[#7c3aed] text-white text-xs leading-relaxed shadow-md font-medium">
                      Looks incredible! Super smooth animations and lightning-fast audio.
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-neutral-400 mt-1 pr-1">
                      <span>14:18</span>
                      <CheckCheck size={12} className="text-purple-300" />
                    </div>
                  </div>

                  {/* Sent Message 2 */}
                  <div className="flex flex-col items-end max-w-[85%] self-end text-right">
                    <div className="p-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#5822b4] to-[#7c3aed] text-white text-xs leading-relaxed shadow-md font-medium">
                      Ready for the public rollout! 🚀
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-neutral-400 mt-1 pr-1">
                      <span>14:20</span>
                      <CheckCheck size={12} className="text-purple-300" />
                    </div>
                  </div>
                </div>

                {/* Bottom Input Bar */}
                <div className="p-2 rounded-2xl bg-[#14141a] border border-white/[0.08] flex items-center justify-between gap-2">
                  <div className="w-7 h-7 rounded-xl bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-neutral-400 cursor-pointer">
                    <Plus size={14} />
                  </div>
                  <div className="flex-1 text-[11px] text-neutral-400 text-left px-2">
                    Message Nikolaj Agh...
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Smile size={16} className="cursor-pointer hover:text-white" />
                    <Mic size={16} className="cursor-pointer hover:text-white" />
                    <div className="w-7 h-7 rounded-xl bg-[#5822b4] text-white flex items-center justify-center cursor-pointer shadow-md">
                      <Send size={12} className="fill-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
