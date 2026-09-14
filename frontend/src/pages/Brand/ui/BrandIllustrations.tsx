import React from 'react';

/**
 * Keyframe Animations for 3D Mascots on Branding Page
 */
const BrandMascotStyles: React.FC = () => (
  <style>{`
    @keyframes brandMascotFloat {
      0%, 100% {
        transform: translate3d(0, 0px, 0) rotate(-6deg);
      }
      50% {
        transform: translate3d(0, -18px, 0) rotate(-2deg);
      }
    }

    @keyframes brandMascotWaveHand {
      0%, 100% {
        transform: rotate(0deg);
      }
      25% {
        transform: rotate(-14deg);
      }
      50% {
        transform: rotate(4deg);
      }
      75% {
        transform: rotate(-18deg);
      }
    }

    @keyframes crystalCubePulse {
      0%, 100% {
        transform: translate3d(0, 0, 0) rotate(12deg) scale(1);
        filter: drop-shadow(0 20px 35px rgba(168,85,247,0.45));
      }
      50% {
        transform: translate3d(0, -12px, 0) rotate(16deg) scale(1.04);
        filter: drop-shadow(0 30px 45px rgba(192,132,252,0.6));
      }
    }

    @keyframes cyberPanHover {
      0%, 100% {
        transform: translate3d(0, 0, 0) rotate(-22deg);
      }
      50% {
        transform: translate3d(0, 14px, 0) rotate(-18deg);
      }
    }

    .brand-mascot-floating {
      animation: brandMascotFloat 5s ease-in-out infinite;
      will-change: transform;
    }

    .brand-mascot-hand {
      transform-origin: 45px 120px;
      animation: brandMascotWaveHand 3s ease-in-out infinite;
    }

    .crystal-cube-floating {
      animation: crystalCubePulse 6s ease-in-out infinite;
      will-change: transform;
    }

    .cyber-pan-floating {
      animation: cyberPanHover 4.5s ease-in-out infinite;
      will-change: transform;
    }
  `}</style>
);

/**
 * 1. Animated 3D Cyber-Wumpus Mascot (Hero Left)
 * Cute character with jacket, zipper, green leaf cap, glowing eyes and wave animation
 */
