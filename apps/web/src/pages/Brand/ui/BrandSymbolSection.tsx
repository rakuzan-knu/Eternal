import React from 'react';
import { Download } from 'lucide-react';
import { downloadSvgFile, LOGO_SVGS } from '../data/brandingData';

export const BrandSymbolSection: React.FC<{
  heading: string;
  subtitle: string;
  symbolNoBgLabel: string;
  symbolRoundedLabel: string;
  downloadSvgText: string;
}> = ({ heading, subtitle, symbolNoBgLabel, symbolRoundedLabel, downloadSvgText }) => {
  return (
    <section className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text flex flex-col gap-12">
      {/* Section Header */}
      <div className="text-left">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase mb-3">
          {heading}
        </h2>
        <p className="text-base sm:text-lg text-neutral-300 font-medium max-w-3xl">{subtitle}</p>
      </div>

      {/* Row 1: Symbol "E" Without Background (Footer Style) */}
      <div className="flex flex-col gap-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
          {symbolNoBgLabel}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* 1. White E on Dark Card */}
          <div className="group relative h-56 rounded-[32px] bg-[#120f24] border border-white/[0.08] hover:border-purple-500/40 shadow-xl flex items-center justify-center p-6 transition-all duration-300 overflow-hidden">
            <span className="text-7xl font-black text-white select-none transition-transform duration-300 group-hover:scale-110">
              E
            </span>

            <button
              type="button"
              onClick={() => downloadSvgFile(LOGO_SVGS.symbolNoBgWhite, 'eternal-symbol-white.svg')}
              className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg flex items-center gap-1.5 cursor-pointer text-xs font-bold"
              title="Download White Symbol E SVG"
            >
              <Download size={14} />
              <span className="hidden sm:inline">{downloadSvgText}</span>
            </button>
          </div>

          {/* 2. Black E on White Card */}
          <div className="group relative h-56 rounded-[32px] bg-[#ffffff] border border-black/10 hover:border-purple-500/50 shadow-xl flex items-center justify-center p-6 transition-all duration-300 overflow-hidden">
            <span className="text-7xl font-black text-[#000000] select-none transition-transform duration-300 group-hover:scale-110">
              E
            </span>

            <button
              type="button"
              onClick={() => downloadSvgFile(LOGO_SVGS.symbolNoBgBlack, 'eternal-symbol-black.svg')}
              className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-black/10 hover:bg-black/20 text-black backdrop-blur-md border border-black/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg flex items-center gap-1.5 cursor-pointer text-xs font-bold"
              title="Download Black Symbol E SVG"
            >
              <Download size={14} />
              <span className="hidden sm:inline">{downloadSvgText}</span>
            </button>
          </div>

          {/* 3. Purple E on Dark Card */}
          <div className="group relative h-56 rounded-[32px] bg-[#120f24] border border-purple-500/30 hover:border-purple-400/60 shadow-xl flex items-center justify-center p-6 transition-all duration-300 overflow-hidden">
            <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 select-none transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              E
            </span>

            <button
              type="button"
              onClick={() =>
                downloadSvgFile(LOGO_SVGS.symbolNoBgPurple, 'eternal-symbol-purple.svg')
              }
              className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-white backdrop-blur-md border border-purple-400/30 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg flex items-center gap-1.5 cursor-pointer text-xs font-bold"
              title="Download Purple Symbol E SVG"
            >
              <Download size={14} />
              <span className="hidden sm:inline">{downloadSvgText}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Symbol "E" With Rounded Background (Navbar / App Icon Style) */}
      <div className="flex flex-col gap-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300">
          {symbolRoundedLabel}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* 1. Dark App Icon on Dark Card */}
          <div className="group relative h-56 rounded-[32px] bg-[#120f24] border border-white/[0.08] hover:border-purple-500/40 shadow-xl flex items-center justify-center p-6 transition-all duration-300 overflow-hidden">
            <div className="w-20 h-20 rounded-[24px] bg-[#07050f] border-2 border-purple-500/50 flex items-center justify-center text-4xl font-black text-white shadow-xl transition-transform duration-300 group-hover:scale-110">
              E
            </div>

            <button
              type="button"
              onClick={() =>
                downloadSvgFile(LOGO_SVGS.iconRoundedDark, 'eternal-app-icon-dark.svg')
              }
              className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg flex items-center gap-1.5 cursor-pointer text-xs font-bold"
              title="Download Dark App Icon SVG"
            >
              <Download size={14} />
              <span className="hidden sm:inline">{downloadSvgText}</span>
            </button>
          </div>

          {/* 2. White App Icon on White Card */}
          <div className="group relative h-56 rounded-[32px] bg-[#ffffff] border border-black/10 hover:border-purple-500/50 shadow-xl flex items-center justify-center p-6 transition-all duration-300 overflow-hidden">
            <div className="w-20 h-20 rounded-[24px] bg-[#000000] flex items-center justify-center text-4xl font-black text-white shadow-xl transition-transform duration-300 group-hover:scale-110">
              E
            </div>

            <button
              type="button"
              onClick={() =>
                downloadSvgFile(LOGO_SVGS.iconRoundedWhite, 'eternal-app-icon-white.svg')
              }
              className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-black/10 hover:bg-black/20 text-black backdrop-blur-md border border-black/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg flex items-center gap-1.5 cursor-pointer text-xs font-bold"
              title="Download White App Icon SVG"
            >
              <Download size={14} />
              <span className="hidden sm:inline">{downloadSvgText}</span>
            </button>
          </div>

          {/* 3. Signature Gradient App Icon on Dark Card */}
          <div className="group relative h-56 rounded-[32px] bg-[#120f24] border border-purple-500/30 hover:border-purple-400/60 shadow-xl flex items-center justify-center p-6 transition-all duration-300 overflow-hidden">
            <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-4xl font-black text-white shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-transform duration-300 group-hover:scale-110">
              E
            </div>

            <button
              type="button"
              onClick={() =>
                downloadSvgFile(LOGO_SVGS.iconRoundedPurple, 'eternal-app-icon-signature.svg')
              }
              className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-white backdrop-blur-md border border-purple-400/30 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg flex items-center gap-1.5 cursor-pointer text-xs font-bold"
              title="Download Signature App Icon SVG"
            >
              <Download size={14} />
              <span className="hidden sm:inline">{downloadSvgText}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
