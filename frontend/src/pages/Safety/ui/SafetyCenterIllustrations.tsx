import React from 'react';

export const SafetyHeroShieldIllustration: React.FC<{ className?: string }> = ({
  className = 'w-48 h-48 sm:w-60 sm:h-60 lg:w-72 lg:h-72',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-indigo-600/30 rounded-full blur-3xl" />
      <div className="absolute w-36 h-36 bg-pink-500/25 rounded-full blur-2xl right-0 top-2" />

      {/* 3D Shield Model */}
      <div className="relative w-full h-full flex items-center justify-center transform -rotate-12 hover:rotate-0 transition-transform duration-700">
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

export const SafetyHeroEggIllustration: React.FC<{ className?: string }> = ({
  className = 'w-44 h-44 sm:w-56 sm:h-56 lg:w-64 lg:h-64',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-purple-600/25 rounded-full blur-3xl" />
      <div className="absolute w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl left-2 top-2" />

      {/* 3D Spotted Egg Model */}
      <div className="relative w-full h-full flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-700">
        <img
          src="/images/safety/egg-3d.png"
          alt="3D Safety Mascot Egg"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] drop-shadow-[0_0_30px_rgba(236,72,153,0.35)] pointer-events-none select-none"
          loading="eager"
        />
      </div>
    </div>
  );
};

export const SafetyLibraryBookIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[480px] aspect-square sm:aspect-[4/3]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute w-72 h-72 bg-purple-600/25 rounded-full blur-3xl -bottom-2 pointer-events-none" />
      <div className="absolute w-48 h-48 bg-cyan-500/20 rounded-full blur-2xl top-2 right-2 pointer-events-none" />

      {/* 3D Library Book Model */}
      <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-[1.03]">
        <img
          src="/images/safety/library-book-3d.png"
          alt="Safety Library 3D Book"
          className="w-full h-full object-contain filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)] drop-shadow-[0_0_30px_rgba(168,85,247,0.3)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const PrivacyTentIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[480px] aspect-square sm:aspect-[4/3]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Night Ambiance Glow */}
      <div className="absolute w-72 h-72 bg-indigo-600/25 rounded-full blur-3xl -bottom-4 pointer-events-none" />
      <div className="absolute w-44 h-44 bg-pink-500/20 rounded-full blur-2xl top-2 left-2 pointer-events-none" />

      {/* 3D Stylized Camping Tent Scene */}
      <div className="relative w-full h-full max-w-[420px] max-h-[340px] flex items-center justify-center transition-transform duration-500 hover:scale-[1.03]">
        <svg
          viewBox="0 0 500 400"
          className="w-full h-full filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Geometric Crescent Moon */}
          <path
            d="M 380 60 L 400 80 L 390 110 L 360 120 L 340 100 L 350 75 Z"
            fill="url(#moonGlow)"
            className="filter drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]"
          />

          {/* Wooden Support Poles (Back) */}
          <polygon points="120,330 135,335 245,95 230,90" fill="#3B2667" />
          <polygon points="340,330 325,335 215,95 230,90" fill="#2E1D52" />

          {/* Tent Left Canvas Flap */}
          <polygon
            points="230,90 100,320 220,335"
            fill="url(#tentLeftGrad)"
            stroke="#7C3AED"
            strokeWidth="3"
          />

          {/* Tent Window Cutout */}
          <polygon
            points="180,210 145,260 175,270 200,220"
            fill="#181132"
            stroke="#A78BFA"
            strokeWidth="2"
          />

          {/* Tent Interior (Dark Open Doorway) */}
          <polygon points="230,90 220,335 270,330" fill="#0F0922" />

          {/* Tent Right Canvas Flap (Illuminated) */}
          <polygon
            points="230,90 270,330 380,310"
            fill="url(#tentRightGrad)"
            stroke="#60A5FA"
            strokeWidth="3"
          />

          {/* Wooden Ridge Cross Poles (Front) */}
          <polygon points="215,85 245,130 235,135 205,90" fill="#8B5CF6" />
          <polygon points="245,85 215,130 225,135 255,90" fill="#A78BFA" />

          {/* Glowing Camping Lantern */}
          <ellipse
            cx="140"
            cy="340"
            rx="28"
            ry="12"
            fill="#312E81"
            stroke="#6366F1"
            strokeWidth="2"
          />
          <path d="M 120,340 L 125,305 L 155,305 L 160,340 Z" fill="#1E1B4B" />

          {/* Glass Chamber & Neon Flame */}
          <rect
            x="125"
            y="270"
            width="30"
            height="35"
            rx="6"
            fill="#F43F5E"
            fillOpacity="0.3"
            stroke="#FB7185"
            strokeWidth="2"
          />
          <ellipse
            cx="140"
            cy="288"
            rx="8"
            ry="12"
            fill="#FFE4E6"
            className="filter drop-shadow-[0_0_15px_rgba(244,63,94,0.9)]"
          />

          {/* Lantern Cap and Handle */}
          <path
            d="M 122,270 L 140,250 L 158,270 Z"
            fill="#4338CA"
            stroke="#818CF8"
            strokeWidth="2"
          />
          <path d="M 130,250 Q 140,230 150,250" stroke="#C7D2FE" strokeWidth="3" fill="none" />

          {/* Gradient Definitions */}
          <defs>
            <linearGradient
              id="moonGlow"
              x1="340"
              y1="60"
              x2="400"
              y2="120"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#E0E7FF" />
            </linearGradient>
            <linearGradient
              id="tentLeftGrad"
              x1="100"
              y1="100"
              x2="230"
              y2="330"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#4C1D95" />
            </linearGradient>
            <linearGradient
              id="tentRightGrad"
              x1="230"
              y1="90"
              x2="380"
              y2="320"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#60A5FA" />
              <stop offset="1" stopColor="#1E3A8A" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export const ParentHubIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[480px] aspect-square sm:aspect-[4/3]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient background glow */}
      <div className="absolute w-72 h-72 bg-purple-600/20 rounded-full blur-3xl -bottom-2 pointer-events-none" />

      {/* 3D Parents Composition */}
      <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-[1.03]">
        <img
          src="/images/safety/parents-3d.png"
          alt="Parent Hub 3D Composition"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] drop-shadow-[0_0_30px_rgba(139,92,246,0.3)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const TransparencyHubIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[480px] aspect-square sm:aspect-[4/3]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient background glow */}
      <div className="absolute w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl -bottom-2 pointer-events-none" />
      <div className="absolute w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl top-2 left-2 pointer-events-none" />

      {/* 3D Safety Controls / Transparency Console */}
      <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-[1.03]">
        <img
          src="/images/safety/safety-controls-3d.png"
          alt="Transparency Hub 3D Console"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] drop-shadow-[0_0_30px_rgba(6,182,212,0.35)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const SafetyNewsMicIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[480px] aspect-square sm:aspect-[4/3]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute w-72 h-72 bg-blue-600/25 rounded-full blur-3xl -bottom-2 pointer-events-none" />
      <div className="absolute w-44 h-44 bg-pink-500/20 rounded-full blur-2xl top-2 right-2 pointer-events-none" />

      {/* 3D Studio Broadcast Microphone Model */}
      <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-[1.03]">
        <img
          src="/images/safety/mic-3d.png"
          alt="Safety News Hub 3D Microphone"
          className="w-full h-full object-contain filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)] drop-shadow-[0_0_30px_rgba(99,102,241,0.35)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const PolicyLaptopIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[480px] aspect-square sm:aspect-[4/3]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute w-72 h-72 bg-indigo-600/25 rounded-full blur-3xl -bottom-2 pointer-events-none" />
      <div className="absolute w-44 h-44 bg-pink-500/20 rounded-full blur-2xl top-2 left-2 pointer-events-none" />

      {/* 3D Policy Laptop Model */}
      <div className="relative w-full h-full flex items-center justify-center transition-transform duration-500 hover:scale-[1.03]">
        <img
          src="/images/safety/laptop-3d.png"
          alt="Policy Hub 3D Laptop"
          className="w-full h-full object-contain filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)] drop-shadow-[0_0_30px_rgba(244,63,94,0.35)] pointer-events-none select-none"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export const TeenCharterIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[480px] aspect-square sm:aspect-[4/3]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute w-72 h-72 bg-purple-600/25 rounded-full blur-3xl -bottom-2 pointer-events-none" />
      <div className="absolute w-48 h-48 bg-pink-500/20 rounded-full blur-2xl top-2 right-2 pointer-events-none" />

      {/* 3D Isometric Teen Collaboration Roundtable Scene */}
      <div className="relative w-full h-full max-w-[420px] max-h-[340px] flex items-center justify-center transition-transform duration-500 hover:scale-[1.03]">
        <svg
          viewBox="0 0 500 400"
          className="w-full h-full filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Round Discussion Table */}
          <ellipse
            cx="250"
            cy="270"
            rx="160"
            ry="70"
            fill="#1C1438"
            stroke="#7C3AED"
            strokeWidth="4"
          />
          <ellipse cx="250" cy="265" rx="150" ry="62" fill="#2A1B54" />

          {/* Table Center Documents & Laptop */}
          <polygon points="210,240 250,230 270,250 230,260" fill="#E2E8F0" opacity="0.9" />
          <polygon points="280,245 320,235 330,255 290,265" fill="#E2E8F0" opacity="0.9" />

          {/* Mini Laptop on table */}
          <polygon points="170,245 200,235 220,255 190,265" fill="#6366F1" />
          <polygon points="170,245 200,235 200,215 170,225" fill="#93C5FD" />

          {/* Water Bottle & Mug */}
          <rect x="240" y="270" width="12" height="20" rx="6" fill="#38BDF8" />
          <circle cx="280" cy="285" r="8" fill="#F43F5E" />

          {/* Character 1 (Top / Robot Mascot) */}
          <rect
            x="220"
            y="140"
            width="60"
            height="50"
            rx="18"
            fill="#6366F1"
            stroke="#A5B4FC"
            strokeWidth="2"
          />
          <circle cx="238" cy="160" r="4" fill="#FFFFFF" />
          <circle cx="262" cy="160" r="4" fill="#FFFFFF" />
          <path
            d="M 245 130 Q 250 115 255 130"
            stroke="#10B981"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Character 2 (Left / Purple Hoodie) */}
          <circle cx="130" cy="190" r="22" fill="#8B5CF6" />
          <path
            d="M 100 270 C 100 220 160 220 160 270 Z"
            fill="#6D28D9"
            stroke="#C4B5FD"
            strokeWidth="2"
          />

          {/* Character 3 (Right / Wizard Hat) */}
          <circle cx="370" cy="200" r="22" fill="#EC4899" />
          <polygon
            points="345,200 370,130 395,200"
            fill="#7C3AED"
            stroke="#F472B6"
            strokeWidth="2"
          />
          <path
            d="M 340 280 C 340 230 400 230 400 280 Z"
            fill="#4C1D95"
            stroke="#A78BFA"
            strokeWidth="2"
          />

          {/* Character 4 (Bottom-Left / Pink Jacket) */}
          <circle cx="160" cy="290" r="22" fill="#F43F5E" />
          <path
            d="M 130 370 C 130 320 200 320 200 370 Z"
            fill="#E11D48"
            stroke="#FDA4AF"
            strokeWidth="2"
          />

          {/* Character 5 (Bottom-Right / Indigo Sweater) */}
          <circle cx="340" cy="290" r="22" fill="#3B82F6" />
          <path
            d="M 300 370 C 300 320 370 320 370 370 Z"
            fill="#1D4ED8"
            stroke="#93C5FD"
            strokeWidth="2"
          />

          {/* Floating Speech Bubbles */}
          <ellipse cx="100" cy="150" rx="24" ry="18" fill="#FFFFFF" opacity="0.9" />
          <ellipse cx="400" cy="140" rx="28" ry="20" fill="#C7D2FE" opacity="0.95" />
          <ellipse cx="410" cy="270" rx="26" ry="18" fill="#FBCFE8" opacity="0.95" />
        </svg>
      </div>
    </div>
  );
};

