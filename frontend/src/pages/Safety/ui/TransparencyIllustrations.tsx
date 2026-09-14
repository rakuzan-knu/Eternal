import React from 'react';

/**
 * 1. Hero 3D Shield Emblem with Eternal Logo
 */
export const TransparencyHeroShield: React.FC<{ className?: string }> = ({
  className = 'w-32 h-32 sm:w-44 sm:h-44',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient Neon Glow Behind Shield */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/60 via-pink-500/40 to-indigo-600/50 blur-2xl animate-pulse" />

      <svg
        viewBox="0 0 200 200"
        className="w-full h-full relative z-10 drop-shadow-[0_15px_30px_rgba(168,85,247,0.5)] transform -rotate-6 hover:rotate-0 transition-transform duration-500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shieldRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="40%" stopColor="#a855f7" />
            <stop offset="80%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="shieldBody" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#2e1065" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="shieldPlate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
          </linearGradient>
          <filter id="shieldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer 3D Shield Rim */}
        <path
          d="M100 15 C135 15 175 25 175 60 C175 120 135 168 100 185 C65 168 25 120 25 60 C25 25 65 15 100 15 Z"
          fill="url(#shieldRim)"
          filter="url(#shieldGlow)"
        />

        {/* 3D Shield Body */}
        <path
          d="M100 24 C130 24 165 32 165 63 C165 116 130 158 100 174 C70 158 35 116 35 63 C35 32 70 24 100 24 Z"
          fill="url(#shieldBody)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
        />

        {/* Glossy Top Reflection */}
        <path
          d="M100 28 C125 28 152 35 155 58 C158 85 140 115 100 130 C60 115 42 85 45 58 C48 35 75 28 100 28 Z"
          fill="url(#shieldPlate)"
          opacity="0.4"
        />

        {/* Center Embossed Emblem */}
        <g transform="translate(100, 95) scale(0.95)">
          {/* Subtle Backglow */}
          <circle cx="0" cy="0" r="32" fill="#8b5cf6" opacity="0.3" filter="url(#shieldGlow)" />
          {/* Eternal 'E' Monogram */}
          <path
            d="M-18 -22 H18 V-12 H-6 V-4 H12 V6 H-6 V14 H18 V24 H-18 Z"
            fill="#ffffff"
            className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
          />
        </g>
      </svg>
    </div>
  );
};

/**
 * 2. Hero 3D Cute Eyes Mascot
 */
export const TransparencyHeroEyes: React.FC<{ className?: string }> = ({
  className = 'w-28 h-28 sm:w-36 sm:h-36',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Soft Glow */}
      <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />

      <svg
        viewBox="0 0 160 120"
        className="w-full h-full relative z-10 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Eyeball 3D gradient */}
          <radialGradient id="eyeballGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#e2e8f0" />
            <stop offset="90%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </radialGradient>
          {/* Deep Iris Gradient */}
          <radialGradient id="irisGrad" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="40%" stopColor="#2563eb" />
            <stop offset="85%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        {/* Left Eyeball */}
        <g transform="translate(48, 60)">
          <circle cx="0" cy="0" r="38" fill="url(#eyeballGrad)" stroke="#cbd5e1" strokeWidth="1" />
          {/* Shadow underneath */}
          <ellipse cx="0" cy="36" rx="28" ry="6" fill="#090d16" opacity="0.3" filter="blur(2px)" />
          {/* Iris looking left-down */}
          <g transform="translate(-10, 4)">
            <circle cx="0" cy="0" r="16" fill="url(#irisGrad)" />
            {/* Pupil */}
            <circle cx="0" cy="0" r="9" fill="#050814" />
            {/* Glossy Catchlights */}
            <circle cx="-5" cy="-5" r="4.5" fill="#ffffff" />
            <circle cx="3" cy="3" r="2" fill="#ffffff" opacity="0.8" />
          </g>
        </g>

        {/* Right Eyeball */}
        <g transform="translate(112, 54)">
          <circle cx="0" cy="0" r="34" fill="url(#eyeballGrad)" stroke="#cbd5e1" strokeWidth="1" />
          <ellipse cx="0" cy="32" rx="24" ry="5" fill="#090d16" opacity="0.3" filter="blur(2px)" />
          <g transform="translate(-10, 4)">
            <circle cx="0" cy="0" r="14" fill="url(#irisGrad)" />
            <circle cx="0" cy="0" r="8" fill="#050814" />
            <circle cx="-4" cy="-4" r="4" fill="#ffffff" />
            <circle cx="2.5" cy="2.5" r="1.8" fill="#ffffff" opacity="0.8" />
          </g>
        </g>
      </svg>
    </div>
  );
};

