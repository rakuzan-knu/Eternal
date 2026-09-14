import React from 'react';

export const LibraryHeroScrollIllustration: React.FC<{ className?: string }> = ({
  className = 'w-44 h-44 sm:w-56 sm:h-56 lg:w-64 lg:h-64',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-blue-600/25 rounded-full blur-3xl" />
      <div className="absolute w-36 h-36 bg-pink-500/20 rounded-full blur-2xl right-2 top-2" />

      {/* 3D Rolled Scroll Model */}
      <div className="relative w-full h-full flex items-center justify-center transform -rotate-12 hover:rotate-0 transition-transform duration-700">
        <img
          src="/images/safety/scroll-3d.png"
          alt="3D Safety Library Scroll"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] drop-shadow-[0_0_30px_rgba(99,102,241,0.35)] pointer-events-none select-none"
          loading="eager"
        />
      </div>
    </div>
  );
};

export const LibraryHeroShieldIllustration: React.FC<{ className?: string }> = ({
  className = 'w-48 h-48 sm:w-60 sm:h-60 lg:w-72 lg:h-72',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-indigo-600/30 rounded-full blur-3xl" />
      <div className="absolute w-36 h-36 bg-pink-500/25 rounded-full blur-2xl left-0 top-2" />

      {/* 3D Shield Model */}
      <div className="relative w-full h-full flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-700">
        <img
          src="/images/safety/shield-3d.png"
          alt="3D Safety Shield"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] drop-shadow-[0_0_30px_rgba(236,72,153,0.35)] pointer-events-none select-none"
          loading="eager"
        />
      </div>
    </div>
  );
};

