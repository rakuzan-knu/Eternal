import React, { useState, useEffect, useRef, useId } from 'react';

interface NotFoundSceneProps {
  className?: string;
}

export const NotFoundScene: React.FC<NotFoundSceneProps> = ({
  className = 'w-full max-w-[580px] h-[440px]',
}) => {
  const rawId = useId();
  const id = rawId.replace(/:/g, '_');

  // Interactive states
  const [isCooking, setIsCooking] = useState(false);
  const [cameraFlash, setCameraFlash] = useState(false);
  const [lanternSwing, setLanternSwing] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [bubbleClicks, setBubbleClicks] = useState(0);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth mouse parallax
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  // Click on Chef
  const triggerChefCook = () => {
    setIsCooking(true);
    setSpeechBubble('Cooking up something fresh! 🍜✨');
    setTimeout(() => setIsCooking(false), 1200);
    setTimeout(() => setSpeechBubble(null), 3000);
  };

  // Click on Friend (Camera flash / selfie)
  const triggerCameraFlash = () => {
    setCameraFlash(true);
    setSpeechBubble('Say 404! 📸✌️');
    setTimeout(() => setCameraFlash(false), 400);
    setTimeout(() => setSpeechBubble(null), 3000);
  };

  // Click on Lantern
  const triggerLantern = () => {
    setLanternSwing(true);
    setTimeout(() => setLanternSwing(false), 2000);
  };

  // Steaming particles
  const [steamParticles, setSteamParticles] = useState([
    { id: 1, y: 0, opacity: 0.8, xOffset: 0 },
    { id: 2, y: -15, opacity: 0.6, xOffset: 6 },
    { id: 3, y: -30, opacity: 0.4, xOffset: -4 },
    { id: 4, y: -45, opacity: 0.2, xOffset: 3 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSteamParticles((prev) =>
        prev.map((p) => ({
          ...p,
          y: p.y <= -50 ? 0 : p.y - 3,
          opacity: p.y <= -45 ? 0.1 : Math.max(0.2, 0.9 - Math.abs(p.y) / 50),
          xOffset: Math.sin((p.y + Date.now() / 300) * 0.1) * 6,
        })),
      );
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative select-none flex items-center justify-center ${className}`}
      style={{ perspective: '1200px' }}
    >
      {/* Speech / Reaction Emote Popover */}
      {speechBubble && (
        <div className="absolute top-4 z-40 animate-bounce pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-[#0f0c24]/95 border border-pink-500/50 shadow-[0_10px_35px_rgba(236,72,153,0.4)] backdrop-blur-xl text-white text-xs font-black tracking-wide flex items-center gap-2">
            <span>{speechBubble}</span>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-purple-900/90" />
          </div>
        </div>
      )}

      {/* Camera Flash Screen Glow Overlay */}
      {cameraFlash && (
        <div className="absolute inset-0 bg-white/40 rounded-3xl z-50 pointer-events-none transition-opacity duration-300 animate-pulse" />
      )}

      {/* Ambient Cosmic Background Glow */}
      <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-pink-500/30 blur-3xl pointer-events-none -z-10" />

      {/* Main 3D Living Scene Graphic */}
      <div
        className="w-full h-full relative transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${-mouseOffset.y * 0.6}deg) rotateY(${mouseOffset.x * 0.8}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <svg
          viewBox="0 0 600 480"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.65)]"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id={`stallRoof_${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4338CA" />
              <stop offset="50%" stopColor="#5822B4" />
              <stop offset="100%" stopColor="#312E81" />
            </linearGradient>

            <linearGradient id={`stallWood_${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            <linearGradient id={`neonPink_${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="50%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#F472B6" />
            </linearGradient>

            <linearGradient id={`neonBlue_${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>

            <radialGradient id={`chefBody_${id}`} cx="35%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="40%" stopColor="#F8FAFC" />
              <stop offset="85%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#94A3B8" />
            </radialGradient>

            <radialGradient id={`wumpusBlue_${id}`} cx="35%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </radialGradient>

            <linearGradient id={`lanternGrad_${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDA4AF" />
              <stop offset="50%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#BE123C" />
            </linearGradient>

            {/* Glowing filters */}
            <filter id={`neonGlow_${id}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ================= BACKGROUND STALL STRUCTURE ================= */}
          {/* Main Stall Back Wall & Shadow */}
          <rect
            x="120"
            y="80"
            width="370"
            height="340"
            rx="20"
            fill="#0C0A1D"
            stroke="#2E1065"
            strokeWidth="4"
          />
          <rect x="135" y="95" width="340" height="180" rx="12" fill="#15112E" />

          {/* Windows / Cyber Grids inside kitchen */}
          <line x1="245" y1="95" x2="245" y2="275" stroke="#251D4A" strokeWidth="3" />
          <line x1="365" y1="95" x2="365" y2="275" stroke="#251D4A" strokeWidth="3" />
          <line
            x1="135"
            y1="185"
            x2="475"
            y2="185"
            stroke="#251D4A"
            strokeWidth="2"
            strokeDasharray="6 6"
          />

          {/* Kitchen Shelves with Spice Bottles & Eternal Hologram */}
          <rect x="145" y="120" width="85" height="8" rx="4" fill="#312E81" />
          <rect x="155" y="105" width="12" height="15" rx="3" fill="#F43F5E" opacity="0.85" />
          <rect x="172" y="102" width="14" height="18" rx="3" fill="#38BDF8" opacity="0.85" />
          <rect x="192" y="108" width="10" height="12" rx="3" fill="#FBBF24" opacity="0.85" />

          {/* Vending / Menu Screen on Right */}
          <rect
            x="380"
            y="115"
            width="80"
            height="120"
            rx="8"
            fill="#090714"
            stroke="#4F46E5"
            strokeWidth="2"
          />
          <rect x="390" y="125" width="60" height="16" rx="4" fill="#6366F1" opacity="0.4" />
          <line x1="390" y1="150" x2="450" y2="150" stroke="#EC4899" strokeWidth="2" />
          <line x1="390" y1="160" x2="435" y2="160" stroke="#38BDF8" strokeWidth="2" />
          <line x1="390" y1="170" x2="445" y2="170" stroke="#A855F7" strokeWidth="2" />
          <line x1="390" y1="180" x2="420" y2="180" stroke="#FBBF24" strokeWidth="2" />
          <circle
            cx="438"
            cy="210"
            r="10"
            fill="#10B981"
            filter={`url(#neonGlow_${id})`}
            opacity="0.8"
          />
          <text x="438" y="213" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
            ✓
          </text>

          {/* ================= ROOF AWNING & 404 NEON SIGN ================= */}
          {/* Stall Awning with Curves */}
          <path
            d="M 95 80 L 515 80 L 535 115 C 535 125, 520 135, 505 125 C 490 135, 470 135, 455 125 C 440 135, 420 135, 405 125 C 390 135, 370 135, 355 125 C 340 135, 320 135, 305 125 C 290 135, 270 135, 255 125 C 240 135, 220 135, 205 125 C 190 135, 170 135, 155 125 C 140 135, 120 135, 105 125 C 90 135, 75 125, 75 115 Z"
            fill={`url(#stallRoof_${id})`}
            stroke="#6366F1"
            strokeWidth="3"
          />

          {/* Glowing Striped Valance Pattern */}
          <path d="M 125 80 L 115 126" stroke="#EC4899" strokeWidth="5" opacity="0.7" />
          <path d="M 175 80 L 165 126" stroke="#38BDF8" strokeWidth="5" opacity="0.7" />
          <path d="M 225 80 L 215 126" stroke="#EC4899" strokeWidth="5" opacity="0.7" />
          <path d="M 275 80 L 265 126" stroke="#38BDF8" strokeWidth="5" opacity="0.7" />
          <path d="M 325 80 L 315 126" stroke="#EC4899" strokeWidth="5" opacity="0.7" />
          <path d="M 375 80 L 365 126" stroke="#38BDF8" strokeWidth="5" opacity="0.7" />
          <path d="M 425 80 L 415 126" stroke="#EC4899" strokeWidth="5" opacity="0.7" />
          <path d="M 475 80 L 465 126" stroke="#38BDF8" strokeWidth="5" opacity="0.7" />

          {/* Big Iconic 404 Neon Sign Header */}
          <g transform="translate(180, 25)">
            <rect
              x="0"
              y="0"
              width="240"
              height="52"
              rx="14"
              fill="#0B091A"
              stroke="#4F46E5"
              strokeWidth="3"
            />
            <rect x="6" y="6" width="228" height="40" rx="10" fill="#140F30" />

            {/* Steaming Bowl Icon */}
            <path
              d="M 30 34 C 30 42, 55 42, 55 34 Z"
              fill="#F43F5E"
              filter={`url(#neonGlow_${id})`}
            />
            <path d="M 27 33 H 58" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <path
              d="M 36 28 C 36 24, 40 24, 40 20"
              stroke="#FBBF24"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 46 28 C 46 24, 50 24, 50 20"
              stroke="#FBBF24"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Neon Glowing "404 RAMEN" Text */}
            <text
              x="135"
              y="34"
              fill="url(#neonPink_)"
              fontSize="24"
              fontWeight="900"
              letterSpacing="2"
              textAnchor="middle"
              filter={`url(#neonGlow_${id})`}
            >
              404 RAMEN
            </text>
          </g>

          {/* ================= CHEF MASCOT (COOKING & STIRRING POT) ================= */}
          <g
            onClick={triggerChefCook}
            className="cursor-pointer group"
            transform="translate(250, 140)"
          >
            {/* Chef Steam / Smoke from Cooking Pan */}
            {steamParticles.map((sp) => (
              <circle
                key={sp.id}
                cx={45 + sp.xOffset}
                cy={110 + sp.y}
                r="7"
                fill="#FDF2F8"
                opacity={sp.opacity}
                filter={`url(#neonGlow_${id})`}
              />
            ))}

            {/* Chef Body */}
            <ellipse cx="60" cy="90" rx="36" ry="32" fill={`url(#chefBody_${id})`} />
            {/* Chef Apron */}
            <path d="M 40 78 L 80 78 L 86 115 L 34 115 Z" fill="#5822B4" />
            <circle cx="60" cy="94" r="10" fill="#1E1B4B" />
            <path
              d="M 56 89 H 64 M 56 94 H 63 M 56 99 H 64 M 56 89 V 99"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Chef Head / Helmet */}
            <rect x="25" y="15" width="70" height="60" rx="26" fill={`url(#chefBody_${id})`} />
            {/* Visor Screen */}
            <rect
              x="33"
              y="25"
              width="54"
              height="40"
              rx="16"
              fill="#0B091A"
              stroke="#4C1D95"
              strokeWidth="2"
            />

            {/* Chef Visor Eyes (Happy Wink / Focus) */}
            <path
              d="M 44 46 Q 50 38 56 46"
              stroke="#38BDF8"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              filter={`url(#neonGlow_${id})`}
            />
            <path
              d="M 64 46 Q 70 38 76 46"
              stroke="#38BDF8"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              filter={`url(#neonGlow_${id})`}
            />

            {/* Chef Hat (White Tall Toque) */}
            <path
              d="M 38 18 C 30 18, 30 -5, 45 -5 C 50 -15, 70 -15, 75 -5 C 90 -5, 90 18, 82 18 Z"
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth="2"
            />
            <rect x="40" y="12" width="40" height="8" rx="2" fill="#F1F5F9" />

            {/* Chef Arm with Ladle / Pan (Animated Stirring) */}
            <g
              style={{
                transformOrigin: '75px 80px',
                transform: isCooking ? 'rotate(-25deg) scale(1.1)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease-in-out',
              }}
            >
              <rect x="75" y="70" width="28" height="14" rx="7" fill={`url(#chefBody_${id})`} />
              {/* Steaming Cooking Pot on Stove */}
              <rect
                x="20"
                y="110"
                width="55"
                height="35"
                rx="8"
                fill="#1E293B"
                stroke="#475569"
                strokeWidth="2"
              />
              <path d="M 15 115 H 80" stroke="#64748B" strokeWidth="4" strokeLinecap="round" />
              <circle
                cx="47"
                cy="110"
                r="18"
                fill="#F43F5E"
                opacity="0.6"
                filter={`url(#neonGlow_${id})`}
              />
              {/* Ladle */}
              <line
                x1="82"
                y1="78"
                x2="48"
                y2="114"
                stroke="#CBD5E1"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="46" cy="116" r="7" fill="#94A3B8" />
            </g>
          </g>

          {/* ================= COUNTERTOP & BOWLS ================= */}
          {/* Main Wooden Countertop Bar */}
          <rect
            x="90"
            y="270"
            width="425"
            height="35"
            rx="10"
            fill={`url(#stallWood_${id})`}
            stroke="#78350F"
            strokeWidth="3"
          />
          {/* Counter Edge Trim */}
          <rect
            x="85"
            y="295"
            width="435"
            height="120"
            rx="8"
            fill="#201A40"
            stroke="#2E1065"
            strokeWidth="3"
          />

          {/* Stool Legs & Footrests */}
          <rect x="145" y="380" width="12" height="60" rx="4" fill="#312E81" />
          <rect x="195" y="380" width="12" height="60" rx="4" fill="#312E81" />

          {/* Ramen Bowl 1 (Hot & Steaming on counter) */}
          <g transform="translate(230, 248)">
            <path
              d="M 0 15 C 0 35, 45 35, 45 15 Z"
              fill="#F43F5E"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
            <ellipse cx="22.5" cy="15" rx="22.5" ry="7" fill="#FEF08A" />
            {/* Noodles & Egg */}
            <circle cx="15" cy="15" r="5" fill="#FFFFFF" />
            <circle cx="15" cy="15" r="3" fill="#F59E0B" />
            <line
              x1="10"
              y1="6"
              x2="35"
              y2="0"
              stroke="#78350F"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>

          {/* ================= CUSTOMER MASCOT (EATING NOODLES & TAKING PHOTOS) ================= */}
          <g
            onClick={triggerCameraFlash}
            className="cursor-pointer group"
            transform="translate(130, 200)"
          >
            {/* Customer Milk Crate Stool */}
            <rect
              x="10"
              y="160"
              width="75"
              height="60"
              rx="8"
              fill="#38BDF8"
              opacity="0.8"
              stroke="#0284C7"
              strokeWidth="3"
            />
            <rect x="22" y="175" width="50" height="30" rx="4" fill="#0C4A6E" />

            {/* Customer Body (Cozy Blue Wumpus Creature) */}
            <ellipse cx="48" cy="110" rx="40" ry="46" fill={`url(#wumpusBlue_${id})`} />
            {/* Cozy Hoodie */}
            <path d="M 18 100 Q 48 85 78 100 L 84 145 Q 48 155 12 145 Z" fill="#4F46E5" />
            <ellipse cx="48" cy="100" rx="12" ry="6" fill="#F8FAFC" />

            {/* Creature Ears / Horns */}
            <path d="M 22 45 Q 10 20 28 25 Z" fill="#0284C7" />
            <path d="M 74 45 Q 86 20 68 25 Z" fill="#0284C7" />

            {/* Cute Face & Big Eyes */}
            <circle cx="36" cy="65" r="7" fill="#FFFFFF" />
            <circle cx="37" cy="65" r="4" fill="#0F172A" />
            <circle cx="60" cy="65" r="7" fill="#FFFFFF" />
            <circle cx="59" cy="65" r="4" fill="#0F172A" />
            {/* Cute Nose / Snout */}
            <ellipse cx="48" cy="74" rx="8" ry="5" fill="#E0F2FE" />
            <circle cx="48" cy="73" r="3" fill="#0369A1" />

            {/* Instant Retro Camera in Hand (Click to Flash!) */}
            <g transform="translate(60, 95)" className="group-hover:scale-110 transition-transform">
              <rect
                x="0"
                y="0"
                width="36"
                height="26"
                rx="6"
                fill="#F43F5E"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <circle cx="18" cy="13" r="8" fill="#1E293B" stroke="#CBD5E1" strokeWidth="2" />
              <circle cx="18" cy="13" r="4" fill="#38BDF8" filter={`url(#neonGlow_${id})`} />
              <rect x="24" y="-4" width="8" height="4" rx="1" fill="#FBBF24" />
            </g>
          </g>

          {/* ================= SWAYING PAPER LANTERN ================= */}
          <g
            onClick={triggerLantern}
            className="cursor-pointer"
            transform="translate(485, 115)"
            style={{
              transformOrigin: '485px 115px',
              animation: lanternSwing ? 'swing 1.8s ease-in-out' : 'none',
            }}
          >
            {/* Wire Cord */}
            <line x1="0" y1="0" x2="0" y2="25" stroke="#94A3B8" strokeWidth="2" />
            {/* Red/Pink Glowing Lantern Body */}
            <ellipse
              cx="0"
              cy="50"
              rx="20"
              ry="26"
              fill={`url(#lanternGrad_${id})`}
              filter={`url(#neonGlow_${id})`}
            />
            <ellipse cx="0" cy="50" rx="18" ry="24" fill={`url(#lanternGrad_${id})`} />
            {/* Lantern Ribs */}
            <line x1="-18" y1="42" x2="18" y2="42" stroke="#FDA4AF" strokeWidth="2" />
            <line x1="-18" y1="58" x2="18" y2="58" stroke="#FDA4AF" strokeWidth="2" />
            {/* Top & Bottom Caps */}
            <rect x="-10" y="24" width="20" height="6" rx="2" fill="#1E1B4B" />
            <rect x="-10" y="72" width="20" height="6" rx="2" fill="#1E1B4B" />
            {/* Tassel */}
            <line
              x1="0"
              y1="78"
              x2="0"
              y2="105"
              stroke="#F43F5E"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* 404 text on lantern */}
            <text x="0" y="55" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">
              404
            </text>
          </g>

          {/* Floor Shadow & Stardust */}
          <ellipse cx="300" cy="435" rx="240" ry="20" fill="#000000" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
};
