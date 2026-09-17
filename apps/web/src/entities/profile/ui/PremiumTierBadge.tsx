import React from 'react';

interface PremiumTierBadgeProps extends React.SVGProps<SVGSVGElement> {
  level?: number;
  size?: number | string;
  className?: string;
}

export const PremiumTierBadge: React.FC<PremiumTierBadgeProps> = ({
  level = 1,
  size = 32,
  className = '',
  ...props
}) => {
  const idSuffix = `prem-${level}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      className={className}
      {...props}
    >
      <defs>
        {/* Glow Filters */}
        <filter id={`glow-${idSuffix}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Bronze (Level 1) Gradients */}
        <linearGradient id={`grad-bronze-base-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="50%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id={`grad-bronze-star-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Silver (Level 2) Gradients */}
        <linearGradient id={`grad-silver-base-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`grad-silver-star-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        {/* Gold (Level 3) Gradients */}
        <linearGradient id={`grad-gold-base-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#713f12" />
        </linearGradient>
        <linearGradient id={`grad-gold-star-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>

        {/* Platinum (Level 4) Gradients */}
        <linearGradient id={`grad-plat-base-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#164e63" />
        </linearGradient>
        <linearGradient id={`grad-plat-star-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Diamond (Level 5) Gradients */}
        <linearGradient id={`grad-dia-base-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d0fe" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#581c87" />
        </linearGradient>
        <linearGradient id={`grad-dia-star-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7e22ce" />
        </linearGradient>

        {/* Ruby (Level 6) Gradients */}
        <linearGradient id={`grad-ruby-base-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fecdd3" />
          <stop offset="50%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>
        <linearGradient id={`grad-ruby-star-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>

        {/* Opal (Level 7) Gradients */}
        <linearGradient id={`grad-opal-base-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="35%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <linearGradient id={`grad-opal-star-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#bae6fd" />
          <stop offset="70%" stopColor="#fbcfe8" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* --- LEVEL 0: SUBSCRIBER <1M --- */}
      {level === 0 && (
        <g>
          <polygon
            points="50,12 85,30 85,70 50,88 15,70 15,30"
            fill="#1f2937"
            stroke="#4b5563"
            strokeWidth="4"
          />
          <polygon
            points="50,20 78,35 78,65 50,80 22,65 22,35"
            fill="#111827"
            stroke="#374151"
            strokeWidth="2"
          />
          <circle cx="50" cy="50" r="12" fill="#9ca3af" stroke="#d1d5db" strokeWidth="2" />
        </g>
      )}

      {/* --- LEVEL 1: BRONZE (1 month) --- */}
      {level === 1 && (
        <g filter={`url(#glow-${idSuffix})`}>
          {/* Side Bezel Wings */}
          <path
            d="M12 40 L4 50 L12 60 Z M88 40 L96 50 L88 60 Z"
            fill="#b45309"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          {/* Outer Hexagon Shield */}
          <polygon
            points="50,10 85,28 85,72 50,90 15,72 15,28"
            fill={`url(#grad-bronze-base-${idSuffix})`}
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Inner Facet Panel */}
          <polygon
            points="50,18 77,32 77,68 50,82 23,68 23,32"
            fill="#1c120c"
            stroke="#b45309"
            strokeWidth="2"
          />
          {/* Central 3D Bronze Star */}
          <polygon
            points="50,28 56,42 72,44 60,55 64,71 50,62 36,71 40,55 28,44 44,42"
            fill={`url(#grad-bronze-star-${idSuffix})`}
            stroke="#fef08a"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* --- LEVEL 2: SILVER (3 months) --- */}
      {level === 2 && (
        <g filter={`url(#glow-${idSuffix})`}>
          <path
            d="M12 40 L4 50 L12 60 Z M88 40 L96 50 L88 60 Z"
            fill="#64748b"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          <polygon
            points="50,10 85,28 85,72 50,90 15,72 15,28"
            fill={`url(#grad-silver-base-${idSuffix})`}
            stroke="#e2e8f0"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <polygon
            points="50,18 77,32 77,68 50,82 23,68 23,32"
            fill="#0f172a"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <polygon
            points="50,28 56,42 72,44 60,55 64,71 50,62 36,71 40,55 28,44 44,42"
            fill={`url(#grad-silver-star-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* --- LEVEL 3: GOLD (6 months) --- */}
      {level === 3 && (
        <g filter={`url(#glow-${idSuffix})`}>
          <path
            d="M12 40 L4 50 L12 60 Z M88 40 L96 50 L88 60 Z"
            fill="#ca8a04"
            stroke="#fde047"
            strokeWidth="2"
          />
          <polygon
            points="50,10 85,28 85,72 50,90 15,72 15,28"
            fill={`url(#grad-gold-base-${idSuffix})`}
            stroke="#facc15"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <polygon
            points="50,18 77,32 77,68 50,82 23,68 23,32"
            fill="#1c160c"
            stroke="#eab308"
            strokeWidth="2"
          />
          <polygon
            points="50,28 56,42 72,44 60,55 64,71 50,62 36,71 40,55 28,44 44,42"
            fill={`url(#grad-gold-star-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* --- LEVEL 4: PLATINUM (1 year) --- */}
      {level === 4 && (
        <g filter={`url(#glow-${idSuffix})`}>
          <path
            d="M12 38 L3 50 L12 62 Z M88 38 L97 50 L88 62 Z"
            fill="#0891b2"
            stroke="#67e8f9"
            strokeWidth="2"
          />
          <polygon
            points="50,10 85,28 85,72 50,90 15,72 15,28"
            fill={`url(#grad-plat-base-${idSuffix})`}
            stroke="#38bdf8"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <polygon
            points="50,18 77,32 77,68 50,82 23,68 23,32"
            fill="#0b1928"
            stroke="#06b6d4"
            strokeWidth="2"
          />
          <polygon
            points="50,28 56,42 72,44 60,55 64,71 50,62 36,71 40,55 28,44 44,42"
            fill={`url(#grad-plat-star-${idSuffix})`}
            stroke="#cffafe"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* --- LEVEL 5: DIAMOND (2 years) --- */}
      {level === 5 && (
        <g filter={`url(#glow-${idSuffix})`}>
          {/* Top Diamond Gem Crest */}
          <polygon
            points="50,2 56,8 50,14 44,8"
            fill="#f0abfc"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          {/* Side Crystalline Wings */}
          <path
            d="M12 34 L2 44 L10 52 L2 60 L12 66 Z M88 34 L98 44 L90 52 L98 60 L88 66 Z"
            fill="#7e22ce"
            stroke="#c084fc"
            strokeWidth="2"
          />
          {/* Hexagon Shield */}
          <polygon
            points="50,10 85,28 85,72 50,90 15,72 15,28"
            fill={`url(#grad-dia-base-${idSuffix})`}
            stroke="#c084fc"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <polygon
            points="50,18 77,32 77,68 50,82 23,68 23,32"
            fill="#140a24"
            stroke="#a855f7"
            strokeWidth="2"
          />
          {/* Gem-Faceted Diamond Star */}
          <polygon
            points="50,28 56,42 72,44 60,55 64,71 50,62 36,71 40,55 28,44 44,42"
            fill={`url(#grad-dia-star-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* --- LEVEL 6: RUBY (5 years) --- */}
      {level === 6 && (
        <g filter={`url(#glow-${idSuffix})`}>
          {/* Top & Bottom Gem Crests */}
          <polygon
            points="50,2 56,8 50,14 44,8"
            fill="#f43f5e"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <polygon
            points="50,86 56,92 50,98 44,92"
            fill="#f43f5e"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          {/* Large Layered Ruby Wings */}
          <path
            d="M12 28 C-2 36 -2 64 12 72 C4 60 4 40 12 28 Z M88 28 C102 36 102 64 88 72 C96 60 96 40 88 28 Z"
            fill="#be123c"
            stroke="#fb7185"
            strokeWidth="2"
          />
          {/* Hexagon Shield */}
          <polygon
            points="50,10 85,28 85,72 50,90 15,72 15,28"
            fill={`url(#grad-ruby-base-${idSuffix})`}
            stroke="#f43f5e"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <polygon
            points="50,18 77,32 77,68 50,82 23,68 23,32"
            fill="#240a12"
            stroke="#e11d48"
            strokeWidth="2"
          />
          {/* Faceted Crimson Ruby Star */}
          <polygon
            points="50,28 56,42 72,44 60,55 64,71 50,62 36,71 40,55 28,44 44,42"
            fill={`url(#grad-ruby-star-${idSuffix})`}
            stroke="#ffe4e6"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* --- LEVEL 7: OPAL (6+ years) --- */}
      {level === 7 && (
        <g filter={`url(#glow-${idSuffix})`}>
          {/* Floating Diamond Sparkles */}
          <circle cx="10" cy="16" r="2.5" fill="#38bdf8" />
          <circle cx="90" cy="16" r="2.5" fill="#f472b6" />
          <circle cx="16" cy="84" r="2" fill="#fbbf24" />
          <circle cx="84" cy="84" r="2" fill="#c084fc" />

          {/* Top Crown & Gem Crest */}
          <path
            d="M42 12 L50 2 L58 12 L66 6 L62 16 L38 16 L34 6 Z"
            fill="#fbbf24"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <polygon points="50,4 54,10 50,14 46,10" fill="#38bdf8" />

          {/* Iridescent Feathery Wings */}
          <path
            d="M14 24 C-6 32 -6 68 14 76 C4 64 4 36 14 24 Z"
            fill="url(#grad-opal-base-prem-7)"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <path
            d="M86 24 C106 32 106 68 86 76 C96 64 96 36 86 24 Z"
            fill="url(#grad-opal-base-prem-7)"
            stroke="#f472b6"
            strokeWidth="2"
          />

          {/* Hexagon Shield */}
          <polygon
            points="50,12 84,29 84,71 50,88 16,71 16,29"
            fill={`url(#grad-opal-base-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <polygon
            points="50,19 76,33 76,67 50,81 24,67 24,33"
            fill="#0f0a1e"
            stroke="#38bdf8"
            strokeWidth="2"
          />

          {/* Holographic Rainbow Opal Star */}
          <polygon
            points="50,28 56,42 72,44 60,55 64,71 50,62 36,71 40,55 28,44 44,42"
            fill={`url(#grad-opal-star-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
};

export default PremiumTierBadge;
