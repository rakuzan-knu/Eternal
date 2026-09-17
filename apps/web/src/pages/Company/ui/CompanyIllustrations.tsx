import React, { useId } from 'react';

/**
 * Embedded Keyframe Styles for Hero Mascot Flying & Coin Toss Loops
 * 2s initial delay, repeats smoothly every 7s
 */
const MascotAnimationStyles: React.FC = () => (
  <style>{`
    @keyframes heroCoinFloat {
      0%, 100% {
        transform: translate3d(0, 0px, 0);
      }
      50% {
        transform: translate3d(0, -12px, 0);
      }
    }

    @keyframes heroOrbFlyLoop {
      0% {
        transform: translate3d(0px, 0px, 0px) rotate(0deg) scale(1);
      }
      12.5% {
        transform: translate3d(26px, -20px, 0px) rotate(6deg) scale(1.07);
      }
      25% {
        transform: translate3d(42px, 2px, 0px) rotate(10deg) scale(1.12);
      }
      37.5% {
        transform: translate3d(26px, 22px, 0px) rotate(5deg) scale(1.06);
      }
      50% {
        transform: translate3d(0px, 30px, 0px) rotate(0deg) scale(1);
      }
      62.5% {
        transform: translate3d(-26px, 22px, 0px) rotate(-5deg) scale(0.94);
      }
      75% {
        transform: translate3d(-42px, 2px, 0px) rotate(-10deg) scale(0.90);
      }
      87.5% {
        transform: translate3d(-26px, -20px, 0px) rotate(-6deg) scale(0.95);
      }
      100% {
        transform: translate3d(0px, 0px, 0px) rotate(0deg) scale(1);
      }
    }

    .hero-coin-animated {
      animation: heroCoinFloat 4.5s ease-in-out infinite;
      will-change: transform;
    }

    .hero-orb-animated {
      animation: heroOrbFlyLoop 8s ease-in-out infinite;
      will-change: transform;
    }
  `}</style>
);

/**
 * 3D Glowing Eternal Coin with "E" (Perspective 3D Tilted Discord Style with 7s Toss Cycle)
 */
export const EternalCoin3D: React.FC<{ className?: string; animated?: boolean }> = ({
  className = 'w-28 h-28',
  animated = false,
}) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');
  const coinFaceGrad = `coinFaceGrad_${id}`;
  const coinRimDepth = `coinRimDepth_${id}`;
  const coinGrooveGrad = `coinGrooveGrad_${id}`;
  const coinInnerShadow = `coinInnerShadow_${id}`;

  return (
    <div
      className={`relative pointer-events-none select-none ${className} ${
        animated ? 'hero-coin-animated' : ''
      }`}
    >
      <MascotAnimationStyles />
      <svg
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_25px_40px_rgba(168,85,247,0.45)]"
      >
        <defs>
          <radialGradient id={coinFaceGrad} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#f5f3ff" />
            <stop offset="60%" stopColor="#ddd6fe" />
            <stop offset="85%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </radialGradient>
          <linearGradient id={coinRimDepth} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="40%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
          <linearGradient id={coinGrooveGrad} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#6b21a8" />
          </linearGradient>
          <filter id={coinInnerShadow} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#4c1d95" floodOpacity="0.4" />
          </filter>
        </defs>

        <g transform="rotate(15 90 90)">
          {/* Coin Rim 3D Extrusion */}
          <path
            d="M 40 85 C 40 120, 140 120, 140 85 L 148 97 C 148 135, 32 135, 32 97 Z"
            fill={`url(#${coinRimDepth})`}
          />

          {/* Ribbed Rim Edges */}
          <ellipse cx="90" cy="95" rx="58" ry="42" fill={`url(#${coinRimDepth})`} opacity="0.85" />

          {/* Coin Main Top Face */}
          <ellipse cx="90" cy="85" rx="58" ry="42" fill={`url(#${coinFaceGrad})`} />

          {/* Inset Ring Groove */}
          <ellipse
            cx="90"
            cy="85"
            rx="50"
            ry="35"
            stroke={`url(#${coinGrooveGrad})`}
            strokeWidth="3"
            fill="none"
            opacity="0.8"
          />

          {/* Top Edge Gloss Highlight */}
          <path
            d="M 50 65 C 70 52, 110 52, 130 65 C 120 58, 60 58, 50 65 Z"
            fill="#ffffff"
            fillOpacity="0.85"
          />

          {/* Embossed 3D "E" */}
          <g filter={`url(#${coinInnerShadow})`}>
            <text
              x="90"
              y="100"
              textAnchor="middle"
              fill={`url(#${coinRimDepth})`}
              fontSize="44"
              fontWeight="900"
              fontFamily="sans-serif"
              letterSpacing="-2"
            >
              E
            </text>
            <text
              x="89"
              y="98"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="44"
              fontWeight="900"
              fontFamily="sans-serif"
              letterSpacing="-2"
            >
              E
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};

