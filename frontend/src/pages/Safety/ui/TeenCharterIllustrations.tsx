import React from 'react';

/**
 * 3D Isometric Teen Collaboration Roundtable Scene for Hero Banner
 * (Featuring diverse teen creators around a collaborative table with speech bubbles, laptop, and mascot)
 */
export const TeenCharterRoundtableIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-lg lg:max-w-xl h-auto',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient Pulsing Glow behind the roundtable scene */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/40 via-pink-500/30 to-indigo-600/40 blur-3xl animate-pulse pointer-events-none" />

      <svg
        viewBox="0 0 460 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
      >
        <defs>
          {/* Table Gradients */}
          <linearGradient
            id="roundtableTop"
            x1="100"
            y1="140"
            x2="360"
            y2="280"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#2e1a66" />
            <stop offset="50%" stopColor="#1e1148" />
            <stop offset="100%" stopColor="#11092e" />
          </linearGradient>

          <linearGradient
            id="roundtableRim"
            x1="120"
            y1="240"
            x2="340"
            y2="300"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>

          {/* Character Gradients */}
          <linearGradient
            id="teenPinkHoodie"
            x1="180"
            y1="240"
            x2="260"
            y2="340"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="60%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>

          <linearGradient
            id="teenPurpleJacket"
            x1="140"
            y1="160"
            x2="220"
            y2="280"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="70%" stopColor="#7e22ce" />
            <stop offset="100%" stopColor="#581c87" />
          </linearGradient>

          <linearGradient
            id="laptopGlow"
            x1="220"
            y1="210"
            x2="300"
            y2="270"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          <linearGradient
            id="speechBubbleGrad"
            x1="0"
            y1="0"
            x2="60"
            y2="50"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
        </defs>

        {/* Floating Sparkles and Stars */}
        <circle cx="90" cy="90" r="3" fill="#ec4899" opacity="0.8" />
        <circle cx="390" cy="110" r="3.5" fill="#818cf8" opacity="0.7" />
        <polygon points="120,60 123,65 120,70 117,65" fill="#60a5fa" opacity="0.8" />
        <polygon points="340,75 344,80 340,85 336,80" fill="#f472b6" opacity="0.8" />

        {/* 1. Isometric Roundtable Base */}
        <ellipse cx="240" cy="235" rx="140" ry="65" fill="url(#roundtableRim)" />
        <ellipse
          cx="240"
          cy="230"
          rx="136"
          ry="60"
          fill="url(#roundtableTop)"
          stroke="#c084fc"
          strokeWidth="2.5"
        />

        {/* Table Objects: Papers, Document, Pen */}
        {/* Document 1 */}
        <polygon points="200,210 245,200 255,230 210,240" fill="#f8fafc" opacity="0.95" />
        <line x1="210" y1="215" x2="235" y2="209" stroke="#94a3b8" strokeWidth="2" />
        <line x1="213" y1="223" x2="242" y2="216" stroke="#94a3b8" strokeWidth="2" />

        {/* Document 2 */}
        <polygon points="260,205 295,215 285,245 250,235" fill="#f1f5f9" opacity="0.9" />

        {/* 3D Glowing Open Laptop */}
        <g transform="translate(230, 215)">
          {/* Laptop Base */}
          <polygon
            points="10,25 55,20 65,38 20,43"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="1"
          />
          {/* Laptop Screen (Upright isometric) */}
          <polygon points="10,25 55,20 55,0 10,5" fill="url(#laptopGlow)" />
          {/* Screen Code Lines */}
          <line x1="16" y1="10" x2="35" y2="8" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="16" y1="15" x2="48" y2="12" stroke="#bfdbfe" strokeWidth="1.5" />
          <line x1="16" y1="20" x2="30" y2="18" stroke="#ffffff" strokeWidth="1.5" />
        </g>

        {/* Thermos / Drink Cup */}
        <ellipse cx="225" cy="255" rx="6" ry="4" fill="#38bdf8" />
        <rect x="219" y="240" width="12" height="15" rx="4" fill="#0284c7" />
        <ellipse cx="225" cy="240" rx="6" ry="3" fill="#7dd3fc" />

        {/* 2. Top-Center Character (Cute Mascot reading with glasses) */}
        <g transform="translate(210, 110)">
          {/* Mascot Ears */}
          <ellipse cx="20" cy="18" rx="8" ry="12" fill="#7c3aed" transform="rotate(-20 20 18)" />
          <ellipse cx="44" cy="18" rx="8" ry="12" fill="#7c3aed" transform="rotate(20 44 18)" />
          {/* Mascot Head */}
          <ellipse cx="32" cy="38" rx="28" ry="24" fill="#818cf8" />
          {/* Mascot Eyes */}
          <circle cx="23" cy="36" r="3.5" fill="#0f172a" />
          <circle cx="41" cy="36" r="3.5" fill="#0f172a" />
          <circle cx="24" cy="35" r="1" fill="#ffffff" />
          <circle cx="42" cy="35" r="1" fill="#ffffff" />
          {/* Mascot Muzzle */}
          <ellipse cx="32" cy="44" rx="9" ry="6" fill="#c7d2fe" />
          <polygon points="30,42 34,42 32,45" fill="#4338ca" />
          {/* Mascot Body */}
          <path d="M12 60C12 52 52 52 52 60V80H12V60Z" fill="#6366f1" />
        </g>

        {/* 3. Left Character (Teen with spiky hair and glasses, taking notes) */}
        <g transform="translate(140, 130)">
          {/* Spiky Hair */}
          <polygon points="30,10 40,25 25,30 35,40 20,40 10,25 20,20" fill="#1e1b4b" />
          {/* Head & Face */}
          <circle cx="45" cy="40" r="18" fill="#fcd34d" />
          {/* Glasses */}
          <rect
            x="36"
            y="36"
            width="10"
            height="8"
            rx="2"
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          <rect
            x="48"
            y="36"
            width="10"
            height="8"
            rx="2"
            fill="none"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          <line x1="46" y1="40" x2="48" y2="40" stroke="#0f172a" strokeWidth="1.5" />
          {/* Smile */}
          <path
            d="M43 50C45 52 49 52 51 50"
            stroke="#0f172a"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Purple Jacket */}
          <path d="M20 58C20 54 70 54 70 58L65 110L25 110Z" fill="url(#teenPurpleJacket)" />
          {/* Arm holding Pen */}
          <path d="M50 70L75 90" stroke="#fcd34d" strokeWidth="8" strokeLinecap="round" />
          <line x1="75" y1="90" x2="82" y2="98" stroke="#38bdf8" strokeWidth="3" />
        </g>

        {/* 4. Right Character (Teen with Witch Hat / Creative Stylus) */}
        <g transform="translate(300, 125)">
          {/* Witch Hat / Cool Hat */}
          <polygon points="40,5 5,55 75,55" fill="#4338ca" />
          <ellipse cx="40" cy="55" rx="36" ry="8" fill="#312e81" />
          <ellipse cx="40" cy="55" rx="14" ry="4" fill="#a855f7" />
          {/* Face */}
          <circle cx="40" cy="70" r="16" fill="#fed7aa" />
          <circle cx="34" cy="68" r="2.5" fill="#0f172a" />
          <circle cx="46" cy="68" r="2.5" fill="#0f172a" />
          <path
            d="M37 78C39 80 41 80 43 78"
            stroke="#0f172a"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Earring */}
          <circle cx="24" cy="72" r="2" fill="#fbbf24" />
          {/* Clothes */}
          <path d="M22 86C22 80 58 80 58 86L62 130H18Z" fill="#3730a3" />
          {/* Gesturing Hand with Stylus */}
          <path d="M25 95L5 110" stroke="#fed7aa" strokeWidth="7" strokeLinecap="round" />
          <line x1="5" y1="110" x2="-2" y2="116" stroke="#f472b6" strokeWidth="3" />
        </g>

        {/* 5. Bottom Character (Teen in Pink Hoodie with Headphones, seen from back/side) */}
        <g transform="translate(190, 210)">
          {/* Pink Hoodie Back & Shoulders */}
          <path d="M20 60C20 40 80 40 80 60L90 120H10Z" fill="url(#teenPinkHoodie)" />
          {/* Head & Hair */}
          <circle cx="50" cy="40" r="22" fill="#1e293b" />
          {/* Headphones */}
          <path d="M28 35C28 20 72 20 72 35" stroke="#38bdf8" strokeWidth="6" fill="none" />
          <rect x="24" y="32" width="10" height="18" rx="5" fill="#0284c7" />
          <rect x="66" y="32" width="10" height="18" rx="5" fill="#0284c7" />
          {/* Left Hand on Table */}
          <ellipse cx="30" cy="75" rx="8" ry="6" fill="#fcd34d" />
        </g>

        {/* 6. Floating Speech Bubbles */}
        {/* Left Speech Bubble */}
        <g transform="translate(80, 140)">
          <ellipse cx="30" cy="22" rx="28" ry="18" fill="url(#speechBubbleGrad)" />
          <polygon points="35,38 45,46 45,35" fill="#e0e7ff" />
          <circle cx="20" cy="22" r="2.5" fill="#818cf8" />
          <circle cx="30" cy="22" r="2.5" fill="#818cf8" />
          <circle cx="40" cy="22" r="2.5" fill="#818cf8" />
        </g>

        {/* Top-Right Speech Bubble (Heart / Sparkle) */}
        <g transform="translate(290, 110)">
          <ellipse cx="28" cy="20" rx="26" ry="17" fill="url(#speechBubbleGrad)" />
          <polygon points="20,34 12,42 16,33" fill="#e0e7ff" />
          {/* Sparkle icon inside */}
          <polygon points="28,13 30,17 34,19 30,21 28,25 26,21 22,19 26,17" fill="#ec4899" />
        </g>

        {/* Bottom-Right Speech Bubble */}
        <g transform="translate(330, 210)">
          <ellipse cx="30" cy="20" rx="26" ry="16" fill="url(#speechBubbleGrad)" />
          <polygon points="20,33 12,40 18,31" fill="#e0e7ff" />
          <circle cx="22" cy="20" r="2" fill="#ec4899" />
          <circle cx="30" cy="20" r="2" fill="#a855f7" />
          <circle cx="38" cy="20" r="2" fill="#3b82f6" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 3D Scrolled Charter Parchment Illustration for Intro Card
 */
