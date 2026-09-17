import React from 'react';

/**
 * 3D Floating Ban Hammer for Policy Hub Hero (matching Discord's iconic ban hammer aesthetic)
 */
export const PolicyBanHammerIllustration: React.FC<{ className?: string }> = ({
  className = 'w-44 h-44 xl:w-56 xl:h-56',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient Pulsing Glow behind hammer */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/50 via-purple-600/40 to-pink-500/50 blur-2xl animate-pulse" />

      <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.85)] transform -rotate-12 hover:rotate-0 transition-transform duration-500"
      >
        <defs>
          {/* Metallic Hammer Head Gradients */}
          <linearGradient
            id="hammerHeadFront"
            x1="60"
            y1="30"
            x2="180"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="40%" stopColor="#6366f1" />
            <stop offset="80%" stopColor="#4338ca" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>

          <linearGradient
            id="hammerHeadTop"
            x1="70"
            y1="20"
            x2="190"
            y2="50"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#c7d2fe" />
            <stop offset="50%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>

          <linearGradient
            id="hammerHeadSide"
            x1="170"
            y1="40"
            x2="210"
            y2="110"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="70%" stopColor="#312e81" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>

          {/* Glowing Pink/Magenta Power Core */}
          <linearGradient
            id="hammerCoreGem"
            x1="90"
            y1="50"
            x2="130"
            y2="80"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>

          {/* Handle Gradients */}
          <linearGradient
            id="hammerHandleGrad"
            x1="120"
            y1="80"
            x2="180"
            y2="210"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="30%" stopColor="#94a3b8" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          <linearGradient
            id="hammerGripWrap"
            x1="130"
            y1="110"
            x2="170"
            y2="180"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#7e22ce" />
            <stop offset="100%" stopColor="#581c87" />
          </linearGradient>

          <linearGradient
            id="pommelCap"
            x1="160"
            y1="190"
            x2="190"
            y2="220"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          <filter id="hammerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient floating magic runes / sparkles */}
        <circle cx="50" cy="40" r="3" fill="#f472b6" opacity="0.8" />
        <circle cx="205" cy="85" r="4" fill="#a5b4fc" opacity="0.7" />
        <circle cx="110" cy="190" r="3.5" fill="#c084fc" opacity="0.9" />
        <polygon points="40,90 45,95 40,100 35,95" fill="#60a5fa" opacity="0.6" />

        {/* 1. Handle (angled diagonally) */}
        <rect
          x="125"
          y="80"
          width="18"
          height="125"
          rx="9"
          transform="rotate(35 125 80)"
          fill="url(#hammerHandleGrad)"
        />

        {/* Handle Grip Leather Wraps */}
        <rect
          x="110"
          y="110"
          width="18"
          height="75"
          rx="6"
          transform="rotate(35 110 110)"
          fill="url(#hammerGripWrap)"
          opacity="0.9"
        />

        {/* Diagonal Grip Lines */}
        <line x1="88" y1="125" x2="102" y2="135" stroke="#c084fc" strokeWidth="2.5" opacity="0.7" />
        <line x1="75" y1="145" x2="89" y2="155" stroke="#c084fc" strokeWidth="2.5" opacity="0.7" />
        <line x1="62" y1="165" x2="76" y2="175" stroke="#c084fc" strokeWidth="2.5" opacity="0.7" />

        {/* Pommel Cap (bottom of handle) */}
        <circle cx="50" cy="192" r="14" fill="url(#pommelCap)" />
        <circle cx="50" cy="192" r="7" fill="#93c5fd" />
        <circle cx="48" cy="190" r="3" fill="#ffffff" opacity="0.9" />

        {/* 2. 3D Hammer Head Base Structure */}
        {/* Head Top Plane */}
        <polygon points="80,30 160,20 185,45 105,55" fill="url(#hammerHeadTop)" />
        {/* Head Front Plane */}
        <polygon points="65,55 145,45 145,95 65,105" fill="url(#hammerHeadFront)" />
        {/* Head Right Side Plane */}
        <polygon points="145,45 185,45 185,90 145,95" fill="url(#hammerHeadSide)" />

        {/* Hammer Impact Face (Left Chamfer) */}
        <polygon points="50,45 80,30 65,55 35,70" fill="#c7d2fe" opacity="0.9" />
        <polygon points="35,70 65,55 65,105 35,120" fill="#818cf8" />
        <polygon points="35,120 65,105 90,115 60,130" fill="#312e81" />

        {/* Hammer Back Face (Right Spike / Claw) */}
        <polygon points="185,45 205,55 205,80 185,90" fill="#1e1b4b" />

        {/* Central Power Core Inset (Glowing Pink Square Gem) */}
        <rect
          x="92"
          y="62"
          width="26"
          height="26"
          rx="5"
          fill="url(#hammerCoreGem)"
          filter="url(#hammerGlow)"
          transform="rotate(5 92 62)"
        />
        <rect
          x="97"
          y="67"
          width="16"
          height="16"
          rx="3"
          fill="#fdf2f8"
          opacity="0.9"
          transform="rotate(5 97 67)"
        />
        <circle cx="105" cy="75" r="4" fill="#ffffff" />

        {/* Metallic Bevel Highlights */}
        <line x1="80" y1="30" x2="160" y2="20" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
        <line x1="65" y1="55" x2="145" y2="45" stroke="#e0e7ff" strokeWidth="1.5" opacity="0.6" />
        <line x1="65" y1="55" x2="65" y2="105" stroke="#c7d2fe" strokeWidth="2" opacity="0.7" />
      </svg>
    </div>
  );
};

