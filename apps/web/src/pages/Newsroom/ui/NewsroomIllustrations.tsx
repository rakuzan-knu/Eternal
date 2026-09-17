import React from 'react';

/**
 * 1. 3D Champion Trophy with Glowing Purple Inset Gems (Hero Top-Left)
 */
export const EternalTrophy3D: React.FC<{ className?: string }> = ({
  className = 'w-28 h-28 lg:w-36 lg:h-36',
}) => {
  return (
    <div className={`relative pointer-events-none select-none ${className} trophy-floating`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_25px_45px_rgba(168,85,247,0.55)]"
      >
        <defs>
          {/* Silver Platinum Trophy Cup Radial Gradient */}
          <radialGradient id="trophyCupGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#f1f5f9" />
            <stop offset="70%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </radialGradient>

          {/* Cup Rim Highlight */}
          <linearGradient id="trophyRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* Purple Gem Inset Radial Gradient */}
          <radialGradient id="gemGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f3e8ff" />
            <stop offset="40%" stopColor="#a855f7" />
            <stop offset="85%" stopColor="#6b21a8" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>
        </defs>

        {/* Outer Handles */}
        <path
          d="M48 65 C20 65, 20 115, 60 115"
          stroke="url(#trophyCupGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M152 65 C180 65, 180 115, 140 115"
          stroke="url(#trophyCupGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />

        {/* Main Cup Body */}
        <path
          d="M55 45 C55 110, 80 135, 100 135 C120 135, 145 110, 145 45 Z"
          fill="url(#trophyCupGrad)"
          stroke="url(#trophyRimGrad)"
          strokeWidth="2"
        />

        {/* Trophy Top Rim */}
        <ellipse cx="100" cy="45" rx="45" ry="12" fill="url(#trophyRimGrad)" />
        <ellipse cx="100" cy="45" rx="38" ry="8" fill="#1e293b" />

        {/* Stem & Pedestal */}
        <path d="M92 135 L92 155 L75 168 L125 168 L108 155 L108 135 Z" fill="url(#trophyCupGrad)" />
        <rect x="65" y="168" width="70" height="14" rx="4" fill="url(#trophyCupGrad)" />

        {/* Glowing Purple Inset Gems along the Cup Upper Rim */}
        <ellipse cx="72" cy="72" rx="6" ry="9" fill="url(#gemGrad)" transform="rotate(-15 72 72)" />
        <ellipse cx="100" cy="76" rx="6.5" ry="10" fill="url(#gemGrad)" />
        <ellipse
          cx="128"
          cy="72"
          rx="6"
          ry="9"
          fill="url(#gemGrad)"
          transform="rotate(15 128 72)"
        />

        {/* Specular Highlights */}
        <ellipse
          cx="78"
          cy="95"
          rx="4"
          ry="16"
          fill="#ffffff"
          opacity="0.6"
          transform="rotate(-10 78 95)"
        />
      </svg>
    </div>
  );
};

/**
 * 2. 3D Cyber Pickaxe Prop (For Brand Kit Banner)
 */
export const EternalPickaxe3D: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => {
  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="pickHeadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
          <linearGradient id="pickHandleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>

        {/* Curved Pickaxe Head */}
        <path
          d="M30 40 C65 25, 95 25, 130 40 C120 52, 100 50, 80 52 C60 50, 40 52, 30 40 Z"
          fill="url(#pickHeadGrad)"
          stroke="#e9d5ff"
          strokeWidth="1.5"
        />

        {/* Pickaxe Shaft / Handle */}
        <path
          d="M80 48 L140 135 C143 140, 138 145, 133 142 L74 54 Z"
          fill="url(#pickHandleGrad)"
          stroke="#cbd5e1"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};