export const CharterParchmentIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-sm h-auto',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient Pulsing Glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/30 to-pink-500/30 blur-2xl pointer-events-none" />

      <svg
        viewBox="0 0 320 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
      >
        <defs>
          <linearGradient
            id="parchmentGrad"
            x1="80"
            y1="40"
            x2="240"
            y2="240"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          <linearGradient
            id="pencilBody"
            x1="30"
            y1="80"
            x2="80"
            y2="220"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient
            id="pencilEraser"
            x1="20"
            y1="80"
            x2="50"
            y2="120"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
        </defs>

        {/* 1. Curled Parchment Paper */}
        <path
          d="M80 50C120 40 220 40 250 50C270 56 260 90 240 100C220 110 240 190 250 210C260 230 200 240 150 235C100 230 80 210 80 180Z"
          fill="url(#parchmentGrad)"
          stroke="#94a3b8"
          strokeWidth="2"
        />

        {/* Top Paper Curl */}
        <path d="M240 50C260 55 270 75 250 85C230 95 210 90 220 70Z" fill="#94a3b8" opacity="0.5" />

        {/* Charter Symbols (Triangle, Circle, Square) */}
        <polygon points="120,80 135,105 105,105" fill="#a855f7" />
        <circle cx="160" cy="92" r="12" fill="#ec4899" />
        <rect x="190" y="80" width="22" height="22" rx="4" fill="#3b82f6" />

        {/* Simulated Text Lines */}
        <rect x="105" y="125" width="110" height="7" rx="3.5" fill="#94a3b8" opacity="0.6" />
        <rect x="105" y="145" width="90" height="7" rx="3.5" fill="#94a3b8" opacity="0.6" />
        <rect x="105" y="165" width="120" height="7" rx="3.5" fill="#94a3b8" opacity="0.6" />

        {/* 2. Oversized Cute 3D Pencil */}
        <g transform="translate(20, 70) rotate(-25 40 120)">
          {/* Eraser */}
          <rect x="30" y="20" width="22" height="30" rx="11" fill="url(#pencilEraser)" />
          {/* Metal Band */}
          <rect x="29" y="45" width="24" height="12" rx="3" fill="#cbd5e1" />
          {/* Pencil Shaft */}
          <rect x="30" y="55" width="22" height="110" fill="url(#pencilBody)" />
          {/* Sharpened Wood Tip */}
          <polygon points="30,165 52,165 41,195" fill="#fed7aa" />
          {/* Graphite Lead */}
          <polygon points="37,185 45,185 41,195" fill="#0f172a" />
        </g>

        {/* 3. Floating Teen Profile Bubbles */}
        {/* Bubble 1 (Top Left) */}
        <g transform="translate(50, 40)">
          <circle cx="30" cy="30" r="22" fill="#ec4899" />
          <circle cx="30" cy="30" r="19" fill="#1e1b4b" />
          {/* Cartoon Character */}
          <circle cx="30" cy="28" r="9" fill="#fcd34d" />
          <polygon points="20,18 30,12 40,18 35,28 25,28" fill="#a855f7" />
        </g>

        {/* Bubble 2 (Bottom Right) */}
        <g transform="translate(220, 180)">
          <circle cx="30" cy="30" r="24" fill="#3b82f6" />
          <circle cx="30" cy="30" r="21" fill="#1e1b4b" />
          {/* Character with headphones */}
          <circle cx="30" cy="30" r="10" fill="#fed7aa" />
          <path d="M22 28C22 20 38 20 38 28" stroke="#ec4899" strokeWidth="3" fill="none" />
          <rect x="19" y="26" width="5" height="8" rx="2" fill="#ec4899" />
          <rect x="36" y="26" width="5" height="8" rx="2" fill="#ec4899" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 3D Teen Authenticity Illustration for Charter Pillar 1
 */
