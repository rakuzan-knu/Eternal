import React from 'react';
import {
  Apple,
  ChevronLeft,
  Phone,
  Video,
  Plus,
  Smile,
  Mic,
  Send,
  Play,
  CheckCheck,
  Signal,
  Wifi,
} from 'lucide-react';
import { triggerInstallerDownload } from '../data/downloadData';

export const DownloadMobileSection: React.FC<{
  heading: string;
  subtitle: string;
  appStoreLabel: string;
  googlePlayLabel: string;
  onDownloadNotice?: (pkg: string) => void;
}> = ({ heading, subtitle, appStoreLabel, googlePlayLabel, onDownloadNotice }) => {
  const handleMobileDownload = (store: string) => {
    triggerInstallerDownload(store === 'ios' ? 'eternal-ios.ipa' : 'eternal-android.apk');
    if (onDownloadNotice)
      onDownloadNotice(store === 'ios' ? 'iOS (App Store)' : 'Android (Google Play)');
  };

  return (
    <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Column: Soft Purple Gradient Card with Real iPhone Proportions & 1:1 Messenger Mockup */}
        <div className="lg:col-span-6 rounded-[44px] bg-gradient-to-br from-[#7289da] via-[#8598e8] to-[#a29bfe] p-6 sm:p-12 shadow-[0_30px_90px_rgba(114,137,218,0.35)] flex items-center justify-center relative overflow-hidden select-none">
          {/* Realistic iPhone Device Mockup */}
          <div className="w-full max-w-[320px] sm:max-w-[340px] rounded-[48px] bg-[#0c091e] border-[6px] border-[#221c38] shadow-[0_35px_80px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col min-h-[580px] sm:min-h-[620px] relative">
            {/* 1:1 iPhone Top Status Bar with Dynamic Island */}
            <div className="px-6 pt-3 pb-2 bg-[#090615] flex items-center justify-between text-[12px] font-semibold text-neutral-200 shrink-0 border-b border-white/[0.04]">
              {/* Time */}
              <span className="tracking-tight font-medium">9:41</span>

              {/* Dynamic Island (Pill with camera dot) */}
              <div className="w-24 h-5 bg-black rounded-full flex items-center justify-end pr-2 border border-white/[0.08] shadow-inner">
                <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a24] border border-white/10" />
              </div>

              {/* Cellular, Wi-Fi & Battery Status Icons */}
              <div className="flex items-center gap-1.5 text-neutral-300">
                <Signal size={13} className="text-neutral-200" />
                <Wifi size={13} className="text-neutral-200" />
                <div className="w-5 h-2.5 border border-neutral-300 rounded-[4px] p-0.5 flex items-center">
                  <div className="w-full h-full bg-white rounded-[2px]" />
                </div>
              </div>
            </div>

            {/* Mobile Chat Header */}
            <div className="px-4 py-3 bg-[#0e0a22] border-b border-white/[0.08] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center text-purple-400 font-bold text-xs cursor-pointer">
                  <ChevronLeft size={18} />
                  <span className="bg-purple-600/30 text-purple-300 text-[10px] px-1.5 py-0.2 rounded-full border border-purple-500/30 ml-0.5">
                    2
                  </span>
                </div>
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center font-bold text-xs text-white">
                    N
                  </div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-[#0e0a22]" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-tight">Nikolaj Agh</span>
                  <span className="text-[10px] text-green-400 font-medium">Active now</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-neutral-300">
                <Phone size={15} className="cursor-pointer hover:text-white" />
                <Video size={15} className="cursor-pointer hover:text-white" />
              </div>
            </div>

            {/* Mobile Message Stream */}
            <div className="p-3.5 flex flex-col gap-3 bg-[#090615] flex-1 text-left overflow-y-auto">
              {/* Date Separator */}
              <div className="self-center px-3 py-0.5 rounded-full bg-white/[0.04] text-[9px] font-bold text-neutral-400">
                Today
              </div>

              {/* Received Message 1 */}
              <div className="flex items-start gap-2 max-w-[85%] self-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-1">
                  N
                </div>
                <div className="flex flex-col gap-1">
                  <div className="p-3 rounded-2xl rounded-tl-sm bg-[#16161c] border border-white/[0.08] text-neutral-200 text-[11px] leading-relaxed shadow-md">
                    Hey! Check out this new update for our mobile messenger 🔥
                  </div>
                  <span className="text-[9px] text-neutral-500 pl-1">14:15</span>
                </div>
              </div>

              {/* Received Message 2 (Audio Voice Note) */}
              <div className="flex items-start gap-2 max-w-[85%] self-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-1">
                  N
                </div>
                <div className="p-2.5 rounded-2xl rounded-tl-sm bg-[#16161c] border border-white/[0.08] flex items-center gap-2.5 shadow-md">
                  <div className="w-6 h-6 rounded-full bg-[#5822b4] flex items-center justify-center text-white shrink-0">
                    <Play size={10} className="fill-white ml-0.5" />
                  </div>
                  {/* Stylized Audio Waveform */}
                  <div className="flex items-center gap-0.5 h-5">
                    {[40, 70, 90, 60, 100, 80, 50, 95, 75, 45, 85, 65].map((h, idx) => (
                      <div
                        key={idx}
                        style={{ height: `${h}%` }}
                        className={`w-1 rounded-full ${
                          idx < 5 ? 'bg-purple-400' : 'bg-neutral-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-neutral-400 font-mono">0:28</span>
                </div>
              </div>

              {/* Sent Message 1 */}
              <div className="flex flex-col items-end max-w-[85%] self-end text-right">
                <div className="p-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#5822b4] to-[#7c3aed] text-white text-[11px] leading-relaxed shadow-md font-medium">
                  Works super smoothly on iOS & Android! 💜
                </div>
                <div className="flex items-center gap-1 text-[9px] text-neutral-400 mt-0.5 pr-1">
                  <span>14:16</span>
                  <CheckCheck size={11} className="text-purple-300" />
                </div>
              </div>

              {/* Sent Message 2 */}
              <div className="flex flex-col items-end max-w-[85%] self-end text-right">
                <div className="p-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#5822b4] to-[#7c3aed] text-white text-[11px] leading-relaxed shadow-md font-medium">
                  Can’t wait for everyone to try it 🚀
                </div>
                <div className="flex items-center gap-1 text-[9px] text-neutral-400 mt-0.5 pr-1">
                  <span>14:18</span>
                  <CheckCheck size={11} className="text-purple-300" />
                </div>
              </div>

              {/* Reaction Badges Container */}
              <div className="self-end flex items-center gap-1 pr-1">
                <span className="px-2 py-0.5 rounded-full bg-purple-950/70 border border-purple-800/40 text-[10px] text-purple-200 font-bold flex items-center gap-1">
                  🔥 <span>4</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/70 border border-purple-800/40 text-[10px] text-purple-200 font-bold flex items-center gap-1">
                  ✨ <span>2</span>
                </span>
              </div>
            </div>

            {/* Bottom Mobile Messenger Input Bar */}
            <div className="p-2.5 bg-[#0e0a22] border-t border-white/[0.08] flex items-center justify-between gap-2 shrink-0">
              <div className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/15 flex items-center justify-center text-neutral-300 cursor-pointer">
                <Plus size={14} />
              </div>
              <div className="flex-1 px-3 py-1.5 rounded-full bg-[#16161c] border border-white/[0.06] text-[11px] text-neutral-400 text-left flex items-center justify-between">
                <span>Message...</span>
                <Smile size={14} className="text-neutral-400 hover:text-white cursor-pointer" />
              </div>
              <div className="w-7 h-7 rounded-full bg-[#5822b4] text-white flex items-center justify-center cursor-pointer shadow-md">
                <Mic size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Heading, Subtitle & 2 Mobile Store Buttons */}
        <div className="lg:col-span-6 flex flex-col gap-8 text-left">
          <div className="flex flex-col gap-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight">
              {heading}
            </h2>
            <p className="text-base sm:text-lg text-neutral-300 leading-relaxed font-normal">
              {subtitle}
            </p>
          </div>

          {/* App Store & Google Play Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            {/* 1. App Store */}
            <button
              type="button"
              onClick={() => handleMobileDownload('ios')}
              className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-100 text-black text-xs font-black tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <Apple size={18} className="fill-black" />
              <span>{appStoreLabel}</span>
            </button>

            {/* 2. Google Play */}
            <button
              type="button"
              onClick={() => handleMobileDownload('android')}
              className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-100 text-black text-xs font-black tracking-wide shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              {/* Google Play Icon */}
              <svg className="w-4 h-4 fill-black" viewBox="0 0 24 24">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a1.996 1.996 0 0 1-.61-.914V2.728c0-.341.137-.667.61-.914zM15.207 13.414l2.457 2.457-11.455 6.612 8.998-9.069zm0-2.828L6.209 1.517l11.455 6.612-2.457 2.457zm1.414 1.414l3.568 2.06c.725.419.725 1.101 0 1.52l-3.568 2.06-2.121-2.121 2.121-3.519z" />
              </svg>
              <span>{googlePlayLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
