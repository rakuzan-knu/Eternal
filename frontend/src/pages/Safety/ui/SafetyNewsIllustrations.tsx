import React from 'react';

/**
 * 1. Hero Featured Banner Illustration (3D Mascot with Trophy, Crown, Coin, Pickaxe)
 */
export const SafetyNewsHeroBannerIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-72 sm:h-96',
}) => {
  return (
    <div
      className={`relative w-full rounded-[32px] bg-gradient-to-b from-[#2a1d63] via-[#1d1448] to-[#120d2e] flex items-center justify-center overflow-hidden border border-white/10 select-none ${className}`}
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-purple-500/25 via-indigo-600/15 to-transparent" />

      <svg
        viewBox="0 0 700 360"
        className="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="trophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="60%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="mascotSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9378ff" />
            <stop offset="50%" stopColor="#7c5cfc" />
            <stop offset="100%" stopColor="#5b3be6" />
          </linearGradient>
          <linearGradient id="jacketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
        </defs>

        {/* 1. Floating Silver Trophy with Amethyst Jewels (Top Left) */}
        <g transform="translate(230, 85) rotate(-14) scale(0.9)">
          <path
            d="M-28 -40 H28 L20 0 C18 18 10 28 0 32 C-10 28 -18 18 -20 0 Z"
            fill="url(#trophyGrad)"
            stroke="#64748b"
            strokeWidth="2"
          />
          {/* Trophy Handles */}
          <path
            d="M-26 -30 C-45 -30 -45 5 -20 5"
            stroke="url(#trophyGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M26 -30 C45 -30 45 5 20 5"
            stroke="url(#trophyGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Trophy Base */}
          <path d="M-6 32 H6 V50 H16 V60 H-16 V50 H-6 Z" fill="url(#trophyGrad)" />
          {/* Amethyst Jewels on Rim */}
          <circle cx="-16" cy="-30" r="4" fill="#a855f7" />
          <circle cx="0" cy="-30" r="4" fill="#a855f7" />
          <circle cx="16" cy="-30" r="4" fill="#a855f7" />
        </g>

        {/* 2. Floating Crown with Pink Gems (Top Right) */}
        <g transform="translate(435, 95) rotate(16) scale(0.9)">
          <path
            d="M-35 25 L-42 -20 L-15 0 L0 -30 L15 0 L42 -20 L35 25 Z"
            fill="url(#crownGrad)"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <ellipse cx="0" cy="25" rx="35" ry="8" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
          {/* Magenta / Ruby Gems on Crown tips */}
          <circle cx="-42" cy="-20" r="5" fill="#f43f5e" />
          <circle cx="0" cy="-30" r="6" fill="#ec4899" />
          <circle cx="42" cy="-20" r="5" fill="#f43f5e" />
        </g>

        {/* 3. Floating 3D Pink Coin with Eternal Logo (Left) */}
        <g transform="translate(235, 230) rotate(-12)">
          <ellipse
            cx="0"
            cy="0"
            rx="32"
            ry="32"
            fill="url(#coinGrad)"
            stroke="#fbcfe8"
            strokeWidth="2"
          />
          <ellipse cx="6" cy="6" rx="32" ry="32" fill="#be185d" opacity="0.3" />
          {/* Eternal 'E' Monogram */}
          <path
            d="M-8 -11 H8 V-6 H-2 V-2 H6 V3 H-2 V7 H8 V12 H-8 Z"
            fill="#ffffff"
            className="drop-shadow-md"
          />
        </g>

        {/* 4. Floating 3D Blue Pickaxe (Right) */}
        <g transform="translate(470, 220) rotate(42)">
          {/* Wooden / Dark Handle */}
          <rect
            x="-4"
            y="-30"
            width="8"
            height="75"
            rx="3"
            fill="#cbd5e1"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          {/* Blue Curved Pickaxe Head */}
          <path
            d="M-45 -30 C-10 -42 10 -42 45 -30 C30 -22 10 -28 0 -24 C-10 -28 -30 -22 -45 -30 Z"
            fill="#60a5fa"
            stroke="#2563eb"
            strokeWidth="2"
          />
        </g>

        {/* 5. Floating Green Leaf (Center Top) */}
        <g transform="translate(340, 115) rotate(-20)">
          <path
            d="M0 -15 C25 -10 30 15 0 25 C-30 15 -25 -10 0 -15 Z"
            fill="#34d399"
            stroke="#059669"
            strokeWidth="2"
          />
        </g>

        {/* 6. Center 3D Mascot with White Sport Jacket */}
        <g transform="translate(350, 260)">
          {/* Mascot Body / White Sport Jacket */}
          <path
            d="M-60 120 C-65 40 -40 20 0 20 C40 20 65 40 60 120 Z"
            fill="url(#jacketGrad)"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          {/* Zipper Line and Badge */}
          <line
            x1="0"
            y1="20"
            x2="0"
            y2="120"
            stroke="#475569"
            strokeWidth="3"
            strokeDasharray="3 3"
          />
          <circle cx="0" cy="50" r="5" fill="#334155" />
          {/* Small Logo Badge on Chest */}
          <rect x="14" y="45" width="16" height="12" rx="3" fill="#6366f1" />
          <path d="M18 48 H26 V50 H20 V52 H24 V54 H20 V55 H26 V57 H18 Z" fill="#ffffff" />

          {/* 3D Round Mascot Head */}
          <rect
            x="-70"
            y="-90"
            width="140"
            height="115"
            rx="45"
            fill="url(#mascotSkin)"
            stroke="#8b5cf6"
            strokeWidth="3"
          />

          {/* Cute Round Ears */}
          <circle
            cx="-68"
            cy="-40"
            r="18"
            fill="url(#mascotSkin)"
            stroke="#8b5cf6"
            strokeWidth="2"
          />
          <circle
            cx="68"
            cy="-40"
            r="18"
            fill="url(#mascotSkin)"
            stroke="#8b5cf6"
            strokeWidth="2"
          />

          {/* Glossy Black Beady Eyes */}
          <circle cx="-32" cy="-42" r="8" fill="#0f172a" />
          <circle cx="-35" cy="-45" r="3" fill="#ffffff" />
          <circle cx="32" cy="-42" r="8" fill="#0f172a" />
          <circle cx="29" cy="-45" r="3" fill="#ffffff" />

          {/* Cute Snout / Nose */}
          <ellipse
            cx="0"
            cy="-28"
            rx="28"
            ry="18"
            fill="#a78bfa"
            stroke="#c4b5fd"
            strokeWidth="1.5"
          />
          <circle cx="-8" cy="-28" r="4" fill="#4c1d95" />
          <circle cx="8" cy="-28" r="4" fill="#4c1d95" />

          {/* Subtle Smirk */}
          <path d="M12 -8 Q20 -4 24 -12" stroke="#4c1d95" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 2. Teen Default Safety Switches & Robot Mascot Illustration
 */
export const TeenSwitchesIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-48',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] flex items-center justify-center overflow-hidden border border-white/10 select-none ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-300/30 via-transparent to-transparent" />

      <svg viewBox="0 0 280 160" className="w-full h-full relative z-10" fill="none">
        {/* Toggle Switches (2 Rows) */}
        {/* Row 1 */}
        <g transform="translate(60, 45)">
          {/* Switch 1 (Checked) */}
          <rect
            x="0"
            y="0"
            width="48"
            height="24"
            rx="12"
            fill="#064e3b"
            stroke="#047857"
            strokeWidth="1.5"
          />
          <circle cx="36" cy="12" r="9" fill="#10b981" />
          <path d="M33 12 L35 14 L39 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g transform="translate(115, 45)">
          {/* Switch 2 (Crossed) */}
          <rect
            x="0"
            y="0"
            width="48"
            height="24"
            rx="12"
            fill="#064e3b"
            stroke="#047857"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="12" r="9" fill="#334155" />
          <path
            d="M9 9 L15 15 M15 9 L9 15"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(170, 45)">
          {/* Switch 3 (Checked) */}
          <rect
            x="0"
            y="0"
            width="48"
            height="24"
            rx="12"
            fill="#064e3b"
            stroke="#047857"
            strokeWidth="1.5"
          />
          <circle cx="36" cy="12" r="9" fill="#10b981" />
          <path d="M33 12 L35 14 L39 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Row 2 */}
        <g transform="translate(60, 80)">
          <rect
            x="0"
            y="0"
            width="48"
            height="24"
            rx="12"
            fill="#064e3b"
            stroke="#047857"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="12" r="9" fill="#334155" />
          <path
            d="M9 9 L15 15 M15 9 L9 15"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(115, 80)">
          <rect
            x="0"
            y="0"
            width="48"
            height="24"
            rx="12"
            fill="#064e3b"
            stroke="#047857"
            strokeWidth="1.5"
          />
          <circle cx="36" cy="12" r="9" fill="#10b981" />
          <path d="M33 12 L35 14 L39 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g transform="translate(170, 80)">
          <rect
            x="0"
            y="0"
            width="48"
            height="24"
            rx="12"
            fill="#064e3b"
            stroke="#047857"
            strokeWidth="1.5"
          />
          <circle cx="36" cy="12" r="9" fill="#10b981" />
          <path d="M33 12 L35 14 L39 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Cute Purple Mascot (Left) */}
        <g transform="translate(42, 130) scale(0.65)">
          <circle cx="0" cy="-30" r="25" fill="#8b5cf6" />
          <circle cx="-8" cy="-32" r="3" fill="#ffffff" />
          <circle cx="8" cy="-32" r="3" fill="#ffffff" />
          <rect x="-18" y="-10" width="36" height="30" rx="8" fill="#ffffff" />
          {/* Hand Pointing Up */}
          <path d="M12 -8 L28 -28" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        </g>

        {/* Floating Robot Mascot (Right) */}
        <g transform="translate(235, 65) scale(0.7)">
          <rect
            x="-24"
            y="-20"
            width="48"
            height="40"
            rx="12"
            fill="#64748b"
            stroke="#334155"
            strokeWidth="2"
          />
          <rect x="-18" y="-14" width="36" height="28" rx="8" fill="#0f172a" />
          <text x="-12" y="5" fill="#f59e0b" fontSize="14" fontWeight="bold">
            n-n
          </text>
          {/* Antenna */}
          <line x1="0" y1="-20" x2="0" y2="-28" stroke="#64748b" strokeWidth="3" />
          <circle cx="0" cy="-30" r="3" fill="#ef4444" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 3. Skater Girl Leaping Through Cyber Screens Illustration
 */
export const GirlScreensIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-48',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#180b38] via-[#24124d] to-[#120a2e] flex items-center justify-center overflow-hidden border border-white/10 select-none ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent" />

      <svg viewBox="0 0 280 160" className="w-full h-full relative z-10" fill="none">
        {/* Floating Translucent Screens */}
        <rect
          x="25"
          y="20"
          width="45"
          height="35"
          rx="6"
          fill="#8b5cf6"
          opacity="0.4"
          transform="rotate(12 25 20)"
        />
        <rect
          x="210"
          y="30"
          width="50"
          height="40"
          rx="8"
          fill="#38bdf8"
          opacity="0.3"
          transform="rotate(-15 210 30)"
        />
        <rect
          x="180"
          y="90"
          width="60"
          height="45"
          rx="8"
          fill="#ec4899"
          opacity="0.4"
          transform="rotate(8 180 90)"
        />

        {/* Leaping Teen with Pink Tracksuit and Headphones */}
        <g transform="translate(140, 85) rotate(-8)">
          {/* Pink Hoodie / Jacket */}
          <path d="M-15 -10 L15 -10 L22 25 L-22 25 Z" fill="#ec4899" />
          {/* Pink Trousers / Legs in Mid-Air Leap */}
          <path d="M-14 25 L-28 55 L-18 58 L-4 32" fill="#f472b6" />
          <path d="M10 25 L32 45 L24 50 L4 30" fill="#f472b6" />
          {/* White Sneakers */}
          <rect x="-34" y="52" width="16" height="8" rx="4" fill="#ffffff" />
          <rect x="28" y="44" width="16" height="8" rx="4" fill="#ffffff" />

          {/* Head & Hair */}
          <circle cx="0" cy="-24" r="14" fill="#fbcfe8" />
          {/* Dark Bun Hair */}
          <circle cx="0" cy="-30" r="12" fill="#1e1b4b" />
          {/* Headphones */}
          <path d="M-14 -24 C-14 -38 14 -38 14 -24" stroke="#ffffff" strokeWidth="3" fill="none" />
          <rect x="-16" y="-27" width="5" height="10" rx="2" fill="#38bdf8" />
          <rect x="11" y="-27" width="5" height="10" rx="2" fill="#38bdf8" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 4. Partnership & Coalition Illustration
 */
export const PartnershipIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-48',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#172554] flex items-center justify-center overflow-hidden border border-white/10 select-none ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />

      <svg viewBox="0 0 280 160" className="w-full h-full relative z-10" fill="none">
        {/* Floating Amethyst Crown */}
        <g transform="translate(80, 50) rotate(-15) scale(0.6)">
          <path
            d="M-30 20 L-35 -15 L-12 0 L0 -24 L12 0 L35 -15 L30 20 Z"
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <circle cx="0" cy="-24" r="5" fill="#a855f7" />
        </g>

        {/* Center Shield Emblem with Hands Clasping */}
        <g transform="translate(140, 80)">
          <path
            d="M0 -45 C35 -45 55 -30 55 10 C55 45 25 70 0 80 C-25 70 -55 45 -55 10 C-55 -30 -35 -45 0 -45 Z"
            fill="#1e1b4b"
            stroke="#60a5fa"
            strokeWidth="3"
          />
          {/* Interlocking Partnership Rings */}
          <circle cx="-12" cy="10" r="18" stroke="#38bdf8" strokeWidth="4" fill="none" />
          <circle cx="12" cy="10" r="18" stroke="#ec4899" strokeWidth="4" fill="none" />
        </g>

        {/* Floating Golden/Pink Coins */}
        <circle cx="210" cy="105" r="14" fill="#ec4899" stroke="#fbcfe8" strokeWidth="1.5" />
        <circle cx="225" cy="50" r="10" fill="#60a5fa" stroke="#bae6fd" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

/**
 * 5. Safer Internet Day Illustration (Group of Diverse Youths)
 */
export const SaferDayIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-48',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#1e143f] via-[#2d1b5e] to-[#170e33] flex items-center justify-center overflow-hidden border border-white/10 select-none ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />

      <svg viewBox="0 0 280 160" className="w-full h-full relative z-10" fill="none">
        {/* Person 1 (Left) */}
        <g transform="translate(80, 105)">
          <circle cx="0" cy="-35" r="16" fill="#fdba74" />
          <path d="M-12 -52 C-12 -58 12 -58 12 -52 Z" fill="#ec4899" />
          <path d="M-22 30 C-22 -10 22 -10 22 30 Z" fill="#f43f5e" />
        </g>

        {/* Person 2 (Center - Tall) */}
        <g transform="translate(140, 95)">
          <circle cx="0" cy="-42" r="18" fill="#fde047" />
          {/* Curly Violet Hair */}
          <circle cx="0" cy="-56" r="14" fill="#6366f1" />
          <path d="M-28 35 C-28 -15 28 -15 28 35 Z" fill="#ffffff" />
          <path d="M-8 -15 L8 -15 L0 5 Z" fill="#818cf8" />
        </g>

        {/* Person 3 (Right) */}
        <g transform="translate(200, 105)">
          <circle cx="0" cy="-35" r="16" fill="#fbcfe8" />
          {/* Cap on head */}
          <path d="M-16 -44 H16 V-38 H-16 Z" fill="#38bdf8" />
          <path d="M-22 30 C-22 -10 22 -10 22 30 Z" fill="#6366f1" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 6. Moderation Console Illustration
 */
export const ModerationConsoleIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-48',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#020617] flex items-center justify-center overflow-hidden border border-white/10 select-none ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />

      <svg viewBox="0 0 280 160" className="w-full h-full relative z-10" fill="none">
        {/* Terminal Screen Frame */}
        <rect
          x="40"
          y="25"
          width="200"
          height="110"
          rx="14"
          fill="#090d16"
          stroke="#4f46e5"
          strokeWidth="2"
        />
        {/* Header bar */}
        <rect x="40" y="25" width="200" height="24" rx="14" fill="#1e1b4b" />
        <circle cx="56" cy="37" r="4" fill="#ef4444" />
        <circle cx="68" cy="37" r="4" fill="#f59e0b" />
        <circle cx="80" cy="37" r="4" fill="#10b981" />

        {/* Filtered Safe Chat Bubble */}
        <rect x="55" y="60" width="130" height="26" rx="8" fill="#1e1b4b" />
        <circle cx="68" cy="73" r="6" fill="#10b981" />
        <line
          x1="82"
          y1="73"
          x2="165"
          y2="73"
          stroke="#a5b4fc"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Shield verification checkmark */}
        <g transform="translate(205, 73)">
          <polygon points="0,-14 12,-6 10,12 0,16 -10,12 -12,-6" fill="#10b981" />
          <path d="M-4 0 L-1 3 L5 -3" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Telemetry line */}
        <path d="M55 110 Q90 95 130 115 T210 100" fill="none" stroke="#ec4899" strokeWidth="2.5" />
      </svg>
    </div>
  );
};