export const TeenAuthenticityIllustration: React.FC<{ className?: string }> = ({
  className = 'w-48 h-48 sm:w-56 sm:h-56',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-purple-600/30 blur-2xl pointer-events-none" />
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xl"
      >
        {/* Background Orbit Disc */}
        <circle cx="100" cy="100" r="75" fill="#1e1346" stroke="#c084fc" strokeWidth="2" />

        {/* Gamepad Floating Top Right */}
        <g transform="translate(130, 45) rotate(15) scale(0.65)">
          <rect
            x="10"
            y="15"
            width="60"
            height="40"
            rx="15"
            fill="#334155"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          <circle cx="25" cy="35" r="7" fill="#475569" />
          <circle cx="55" cy="30" r="4" fill="#ec4899" />
          <circle cx="50" cy="40" r="4" fill="#3b82f6" />
        </g>

        {/* Headphones Floating Top Left */}
        <g transform="translate(25, 45) rotate(-20) scale(0.7)">
          <path d="M15 35C15 15 55 15 55 35" stroke="#38bdf8" strokeWidth="6" fill="none" />
          <rect x="10" y="30" width="10" height="18" rx="4" fill="#0284c7" />
          <rect x="50" y="30" width="10" height="18" rx="4" fill="#0284c7" />
        </g>

        {/* Star Badge Bottom Left */}
        <polygon
          points="45,130 50,140 60,142 52,150 55,160 45,154 35,160 38,150 30,142 40,140"
          fill="#f43f5e"
        />

        {/* Central Teen Character Avatar */}
        <g transform="translate(55, 55)">
          <circle cx="45" cy="45" r="35" fill="#818cf8" />
          {/* Cap */}
          <path d="M22 35C22 20 68 20 68 35L78 40H22Z" fill="#fb7185" />
          {/* Face */}
          <circle cx="45" cy="48" r="18" fill="#fcd34d" />
          <circle cx="39" cy="46" r="2.5" fill="#0f172a" />
          <circle cx="51" cy="46" r="2.5" fill="#0f172a" />
          <path
            d="M42 54C44 56 46 56 48 54"
            stroke="#0f172a"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Hair strands */}
          <path d="M25 40L35 60L42 45" fill="#312e81" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 3D Teen Privacy Illustration for Charter Pillar 2
 */
export const TeenPrivacyIllustration: React.FC<{ className?: string }> = ({
  className = 'w-48 h-48 sm:w-56 sm:h-56',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-indigo-600/30 blur-2xl pointer-events-none" />
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xl"
      >
        {/* Background Orbit Disc */}
        <circle cx="100" cy="100" r="75" fill="#140f3a" stroke="#818cf8" strokeWidth="2" />

        {/* Smooth Capsule Pillow */}
        <rect x="50" y="130" width="100" height="28" rx="14" fill="#3b82f6" opacity="0.8" />

        {/* Reclining Teen Character */}
        <g transform="translate(45, 50)">
          {/* Hair */}
          <polygon points="35,10 50,30 65,15 75,35 65,55 35,50 25,30" fill="#92400e" />
          {/* Face */}
          <circle cx="52" cy="45" r="18" fill="#fed7aa" />
          {/* Closed Relaxed Happy Eyes */}
          <path
            d="M44 45C46 42 48 42 50 45"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M54 45C56 42 58 42 60 45"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Smile */}
          <path
            d="M48 53C52 56 56 56 58 53"
            stroke="#0f172a"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Blue Tracksuit Body */}
          <path d="M30 65C30 60 75 60 75 65L85 105H20Z" fill="#4338ca" />
          {/* Hand resting */}
          <ellipse cx="85" cy="100" rx="8" ry="6" fill="#fed7aa" />
        </g>

        {/* 3D Glossy Cartoon Eyes looking out */}
        <g transform="translate(130, 115) scale(0.65)">
          <ellipse
            cx="20"
            cy="20"
            rx="18"
            ry="22"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          <circle cx="22" cy="18" r="8" fill="#3b82f6" />
          <circle cx="24" cy="16" r="3" fill="#ffffff" />

          <ellipse
            cx="50"
            cy="22"
            rx="16"
            ry="20"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          <circle cx="52" cy="20" r="7" fill="#3b82f6" />
          <circle cx="54" cy="18" r="2.5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 3D Puzzle Collaboration Illustration for "It Takes A Village"
 */
export const PuzzleCollaborationIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-md h-auto',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-purple-600/30 blur-2xl pointer-events-none" />
      <svg
        viewBox="0 0 360 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-2xl"
      >
        {/* Tetris / Puzzle Blocks */}
        {/* Blue 2x1 block (top left) */}
        <rect
          x="50"
          y="60"
          width="30"
          height="30"
          rx="4"
          fill="#2563eb"
          stroke="#60a5fa"
          strokeWidth="2"
        />
        <rect
          x="80"
          y="60"
          width="30"
          height="30"
          rx="4"
          fill="#2563eb"
          stroke="#60a5fa"
          strokeWidth="2"
        />

        {/* Pink T-Block */}
        <rect
          x="140"
          y="110"
          width="30"
          height="30"
          rx="4"
          fill="#ec4899"
          stroke="#f472b6"
          strokeWidth="2"
        />
        <rect
          x="170"
          y="110"
          width="30"
          height="30"
          rx="4"
          fill="#ec4899"
          stroke="#f472b6"
          strokeWidth="2"
        />
        <rect
          x="140"
          y="140"
          width="30"
          height="30"
          rx="4"
          fill="#ec4899"
          stroke="#f472b6"
          strokeWidth="2"
        />
        <rect
          x="140"
          y="80"
          width="30"
          height="30"
          rx="4"
          fill="#ec4899"
          stroke="#f472b6"
          strokeWidth="2"
        />

        {/* Cyan Column Block */}
        <rect
          x="210"
          y="90"
          width="30"
          height="30"
          rx="4"
          fill="#06b6d4"
          stroke="#67e8f9"
          strokeWidth="2"
        />
        <rect
          x="210"
          y="120"
          width="30"
          height="30"
          rx="4"
          fill="#06b6d4"
          stroke="#67e8f9"
          strokeWidth="2"
        />
        <rect
          x="210"
          y="150"
          width="30"
          height="30"
          rx="4"
          fill="#06b6d4"
          stroke="#67e8f9"
          strokeWidth="2"
        />

        {/* Pink Corner Block (Bottom Right) */}
        <rect
          x="270"
          y="170"
          width="35"
          height="35"
          rx="5"
          fill="#ec4899"
          stroke="#f472b6"
          strokeWidth="2"
        />
        <rect
          x="270"
          y="205"
          width="35"
          height="35"
          rx="5"
          fill="#ec4899"
          stroke="#f472b6"
          strokeWidth="2"
        />
        <rect
          x="305"
          y="205"
          width="35"
          height="35"
          rx="5"
          fill="#ec4899"
          stroke="#f472b6"
          strokeWidth="2"
        />

        {/* 1. Purple Stylized Hand (Top-Center) */}
        <g transform="translate(130, 20)">
          <path d="M25 0L35 45L45 60L35 70L20 60L10 35Z" fill="#7c3aed" />
          <rect x="15" y="55" width="10" height="25" rx="4" fill="#a855f7" />
          <rect x="28" y="58" width="10" height="28" rx="4" fill="#a855f7" />
          <rect x="40" y="55" width="10" height="22" rx="4" fill="#a855f7" />
        </g>

        {/* 2. Fluffy White Cloud Mascot Paw (Top-Right) */}
        <g transform="translate(205, 50)">
          <circle cx="25" cy="25" r="16" fill="#ffffff" />
          <circle cx="14" cy="14" r="8" fill="#f8fafc" />
          <circle cx="36" cy="14" r="8" fill="#f8fafc" />
          <circle cx="25" cy="4" r="7" fill="#f8fafc" />
          <circle cx="25" cy="25" r="6" fill="#f472b6" />
        </g>

        {/* 3. Blue Robotic Hand (Bottom-Left) */}
        <g transform="translate(90, 160)">
          <rect
            x="10"
            y="15"
            width="45"
            height="35"
            rx="10"
            fill="#38bdf8"
            stroke="#bae6fd"
            strokeWidth="2"
          />
          <circle cx="20" cy="22" r="3" fill="#ffffff" />
          <circle cx="20" cy="38" r="3" fill="#ffffff" />
          <rect x="52" y="15" width="15" height="8" rx="4" fill="#0284c7" />
          <rect x="52" y="27" width="18" height="8" rx="4" fill="#0284c7" />
          <rect x="52" y="39" width="15" height="8" rx="4" fill="#0284c7" />
        </g>

        {/* 4. Human Hand reaching from Bottom Right */}
        <g transform="translate(180, 170)">
          <path d="M70 70L25 25L10 35L50 80Z" fill="#fed7aa" />
          <rect
            x="20"
            y="15"
            width="8"
            height="25"
            rx="4"
            transform="rotate(-30 20 15)"
            fill="#fed7aa"
          />
          <rect
            x="32"
            y="15"
            width="8"
            height="28"
            rx="4"
            transform="rotate(-30 32 15)"
            fill="#fed7aa"
          />
          <rect
            x="44"
            y="18"
            width="8"
            height="26"
            rx="4"
            transform="rotate(-30 44 18)"
            fill="#fed7aa"
          />
          <rect
            x="56"
            y="24"
            width="8"
            height="22"
            rx="4"
            transform="rotate(-30 56 24)"
            fill="#fed7aa"
          />
        </g>
      </svg>
    </div>
  );
};

