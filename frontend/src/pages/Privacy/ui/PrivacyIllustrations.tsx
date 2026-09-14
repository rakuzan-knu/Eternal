import React, { useId } from 'react';

/**
 * 1. Safety Mascot: Original 3D Security Cyber-Orb with Halo and "E" Crest
 */
export const DropdownSafetyMascot: React.FC<{ className?: string }> = ({
  className = 'w-28 h-28',
}) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');
  const eternalSafetyGrad = `eternalSafetyGrad_${id}`;
  const safetyHaloGold = `safetyHaloGold_${id}`;
  const safetyEyeCyan = `safetyEyeCyan_${id}`;

  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] animate-bounce"
        style={{ animationDuration: '3.5s' }}
      >
        <defs>
          <radialGradient id={eternalSafetyGrad} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#e9d5ff" />
            <stop offset="55%" stopColor="#a855f7" />
            <stop offset="85%" stopColor="#6b21a8" />
            <stop offset="100%" stopColor="#3b0764" />
          </radialGradient>
          <linearGradient id={safetyHaloGold} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id={safetyEyeCyan} x1="0%" y1="0%" x2="100%" y2="100%">
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
          stroke={`url(#${safetyHaloGold})`}
          strokeWidth="6"
          fill="none"
          transform="rotate(-8 80 26)"
          className="drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]"
        />

        {/* 3D Sphere Body */}
        <circle cx="80" cy="85" r="56" fill={`url(#${eternalSafetyGrad})`} />

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
          fill={`url(#${safetyEyeCyan})`}
          className="drop-shadow-[0_0_6px_#22d3ee]"
        />
        <circle cx="64" cy="79" r="2.5" fill="#ffffff" />

        <ellipse
          cx="98"
          cy="82"
          rx="6.5"
          ry="9"
          fill={`url(#${safetyEyeCyan})`}
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
 * 2. Support Mascot: Cute 3D Floating Helper Bot "Astro-Neko" waving happily
 */
export const DropdownSupportMascot: React.FC<{ className?: string }> = ({
  className = 'w-28 h-28',
}) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');
  const astroBodyGrad = `astroBodyGrad_${id}`;
  const astroEarPink = `astroEarPink_${id}`;
  const astroGoggleGlass = `astroGoggleGlass_${id}`;

  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] animate-bounce"
        style={{ animationDuration: '2.8s' }}
      >
        <defs>
          <radialGradient id={astroBodyGrad} cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#f3e8ff" />
            <stop offset="80%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7e22ce" />
          </radialGradient>
          <linearGradient id={astroEarPink} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
          <linearGradient id={astroGoggleGlass} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Ears */}
        <path d="M42 45 L32 20 C32 20 52 24 58 38 Z" fill={`url(#${astroBodyGrad})`} />
        <path d="M41 40 L36 26 C36 26 48 29 52 38 Z" fill={`url(#${astroEarPink})`} />

        <path d="M102 38 C108 24 128 20 128 20 L118 45 Z" fill={`url(#${astroBodyGrad})`} />
        <path d="M108 38 C112 29 124 26 124 26 L119 40 Z" fill={`url(#${astroEarPink})`} />

        {/* Head */}
        <ellipse cx="80" cy="72" rx="42" ry="38" fill={`url(#${astroBodyGrad})`} />

        {/* Cyber Goggles */}
        <g transform="translate(48, 38)">
          <rect
            x="0"
            y="4"
            width="64"
            height="18"
            rx="9"
            fill="#1e1b4b"
            stroke="#818cf8"
            strokeWidth="2.5"
          />
          <rect x="4" y="7" width="24" height="12" rx="6" fill={`url(#${astroGoggleGlass})`} />
          <rect x="36" y="7" width="24" height="12" rx="6" fill={`url(#${astroGoggleGlass})`} />
          <line x1="28" y1="13" x2="36" y2="13" stroke="#818cf8" strokeWidth="3" />
        </g>

        {/* Kawaii Eyes */}
        <circle cx="64" cy="74" r="7" fill="#1e1b4b" />
        <circle cx="62" cy="71" r="2.5" fill="#ffffff" />
        <circle cx="66" cy="76" r="1.2" fill="#ffffff" />

        <circle cx="96" cy="74" r="7" fill="#1e1b4b" />
        <circle cx="94" cy="71" r="2.5" fill="#ffffff" />
        <circle cx="98" cy="76" r="1.2" fill="#ffffff" />

        {/* Smile */}
        <path d="M80 81 L78 79 H82 Z" fill="#ec4899" />
        <path
          d="M74 85 Q80 93 86 85"
          stroke="#1e1b4b"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="#db2777"
        />

        {/* Cheeks */}
        <ellipse cx="53" cy="80" rx="5" ry="3" fill="#f472b6" fillOpacity="0.7" />
        <ellipse cx="107" cy="80" rx="5" ry="3" fill="#f472b6" fillOpacity="0.7" />

        {/* Body & Core */}
        <path
          d="M56 100 C56 100 62 135 80 135 C98 135 104 100 104 100 Z"
          fill={`url(#${astroBodyGrad})`}
        />
        <circle cx="80" cy="115" r="9" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="2.5" />
        <circle cx="80" cy="115" r="5" fill="#38bdf8" className="animate-pulse" />

        {/* Left Arm */}
        <ellipse
          cx="46"
          cy="110"
          rx="9"
          ry="7"
          fill={`url(#${astroBodyGrad})`}
          transform="rotate(20 46 110)"
        />

        {/* Waving Paw */}
        <g style={{ transformOrigin: '105px 105px' }}>
          <ellipse
            cx="120"
            cy="88"
            rx="10"
            ry="8"
            fill={`url(#${astroBodyGrad})`}
            transform="rotate(-30 120 88)"
          />
          <circle cx="120" cy="88" r="3.5" fill="#ec4899" />
          <circle cx="116" cy="84" r="1.5" fill="#ec4899" />
          <circle cx="122" cy="83" r="1.5" fill="#ec4899" />
          <circle cx="126" cy="87" r="1.5" fill="#ec4899" />
        </g>
      </svg>
    </div>
  );
};