/**
 * 3D Security Cyber-Orb with Orbit Flight Cycle for Hero Section
 */
export const HeroSafetyOrb: React.FC<{ className?: string }> = ({ className = 'w-28 h-28' }) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');
  const heroSafetyGrad = `heroSafetyGrad_${id}`;
  const heroHaloGold = `heroHaloGold_${id}`;
  const heroEyeCyan = `heroEyeCyan_${id}`;

  return (
    <div className={`relative pointer-events-none select-none ${className} hero-orb-animated`}>
      <MascotAnimationStyles />
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.55)]"
      >
        <defs>
          <radialGradient id={heroSafetyGrad} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#e9d5ff" />
            <stop offset="55%" stopColor="#a855f7" />
            <stop offset="85%" stopColor="#6b21a8" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>
          <linearGradient id={heroHaloGold} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id={heroEyeCyan} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Floating Halo */}
        <ellipse
          cx="80"
          cy="26"
          rx="38"
          ry="11"
          stroke={`url(#${heroHaloGold})`}
          strokeWidth="6"
          fill="none"
          transform="rotate(-8 80 26)"
          className="drop-shadow-[0_0_12px_rgba(250,204,21,0.7)]"
        />

        {/* 3D Sphere Body */}
        <circle cx="80" cy="85" r="56" fill={`url(#${heroSafetyGrad})`} />

        {/* Top Gloss */}
        <ellipse
          cx="65"
          cy="52"
          rx="22"
          ry="12"
          transform="rotate(-25 65 52)"
          fill="#ffffff"
          fillOpacity="0.45"
        />

        {/* Cyber Eyes */}
        <ellipse
          cx="62"
          cy="82"
          rx="6.5"
          ry="9"
          fill={`url(#${heroEyeCyan})`}
          className="drop-shadow-[0_0_6px_#22d3ee]"
        />
        <circle cx="64" cy="79" r="2.5" fill="#ffffff" />

        <ellipse
          cx="98"
          cy="82"
          rx="6.5"
          ry="9"
          fill={`url(#${heroEyeCyan})`}
          className="drop-shadow-[0_0_6px_#22d3ee]"
        />
        <circle cx="100" cy="79" r="2.5" fill="#ffffff" />

        {/* Smile */}
        <path
          d="M73 98 Q80 105 87 98"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />

        {/* Cheeks */}
        <ellipse cx="50" cy="94" rx="7" ry="4" fill="#f472b6" fillOpacity="0.5" />
        <ellipse cx="110" cy="94" rx="7" ry="4" fill="#f472b6" fillOpacity="0.5" />

        {/* Chest Crest */}
        <g transform="translate(68, 108)">
          <path
            d="M12 2 C18 2 22 5 22 10 C22 18 16 24 12 26 C8 24 2 18 2 10 C2 5 6 2 12 2 Z"
            fill="#1e1035"
            stroke="#facc15"
            strokeWidth="2"
          />
          <text
            x="12"
            y="17"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="10"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            E
          </text>
        </g>
      </svg>
    </div>
  );
};

/**
 * High-Fidelity 3D White/Silver Crown with Glowing Pink Faceted Gems (1:1 Discord Style)
 */