/**
 * 3. Section 1: 3D Holographic Cyber Dashboard Console
 */
export const CyberTransparencyConsoleIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[420px] h-auto',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Cyber Glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-pink-500/20 blur-3xl" />

      <svg
        viewBox="0 0 380 260"
        className="w-full h-auto relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="consoleBezel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#312e81" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f0e26" />
          </linearGradient>
          <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#090718" />
          </linearGradient>
          <linearGradient id="chartWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* 3D Console Outer Frame with Angled Edges */}
        <path
          d="M40 30 L320 30 L360 80 L350 210 L300 240 L60 240 L20 200 L20 80 Z"
          fill="url(#consoleBezel)"
          stroke="#6366f1"
          strokeWidth="3"
        />

        {/* Top Header Badge */}
        <path
          d="M130 18 L230 18 L245 40 L115 40 Z"
          fill="#4f46e5"
          stroke="#818cf8"
          strokeWidth="2"
        />
        <circle cx="180" cy="29" r="4" fill="#34d399" className="animate-ping" />
        <circle cx="180" cy="29" r="4" fill="#34d399" />

        {/* Inner Screen Display */}
        <rect
          x="45"
          y="48"
          width="290"
          height="165"
          rx="16"
          fill="url(#screenGrad)"
          stroke="rgba(168,85,247,0.3)"
          strokeWidth="1.5"
        />

        {/* Screen Top Status Bars */}
        <line
          x1="60"
          y1="68"
          x2="120"
          y2="68"
          stroke="#a855f7"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="140" cy="68" r="4" fill="#f43f5e" />
        <circle cx="155" cy="68" r="4" fill="#f59e0b" />
        <circle cx="170" cy="68" r="4" fill="#10b981" />

        {/* Circular Pie Chart Widget (Left Screen) */}
        <g transform="translate(100, 138)">
          <circle cx="0" cy="0" r="30" fill="#1e1b4b" stroke="#312e81" strokeWidth="4" />
          {/* Slice 1 (Purple) */}
          <path d="M0 0 L0 -30 A30 30 0 0 1 26 15 Z" fill="#a855f7" />
          {/* Slice 2 (Rose) */}
          <path d="M0 0 L26 15 A30 30 0 0 1 -21 21 Z" fill="#f43f5e" />
          {/* Slice 3 (Cyan) */}
          <path d="M0 0 L-21 21 A30 30 0 0 1 0 -30 Z" fill="#38bdf8" />
          {/* Inner cutout donut */}
          <circle cx="0" cy="0" r="14" fill="#090718" />
        </g>

        {/* Telemetry Wave Graph (Right Screen Top) */}
        <g transform="translate(170, 75)">
          <rect
            x="0"
            y="0"
            width="145"
            height="50"
            rx="8"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.08)"
          />
          {/* Glowing Waveform */}
          <path
            d="M8 30 Q30 5 50 30 T95 20 T135 15"
            fill="none"
            stroke="url(#chartWave)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>

        {/* Bar Histogram & Sliders (Right Screen Bottom) */}
        <g transform="translate(170, 138)">
          {/* Bar 1 */}
          <rect x="5" y="10" width="18" height="50" rx="4" fill="#6366f1" />
          {/* Bar 2 */}
          <rect x="30" y="22" width="18" height="38" rx="4" fill="#a855f7" />
          {/* Bar 3 */}
          <rect x="55" y="5" width="18" height="55" rx="4" fill="#ec4899" />
          {/* Bar 4 */}
          <rect x="80" y="28" width="18" height="32" rx="4" fill="#38bdf8" />
          {/* Bar 5 */}
          <rect x="105" y="15" width="18" height="45" rx="4" fill="#34d399" />
        </g>

        {/* Bottom Glowing Corner Accents */}
        <polygon points="50,225 70,225 60,235" fill="#38bdf8" />
        <polygon points="310,225 330,225 320,235" fill="#ec4899" />
      </svg>
    </div>
  );
};