/**
 * 7. Cryptography & Security Padlock Illustration
 */
export const CryptographyIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-48',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#1e1145] via-[#2a1760] to-[#12082e] flex items-center justify-center overflow-hidden border border-white/10 select-none ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/25 via-transparent to-transparent" />

      <svg viewBox="0 0 280 160" className="w-full h-full relative z-10" fill="none">
        {/* Orbiting Encryption Rings */}
        <ellipse
          cx="140"
          cy="80"
          rx="85"
          ry="32"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
        />
        <ellipse
          cx="140"
          cy="80"
          rx="65"
          ry="50"
          stroke="#ec4899"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          fill="none"
        />

        {/* 3D Glowing Padlock */}
        <g transform="translate(140, 80)">
          {/* Padlock Shackle */}
          <path
            d="M-18 -10 V-28 C-18 -42 18 -42 18 -28 V-10"
            stroke="#38bdf8"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          {/* Padlock Body */}
          <rect
            x="-30"
            y="-10"
            width="60"
            height="50"
            rx="14"
            fill="#4338ca"
            stroke="#818cf8"
            strokeWidth="2.5"
          />
          {/* Keyhole */}
          <circle cx="0" cy="10" r="5" fill="#0f172a" />
          <polygon points="-2,12 2,12 3,24 -3,24" fill="#0f172a" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 8. Server Safety Badge & Shield Illustration
 */