/**
 * 3D Floating Shield for Policy Hub Hero (matching Discord's shield)
 */
export const PolicyHeroShieldIllustration: React.FC<{ className?: string }> = ({
  className = 'w-44 h-44 xl:w-56 xl:h-56',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient Pulsing Glow behind shield */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/50 via-pink-500/40 to-indigo-600/50 blur-2xl animate-pulse" />

      <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] transform rotate-6 hover:rotate-0 transition-transform duration-500"
      >
        <defs>
          <linearGradient
            id="policyShieldRim"
            x1="30"
            y1="20"
            x2="210"
            y2="220"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="35%" stopColor="#c084fc" />
            <stop offset="70%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          <linearGradient
            id="policyShieldFace"
            x1="45"
            y1="35"
            x2="195"
            y2="205"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#1e1346" />
            <stop offset="50%" stopColor="#150d36" />
            <stop offset="100%" stopColor="#0b071e" />
          </linearGradient>

          <linearGradient
            id="policyShieldEmblem"
            x1="80"
            y1="75"
            x2="160"
            y2="155"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#fdf4ff" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>

        {/* Outer Beveled Shield */}
        <path
          d="M120 18L195 52V124C195 168 163 207 120 222C77 207 45 168 45 124V52L120 18Z"
          fill="url(#policyShieldRim)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="3"
        />

        {/* Inner Dark Shield Body */}
        <path
          d="M120 30L182 58V122C182 159 156 193 120 206C84 193 58 159 58 122V58L120 30Z"
          fill="url(#policyShieldFace)"
        />

        {/* Glossy Top Glass Glare */}
        <path
          d="M120 34L175 60V105C150 90 90 90 65 105V60L120 34Z"
          fill="white"
          fillOpacity="0.12"
        />

        {/* Embossed Eternal 'E' Monogram with subtle wings */}
        <g filter="drop-shadow(0px 8px 16px rgba(232,121,249,0.5))">
          <path
            d="M96 75H144C148.418 75 152 78.5817 152 83V91C152 95.4183 148.418 99 144 99H116V108H140C144.418 108 148 111.582 148 116V124C148 128.418 144.418 132 140 132H116V141H144C148.418 141 152 144.582 152 149V157C152 161.418 148.418 165 144 165H96C91.5817 165 88 161.418 88 157V83C88 78.5817 91.5817 75 96 75Z"
            fill="url(#policyShieldEmblem)"
          />
        </g>
      </svg>
    </div>
  );
};

