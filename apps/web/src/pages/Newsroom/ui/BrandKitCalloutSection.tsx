import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BrandMascotAnimated3D } from '../../Brand/ui/BrandIllustrations';
import { EternalCrown3D, EternalCoin3D } from '../../Company/ui/CompanyIllustrations';
import { EternalTrophy3D, EternalPickaxe3D } from './NewsroomIllustrations';

/**
 * 3D Floating Green Sprout Leaf (Directly above Mascot head matching Discord's banner)
 */
const FloatingGreenLeaf3D: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => {
  return (
    <div className={`pointer-events-none select-none ${className} animate-pulse`}>
      <svg
        viewBox="0 0 100 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_10px_25px_rgba(34,197,94,0.6)]"
      >
        <defs>
          <linearGradient id="floatingLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bbf7d0" />
            <stop offset="40%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
        </defs>
        <path
          d="M 10 30 C 25 5, 75 5, 90 30 C 75 55, 25 55, 10 30 Z"
          fill="url(#floatingLeafGrad)"
          stroke="#dcfce7"
          strokeWidth="1.5"
        />
        <path d="M 12 30 Q 50 30 88 30" stroke="#bbf7d0" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export const BrandKitCalloutSection: React.FC<{
  heading: string;
  subtitle: string;
  buttonText: string;
}> = ({ heading, subtitle, buttonText }) => {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      {/* Title & Subtitle */}
      <div className="flex flex-col items-center text-center mb-12">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase max-w-3xl leading-tight mb-4">
          {heading}
        </h2>
        <p className="text-base sm:text-lg text-neutral-300 max-w-2xl leading-relaxed font-medium">
          {subtitle}
        </p>
      </div>

      {/* Discord-identical Smooth Stadium Pill Banner */}
      <div className="relative rounded-[48px] sm:rounded-[56px] bg-gradient-to-r from-[#44309a] via-[#332082] to-[#44309a] border border-purple-400/20 p-8 sm:p-14 shadow-[0_30px_90px_rgba(51,32,130,0.5)] flex flex-col items-center justify-center min-h-[380px] sm:min-h-[420px] overflow-hidden select-none mb-10">
        {/* Soft Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[340px] bg-purple-500/25 blur-[120px] pointer-events-none rounded-full" />

        {/* Mascot 1: Top-Left Floating 3D Trophy */}
        <div className="hidden sm:block absolute left-8 md:left-20 lg:left-32 top-8 pointer-events-none -rotate-12 hover:rotate-0 transition-transform duration-300">
          <EternalTrophy3D className="w-24 h-24 lg:w-32 lg:h-32" />
        </div>

        {/* Mascot 2: Floating Green Leaf above Head */}
        <div className="absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 pointer-events-none z-30">
          <FloatingGreenLeaf3D className="w-16 h-10 sm:w-20 sm:h-12" />
        </div>

        {/* Mascot 3: Top-Right Floating 3D Crown */}
        <div className="hidden sm:block absolute right-8 md:right-20 lg:right-32 top-8 pointer-events-none rotate-12 hover:rotate-0 transition-transform duration-300">
          <EternalCrown3D className="w-24 h-24 lg:w-32 lg:h-32" />
        </div>

        {/* Mascot 4: Center 3D Cyber-Wumpus in Puffer Jacket */}
        <div className="relative z-20 pointer-events-none pt-4">
          <BrandMascotAnimated3D className="w-44 h-44 sm:w-52 sm:h-52" />
        </div>

        {/* Mascot 5: Bottom-Left Floating 3D Eternal Coin */}
        <div className="hidden sm:block absolute left-12 md:left-24 lg:left-36 bottom-6 pointer-events-none -rotate-6">
          <EternalCoin3D className="w-20 h-20 lg:w-28 lg:h-28" animated={true} />
        </div>

        {/* Mascot 6: Bottom-Right Floating 3D Cyber Pickaxe */}
        <div className="hidden sm:block absolute right-12 md:right-24 lg:right-36 bottom-6 pointer-events-none rotate-12">
          <EternalPickaxe3D className="w-20 h-20 lg:w-28 lg:h-28" />
        </div>
      </div>

      {/* Clean White Learn More Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => navigate('/branding')}
          className="px-8 py-3 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-black tracking-wide shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>{buttonText}</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
};