/**
 * 3. Blog Mascot: 3D Glossy Holographic Gem Block with Glowing Eternal Logo
 */
export const DropdownBlogMascot: React.FC<{ className?: string }> = ({
  className = 'w-28 h-28',
}) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');
  const holoGemTop = `holoGemTop_${id}`;
  const holoGemLeft = `holoGemLeft_${id}`;
  const holoGemRight = `holoGemRight_${id}`;

  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] animate-pulse"
        style={{ animationDuration: '3.5s' }}
      >
        <defs>
          <linearGradient id={holoGemTop} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id={holoGemLeft} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id={holoGemRight} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>
        </defs>

        <g transform="translate(80, 80) rotate(15) translate(-80, -80)">
          <path d="M80 18 L136 50 L80 82 L24 50 Z" fill={`url(#${holoGemTop})`} fillOpacity="0.9" />
          <path
            d="M24 50 L80 82 L80 144 L24 112 Z"
            fill={`url(#${holoGemLeft})`}
            fillOpacity="0.95"
          />
          <path
            d="M80 82 L136 50 L136 112 L80 144 Z"
            fill={`url(#${holoGemRight})`}
            fillOpacity="0.95"
          />

          <circle cx="80" cy="82" r="26" fill="#ffffff" fillOpacity="0.2" />

          <text
            x="80"
            y="91"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="26"
            fontWeight="900"
            fontFamily="sans-serif"
            className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          >
            E
          </text>
        </g>
      </svg>
    </div>
  );
};

/**
 * 4. Developer Mascot: 3D Cute CRT Retro-Bot "Byte-Bot" with Pixel Eyes and Cyber-Wrench
 * An original retro-futuristic CRT screen robot mascot with yellow pixel smiley eyes and purple chassis.
 */
export const DropdownDeveloperMascot: React.FC<{ className?: string }> = ({
  className = 'w-28 h-28',
}) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');
  const crtChassis = `crtChassis_${id}`;
  const crtScreenBg = `crtScreenBg_${id}`;
  const pixelYellow = `pixelYellow_${id}`;
  const botBodyOrange = `botBodyOrange_${id}`;

  return (
    <div className={`relative pointer-events-none select-none ${className}`}>
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] animate-bounce"
        style={{ animationDuration: '3.2s' }}
      >
        <defs>
          <linearGradient id={crtChassis} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
          <radialGradient id={crtScreenBg} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0f0e26" />
          </radialGradient>
          <linearGradient id={pixelYellow} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <linearGradient id={botBodyOrange} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* Small Antenna with Glowing Bulb */}
        <line
          x1="80"
          y1="36"
          x2="80"
          y2="20"
          stroke="#a855f7"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx="80"
          cy="18"
          r="6"
          fill="#facc15"
          className="animate-pulse drop-shadow-[0_0_8px_#fde047]"
        />

        {/* 3D CRT Monitor Head Box */}
        <rect
          x="36"
          y="34"
          width="88"
          height="66"
          rx="20"
          fill={`url(#${crtChassis})`}
          stroke="#e9d5ff"
          strokeWidth="3"
        />

        {/* Screen Glass Inset */}
        <rect x="46" y="44" width="68" height="46" rx="12" fill={`url(#${crtScreenBg})`} />

        {/* Cute Yellow Pixel Eyes (8-bit style) */}
        {/* Left Pixel Eye */}
        <g transform="translate(56, 56)">
          <rect x="0" y="4" width="6" height="12" fill={`url(#${pixelYellow})`} />
          <rect x="6" y="0" width="6" height="6" fill={`url(#${pixelYellow})`} />
          <rect x="12" y="4" width="6" height="12" fill={`url(#${pixelYellow})`} />
        </g>

        {/* Right Pixel Eye */}
        <g transform="translate(86, 56)">
          <rect x="0" y="4" width="6" height="12" fill={`url(#${pixelYellow})`} />
          <rect x="6" y="0" width="6" height="6" fill={`url(#${pixelYellow})`} />
          <rect x="12" y="4" width="6" height="12" fill={`url(#${pixelYellow})`} />
        </g>

        {/* Cute Pixel Mouth */}
        <rect x="76" y="74" width="8" height="4" rx="2" fill={`url(#${pixelYellow})`} />

        {/* Screen Glare Highlight */}
        <path d="M48 48 L72 48 L56 86 L48 86 Z" fill="#ffffff" fillOpacity="0.12" />

        {/* Orange Body Chassis */}
        <path
          d="M60 102 L52 138 L108 138 L100 102 Z"
          fill={`url(#${botBodyOrange})`}
          stroke="#c2410c"
          strokeWidth="2"
        />
        <circle cx="80" cy="120" r="7" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="80" cy="120" r="3.5" fill="#38bdf8" />

        {/* Left Mechanical Hand */}
        <path d="M52 110 L38 126" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
        <circle cx="36" cy="128" r="5" fill="#64748b" />

        {/* Right Arm Holding Cyber Stylus */}
        <path d="M100 110 L118 122" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
        {/* Stylus Tool */}
        <line
          x1="116"
          y1="114"
          x2="128"
          y2="136"
          stroke="#f43f5e"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="128" cy="136" r="3" fill="#facc15" className="animate-ping" />
      </svg>
    </div>
  );
};
