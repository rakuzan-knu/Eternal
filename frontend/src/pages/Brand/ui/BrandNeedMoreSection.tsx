import React from 'react';
import { ArrowRight } from 'lucide-react';
import { CyberSpottedEgg3D } from './BrandIllustrations';
import { EternalCoin3D } from '../../Company/ui/CompanyIllustrations';

export const BrandNeedMoreSection: React.FC<{
  title: string;
  subtitle: string;
  buttonText: string;
  onButtonClick: () => void;
}> = ({ title, subtitle, buttonText, onButtonClick }) => {
  return (
    <section className="py-28 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      <div className="relative rounded-[44px] bg-gradient-to-b from-[#1c1538] via-[#120f24] to-[#07050f] border border-purple-500/25 p-12 sm:p-20 shadow-2xl flex flex-col items-center text-center overflow-hidden">
        {/* Ambient Center Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-purple-600/20 blur-[100px] pointer-events-none rounded-full" />

        {/* Mascot Left: 3D Spotted Egg */}
        <div className="hidden md:block absolute left-8 lg:left-14 top-1/2 -translate-y-1/2 select-none pointer-events-none">
          <CyberSpottedEgg3D className="w-28 h-28 lg:w-36 lg:h-36" />
        </div>

        {/* Mascot Right: 3D Eternal Coin */}
        <div className="hidden md:block absolute right-8 lg:right-14 top-1/2 -translate-y-1/2 select-none pointer-events-none">
          <EternalCoin3D className="w-28 h-28 lg:w-36 lg:h-36" animated={true} />
        </div>

        {/* Heading & Subtitle */}
        <div className="relative z-10 max-w-2xl flex flex-col items-center gap-4 mb-8">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight">
            {title}
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 font-medium leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Action Button: "View Brand Kit" */}
        <button
          type="button"
          onClick={onButtonClick}
          className="relative z-10 px-8 py-3.5 rounded-full bg-[#5822b4] hover:bg-[#6b2bd8] text-white text-sm font-bold tracking-wide shadow-[0_0_30px_rgba(88,34,180,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>{buttonText}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
};