export const BrandMascotAnimated3D: React.FC<{ className?: string }> = ({
  className = 'w-48 h-48 lg:w-56 lg:h-56',
}) => {
  return (
    <div className={`relative pointer-events-none select-none ${className} brand-mascot-floating`}>
      <BrandMascotStyles />
      <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_25px_45px_rgba(88,34,180,0.5)]"
      >
        <defs>
          {/* Body Gradient */}
          <radialGradient id="mascotSkinGrad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="45%" stopColor="#7c3aed" />
            <stop offset="85%" stopColor="#5b21b6" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>

          {/* Leaf Cap Gradient */}
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>

          {/* Jacket Gradient */}
          <linearGradient id="jacketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Snout Gradient */}
          <radialGradient id="snoutGrad" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="60%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6d28d9" />
          </radialGradient>

          {/* Eye Glow */}
          <filter id="eyeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Green Leaf / Cap on Top of Head */}
        <g transform="translate(100, 30)">
          <path
            d="M0 25 C-15 10, -5 -5, 25 0 C45 5, 50 25, 30 35 C15 42, 5 35, 0 25 Z"
            fill="url(#leafGrad)"
          />
          <path d="M0 25 Q18 15 30 18" stroke="#14532d" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Cute Ears */}
        {/* Left Ear */}
        <path d="M58 85 C40 70, 38 48, 55 42 C70 38, 78 55, 75 75 Z" fill="url(#mascotSkinGrad)" />
        {/* Right Ear */}
        <path
          d="M172 85 C190 70, 192 48, 175 42 C160 38, 152 55, 155 75 Z"
          fill="url(#mascotSkinGrad)"
        />

        {/* Head / Body 3D Volume */}
        <ellipse cx="115" cy="115" rx="62" ry="58" fill="url(#mascotSkinGrad)" />

        {/* Left Waving Hand / Arm (Animated Group) */}
        <g className="brand-mascot-hand">
          <path
            d="M58 118 C32 105, 18 85, 24 76 C30 68, 48 82, 65 102 Z"
            fill="url(#mascotSkinGrad)"
          />
          {/* Hand Palm with Thumb */}
          <circle cx="25" cy="78" r="11" fill="#9333ea" />
          <circle cx="34" cy="74" r="5" fill="#a855f7" />
        </g>

        {/* Right Arm */}
        <path
          d="M168 125 C192 135, 205 152, 198 160 C190 168, 175 152, 158 135 Z"
          fill="url(#mascotSkinGrad)"
        />
        <circle cx="198" cy="158" r="10" fill="#9333ea" />

        {/* 3D Soft Snout */}
        <ellipse cx="115" cy="122" rx="26" ry="19" fill="url(#snoutGrad)" />
        {/* Nostrils */}
        <circle cx="106" cy="121" r="3.5" fill="#3b0764" />
        <circle cx="124" cy="121" r="3.5" fill="#3b0764" />

        {/* Eyes with Glowing Pupils */}
        {/* Left Eye */}
        <circle cx="92" cy="100" r="6" fill="#1e1b4b" />
        <circle cx="90" cy="98" r="2" fill="#ffffff" filter="url(#eyeGlow)" />
        {/* Right Eye */}
        <circle cx="138" cy="100" r="6" fill="#1e1b4b" />
        <circle cx="136" cy="98" r="2" fill="#ffffff" filter="url(#eyeGlow)" />

        {/* White Puffer Jacket */}
        <path
          d="M62 140 C65 130, 80 128, 115 128 C150 128, 165 130, 168 140 C172 165, 168 190, 155 198 C140 205, 90 205, 75 198 C62 190, 58 165, 62 140 Z"
          fill="url(#jacketGrad)"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />

        {/* Jacket Zipper & Collar Details */}
        <path d="M115 130 L115 195" stroke="#475569" strokeWidth="2.5" strokeDasharray="3 2" />
        <circle cx="115" cy="142" r="3" fill="#6366f1" />

        {/* Cute Legs / Feet */}
        <ellipse cx="94" cy="202" rx="14" ry="18" fill="url(#mascotSkinGrad)" />
        <ellipse cx="136" cy="202" rx="14" ry="18" fill="url(#mascotSkinGrad)" />
      </svg>
    </div>
  );
};

/**
 * 2. 3D Frosted Crystal Glass Cube with glowing "E" (Hero Top-Right)
 */
export const EternalCrystalCube3D: React.FC<{ className?: string }> = ({
  className = 'w-36 h-36 lg:w-44 lg:h-44',
}) => {
  return (
    <div className={`relative pointer-events-none select-none ${className} crystal-cube-floating`}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_25px_50px_rgba(147,51,234,0.55)]"
      >
        <defs>
          <linearGradient id="cubeTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#c084fc" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="cubeLeftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#312e81" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="cubeRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="innerGlowE" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#f3e8ff" />
            <stop offset="100%" stopColor="#c084fc" />
          </radialGradient>
        </defs>

        {/* 3D Isometric Frosted Cube Faces */}
        {/* Top Face */}
        <polygon
          points="100,20 168,55 100,90 32,55"
          fill="url(#cubeTopGrad)"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="2.5"
        />

        {/* Left Face */}
        <polygon
          points="32,55 100,90 100,165 32,130"
          fill="url(#cubeLeftGrad)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2"
        />

        {/* Right Face */}
        <polygon
          points="100,90 168,55 168,130 100,165"
          fill="url(#cubeRightGrad)"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
        />

        {/* Internal Glowing 3D "E" Floating in Glass */}
        <g transform="translate(100, 108) scale(0.95)" filter="drop-shadow(0 0 16px #a855f7)">
          <text
            x="0"
            y="12"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="48"
            fontWeight="900"
            textAnchor="middle"
            fill="url(#innerGlowE)"
          >
            E
          </text>
        </g>

        {/* Glass Highlight Specks */}
        <circle cx="68" cy="45" r="4" fill="#ffffff" opacity="0.8" />
        <circle cx="140" cy="85" r="3" fill="#ffffff" opacity="0.6" />
      </svg>
    </div>
  );
};