/**
 * Boston Children's Digital Wellness Lab Logo
 */
export const BostonChildrensLogo: React.FC<{ className?: string }> = ({
  className = 'h-14 w-auto',
}) => {
  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* Circular Emblem with Mother and Child in Blue/White */}
      <div className="w-12 h-12 rounded-full bg-[#1d4ed8] border-2 border-white/80 flex items-center justify-center p-1.5 shrink-0 shadow-lg">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Angel / Parent figure holding child */}
          <ellipse cx="20" cy="12" rx="4" ry="4" fill="#ffffff" />
          <path d="M12 28C12 20 28 20 28 28V36H12V28Z" fill="#ffffff" />
          {/* Small Child Figure */}
          <ellipse cx="24" cy="22" rx="2.5" ry="2.5" fill="#93c5fd" />
          <path d="M20 30C20 26 28 26 28 30V36H20V30Z" fill="#93c5fd" />
        </svg>
      </div>

      <div className="flex flex-col text-left">
        <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
          Boston Children&apos;s
        </span>
        <span className="text-sm sm:text-base font-semibold text-neutral-300 tracking-normal mt-0.5">
          Digital Wellness Lab
        </span>
      </div>
    </div>
  );
};

/**
 * NŌFILTR | THORN Logo
 */
export const ThornNoFiltrLogo: React.FC<{ className?: string }> = ({
  className = 'h-14 w-auto',
}) => {
  return (
    <div
      aria-label="NŌFILTR THORN"
      className={`flex items-center gap-4 sm:gap-6 select-none ${className}`}
    >
      {/* NŌFILTR */}
      <div className="flex items-center">
        <span className="text-2xl sm:text-3xl font-black tracking-wider text-white">N</span>
        {/* Stylized Target Ō */}
        <div className="relative flex items-center justify-center mx-0.5">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 sm:border-[2.5px] border-[#22d3ee] flex items-center justify-center">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#22d3ee]" />
          </div>
          {/* Top Line over O */}
          <div className="absolute -top-1.5 w-4 h-0.5 bg-white rounded-full" />
        </div>
        <span className="text-2xl sm:text-3xl font-black tracking-wider text-white">FILTR</span>
      </div>

      {/* Vertical Divider */}
      <div className="w-[1.5px] h-8 bg-neutral-600" />

      {/* THORN */}
      <div className="flex items-center gap-1.5">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-widest text-[#fb923c]">
          THORN
        </span>
        {/* Thorn Sprout / Flame Accent */}
        <span className="text-xl sm:text-2xl font-black text-[#fb923c] rotate-12">1</span>
      </div>
    </div>
  );
};

/**
 * ThinkYoung Logo
 */
export const ThinkYoungLogo: React.FC<{ className?: string }> = ({ className = 'h-14 w-auto' }) => {
  return (
    <div className={`flex items-center gap-1 select-none ${className}`}>
      {/* Cursive script "Think" */}
      <span
        className="text-3xl sm:text-4xl text-white font-medium italic tracking-wide"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Think
      </span>
      {/* Modern sans "Young" */}
      <span className="text-3xl sm:text-4xl text-neutral-200 font-light tracking-tight ml-1 font-sans">
        Young
      </span>
    </div>
  );
};
