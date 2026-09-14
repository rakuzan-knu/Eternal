import React from 'react';

/**
 * 1. 3D Glossy Metallic Shield with Embossed Monogram for Hero Banner
 */
export const WellbeingHeroShieldIllustration: React.FC<{ className?: string }> = ({
  className = 'w-44 h-44 sm:w-56 sm:h-56',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient Pulsing Glow behind Shield */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/40 to-pink-500/30 blur-2xl animate-pulse pointer-events-none" />

      <svg
        viewBox="0 0 200 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_20px_45px_rgba(0,0,0,0.8)]"
      >
        <defs>
          <linearGradient
            id="shieldBorderGrad"
            x1="20"
            y1="10"
            x2="180"
            y2="210"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          <linearGradient
            id="shieldFaceGrad"
            x1="40"
            y1="30"
            x2="160"
            y2="190"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          <linearGradient
            id="shieldCoreGrad"
            x1="60"
            y1="50"
            x2="140"
            y2="170"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
        </defs>

        {/* Outer 3D Shield Bevel Border */}
        <path
          d="M100 12L175 48V115C175 165 100 208 100 208C100 208 25 165 25 115V48L100 12Z"
          fill="url(#shieldBorderGrad)"
        />

        {/* Chrome Metallic Shield Face */}
        <path
          d="M100 24L163 55V112C163 154 100 192 100 192C100 192 37 154 37 112V55L100 24Z"
          fill="url(#shieldFaceGrad)"
        />

        {/* Inner Purple Gem Shield Recess */}
        <path
          d="M100 36L151 62V109C151 143 100 176 100 176C100 176 49 143 49 109V62L100 36Z"
          fill="url(#shieldCoreGrad)"
          stroke="#c084fc"
          strokeWidth="2"
        />

        {/* Embossed Eternal "E" / Safety Heart Monogram */}
        <g transform="translate(70, 72)">
          {/* 3D Heart Gem */}
          <path
            d="M30 46L8 24C1 17 4 4 15 4C21 4 27 9 30 14C33 9 39 4 45 4C56 4 59 17 52 24L30 46Z"
            fill="#f43f5e"
            stroke="#ffffff"
            strokeWidth="2.5"
          />
          {/* Central Sparkle */}
          <polygon points="30,16 32,22 38,24 32,26 30,32 28,26 22,24 28,22" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 2. 3D Floating Cute Mascot Sprout (Radish / Turnip Sprout) for Hero Banner
 */
export const WellbeingSproutIllustration: React.FC<{ className?: string }> = ({
  className = 'w-36 h-36 sm:w-48 sm:h-48',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient Pulsing Glow behind Sprout */}
      <div className="absolute inset-0 rounded-full bg-emerald-500/25 blur-2xl animate-pulse pointer-events-none" />

      <svg
        viewBox="0 0 180 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_20px_45px_rgba(0,0,0,0.7)]"
      >
        <defs>
          <linearGradient
            id="turnipBodyGrad"
            x1="50"
            y1="70"
            x2="130"
            y2="180"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#f1f5f9" />
            <stop offset="80%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          <linearGradient
            id="turnipBottomPink"
            x1="70"
            y1="130"
            x2="110"
            y2="185"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient
            id="sproutLeafGrad"
            x1="60"
            y1="10"
            x2="160"
            y2="90"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>

        {/* 1. Fresh Green Leaves on Top */}
        {/* Left Leaf */}
        <path
          d="M85 85C60 70 35 45 40 25C45 5 70 20 85 45C95 60 90 75 85 85Z"
          fill="url(#sproutLeafGrad)"
          stroke="#86efac"
          strokeWidth="2"
        />
        {/* Right Big Leaf */}
        <path
          d="M95 85C115 65 155 35 160 20C165 5 140 10 115 35C95 55 92 75 95 85Z"
          fill="url(#sproutLeafGrad)"
          stroke="#86efac"
          strokeWidth="2"
        />
        {/* Center Stem */}
        <path d="M88 90C90 70 94 50 96 40" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" />

        {/* 2. White Glossy Turnip Body */}
        <path
          d="M90 75C135 75 148 115 142 145C136 175 105 190 90 192C75 190 44 175 38 145C32 115 45 75 90 75Z"
          fill="url(#turnipBodyGrad)"
        />

        {/* Bottom Pink Blush Gradient */}
        <path
          d="M90 75C135 75 148 115 142 145C136 175 105 190 90 192C75 190 44 175 38 145C32 115 45 75 90 75Z"
          fill="url(#turnipBottomPink)"
        />

        {/* Cute Tail Root Tip */}
        <path
          d="M90 192C92 196 95 200 98 202"
          stroke="#ec4899"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Cute Face (Minimalist kawaii eyes & smile) */}
        <g transform="translate(68, 120)">
          <circle cx="10" cy="10" r="3.5" fill="#0f172a" />
          <circle cx="34" cy="10" r="3.5" fill="#0f172a" />
          <circle cx="11" cy="9" r="1" fill="#ffffff" />
          <circle cx="35" cy="9" r="1" fill="#ffffff" />
          {/* Rosy Cheeks */}
          <ellipse cx="6" cy="16" rx="4" ry="2.5" fill="#f472b6" opacity="0.6" />
          <ellipse cx="38" cy="16" rx="4" ry="2.5" fill="#f472b6" opacity="0.6" />
          {/* Happy Mouth */}
          <path
            d="M19 16C21 19 23 19 25 16"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
};

/**
 * 3. 3D Faceted Heart Gemstone with Floating Purple Hands for Crisis Text Line
 */
export const CrisisHeartGemIllustration: React.FC<{ className?: string }> = ({
  className = 'w-36 h-36 sm:w-44 sm:h-44',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Ambient Pulsing Pink/Purple Glow */}
      <div className="absolute inset-0 rounded-full bg-pink-500/30 blur-2xl animate-pulse pointer-events-none" />

      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-2xl"
      >
        <defs>
          <linearGradient
            id="gemFacet1"
            x1="30"
            y1="20"
            x2="130"
            y2="130"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>

          <linearGradient
            id="gemFacetBevel"
            x1="20"
            y1="20"
            x2="140"
            y2="140"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
        </defs>

        {/* 1. Outer Faceted 3D Crystal Heart */}
        <polygon points="80,140 20,70 40,25 80,45 120,25 140,70" fill="url(#gemFacetBevel)" />

        {/* 2. Inner Glowing Heart Gem */}
        <polygon points="80,128 32,68 48,36 80,50 112,36 128,68" fill="url(#gemFacet1)" />

        {/* Facet Highlights */}
        <polygon points="80,50 112,36 128,68 80,85" fill="#fbcfe8" opacity="0.6" />
        <polygon points="80,50 48,36 32,68 80,85" fill="#f472b6" opacity="0.8" />
        <polygon points="80,85 128,68 80,128" fill="#db2777" />
        <polygon points="80,85 32,68 80,128" fill="#9d174d" />

        {/* 3. Floating Hugging Hands */}
        {/* Left Purple Hand */}
        <g transform="translate(10, 85) rotate(-20)">
          <path d="M10 20C10 10 35 10 35 20L38 40H8Z" fill="#818cf8" />
          <circle cx="15" cy="18" r="4" fill="#a5b4fc" />
          <circle cx="24" cy="16" r="4" fill="#a5b4fc" />
          <circle cx="32" cy="18" r="4" fill="#a5b4fc" />
        </g>

        {/* Right Purple Hand */}
        <g transform="translate(120, 75) rotate(20)">
          <path d="M10 20C10 10 35 10 35 20L38 40H8Z" fill="#818cf8" />
          <circle cx="15" cy="18" r="4" fill="#a5b4fc" />
          <circle cx="24" cy="16" r="4" fill="#a5b4fc" />
          <circle cx="32" cy="18" r="4" fill="#a5b4fc" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 4. 3D Game Controller Icon for Principle 1
 */
export const WellbeingControllerIcon: React.FC<{ className?: string }> = ({
  className = 'w-16 h-16 sm:w-20 sm:h-20',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-purple-600/30 blur-xl pointer-events-none" />
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        {/* 3D Gamepad */}
        <rect
          x="12"
          y="24"
          width="56"
          height="36"
          rx="14"
          fill="#6366f1"
          stroke="#a5b4fc"
          strokeWidth="2.5"
        />
        {/* D-Pad Cross */}
        <rect x="22" y="36" width="14" height="12" rx="3" fill="#312e81" />
        <rect x="25" y="33" width="8" height="18" rx="3" fill="#312e81" />
        {/* Action Buttons */}
        <circle cx="54" cy="38" r="3.5" fill="#f43f5e" />
        <circle cx="60" cy="44" r="3.5" fill="#38bdf8" />
        <circle cx="48" cy="44" r="3.5" fill="#4ade80" />
        {/* Plus Symbol */}
        <polygon points="26,10 30,14 36,10 32,6" fill="#ec4899" />
      </svg>
    </div>
  );
};

/**
 * 5. 3D High-Five Hands Icon for Principle 2
 */
export const WellbeingHighFiveIcon: React.FC<{ className?: string }> = ({
  className = 'w-16 h-16 sm:w-20 sm:h-20',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-indigo-600/30 blur-xl pointer-events-none" />
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        {/* Left Glove / Hand (Blue/Silver) */}
        <g transform="translate(10, 18) rotate(15)">
          <path
            d="M15 15C15 5 40 5 40 15L42 45H10Z"
            fill="#38bdf8"
            stroke="#bae6fd"
            strokeWidth="2"
          />
          <rect x="16" y="8" width="6" height="14" rx="3" fill="#0284c7" />
          <rect x="24" y="6" width="6" height="16" rx="3" fill="#0284c7" />
          <rect x="32" y="8" width="6" height="14" rx="3" fill="#0284c7" />
        </g>

        {/* Right Glove / Hand (Purple/Pink) */}
        <g transform="translate(42, 18) rotate(-15)">
          <path
            d="M15 15C15 5 40 5 40 15L42 45H10Z"
            fill="#a855f7"
            stroke="#e9d5ff"
            strokeWidth="2"
          />
          <rect x="16" y="8" width="6" height="14" rx="3" fill="#6b21a8" />
          <rect x="24" y="6" width="6" height="16" rx="3" fill="#6b21a8" />
          <rect x="32" y="8" width="6" height="14" rx="3" fill="#6b21a8" />
        </g>

        {/* Impact Sparkle in Center */}
        <polygon
          points="40,24 43,30 50,32 44,35 45,42 40,37 35,42 36,35 30,32 37,30"
          fill="#fbbf24"
        />
      </svg>
    </div>
  );
};

/**
 * 6. 3D Safety Shield Heart Icon for Principle 3
 */
export const WellbeingShieldHeartIcon: React.FC<{ className?: string }> = ({
  className = 'w-16 h-16 sm:w-20 sm:h-20',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-emerald-600/30 blur-xl pointer-events-none" />
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        {/* 3D Shield */}
        <path
          d="M40 8L68 22V45C68 62 40 76 40 76C40 76 12 62 12 45V22L40 8Z"
          fill="#10b981"
          stroke="#6ee7b7"
          strokeWidth="2.5"
        />
        {/* Heart Center */}
        <path
          d="M40 52L26 38C21 33 23 24 30 24C34 24 38 27 40 31C42 27 46 24 50 24C57 24 59 33 54 38L40 52Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
};

/**
 * 7. 3D Lotus Empathy Icon for Principle 4
 */
export const WellbeingLotusEmpathyIcon: React.FC<{ className?: string }> = ({
  className = 'w-16 h-16 sm:w-20 sm:h-20',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-pink-600/30 blur-xl pointer-events-none" />
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-lg"
      >
        {/* Lotus Petals */}
        <path d="M40 18C40 18 28 35 34 54C40 48 40 30 40 18Z" fill="#ec4899" />
        <path d="M40 18C40 18 52 35 46 54C40 48 40 30 40 18Z" fill="#f472b6" />
        {/* Side Petals */}
        <path d="M22 36C22 36 24 50 40 56C30 52 24 42 22 36Z" fill="#db2777" />
        <path d="M58 36C58 36 56 50 40 56C50 52 56 42 58 36Z" fill="#db2777" />
        {/* Lotus Base Pond */}
        <ellipse cx="40" cy="58" rx="22" ry="5" fill="#831843" stroke="#f472b6" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

/**
 * 8. 3D Article Visual Header Card for Section 4
 */
export const WellbeingArticleThumbnail: React.FC<{
  type: 'banter' | 'communities' | 'on-the-road' | 'boundaries' | 'parent-guide' | 'mindfulness';
  className?: string;
}> = ({ type, className = 'w-full h-44' }) => {
  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 select-none shadow-md ${className}`}
    >
      {type === 'banter' ? (
        <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 flex items-center justify-center gap-6 p-4">
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-xl border border-white/30 shadow-lg">
            💬
          </div>
          <div className="w-0.5 h-12 bg-white/30" />
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-xl border border-white/30 shadow-lg">
            🛡️
          </div>
        </div>
      ) : type === 'communities' ? (
        <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 flex items-center justify-center gap-4 p-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center text-2xl shadow">
            🏆
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/40 border border-indigo-400/50 flex items-center justify-center text-3xl shadow-lg">
            🎮
          </div>
          <div className="w-12 h-12 rounded-2xl bg-pink-500/30 border border-pink-400/40 flex items-center justify-center text-2xl shadow">
            🌱
          </div>
        </div>
      ) : type === 'on-the-road' ? (
        <div className="w-full h-full bg-gradient-to-br from-pink-900 via-purple-950 to-slate-950 flex items-center justify-center gap-3 p-4">
          <div className="flex -space-x-3">
            <div className="w-12 h-12 rounded-full bg-pink-500 border-2 border-slate-900 flex items-center justify-center font-bold text-white text-sm shadow">
              Y1
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-500 border-2 border-slate-900 flex items-center justify-center font-bold text-white text-sm shadow">
              Y2
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-500 border-2 border-slate-900 flex items-center justify-center font-bold text-white text-sm shadow">
              Y3
            </div>
          </div>
        </div>
      ) : type === 'boundaries' ? (
        <div className="w-full h-full bg-gradient-to-br from-cyan-900 via-slate-900 to-slate-950 flex items-center justify-center gap-4 p-4">
          <div className="px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Do Not Disturb</span>
          </div>
        </div>
      ) : type === 'parent-guide' ? (
        <div className="w-full h-full bg-gradient-to-br from-amber-900 via-orange-950 to-slate-950 flex items-center justify-center gap-4 p-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/30 border border-amber-400/40 flex items-center justify-center text-3xl shadow-lg">
            👨‍👩‍👧
          </div>
        </div>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-teal-900 via-emerald-950 to-slate-950 flex items-center justify-center gap-4 p-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center text-3xl shadow-lg">
            🧘
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 9. 3D Megaphone Speaker Illustration for Quote Section (Top Left)
 */
export const WellbeingMegaphoneIllustration: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24 sm:w-32 sm:h-32',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl pointer-events-none" />
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
      >
        <defs>
          <linearGradient
            id="hornGrad"
            x1="20"
            y1="20"
            x2="100"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#e0e7ff" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient
            id="hornInside"
            x1="70"
            y1="20"
            x2="110"
            y2="70"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Megaphone Handle */}
        <g transform="translate(30, 60) rotate(-25)">
          <rect
            x="0"
            y="0"
            width="14"
            height="32"
            rx="6"
            fill="#4f46e5"
            stroke="#a5b4fc"
            strokeWidth="2"
          />
        </g>

        {/* Megaphone Body Horn */}
        <path d="M32 58L85 30V80L32 64Z" fill="url(#hornGrad)" stroke="#c7d2fe" strokeWidth="2" />

        {/* Back Cylinder */}
        <rect
          x="18"
          y="52"
          width="18"
          height="18"
          rx="5"
          fill="#38bdf8"
          stroke="#bae6fd"
          strokeWidth="2"
        />

        {/* Front Bell Opening Oval (with bright glowing purple/pink inside) */}
        <ellipse
          cx="85"
          cy="55"
          rx="14"
          ry="25"
          fill="url(#hornInside)"
          stroke="#ffffff"
          strokeWidth="2.5"
        />
        <ellipse cx="85" cy="55" rx="8" ry="16" fill="#312e81" opacity="0.6" />

        {/* Green / Cyan accent stripe */}
        <path d="M48 49L54 46V68L48 66Z" fill="#22d3ee" />
      </svg>
    </div>
  );
};

/**
 * 10. ConnectSafely Logo
 */
export const ConnectSafelyLogo: React.FC<{ className?: string }> = ({
  className = 'h-10 w-auto',
}) => {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Arch / Roof curve above logo */}
      <svg viewBox="0 0 160 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-40 h-3">
        <path d="M5 14C50 2 110 2 155 14" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {/* Text "ConnectSafely" */}
      <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-white font-sans mt-0.5">
        ConnectSafely
      </span>
    </div>
  );
};

/**
 * 11. 3D Cartoon Googly Eyes Illustration (Bottom Right)
 */
export const GooglyEyesIllustration: React.FC<{ className?: string }> = ({
  className = 'w-24 h-24 sm:w-28 sm:h-28',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 100 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
      >
        <defs>
          <linearGradient
            id="eyeBallGrad"
            x1="10"
            y1="10"
            x2="60"
            y2="70"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient
            id="irisGrad"
            x1="20"
            y1="20"
            x2="40"
            y2="50"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="60%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>

        {/* Left Eyeball (3D Sphere) */}
        <g transform="translate(5, 5)">
          <circle cx="28" cy="35" r="24" fill="url(#eyeBallGrad)" />
          {/* Iris */}
          <circle cx="22" cy="35" r="10" fill="url(#irisGrad)" />
          {/* Pupil */}
          <circle cx="22" cy="35" r="6" fill="#0f172a" />
          {/* Glossy White Specular Highlights */}
          <circle cx="19" cy="31" r="3" fill="#ffffff" />
          <circle cx="25" cy="37" r="1.5" fill="#ffffff" />
        </g>

        {/* Right Eyeball (Overlapping slightly) */}
        <g transform="translate(42, 10)">
          <circle cx="28" cy="30" r="22" fill="url(#eyeBallGrad)" />
          {/* Iris */}
          <circle cx="24" cy="30" r="9" fill="url(#irisGrad)" />
          {/* Pupil */}
          <circle cx="24" cy="30" r="5" fill="#0f172a" />
          {/* Glossy White Specular Highlights */}
          <circle cx="21" cy="27" r="2.5" fill="#ffffff" />
          <circle cx="26" cy="32" r="1.2" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
};