/**
 * 3. 3D Cyber Frying Pan Prop (Hero Bottom-Right, matching Discord branding 1:1)
 */
export const EternalCyberPan3D: React.FC<{ className?: string }> = ({
  className = 'w-32 h-32 lg:w-40 lg:h-40',
}) => {
  return (
    <div className={`relative pointer-events-none select-none ${className} cyber-pan-floating`}>
      <svg
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_20px_35px_rgba(88,34,180,0.4)]"
      >
        <defs>
          <radialGradient id="panBowlGrad" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="65%" stopColor="#5b21b6" />
            <stop offset="100%" stopColor="#2e1065" />
          </radialGradient>
          <linearGradient id="panHandleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="60%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
          <linearGradient id="panRimLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
        </defs>

        {/* Pan Rim & Inner Bowl */}
        <circle
          cx="118"
          cy="65"
          r="45"
          fill="url(#panBowlGrad)"
          stroke="url(#panRimLight)"
          strokeWidth="6"
        />

        {/* Inner Bowl Bottom Shadow */}
        <ellipse cx="118" cy="68" rx="34" ry="32" fill="#2e1065" opacity="0.6" />

        {/* Handle with Neon Grip Accent */}
        <path
          d="M84 94 L32 148 C27 153, 20 150, 18 144 C16 138, 22 132, 28 126 L78 74 Z"
          fill="url(#panHandleGrad)"
          stroke="#c084fc"
          strokeWidth="2"
        />

        {/* Hanging Hole on Handle Tip */}
        <ellipse cx="24" cy="144" rx="4" ry="5" fill="#07050f" />
      </svg>
    </div>
  );
};

/**
 * 4. 3D Cyber Spotted Egg Mascot (Need More Section Left)
 */
export const CyberSpottedEgg3D: React.FC<{ className?: string }> = ({
  className = 'w-32 h-32 lg:w-40 lg:h-40',
}) => {
  return (
    <div className={`relative pointer-events-none select-none ${className} brand-mascot-floating`}>
      <svg
        viewBox="0 0 180 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_25px_40px_rgba(74,222,128,0.35)]"
      >
        <defs>
          {/* Egg Shell Gradient */}
          <radialGradient id="eggShellGrad" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#f3e8ff" />
            <stop offset="80%" stopColor="#e9d5ff" />
            <stop offset="100%" stopColor="#c084fc" />
          </radialGradient>

          {/* Green Spot Gradient */}
          <radialGradient id="greenSpotGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </radialGradient>
        </defs>

        {/* Egg Shape */}
        <path
          d="M90 20 C140 20, 160 85, 160 135 C160 175, 130 195, 90 195 C50 195, 20 175, 20 135 C20 85, 40 20, 90 20 Z"
          fill="url(#eggShellGrad)"
        />

        {/* 3D Green Spots */}
        {/* Large Center-Left Spot */}
        <ellipse
          cx="65"
          cy="110"
          rx="28"
          ry="34"
          fill="url(#greenSpotGrad)"
          transform="rotate(-15 65 110)"
        />
        {/* Upper Right Spot */}
        <ellipse
          cx="120"
          cy="75"
          rx="16"
          ry="20"
          fill="url(#greenSpotGrad)"
          transform="rotate(20 120 75)"
        />
        {/* Bottom Right Spot */}
        <ellipse cx="132" cy="140" rx="14" ry="18" fill="url(#greenSpotGrad)" />
        {/* Small Top Left Spot */}
        <circle cx="50" cy="55" r="9" fill="url(#greenSpotGrad)" />

        {/* Glossy Top-Left Specular Reflection */}
        <ellipse
          cx="72"
          cy="48"
          rx="16"
          ry="22"
          fill="#ffffff"
          opacity="0.6"
          transform="rotate(-25 72 48)"
        />
      </svg>
    </div>
  );
};
