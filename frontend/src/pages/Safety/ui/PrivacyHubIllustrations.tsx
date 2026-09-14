import React from 'react';

export const PrivacyHeroSunglassesIllustration: React.FC<{ className?: string }> = ({
  className = 'w-48 h-48 sm:w-60 sm:h-60 lg:w-72 lg:h-72',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient background bloom */}
      <div className="absolute inset-0 bg-indigo-600/30 rounded-full blur-3xl" />
      <div className="absolute w-32 h-32 bg-pink-500/25 rounded-full blur-2xl right-2 top-2" />

      {/* 3D Sunglasses Model */}
      <div className="relative w-full h-full flex items-center justify-center transform -rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-500">
        <img
          src="/images/safety/sunglasses-3d.png"
          alt="3D Privacy Sunglasses"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] drop-shadow-[0_0_30px_rgba(139,92,246,0.4)] pointer-events-none select-none"
          loading="eager"
        />
      </div>
    </div>
  );
};

export const PrivacyHeroShieldIllustration: React.FC<{ className?: string }> = ({
  className = 'w-48 h-48 sm:w-60 sm:h-60 lg:w-72 lg:h-72',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient background bloom */}
      <div className="absolute inset-0 bg-purple-600/30 rounded-full blur-3xl" />
      <div className="absolute w-36 h-36 bg-pink-500/30 rounded-full blur-2xl left-2 bottom-2" />

      {/* 3D Shield Model */}
      <div className="relative w-full h-full flex items-center justify-center transform rotate-6 hover:rotate-0 hover:scale-105 transition-all duration-500">
        <img
          src="/images/safety/shield-3d.png"
          alt="3D Security Shield"
          className="w-full h-full object-contain filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)] drop-shadow-[0_0_35px_rgba(236,72,153,0.4)] pointer-events-none select-none"
          loading="eager"
        />
      </div>
    </div>
  );
};

export const PrivacyChestIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[500px]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Rich purple/pink ambient glow */}
      <div className="absolute inset-4 bg-gradient-to-tr from-purple-600/30 via-indigo-600/30 to-pink-500/30 rounded-full blur-3xl" />

      {/* 3D Chest and Glowing Crystal Sword */}
      <div className="relative w-full h-full flex items-center justify-center transform hover:scale-105 transition-transform duration-500">
        <img
          src="/images/safety/chest-3d.png"
          alt="3D Privacy Preserving Chest and Sword"
          className="w-full h-auto object-contain filter drop-shadow-[0_30px_60px_rgba(0,0,0,0.9)] drop-shadow-[0_0_40px_rgba(168,85,247,0.4)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const PrincipleCardIcon: React.FC<{ iconSrc: string; alt: string }> = ({ iconSrc, alt }) => {
  return (
    <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center flex-shrink-0">
      <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-xl" />
      <img
        src={iconSrc}
        alt={alt}
        className="w-full h-full object-contain relative z-10 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300 pointer-events-none select-none"
        loading="lazy"
      />
    </div>
  );
};