export const WellbeingHeartIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[480px] aspect-square sm:aspect-[4/3]',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Background Ambient Glow */}
      <div className="absolute w-72 h-72 bg-pink-600/25 rounded-full blur-3xl -bottom-2 pointer-events-none" />
      <div className="absolute w-48 h-48 bg-purple-500/20 rounded-full blur-2xl top-2 left-2 pointer-events-none" />

      {/* 3D Faceted Crystal Heart with Protective Hands */}
      <div className="relative w-full h-full max-w-[420px] max-h-[340px] flex items-center justify-center transition-transform duration-500 hover:scale-[1.03]">
        <svg
          viewBox="0 0 500 400"
          className="w-full h-full filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Protective Hand / Wing */}
          <path
            d="M 120 280 C 100 240 120 180 150 160 C 165 210 160 260 190 290 Z"
            fill="url(#handLeftGrad)"
            stroke="#818CF8"
            strokeWidth="3"
            className="filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
          />
          <path
            d="M 140 310 C 130 270 140 220 170 200 C 180 240 180 280 210 310 Z"
            fill="url(#handLeftGrad)"
            stroke="#A5B4FC"
            strokeWidth="3"
          />

          {/* Right Protective Hand / Wing */}
          <path
            d="M 380 280 C 400 240 380 180 350 160 C 335 210 340 260 310 290 Z"
            fill="url(#handRightGrad)"
            stroke="#818CF8"
            strokeWidth="3"
            className="filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
          />
          <path
            d="M 360 310 C 370 270 360 220 330 200 C 320 240 320 280 290 310 Z"
            fill="url(#handRightGrad)"
            stroke="#A5B4FC"
            strokeWidth="3"
          />

          {/* Outer Crystal Faceted Frame */}
          <path
            d="M 250 330 L 140 220 L 140 140 L 200 90 L 250 130 L 300 90 L 360 140 L 360 220 Z"
            fill="url(#heartFrameGrad)"
            stroke="#818CF8"
            strokeWidth="4"
          />

          {/* Inner Faceted Pink Gemstone Heart */}
          <path
            d="M 250 300 L 170 210 L 170 150 L 210 115 L 250 145 L 290 115 L 330 150 L 330 210 Z"
            fill="url(#gemHeartGrad)"
            stroke="#F472B6"
            strokeWidth="3"
          />

          {/* Crystal Bevel Facet Lines & Highlights */}
          <g stroke="#FDA4AF" strokeWidth="2" opacity="0.8">
            <line x1="250" y1="145" x2="250" y2="300" />
            <line x1="170" y1="150" x2="250" y2="210" />
            <line x1="330" y1="150" x2="250" y2="210" />
            <line x1="210" y1="115" x2="250" y2="145" />
            <line x1="290" y1="115" x2="250" y2="145" />
          </g>

          {/* Top-Left Specular Crystal Reflection */}
          <polygon points="175,155 210,125 240,150 205,180" fill="#FFFFFF" opacity="0.65" />

          {/* Ambient Glow */}
          <circle
            cx="250"
            cy="200"
            r="60"
            fill="#EC4899"
            fillOpacity="0.25"
            className="filter blur-xl"
          />

          <defs>
            <linearGradient
              id="handLeftGrad"
              x1="120"
              y1="160"
              x2="210"
              y2="310"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#312E81" />
            </linearGradient>
            <linearGradient
              id="handRightGrad"
              x1="380"
              y1="160"
              x2="290"
              y2="310"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#818CF8" />
              <stop offset="1" stopColor="#4338CA" />
            </linearGradient>
            <linearGradient
              id="heartFrameGrad"
              x1="140"
              y1="90"
              x2="360"
              y2="330"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#4338CA" />
              <stop offset="0.5" stopColor="#312E81" />
              <stop offset="1" stopColor="#1E1B4B" />
            </linearGradient>
            <linearGradient
              id="gemHeartGrad"
              x1="170"
              y1="115"
              x2="330"
              y2="300"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#FB7185" />
              <stop offset="0.5" stopColor="#F43F5E" />
              <stop offset="1" stopColor="#BE123C" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};
