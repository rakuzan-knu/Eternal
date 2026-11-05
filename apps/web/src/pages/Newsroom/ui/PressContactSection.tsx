import React from 'react';
import { Mail } from 'lucide-react';
import { DropdownDeveloperMascot } from '../../Privacy/ui/PrivacyIllustrations';
import { EternalCoin3D } from '../../Company/ui/CompanyIllustrations';

export const PressContactSection: React.FC<{
  heading: string;
  subtitle: string;
  buttonText: string;
}> = ({ heading, subtitle, buttonText }) => {
  return (
    <section className="py-24 px-6 lg:px-12 max-w-7xl mx-auto w-full relative z-10 select-text">
      <div className="relative rounded-[44px] bg-[#07050f] p-8 sm:p-14 flex items-center justify-between overflow-hidden">
        {/* Soft Ambient Bottom Center Radial Illumination */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-purple-700/25 blur-[120px] pointer-events-none rounded-full" />

        {/* Mascot 1: Left 3D Retro Robot Mascot (Waving) */}
        <div className="hidden lg:block relative z-10 select-none pointer-events-none -rotate-6 hover:rotate-0 transition-transform duration-300">
          <DropdownDeveloperMascot className="w-36 h-36 xl:w-44 xl:h-44" />
        </div>

        {/* Center Text & Button */}
        <div className="relative z-10 flex-1 max-w-2xl mx-auto flex flex-col items-center text-center gap-5">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase leading-tight">
            {heading}
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 font-medium leading-relaxed">
            {subtitle}
          </p>
          <button
            type="button"
            disabled
            className="mt-2 px-8 py-3.5 rounded-full bg-[#5822b4] text-white text-xs font-black tracking-wide shadow-[0_0_30px_rgba(88,34,180,0.5)] transition-all flex items-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Mail size={15} />
            <span>{buttonText}</span>
          </button>
        </div>

        {/* Mascot 2: Right 3D Silver/Purple Eternal Coin */}
        <div className="hidden lg:block relative z-10 select-none pointer-events-none rotate-12 hover:rotate-0 transition-transform duration-300">
          <EternalCoin3D className="w-32 h-32 xl:w-40 xl:h-40" animated={true} />
        </div>
      </div>
    </section>
  );
};