/**
 * 4. Section 2: 3D Magical DSA Spellbook with D20 Crystal Gemstone
 */
export const DsaBookIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[420px] h-auto',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Magic Glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-pink-600/30 via-purple-600/30 to-indigo-600/20 blur-3xl" />

      <svg
        viewBox="0 0 380 260"
        className="w-full h-auto relative z-10 drop-shadow-[0_20px_45px_rgba(0,0,0,0.8)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bookCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="50%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="bookPagesGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
        </defs>

        {/* 3D Isometric Book Base & Thick Pages */}
        {/* Bottom Cover Shadow/Thickness */}
        <polygon points="90,195 290,135 340,165 140,225" fill="#1e1b4b" />
        {/* Book Paper Stack (Thick white parchment edge) */}
        <polygon
          points="90,185 290,125 335,152 135,212"
          fill="url(#bookPagesGrad)"
          stroke="#94a3b8"
          strokeWidth="1"
        />
        {/* Page Line Indentations */}
        <line x1="94" y1="188" x2="135" y2="212" stroke="#64748b" strokeWidth="1.5" />
        <line x1="97" y1="192" x2="135" y2="214" stroke="#64748b" strokeWidth="1.5" />

        {/* Top Book Cover (Deep Indigo Leather) */}
        <polygon
          points="80,170 280,110 330,140 130,200"
          fill="url(#bookCoverGrad)"
          stroke="#818cf8"
          strokeWidth="3"
        />

        {/* Metallic Corner Rivets / Brackets */}
        <polygon points="80,170 100,164 105,178 85,184" fill="#a855f7" />
        <polygon points="280,110 260,116 265,130 285,124" fill="#a855f7" />
        <polygon points="330,140 310,146 315,160 335,154" fill="#a855f7" />
        <polygon points="130,200 150,194 155,208 135,214" fill="#a855f7" />

        {/* Embossed Eternal Crest On Book Cover */}
        <g transform="translate(205, 155) rotate(-17) skewX(-20) scale(0.9)">
          <circle cx="0" cy="0" r="28" fill="#4f46e5" stroke="#a5b4fc" strokeWidth="2.5" />
          <path
            d="M-12 -16 H12 V-9 H-4 V-3 H8 V4 H-4 V10 H12 V17 H-12 Z"
            fill="#ffffff"
            className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          />
        </g>

        {/* Floating Faceted D20 Gemstone (Left of Book) */}
        <g transform="translate(95, 190)">
          {/* Gem Glow */}
          <circle cx="0" cy="0" r="32" fill="#ec4899" opacity="0.3" filter="blur(8px)" />

          {/* D20 Facets */}
          <polygon points="0,-28 24,-12 0,16" fill="#f472b6" stroke="#fbcfe8" strokeWidth="1" />
          <polygon points="0,-28 -24,-12 0,16" fill="#ec4899" stroke="#fbcfe8" strokeWidth="1" />
          <polygon points="0,16 24,-12 20,24" fill="#db2777" stroke="#fbcfe8" strokeWidth="1" />
          <polygon points="0,16 -24,-12 -20,24" fill="#be185d" stroke="#fbcfe8" strokeWidth="1" />
          <polygon points="0,16 20,24 0,36" fill="#9d174d" stroke="#fbcfe8" strokeWidth="1" />
          <polygon points="0,16 -20,24 0,36" fill="#831843" stroke="#fbcfe8" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 5. Article Card 1: Moderation Illustration
 */