export const ArticleCardThumbnail: React.FC<{
  theme: 'shield' | 'lock' | 'envelope' | 'community' | 'moderation' | 'privacy';
  className?: string;
}> = ({ theme, className = 'w-full aspect-[16/9] rounded-2xl overflow-hidden' }) => {
  if (theme === 'shield') {
    return (
      <div
        className={`relative flex items-center justify-center bg-gradient-to-br from-[#1E1B4B] via-[#2E1065] to-[#0F172A] border border-white/10 ${className}`}
      >
        {/* Isometric Grid Background */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#818CF8_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute w-36 h-36 bg-indigo-500/30 rounded-full blur-2xl" />

        {/* Central 3D Shield Icon */}
        <div className="relative flex items-center justify-center filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]">
          <svg viewBox="0 0 100 120" className="w-24 h-24" fill="none">
            <path
              d="M 50 10 L 85 28 C 85 75 50 110 50 110 C 50 110 15 75 15 28 Z"
              fill="url(#cardShieldGrad)"
              stroke="#A5B4FC"
              strokeWidth="3"
            />
            {/* Embossed E Logo */}
            <path
              d="M 40 45 L 62 45 M 40 60 L 58 60 M 40 75 L 62 75 M 40 45 L 40 75"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient
                id="cardShieldGrad"
                x1="15"
                y1="10"
                x2="85"
                y2="110"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#60A5FA" />
                <stop offset="0.5" stopColor="#3B82F6" />
                <stop offset="1" stopColor="#1D4ED8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  }

  if (theme === 'envelope') {
    return (
      <div
        className={`relative flex items-center justify-center bg-gradient-to-br from-[#FEF08A] via-[#F43F5E] to-[#BE185D] border border-white/10 ${className}`}
      >
        <div className="absolute w-36 h-36 bg-pink-500/30 rounded-full blur-2xl" />

        {/* 3D Envelope with Golden Shield */}
        <div className="relative flex items-center justify-center filter drop-shadow-[0_12px_25px_rgba(0,0,0,0.5)]">
          <svg viewBox="0 0 140 100" className="w-28 h-20" fill="none">
            <rect
              x="15"
              y="20"
              width="110"
              height="70"
              rx="12"
              fill="#E11D48"
              stroke="#FDA4AF"
              strokeWidth="2"
            />
            <path
              d="M 15 25 L 70 65 L 125 25"
              stroke="#FFE4E6"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Golden Shield */}
            <path
              d="M 70 45 L 85 55 C 85 75 70 85 70 85 C 70 85 55 75 55 55 Z"
              fill="#FBBF24"
              stroke="#FDE68A"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (theme === 'lock') {
    return (
      <div
        className={`relative flex items-center justify-center bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#1E3A8A] border border-white/10 ${className}`}
      >
        {/* Floating Golden Padlocks & Password Bars */}
        <div className="absolute inset-0 flex items-center justify-around opacity-90 p-4">
          <div className="flex flex-col gap-3 items-center">
            <div className="w-8 h-8 rounded-lg bg-amber-400 border border-amber-200 flex items-center justify-center shadow-lg transform -rotate-12">
              <div className="w-2 h-2 rounded-full bg-amber-900" />
            </div>
            <div className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-mono text-white tracking-widest">
              ••••••
            </div>
          </div>
          <div className="flex flex-col gap-2 items-center">
            <div className="w-12 h-12 rounded-xl bg-amber-400 border-2 border-amber-200 flex items-center justify-center shadow-xl transform rotate-6">
              <div className="w-3 h-3 rounded-full bg-amber-900" />
            </div>
            <div className="px-3 py-0.5 rounded-full bg-white/25 text-[10px] font-mono text-white tracking-widest">
              ••••••••
            </div>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <div className="w-8 h-8 rounded-lg bg-amber-400 border border-amber-200 flex items-center justify-center shadow-lg transform rotate-12">
              <div className="w-2 h-2 rounded-full bg-amber-900" />
            </div>
            <div className="px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-mono text-white tracking-widest">
              ••••••
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (theme === 'moderation') {
    return (
      <div
        className={`relative flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#3B0764] border border-white/10 ${className}`}
      >
        <div className="w-36 h-36 bg-purple-500/20 rounded-full blur-2xl absolute" />
        <svg
          viewBox="0 0 120 90"
          className="w-28 h-20 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
          fill="none"
        >
          <rect
            x="15"
            y="15"
            width="90"
            height="60"
            rx="10"
            fill="#1E1B4B"
            stroke="#818CF8"
            strokeWidth="2"
          />
          <line
            x1="25"
            y1="35"
            x2="65"
            y2="35"
            stroke="#A78BFA"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="25"
            y1="48"
            x2="85"
            y2="48"
            stroke="#60A5FA"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="25"
            y1="60"
            x2="50"
            y2="60"
            stroke="#34D399"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="80" cy="35" r="5" fill="#EC4899" />
          <circle cx="70" cy="60" r="5" fill="#38BDF8" />
        </svg>
      </div>
    );
  }

  if (theme === 'community') {
    return (
      <div
        className={`relative flex items-center justify-center bg-gradient-to-br from-[#065F46] via-[#047857] to-[#10B981] border border-white/10 ${className}`}
      >
        <div className="w-36 h-36 bg-emerald-300/20 rounded-full blur-2xl absolute" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center shadow-lg transform -rotate-6">
            <span className="text-white text-xs font-black">E</span>
          </div>
          <div className="w-14 h-14 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center shadow-xl">
            <span className="text-white text-sm font-black">🛡️</span>
          </div>
          <div className="w-12 h-12 rounded-full bg-pink-500 border-2 border-white flex items-center justify-center shadow-lg transform rotate-6">
            <span className="text-white text-xs font-black">💬</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center bg-gradient-to-br from-[#1E1B4B] via-[#4C1D95] to-[#701A75] border border-white/10 ${className}`}
    >
      <div className="w-36 h-36 bg-pink-500/20 rounded-full blur-2xl absolute" />
      <div className="flex items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
          fill="none"
        >
          <rect
            x="25"
            y="40"
            width="50"
            height="45"
            rx="8"
            fill="#4338CA"
            stroke="#A78BFA"
            strokeWidth="2"
          />
          <path
            d="M 35 40 L 35 25 C 35 15 65 15 65 25 L 65 40"
            stroke="#C7D2FE"
            strokeWidth="3"
            fill="none"
          />
          <circle cx="50" cy="62" r="5" fill="#F43F5E" />
        </svg>
      </div>
    </div>
  );
};
