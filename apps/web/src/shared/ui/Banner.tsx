import React from 'react';

interface BannerProps {
  src?: string | null | undefined;
  positionY?: number | undefined;
  alt?: string | undefined;
}

export default function Banner({ src, positionY = 50, alt = 'User profile banner' }: BannerProps) {
  return (
    <div className="w-full h-full relative border-b border-white/[0.05] overflow-hidden bg-[#111]">
      {src ? (
        <>
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover select-none pointer-events-none"
            style={{ objectPosition: `50% ${positionY}%` }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-white/[0.01] backdrop-blur-[1px]"></div>
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 relative">
          <div className="absolute inset-0 bg-white/[0.01] backdrop-blur-[2px]"></div>
        </div>
      )}
    </div>
  );
}