export const ModerationArticleIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-44',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-indigo-950 via-[#181336] to-purple-950 flex items-center justify-center overflow-hidden border border-white/10 ${className}`}
    >
      {/* Background stardust glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />

      {/* Floating Pages & Open Spellbook */}
      <svg viewBox="0 0 200 120" className="w-48 h-32 relative z-10" fill="none">
        {/* Floating Pages */}
        <rect
          x="25"
          y="20"
          width="30"
          height="40"
          rx="4"
          transform="rotate(-15 25 20)"
          fill="#f8fafc"
          opacity="0.8"
        />
        <rect
          x="145"
          y="30"
          width="28"
          height="38"
          rx="4"
          transform="rotate(20 145 30)"
          fill="#f8fafc"
          opacity="0.7"
        />

        {/* Center Open Book */}
        <path
          d="M100 80 C80 60 50 65 40 70 L40 100 C50 95 80 90 100 110 C120 90 150 95 160 100 L160 70 C150 65 120 60 100 80 Z"
          fill="#ffffff"
        />
        <path d="M100 80 L100 110" stroke="#94a3b8" strokeWidth="2" />

        {/* Twinkling Golden / Cyan Stars */}
        <polygon
          points="100,30 103,38 111,38 105,43 107,51 100,46 93,51 95,43 89,38 97,38"
          fill="#fbbf24"
        />
        <polygon
          points="45,45 47,50 52,50 48,53 50,58 45,55 40,58 42,53 38,50 43,50"
          fill="#38bdf8"
        />
        <polygon
          points="155,75 157,80 162,80 158,83 160,88 155,85 150,88 152,83 148,80 153,80"
          fill="#ec4899"
        />
      </svg>
    </div>
  );
};

/**
 * 6. Article Card 2: Ban Hammer & Shield Illustration
 */
export const HammerArticleIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-44',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#120d2a] via-[#1c1444] to-[#251559] flex items-center justify-center overflow-hidden border border-white/10 ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />

      <svg viewBox="0 0 200 120" className="w-48 h-32 relative z-10" fill="none">
        {/* Back Shield */}
        <path
          d="M120 20 C140 20 160 26 160 50 C160 90 135 110 120 115 C105 110 80 90 80 50 C80 26 100 20 120 20 Z"
          fill="#1e1b4b"
          stroke="#6366f1"
          strokeWidth="3"
        />

        {/* 3D Cyan Ban Hammer */}
        <g transform="translate(90, 60) rotate(-35)">
          {/* Hammer Handle */}
          <rect
            x="-6"
            y="0"
            width="12"
            height="65"
            rx="5"
            fill="#38bdf8"
            stroke="#0284c7"
            strokeWidth="2"
          />
          {/* Grip Stripes */}
          <line x1="-6" y1="30" x2="6" y2="30" stroke="#0369a1" strokeWidth="2" />
          <line x1="-6" y1="40" x2="6" y2="40" stroke="#0369a1" strokeWidth="2" />
          {/* Hammer Head Block */}
          <rect
            x="-30"
            y="-30"
            width="60"
            height="35"
            rx="8"
            fill="#7dd3fc"
            stroke="#0284c7"
            strokeWidth="3"
          />
          <polygon points="-30,-30 30,-30 22,-38 -22,-38" fill="#bae6fd" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 7. Article Card 3: Community Chill & Safe Space Illustration
 */
export const CommunityArticleIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-44',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#0c1432] via-[#161a47] to-[#1f1956] flex items-center justify-center overflow-hidden border border-white/10 ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent" />

      <svg viewBox="0 0 200 120" className="w-48 h-32 relative z-10" fill="none">
        {/* Floating Premium Badge */}
        <g transform="translate(138, 30)">
          <rect x="0" y="0" width="54" height="22" rx="6" fill="#ec4899" />
          <text x="6" y="15" fill="#ffffff" fontSize="9" fontWeight="900" letterSpacing="0.5">
            PREMIUM
          </text>
        </g>

        {/* 3D Paddle with Eyes */}
        <g transform="translate(85, 60) rotate(15)">
          {/* Paddle Body */}
          <rect
            x="-24"
            y="-35"
            width="48"
            height="55"
            rx="16"
            fill="#3b82f6"
            stroke="#60a5fa"
            strokeWidth="2"
          />
          {/* Handle */}
          <rect x="-6" y="20" width="12" height="30" rx="4" fill="#1e293b" />
          {/* Cute Eyes on Paddle */}
          <circle cx="-10" cy="-12" r="6" fill="#ffffff" />
          <circle cx="-9" cy="-12" r="3" fill="#0f172a" />
          <circle cx="10" cy="-12" r="6" fill="#ffffff" />
          <circle cx="11" cy="-12" r="3" fill="#0f172a" />
          {/* Smile */}
          <path d="M-6 4 Q0 10 6 4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};