/**
 * 3D Card Artwork Thumbnail Component for Policy Explainer cards
 * (Featuring stylized mint/emerald and royal purple banners with 3D pickaxes, badges, and crests)
 */
export const PolicyCardThumbnail: React.FC<{
  theme?: 'purple' | 'emerald' | 'indigo' | 'amber' | 'rose';
  className?: string;
}> = ({ theme = 'purple', className = 'w-full h-44' }) => {
  const gradientMap = {
    purple: 'from-[#1e114a] via-[#311b7a] to-[#120830]',
    emerald: 'from-[#064e3b] via-[#047857] to-[#022c22]',
    indigo: 'from-[#1e1b4b] via-[#3730a3] to-[#0f172a]',
    amber: 'from-[#451a03] via-[#b45309] to-[#1c0a00]',
    rose: 'from-[#4c0519] via-[#9f1239] to-[#250009]',
  };

  const accentColorMap = {
    purple: '#c084fc',
    emerald: '#34d399',
    indigo: '#818cf8',
    amber: '#fbbf24',
    rose: '#fb7185',
  };

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br ${gradientMap[theme]} flex items-center justify-center overflow-hidden border border-white/10 select-none shadow-lg group-hover:scale-[1.02] transition-transform duration-300 ${className}`}
    >
      {/* Ambient Radial Spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent pointer-events-none" />

      {/* Cyber Grid Texture */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* SVG Central Vector Graphic */}
      <svg
        viewBox="0 0 320 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10"
      >
        {/* "POLICY & SAFETY" Header text banner */}
        <text
          x="24"
          y="42"
          fill="#ffffff"
          fontWeight="900"
          fontSize="24"
          letterSpacing="0.05em"
          fontFamily="system-ui, sans-serif"
          className="uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
        >
          POLICY &
        </text>
        <text
          x="24"
          y="68"
          fill="#ffffff"
          fontWeight="900"
          fontSize="24"
          letterSpacing="0.05em"
          fontFamily="system-ui, sans-serif"
          className="uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
        >
          SAFETY
        </text>

        {/* Small Domain Tag */}
        <text
          x="24"
          y="138"
          fill="rgba(255,255,255,0.7)"
          fontWeight="700"
          fontSize="11"
          letterSpacing="0.08em"
          fontFamily="monospace"
        >
          ETERNAL.COM
        </text>

        {/* 3D App Icon Container / Floating Cube */}
        <g transform="translate(195, 30)">
          {/* Shadow */}
          <rect x="8" y="10" width="80" height="80" rx="24" fill="rgba(0,0,0,0.4)" />
          {/* Icon Box */}
          <rect
            x="0"
            y="0"
            width="80"
            height="80"
            rx="24"
            fill="#181336"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
          />
          {/* Internal Glow */}
          <circle cx="40" cy="40" r="28" fill={accentColorMap[theme]} opacity="0.25" />
          {/* 3D Mascot / Logo inside box */}
          <circle cx="32" cy="38" r="4.5" fill="#ffffff" />
          <circle cx="48" cy="38" r="4.5" fill="#ffffff" />
          <path
            d="M36 47C38 49 42 49 44 47"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* Floating 3D Pickaxes (matching Discord card style) */}
        {/* Left Pickaxe */}
        <g transform="translate(170, 65) rotate(-35) scale(0.65)">
          <rect x="25" y="5" width="8" height="50" rx="4" fill="#cbd5e1" />
          <path d="M5 25C15 10 45 10 55 25L45 30C38 20 22 20 15 30L5 25Z" fill="#a855f7" />
          <circle cx="30" cy="20" r="3" fill="#ffffff" />
        </g>

        {/* Right Pickaxe */}
        <g transform="translate(275, 45) rotate(40) scale(0.65)">
          <rect x="25" y="5" width="8" height="50" rx="4" fill="#cbd5e1" />
          <path d="M5 25C15 10 45 10 55 25L45 30C38 20 22 20 15 30L5 25Z" fill="#818cf8" />
          <circle cx="30" cy="20" r="3" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};
