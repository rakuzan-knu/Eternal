import React, { useState, useEffect, useRef, useId } from 'react';
import { useLanguageStore } from '../../../shared/lib/language/languageStore';

interface NotFoundIllustrationProps {
  className?: string;
}

type MascotExpression = 'normal' | 'happy' | 'surprised' | 'cool' | 'heart' | 'dj';

export const NotFoundIllustration: React.FC<NotFoundIllustrationProps> = ({
  className = 'w-80 h-80',
}) => {
  const { currentLanguage } = useLanguageStore();
  const isUk = currentLanguage === 'Українська';
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');

  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [expression, setExpression] = useState<MascotExpression>('normal');
  const [isSpinning, setIsSpinning] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; color: string; size: number }>
  >([]);

  // Quotes and easter eggs for clicks
  const QUOTES_EN = [
    'Whoa! Zero-G backflip! 🚀',
    '404: Coordinates lost in the cosmos! 🌌',
    'Still lost, but vibing with you... 😎',
    'Found a new friend in deep space! ♥',
    'Eternal Matrix: All systems grooving! 🎧✨',
  ];

  const QUOTES_UK = [
    'Вау! Сальто в невагомості! 🚀',
    '404: Координати загублено в космосі! 🌌',
    'Загубився, але на максимальному вайбі... 😎',
    'Знайшов нового друга у кіберпросторі! ♥',
    'Eternal Matrix: Всі системи грають музику! 🎧✨',
  ];

  // Mouse tracking with smooth normalization (-1 to 1)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      setMousePos({
        x: Math.max(-1, Math.min(1, dx)),
        y: Math.max(-1, Math.min(1, dy)),
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Idle blink cycle
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (expression === 'normal') {
        // Subtle blink trigger handled via CSS or state
      }
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, [expression]);

  // Click interaction handler with Easter eggs
  const handleMascotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCount = clickCount + 1;
    setClickCount(newCount);

    const quotes = isUk ? QUOTES_UK : QUOTES_EN;
    const quoteIndex = (newCount - 1) % quotes.length;
    setSpeechBubble(quotes[quoteIndex]);

    // Expressions cycle
    const expressions: MascotExpression[] = ['happy', 'surprised', 'cool', 'heart', 'dj'];
    const nextExpr = expressions[(newCount - 1) % expressions.length];
    setExpression(nextExpr);
    setIsSpinning(true);

    // Spawn celebratory stardust burst particles
    const newParticles = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 120,
      y: (Math.random() - 0.5) * 120 - 40,
      color: ['#A855F7', '#EC4899', '#38BDF8', '#FBBF24', '#34D399'][Math.floor(Math.random() * 5)],
      size: Math.random() * 6 + 4,
    }));
    setParticles(newParticles);

    // Reset spin & temporary expression after animation
    setTimeout(() => setIsSpinning(false), 900);
    setTimeout(() => {
      setSpeechBubble(null);
      setExpression('normal');
      setParticles([]);
    }, 3200);
  };

  // 3D Parallax Tilt Calculation
  const tiltX = mousePos.y * -14;
  const tiltY = mousePos.x * 16;
  const pupilX = mousePos.x * 8;
  const pupilY = mousePos.y * 6;

  // Unique SVG element IDs
  const gradMascotBody = `mascotBody_${id}`;
  const gradVisor = `visorGrad_${id}`;
  const gradPortal = `portalGrad_${id}`;
  const gradGem = `gemGrad_${id}`;
  const filterGlow = `glowFilter_${id}`;
  const filterShadow = `shadowFilter_${id}`;

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleMascotClick}
      role="button"
      tabIndex={0}
      aria-label={isUk ? 'Інтерактивний маскот Eternal 404' : 'Interactive Eternal 404 Mascot'}
      className={`relative flex items-center justify-center select-none cursor-pointer transition-transform duration-300 ${className}`}
      style={{
        perspective: '1000px',
      }}
    >
      {/* Speech / Reaction Emote Popover */}
      {speechBubble && (
        <div className="absolute -top-12 z-30 animate-bounce pointer-events-none">
          <div className="relative px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-900/95 via-indigo-950/95 to-purple-900/95 border border-purple-400/50 shadow-[0_10px_30px_rgba(168,85,247,0.5)] backdrop-blur-xl text-white text-xs font-black tracking-wide flex items-center gap-2 whitespace-nowrap">
            <span>{speechBubble}</span>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-purple-800/90" />
          </div>
        </div>
      )}

      {/* Floating Click Confetti Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute pointer-events-none rounded-full animate-ping z-20"
          style={{
            transform: `translate(${p.x}px, ${p.y}px)`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            boxShadow: `0 0 12px ${p.color}`,
          }}
        />
      ))}

      {/* Background Ambient Cosmic Glow */}
      <div
        className={`absolute w-72 h-72 rounded-full bg-gradient-to-tr from-purple-600/40 via-indigo-600/30 to-pink-500/40 blur-3xl transition-all duration-500 pointer-events-none ${
          isHovered ? 'scale-125 opacity-100' : 'scale-100 opacity-70'
        }`}
      />

      {/* 3D Container with Mouse Parallax & Spin */}
      <div
        className="w-full h-full relative transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg) ${
            isSpinning ? 'rotate(360deg) scale(1.1)' : isHovered ? 'scale(1.05)' : 'scale(1)'
          }`,
          transformStyle: 'preserve-3d',
          transition: isSpinning
            ? 'transform 0.85s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'transform 0.15s ease-out',
        }}
      >
        <svg
          viewBox="0 0 420 420"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_25px_60px_rgba(0,0,0,0.7)]"
        >
          <defs>
            {/* 3D Glossy White Ceramic Body */}
            <radialGradient id={gradMascotBody} cx="35%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#F8FAFC" />
              <stop offset="60%" stopColor="#E2E8F0" />
              <stop offset="85%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </radialGradient>

            {/* Obsidian Glass Visor */}
            <radialGradient id={gradVisor} cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#2E1065" />
              <stop offset="45%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            {/* Neon Portal Gradient */}
            <linearGradient id={gradPortal} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="35%" stopColor="#6366F1" />
              <stop offset="70%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>

            {/* Glowing Crystal Gem */}
            <linearGradient id={gradGem} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>

            {/* Specular Rim Light */}
            <linearGradient id={`rim_${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.1" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter id={filterGlow} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Soft Ambient Shadow */}
            <filter id={filterShadow} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* ================= BACKGROUND PORTAL & ORBITS ================= */}
          {/* Orbital Dashed Ring 1 */}
          <ellipse
            cx="210"
            cy="270"
            rx="160"
            ry="48"
            stroke={`url(#${gradPortal})`}
            strokeWidth="2.5"
            strokeDasharray="10 8"
            opacity={isHovered ? '0.85' : '0.45'}
            transform="rotate(-12 210 270)"
            className="animate-spin"
            style={{ animationDuration: isHovered ? '12s' : '26s', transformOrigin: '210px 270px' }}
          />

          {/* Orbital Solid Ring 2 */}
          <ellipse
            cx="210"
            cy="270"
            rx="135"
            ry="40"
            stroke="#EC4899"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity="0.35"
            transform="rotate(8 210 270)"
            className="animate-spin"
            style={{ animationDuration: '18s', transformOrigin: '210px 270px' }}
          />

          {/* Portal Base Disk Floor */}
          <ellipse
            cx="210"
            cy="305"
            rx="115"
            ry="30"
            fill={`url(#${gradPortal})`}
            opacity="0.25"
            filter={`url(#${filterGlow})`}
          />
          <ellipse cx="210" cy="305" rx="90" ry="20" fill="#5822B4" opacity="0.4" />

          {/* Floating Space Asteroids & Crystals */}
          <g className="animate-pulse" style={{ animationDuration: '4s' }}>
            <polygon
              points="75,130 85,142 78,155 65,145 68,133"
              fill={`url(#${gradGem})`}
              filter={`url(#${filterGlow})`}
              opacity="0.8"
            />
            <polygon
              points="340,110 352,122 344,136 330,128 333,114"
              fill="#38BDF8"
              filter={`url(#${filterGlow})`}
              opacity="0.75"
            />
            <circle cx="90" cy="270" r="4" fill="#F472B6" filter={`url(#${filterGlow})`} />
            <circle cx="330" cy="260" r="5" fill="#C084FC" filter={`url(#${filterGlow})`} />
          </g>

          {/* ================= 3D MASCOT BODY (Zero-G Levitation) ================= */}
          <g className="animate-bounce" style={{ animationDuration: isHovered ? '2.2s' : '3.8s' }}>
            {/* Mascot Base Shadow on Portal */}
            <ellipse
              cx="210"
              cy="298"
              rx={isHovered ? '38' : '45'}
              ry={isHovered ? '10' : '14'}
              fill="#000000"
              opacity="0.5"
              filter={`url(#${filterShadow})`}
            />

            {/* Jetpack Thruster Glow behind body */}
            <ellipse
              cx="210"
              cy="270"
              rx="24"
              ry="8"
              fill="#A855F7"
              filter={`url(#${filterGlow})`}
              opacity={isHovered ? '0.9' : '0.4'}
            />

            {/* Left Foot / Thruster Boot */}
            <g transform="translate(170, 260)">
              <ellipse cx="0" cy="0" rx="18" ry="12" fill={`url(#${gradMascotBody})`} />
              <ellipse cx="0" cy="2" rx="14" ry="7" fill="#64748B" />
              <ellipse
                cx="0"
                cy="3"
                rx="8"
                ry="4"
                fill="#38BDF8"
                filter={`url(#${filterGlow})`}
                opacity="0.8"
              />
            </g>

            {/* Right Foot / Thruster Boot */}
            <g transform="translate(250, 260)">
              <ellipse cx="0" cy="0" rx="18" ry="12" fill={`url(#${gradMascotBody})`} />
              <ellipse cx="0" cy="2" rx="14" ry="7" fill="#64748B" />
              <ellipse
                cx="0"
                cy="3"
                rx="8"
                ry="4"
                fill="#38BDF8"
                filter={`url(#${filterGlow})`}
                opacity="0.8"
              />
            </g>

            {/* Torso / Chassis */}
            <rect
              x="155"
              y="165"
              width="110"
              height="95"
              rx="42"
              fill={`url(#${gradMascotBody})`}
              filter="drop-shadow(0 15px 25px rgba(0,0,0,0.4))"
            />

            {/* Torso Specular Highlight Curved Pill */}
            <path
              d="M 175 178 C 190 172, 230 172, 245 178"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Glowing Eternal Reactor Core (Chest Crest) */}
            <circle cx="210" cy="210" r="20" fill="#1E1B4B" stroke="#A855F7" strokeWidth="2" />
            <circle cx="210" cy="210" r="16" fill="#5822B4" filter={`url(#${filterGlow})`} />
            <path
              d="M204 202 H216 M204 210 H214 M204 218 H216 M204 202 V218"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Left Arm (Interactive Waving / Lifting) */}
            <g
              style={{
                transformOrigin: '155px 190px',
                transform: isHovered ? 'rotate(-25deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}
            >
              <rect
                x="120"
                y="170"
                width="40"
                height="32"
                rx="16"
                fill={`url(#${gradMascotBody})`}
                transform="rotate(-20 140 186)"
              />
              <circle cx="118" cy="176" r="12" fill={`url(#${gradMascotBody})`} />
            </g>

            {/* Right Arm (Holding Holographic Compass Crystal) */}
            <g
              style={{
                transformOrigin: '265px 190px',
                transform: isHovered ? 'rotate(15deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}
            >
              <rect
                x="260"
                y="170"
                width="40"
                height="32"
                rx="16"
                fill={`url(#${gradMascotBody})`}
                transform="rotate(20 280 186)"
              />
              <circle cx="302" cy="176" r="12" fill={`url(#${gradMascotBody})`} />

              {/* Floating Hologram Polyhedral Compass Crystal */}
              <g
                transform="translate(315, 155)"
                className="animate-spin"
                style={{ animationDuration: '8s', transformOrigin: 'center' }}
              >
                <polygon
                  points="0,-16 14,0 0,16 -14,0"
                  fill={`url(#${gradGem})`}
                  filter={`url(#${filterGlow})`}
                  opacity="0.9"
                />
                <polygon points="0,-16 14,0 0,0" fill="#FFFFFF" opacity="0.4" />
              </g>
            </g>

            {/* ================= 3D ASTRONAUT HEAD & HELMET ================= */}
            <g
              style={{
                transformOrigin: '210px 120px',
                transform: `translate(${mousePos.x * 4}px, ${mousePos.y * 3}px)`,
                transition: 'transform 0.1s ease-out',
              }}
            >
              {/* Helmet Main Outer Shell */}
              <rect
                x="145"
                y="70"
                width="130"
                height="110"
                rx="52"
                fill={`url(#${gradMascotBody})`}
                filter="drop-shadow(0 15px 30px rgba(0,0,0,0.5))"
              />

              {/* Helmet Top Specular Arc */}
              <path
                d="M 165 85 C 190 76, 230 76, 255 85"
                stroke="#FFFFFF"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.9"
              />

              {/* Obsidian Visor Screen */}
              <rect
                x="158"
                y="85"
                width="104"
                height="80"
                rx="38"
                fill={`url(#${gradVisor})`}
                stroke="#4C1D95"
                strokeWidth="2.5"
              />

              {/* Visor Glare Curve */}
              <path
                d="M 170 98 C 195 90, 225 90, 250 98"
                stroke="#FFFFFF"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.45"
              />

              {/* ================= DYNAMIC VISOR EYES / EMOTES ================= */}
              {expression === 'normal' && (
                <g transform={`translate(${pupilX}, ${pupilY})`}>
                  {/* Left Cyan Eye */}
                  <rect
                    x="180"
                    y="115"
                    width="16"
                    height="22"
                    rx="8"
                    fill="#38BDF8"
                    filter={`url(#${filterGlow})`}
                  />
                  <circle cx="186" cy="120" r="3.5" fill="#FFFFFF" />

                  {/* Right Cyan Eye */}
                  <rect
                    x="224"
                    y="115"
                    width="16"
                    height="22"
                    rx="8"
                    fill="#38BDF8"
                    filter={`url(#${filterGlow})`}
                  />
                  <circle cx="230" cy="120" r="3.5" fill="#FFFFFF" />
                </g>
              )}

              {expression === 'happy' && (
                <g>
                  {/* Happy Squint Eyes ( ^ _ ^ ) */}
                  <path
                    d="M 178 126 Q 188 112 198 126"
                    stroke="#38BDF8"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    filter={`url(#${filterGlow})`}
                  />
                  <path
                    d="M 222 126 Q 232 112 242 126"
                    stroke="#38BDF8"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    filter={`url(#${filterGlow})`}
                  />
                  {/* Rosy Cheeks */}
                  <ellipse
                    cx="176"
                    cy="136"
                    rx="6"
                    ry="3"
                    fill="#EC4899"
                    opacity="0.8"
                    filter={`url(#${filterGlow})`}
                  />
                  <ellipse
                    cx="244"
                    cy="136"
                    rx="6"
                    ry="3"
                    fill="#EC4899"
                    opacity="0.8"
                    filter={`url(#${filterGlow})`}
                  />
                </g>
              )}

              {expression === 'surprised' && (
                <g>
                  {/* Shocked Wide Eyes ( O _ O ) */}
                  <circle cx="188" cy="122" r="12" fill="#38BDF8" filter={`url(#${filterGlow})`} />
                  <circle cx="188" cy="122" r="6" fill="#FFFFFF" />
                  <circle cx="232" cy="122" r="12" fill="#38BDF8" filter={`url(#${filterGlow})`} />
                  <circle cx="232" cy="122" r="6" fill="#FFFFFF" />
                  {/* Open Mouth */}
                  <ellipse
                    cx="210"
                    cy="142"
                    rx="5"
                    ry="7"
                    fill="#38BDF8"
                    filter={`url(#${filterGlow})`}
                  />
                </g>
              )}

              {expression === 'cool' && (
                <g>
                  {/* Cyber 8-bit Sunglasses ( B-) ) */}
                  <polygon
                    points="172,112 210,112 206,132 176,132"
                    fill="#EC4899"
                    filter={`url(#${filterGlow})`}
                  />
                  <polygon
                    points="210,112 248,112 244,132 214,132"
                    fill="#EC4899"
                    filter={`url(#${filterGlow})`}
                  />
                  <rect x="195" y="112" width="30" height="4" fill="#EC4899" />
                  <line
                    x1="178"
                    y1="118"
                    x2="195"
                    y2="128"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="216"
                    y1="118"
                    x2="233"
                    y2="128"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {expression === 'heart' && (
                <g>
                  {/* Glowing Heart Eyes ♥ */}
                  <path
                    d="M 188 128 C 188 128, 178 120, 178 114 C 178 108, 184 106, 188 111 C 192 106, 198 108, 198 114 C 198 120, 188 128, 188 128 Z"
                    fill="#EC4899"
                    filter={`url(#${filterGlow})`}
                  />
                  <path
                    d="M 232 128 C 232 128, 222 120, 222 114 C 222 108, 228 106, 232 111 C 236 106, 242 108, 242 114 C 242 120, 232 128, 232 128 Z"
                    fill="#EC4899"
                    filter={`url(#${filterGlow})`}
                  />
                </g>
              )}

              {expression === 'dj' && (
                <g>
                  {/* Glowing Neon DJ Headphones */}
                  <path
                    d="M 140 120 C 140 60, 280 60, 280 120"
                    stroke="#A855F7"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                    filter={`url(#${filterGlow})`}
                  />
                  <rect
                    x="135"
                    y="105"
                    width="16"
                    height="34"
                    rx="8"
                    fill="#EC4899"
                    filter={`url(#${filterGlow})`}
                  />
                  <rect
                    x="269"
                    y="105"
                    width="16"
                    height="34"
                    rx="8"
                    fill="#EC4899"
                    filter={`url(#${filterGlow})`}
                  />
                  {/* Music Rhythm Visor Waves */}
                  <rect
                    x="180"
                    y="118"
                    width="6"
                    height="18"
                    rx="3"
                    fill="#38BDF8"
                    filter={`url(#${filterGlow})`}
                  />
                  <rect
                    x="192"
                    y="110"
                    width="6"
                    height="26"
                    rx="3"
                    fill="#A855F7"
                    filter={`url(#${filterGlow})`}
                  />
                  <rect
                    x="204"
                    y="114"
                    width="6"
                    height="22"
                    rx="3"
                    fill="#EC4899"
                    filter={`url(#${filterGlow})`}
                  />
                  <rect
                    x="216"
                    y="108"
                    width="6"
                    height="28"
                    rx="3"
                    fill="#FBBF24"
                    filter={`url(#${filterGlow})`}
                  />
                  <rect
                    x="228"
                    y="116"
                    width="6"
                    height="20"
                    rx="3"
                    fill="#34D399"
                    filter={`url(#${filterGlow})`}
                  />
                </g>
              )}

              {/* Antenna with Pulsing Crystal Beacon */}
              <path d="M 210 70 V 46" stroke="#94A3B8" strokeWidth="4.5" strokeLinecap="round" />
              <circle
                cx="210"
                cy="42"
                r={isHovered ? '11' : '9'}
                fill={`url(#${gradGem})`}
                filter={`url(#${filterGlow})`}
                className="animate-pulse"
              />
              <circle cx="210" cy="42" r="4" fill="#FFFFFF" />
            </g>
          </g>
        </svg>
      </div>

      {/* Interactive Helper Hint Badge */}
      <div className="absolute -bottom-2 sm:-bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/30 text-[10px] sm:text-xs font-semibold text-purple-300 backdrop-blur-md opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 whitespace-nowrap shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
        <span>
          {isUk ? 'Натисни на мене або проведи мишкою ✨' : 'Click or hover me for magic ✨'}
        </span>
      </div>
    </div>
  );
};