export const EternalCrown3D: React.FC<{ className?: string }> = ({ className = 'w-28 h-28' }) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');
  const crownInnerDepth = `crownInnerDepth_${id}`;
  const crownOuterShell = `crownOuterShell_${id}`;
  const crownRimBand = `crownRimBand_${id}`;
  const pinkGemFacetTop = `pinkGemFacetTop_${id}`;
  const pinkGemFacetLeft = `pinkGemFacetLeft_${id}`;
  const pinkGemFacetRight = `pinkGemFacetRight_${id}`;
  const crownShadeLeft = `crownShadeLeft_${id}`;

  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 200 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)]"
      >
        <defs>
          {/* Inner Depth Gradient */}
          <radialGradient id={crownInnerDepth} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="60%" stopColor="#2e1065" />
            <stop offset="100%" stopColor="#0f0728" />
          </radialGradient>

          {/* Front Outer Shell Gloss Gradient (White/Silver with Lavender Tints) */}
          <linearGradient id={crownOuterShell} x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#f5f3ff" />
            <stop offset="55%" stopColor="#ede9fe" />
            <stop offset="80%" stopColor="#ddd6fe" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>

          {/* Crown Rim Band Gradient */}
          <linearGradient id={crownRimBand} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="30%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#ede9fe" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>

          {/* 3D Faceted Pink Gem Gradient */}
          <linearGradient id={pinkGemFacetTop} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
          <linearGradient id={pinkGemFacetLeft} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#db2777" />
            <stop offset="100%" stopColor="#9d174d" />
          </linearGradient>
          <linearGradient id={pinkGemFacetRight} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>

          {/* Ambient Lighting Shade */}
          <linearGradient id={crownShadeLeft} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform="rotate(-6 100 90)">
          {/* 1. Crown Back Wall / Inner Cylinder Cavity (3D Interior) */}
          <path
            d="M 35 110 C 35 80, 165 80, 165 110 L 165 95 L 140 68 L 120 85 L 100 55 L 80 85 L 60 68 L 35 95 Z"
            fill={`url(#${crownInnerDepth})`}
          />

          {/* 2. Crown Front 3D Body Peaks (Glossy White/Lavender Porcelain Finish) */}
          <path
            d="M 32 112 
               C 32 135, 168 135, 168 112 
               L 165 72 
               L 142 96 
               L 100 52 
               L 58 96 
               L 35 72 
               Z"
            fill={`url(#${crownOuterShell})`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />

          {/* Left Shadow on Curved Shell */}
          <path
            d="M 32 112 C 32 135, 100 135, 100 112 L 100 52 L 58 96 L 35 72 Z"
            fill={`url(#${crownShadeLeft})`}
          />

          {/* 3. Crown Bottom Base Rim Band */}
          <path
            d="M 32 112 C 32 138, 168 138, 168 112 C 168 128, 32 128, 32 112 Z"
            fill={`url(#${crownRimBand})`}
          />
          <path
            d="M 36 122 C 40 136, 160 136, 164 122"
            stroke="#8b5cf6"
            strokeWidth="2.5"
            strokeOpacity="0.4"
            fill="none"
          />

          {/* 4. Faceted 3D Pink Gem 1 (Center Peak) */}
          <g transform="translate(100, 74)">
            <circle cx="0" cy="2" r="14" fill="#831843" opacity="0.5" />
            <polygon points="0,-16 11,-4 0,4 -11,-4" fill={`url(#${pinkGemFacetTop})`} />
            <polygon points="-11,-4 0,4 0,16 -11,8" fill={`url(#${pinkGemFacetLeft})`} />
            <polygon points="11,-4 0,4 0,16 11,8" fill={`url(#${pinkGemFacetRight})`} />
            <circle cx="-3" cy="-7" r="2" fill="#ffffff" opacity="0.9" />
          </g>

          {/* 5. Faceted 3D Pink Gem 2 (Left Peak) */}
          <g transform="translate(56, 86) rotate(-12)">
            <circle cx="0" cy="2" r="10" fill="#831843" opacity="0.5" />
            <polygon points="0,-12 8,-3 0,3 -8,-3" fill={`url(#${pinkGemFacetTop})`} />
            <polygon points="-8,-3 0,3 0,12 -8,6" fill={`url(#${pinkGemFacetLeft})`} />
            <polygon points="8,-3 0,3 0,12 8,6" fill={`url(#${pinkGemFacetRight})`} />
            <circle cx="-2" cy="-5" r="1.5" fill="#ffffff" opacity="0.9" />
          </g>

          {/* 6. Faceted 3D Pink Gem 3 (Right Peak) */}
          <g transform="translate(144, 86) rotate(12)">
            <circle cx="0" cy="2" r="10" fill="#831843" opacity="0.5" />
            <polygon points="0,-12 8,-3 0,3 -8,-3" fill={`url(#${pinkGemFacetTop})`} />
            <polygon points="-8,-3 0,3 0,12 -8,6" fill={`url(#${pinkGemFacetLeft})`} />
            <polygon points="8,-3 0,3 0,12 8,6" fill={`url(#${pinkGemFacetRight})`} />
            <circle cx="-2" cy="-5" r="1.5" fill="#ffffff" opacity="0.9" />
          </g>

          {/* 7. Rim Inset Pink Diamonds (Bottom Row) */}
          <circle cx="70" cy="120" r="3.5" fill="#f472b6" stroke="#9d174d" strokeWidth="1" />
          <circle cx="100" cy="123" r="4.5" fill="#f472b6" stroke="#9d174d" strokeWidth="1" />
          <circle cx="130" cy="120" r="3.5" fill="#f472b6" stroke="#9d174d" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 3D Glossy Sprout / Turnip Mascot (1:1 Discord Careers Hero Mascot)
 */
export const EternalSprout3D: React.FC<{ className?: string }> = ({ className = 'w-28 h-28' }) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');
  const sproutBodyGrad = `sproutBodyGrad_${id}`;
  const leafGrad1 = `leafGrad1_${id}`;
  const leafGrad2 = `leafGrad2_${id}`;

  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_25px_40px_rgba(168,85,247,0.5)]"
      >
        <defs>
          {/* 3D Body Gradient (Lavender to Rich Violet/Magenta) */}
          <radialGradient id={sproutBodyGrad} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#f5f3ff" />
            <stop offset="55%" stopColor="#e9d5ff" />
            <stop offset="75%" stopColor="#c084fc" />
            <stop offset="90%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#4c1d95" />
          </radialGradient>

          {/* Leaf 1 Gradient (Bright Lime Green) */}
          <linearGradient id={leafGrad1} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bbf7d0" />
            <stop offset="40%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>

          {/* Leaf 2 Gradient */}
          <linearGradient id={leafGrad2} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
        </defs>

        <g transform="rotate(-15 90 90)">
          {/* Top Green Leaves / Sprout Stems */}
          <path
            d="M 92 50 C 90 25, 60 18, 48 24 C 40 35, 65 48, 88 54 Z"
            fill={`url(#${leafGrad1})`}
          />
          <path
            d="M 94 48 C 105 20, 140 18, 148 28 C 145 42, 115 48, 96 52 Z"
            fill={`url(#${leafGrad2})`}
          />

          {/* Center Leaf Highlight Ridge */}
          <path
            d="M 88 52 C 80 32, 65 24, 52 26"
            stroke="#dcfce7"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />

          {/* 3D Glossy Turnip / Bulb Body */}
          <path
            d="M 90 48 
               C 135 48, 150 95, 138 125 
               C 125 152, 90 162, 75 145 
               C 55 125, 48 85, 90 48 Z"
            fill={`url(#${sproutBodyGrad})`}
          />

          {/* Specular Light Reflection */}
          <ellipse
            cx="75"
            cy="75"
            rx="18"
            ry="24"
            transform="rotate(-20 75 75)"
            fill="#ffffff"
            fillOpacity="0.4"
          />
          <ellipse
            cx="70"
            cy="68"
            rx="7"
            ry="11"
            transform="rotate(-20 70 68)"
            fill="#ffffff"
            fillOpacity="0.75"
          />
        </g>
      </svg>
    </div>
  );
};