export const ServerBadgeIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-48',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#131138] via-[#1f1b57] to-[#0c0a26] flex items-center justify-center overflow-hidden border border-white/10 select-none ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent" />

      <svg viewBox="0 0 280 160" className="w-full h-full relative z-10" fill="none">
        {/* Shield Base */}
        <g transform="translate(140, 80)">
          <path
            d="M0 -45 C35 -45 55 -30 55 10 C55 45 25 70 0 80 C-25 70 -55 45 -55 10 C-55 -30 -35 -45 0 -45 Z"
            fill="#312e81"
            stroke="#a855f7"
            strokeWidth="3"
          />
          {/* Golden Crown Inside */}
          <path
            d="M-22 -8 L-26 -28 L-9 -16 L0 -34 L9 -16 L26 -28 L22 -8 Z"
            fill="#fbbf24"
            stroke="#f59e0b"
            strokeWidth="1.5"
          />
          {/* Verified Star Badge */}
          <polygon
            points="0,6 4,18 16,18 7,25 10,37 0,30 -10,37 -7,25 -16,18 -4,18"
            fill="#38bdf8"
          />
        </g>
      </svg>
    </div>
  );
};

/**
 * 9. Wellbeing & Mind Heart Gemstone Illustration
 */
export const WellbeingIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-48',
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#200f33] via-[#36144f] to-[#150a24] flex items-center justify-center overflow-hidden border border-white/10 select-none ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-500/30 via-transparent to-transparent" />

      <svg viewBox="0 0 280 160" className="w-full h-full relative z-10" fill="none">
        {/* Glowing Heart Crystal Gemstone */}
        <g transform="translate(140, 75) scale(0.9)">
          <circle cx="0" cy="5" r="42" fill="#ec4899" opacity="0.2" filter="blur(8px)" />
          {/* Faceted Heart Polygons */}
          <path
            d="M0 45 L-38 5 C-48 -10 -40 -35 -15 -35 C-5 -35 0 -22 0 -22 C0 -22 5 -35 15 -35 C40 -35 48 -10 38 5 Z"
            fill="#db2777"
            stroke="#fbcfe8"
            strokeWidth="2"
          />
          <polygon points="0,-22 -15,-35 0,-8" fill="#f472b6" />
          <polygon points="0,-22 15,-35 0,-8" fill="#f472b6" />
          <polygon points="0,-8 -38,5 0,45" fill="#be185d" />
          <polygon points="0,-8 38,5 0,45" fill="#9d174d" />
        </g>
      </svg>
    </div>
  );
};
