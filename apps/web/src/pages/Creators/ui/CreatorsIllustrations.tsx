import React from 'react';

export const CreatorHeroWandIllustration: React.FC<{ className?: string }> = ({
  className = 'w-48 h-48 sm:w-60 sm:h-60 lg:w-72 lg:h-72',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient green & purple background bloom */}
      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl" />
      <div className="absolute w-32 h-32 bg-purple-600/30 rounded-full blur-2xl left-2 bottom-2" />

      {/* 3D Magic Wand */}
      <div className="relative w-full h-full flex items-center justify-center transform -rotate-12 hover:rotate-0 hover:scale-105 transition-all duration-500">
        <img
          src="/images/creators/hero-wand-3d.png"
          alt="3D Creator Magic Wand"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] drop-shadow-[0_0_30px_rgba(34,197,94,0.4)] pointer-events-none select-none"
          loading="eager"
        />
      </div>
    </div>
  );
};

export const CreatorHeroCameraIllustration: React.FC<{ className?: string }> = ({
  className = 'w-48 h-48 sm:w-60 sm:h-60 lg:w-72 lg:h-72',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient purple/cyan background bloom */}
      <div className="absolute inset-0 bg-indigo-600/25 rounded-full blur-3xl" />
      <div className="absolute w-36 h-36 bg-pink-500/25 rounded-full blur-2xl right-2 top-2" />

      {/* 3D Studio Camera */}
      <div className="relative w-full h-full flex items-center justify-center transform rotate-12 hover:rotate-0 hover:scale-105 transition-all duration-500">
        <img
          src="/images/creators/hero-camera-3d.png"
          alt="3D Creator Studio Camera"
          className="w-full h-full object-contain filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)] drop-shadow-[0_0_35px_rgba(168,85,247,0.4)] pointer-events-none select-none"
          loading="eager"
        />
      </div>
    </div>
  );
};

export const CreatorCardThumbnail: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = 'aspect-video w-full' }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#17132a] border border-white/5 group-hover:border-purple-500/30 transition-all duration-300 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 pointer-events-none select-none"
        loading="lazy"
      />
      {/* Subtle bottom gradient to blend text smoothly */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07050f]/60 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />
    </div>
  );
};
