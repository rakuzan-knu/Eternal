import React from 'react';
import { Download } from 'lucide-react';
import { downloadSvgFile, LOGO_SVGS } from '../data/brandingData';

export const BrandLogoSection: React.FC<{
  heading: string;
  subtitle: string;
  downloadSvgText: string;
}> = ({ heading, subtitle, downloadSvgText }) => {
  return (
    <section
      id="logo-section"
      className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text"
    >
      {/* Section Header */}
      <div className="text-left mb-10">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-3">
          {heading}
        </h2>
        <p className="text-base sm:text-lg text-neutral-300 font-medium max-w-3xl">{subtitle}</p>
      </div>

      {/* 3 Large Logo Display Cards (Dark, White, Brand Purple) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* 1. Dark Card with White Logo */}
        <div className="group relative h-64 sm:h-72 rounded-[36px] bg-[#120f24] border border-white/[0.08] hover:border-purple-500/40 shadow-2xl flex items-center justify-center p-8 transition-all duration-300 overflow-hidden">
          {/* Logo Visual */}
          <div className="flex items-center gap-3.5 select-none transition-transform duration-300 group-hover:scale-105">
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-2xl font-black text-[#07050f] shadow-lg">
              E
            </div>
            <span className="text-3xl font-black tracking-tight text-white font-sans">Eternal</span>
          </div>

          {/* Download Floating Action Button */}
          <button
            type="button"
            onClick={() => downloadSvgFile(LOGO_SVGS.fullWhite, 'eternal-logo-white.svg')}
            className="absolute bottom-5 right-5 p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg flex items-center gap-2 cursor-pointer text-xs font-bold"
            title="Download White Logo SVG"
          >
            <Download size={16} />
            <span className="hidden sm:inline">{downloadSvgText}</span>
          </button>
        </div>

        {/* 2. Crisp White Card with Black Logo */}
        <div className="group relative h-64 sm:h-72 rounded-[36px] bg-[#ffffff] border border-black/10 hover:border-purple-500/50 shadow-2xl flex items-center justify-center p-8 transition-all duration-300 overflow-hidden">
          {/* Logo Visual */}
          <div className="flex items-center gap-3.5 select-none transition-transform duration-300 group-hover:scale-105">
            <div className="w-14 h-14 rounded-2xl bg-[#000000] flex items-center justify-center text-2xl font-black text-white shadow-md">
              E
            </div>
            <span className="text-3xl font-black tracking-tight text-[#000000] font-sans">
              Eternal
            </span>
          </div>

          {/* Download Floating Action Button */}
          <button
            type="button"
            onClick={() => downloadSvgFile(LOGO_SVGS.fullBlack, 'eternal-logo-black.svg')}
            className="absolute bottom-5 right-5 p-3 rounded-2xl bg-black/10 hover:bg-black/20 text-black backdrop-blur-md border border-black/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg flex items-center gap-2 cursor-pointer text-xs font-bold"
            title="Download Black Logo SVG"
          >
            <Download size={16} />
            <span className="hidden sm:inline">{downloadSvgText}</span>
          </button>
        </div>

        {/* 3. Deep Card with Brand Purple Logo */}
        <div className="group relative h-64 sm:h-72 rounded-[36px] bg-[#120f24] border border-purple-500/30 hover:border-purple-400/60 shadow-2xl flex items-center justify-center p-8 transition-all duration-300 overflow-hidden">
          {/* Logo Visual */}
          <div className="flex items-center gap-3.5 select-none transition-transform duration-300 group-hover:scale-105">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-2xl font-black text-white shadow-[0_0_25px_rgba(168,85,247,0.5)]">
              E
            </div>
            <span className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-purple-200 to-pink-200 font-sans">
              Eternal
            </span>
          </div>

          {/* Download Floating Action Button */}
          <button
            type="button"
            onClick={() => downloadSvgFile(LOGO_SVGS.fullPurple, 'eternal-logo-purple.svg')}
            className="absolute bottom-5 right-5 p-3 rounded-2xl bg-purple-600/30 hover:bg-purple-600/50 text-white backdrop-blur-md border border-purple-400/30 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg flex items-center gap-2 cursor-pointer text-xs font-bold"
            title="Download Purple Logo SVG"
          >
            <Download size={16} />
            <span className="hidden sm:inline">{downloadSvgText}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
