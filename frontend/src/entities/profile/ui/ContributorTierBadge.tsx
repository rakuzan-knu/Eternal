import React from 'react';

interface ContributorTierBadgeProps extends React.SVGProps<SVGSVGElement> {
  level?: number;
  size?: number | string;
  className?: string;
}

export const ContributorTierBadge: React.FC<ContributorTierBadgeProps> = ({
  level = 1,
  size = 32,
  className = '',
  ...props
}) => {
  const idSuffix = `contrib-${level}`;

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
        <linearGradient id={`grad-bronze-plant-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Silver (Level 2) Gradients */}
        <linearGradient id={`grad-silver-base-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`grad-silver-plant-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
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
        <linearGradient id={`grad-gold-plant-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
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
        <linearGradient id={`grad-plat-plant-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
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
        <linearGradient id={`grad-dia-plant-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
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
        <linearGradient id={`grad-ruby-plant-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
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
        <linearGradient id={`grad-opal-plant-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#bae6fd" />
          <stop offset="70%" stopColor="#fbcfe8" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* --- LEVEL 1: BRONZE (1 PR/Report) --- */}
      {level === 1 && (
        <g filter={`url(#glow-${idSuffix})`}>
          <polygon
            points="50,10 85,28 85,72 50,90 15,72 15,28"
            fill={`url(#grad-bronze-base-${idSuffix})`}
            stroke="#f59e0b"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <polygon
            points="50,18 77,32 77,68 50,82 23,68 23,32"
            fill="#1c120c"
            stroke="#b45309"
            strokeWidth="2"
          />
          {/* Sprout & Soil */}
          <path d="M35 70 Q50 64 65 70" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
          <path d="M50 68 V45" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M50 54 Q36 50 34 38 Q48 38 50 54 Z"
            fill={`url(#grad-bronze-plant-${idSuffix})`}
            stroke="#fef08a"
            strokeWidth="1.5"
          />
          <path
            d="M50 48 Q64 42 66 32 Q52 34 50 48 Z"
            fill={`url(#grad-bronze-plant-${idSuffix})`}
            stroke="#fef08a"
            strokeWidth="1.5"
          />
        </g>
      )}

      {/* --- LEVEL 2: SILVER (3 PRs/Reports) --- */}
      {level === 2 && (
        <g filter={`url(#glow-${idSuffix})`}>
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
          <path d="M35 70 Q50 64 65 70" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <path d="M50 68 V45" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M50 54 Q36 50 34 38 Q48 38 50 54 Z"
            fill={`url(#grad-silver-plant-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M50 48 Q64 42 66 32 Q52 34 50 48 Z"
            fill={`url(#grad-silver-plant-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </g>
      )}

      {/* --- LEVEL 3: GOLD (5 PRs/Reports) --- */}
      {level === 3 && (
        <g filter={`url(#glow-${idSuffix})`}>
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
          {/* Soil & 3-Leaf Sprout */}
          <path d="M35 70 Q50 64 65 70" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" />
          <path d="M50 68 V40" stroke="#facc15" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M50 56 Q34 52 32 40 Q48 40 50 56 Z"
            fill={`url(#grad-gold-plant-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M50 50 Q66 44 68 32 Q52 34 50 50 Z"
            fill={`url(#grad-gold-plant-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M50 42 Q44 26 50 24 Q56 26 50 42 Z"
            fill={`url(#grad-gold-plant-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </g>
      )}

      {/* --- LEVEL 4: PLATINUM (10 PRs/Reports) with Code Brackets `< >` --- */}
      {level === 4 && (
        <g filter={`url(#glow-${idSuffix})`}>
          {/* Outer Shield */}
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
          {/* Code Brackets `< >` on sides */}
          <path
            d="M30 46 L24 50 L30 54"
            stroke="#67e8f9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M70 46 L76 50 L70 54"
            stroke="#67e8f9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Sprout Plant */}
          <path d="M35 70 Q50 64 65 70" stroke="#0891b2" strokeWidth="3" strokeLinecap="round" />
          <path d="M50 68 V42" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M50 56 Q34 52 32 40 Q48 40 50 56 Z"
            fill={`url(#grad-plat-plant-${idSuffix})`}
            stroke="#cffafe"
            strokeWidth="1.5"
          />
          <path
            d="M50 50 Q66 44 68 32 Q52 34 50 50 Z"
            fill={`url(#grad-plat-plant-${idSuffix})`}
            stroke="#cffafe"
            strokeWidth="1.5"
          />
        </g>
      )}

      {/* --- LEVEL 5: DIAMOND (25 PRs/Reports) with Laurels & Top Gem --- */}
      {level === 5 && (
        <g filter={`url(#glow-${idSuffix})`}>
          {/* Top Diamond Gem Crest */}
          <polygon
            points="50,2 56,8 50,14 44,8"
            fill="#f0abfc"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          {/* Crystal Laurels on Sides */}
          <path
            d="M12 36 C4 44 4 60 12 68 M88 36 C96 44 96 60 88 68"
            stroke="#c084fc"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Shield Base */}
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
          {/* Crystal Tree Plant */}
          <path d="M35 70 Q50 64 65 70" stroke="#7e22ce" strokeWidth="3" />
          <path d="M50 68 V38" stroke="#c084fc" strokeWidth="4" />
          <path
            d="M50 56 Q32 50 30 36 Q48 38 50 56 Z"
            fill={`url(#grad-dia-plant-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M50 50 Q68 44 70 30 Q52 32 50 50 Z"
            fill={`url(#grad-dia-plant-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <polygon
            points="50,24 55,34 50,40 45,34"
            fill="#f0abfc"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </g>
      )}

      {/* --- LEVEL 6: RUBY (50 PRs/Reports) with Git-Branch Symbol & Ruby Leaf Wreath --- */}
      {level === 6 && (
        <g filter={`url(#glow-${idSuffix})`}>
          {/* Top Ruby Crest with Git Branch Icon `<o-` */}
          <polygon
            points="50,2 56,8 50,14 44,8"
            fill="#f43f5e"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M47 8 L50 6 L53 8 M50 6 V12"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Outer Layered Crimson Ruby Leaf Wreath */}
          <path
            d="M12 28 C-2 36 -2 64 12 72 C4 60 4 40 12 28 Z M88 28 C102 36 102 64 88 72 C96 60 96 40 88 28 Z"
            fill="#be123c"
            stroke="#fb7185"
            strokeWidth="2"
          />
          {/* Shield Base */}
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
          {/* Ruby Plant */}
          <path d="M35 70 Q50 64 65 70" stroke="#be123c" strokeWidth="3" />
          <path d="M50 68 V38" stroke="#fb7185" strokeWidth="4" />
          <path
            d="M50 56 Q30 48 28 34 Q48 36 50 56 Z"
            fill={`url(#grad-ruby-plant-${idSuffix})`}
            stroke="#ffe4e6"
            strokeWidth="1.5"
          />
          <path
            d="M50 50 Q70 42 72 28 Q52 30 50 50 Z"
            fill={`url(#grad-ruby-plant-${idSuffix})`}
            stroke="#ffe4e6"
            strokeWidth="1.5"
          />
          <polygon
            points="50,22 56,32 50,38 44,32"
            fill="#ffe4e6"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </g>
      )}

      {/* --- LEVEL 7: OPAL (100 PRs/Reports) with Golden Crown, Git-Branch & Iridescent Laurels --- */}
      {level === 7 && (
        <g filter={`url(#glow-${idSuffix})`}>
          {/* Floating Crystal Sparkles */}
          <circle cx="10" cy="16" r="2.5" fill="#38bdf8" />
          <circle cx="90" cy="16" r="2.5" fill="#f472b6" />
          <circle cx="16" cy="84" r="2" fill="#fbbf24" />
          <circle cx="84" cy="84" r="2" fill="#c084fc" />

          {/* Top Crown & Git-Branch Crest `<o-` */}
          <path
            d="M42 12 L50 2 L58 12 L66 6 L62 16 L38 16 L34 6 Z"
            fill="#fbbf24"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M47 8 L50 5 L53 8 M50 5 V11"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Iridescent Winged Laurels */}
          <path
            d="M14 24 C-6 32 -6 68 14 76 C4 64 4 36 14 24 Z"
            fill="url(#grad-opal-base-contrib-7)"
            stroke="#38bdf8"
            strokeWidth="2"
          />
          <path
            d="M86 24 C106 32 106 68 86 76 C96 64 96 36 86 24 Z"
            fill="url(#grad-opal-base-contrib-7)"
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

          {/* Opal Crystal Plant */}
          <path d="M35 70 Q50 64 65 70" stroke="#38bdf8" strokeWidth="3" />
          <path d="M50 68 V38" stroke="#ffffff" strokeWidth="4" />
          <path
            d="M50 56 Q30 48 28 34 Q48 36 50 56 Z"
            fill={`url(#grad-opal-plant-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <path
            d="M50 50 Q70 42 72 28 Q52 30 50 50 Z"
            fill={`url(#grad-opal-plant-${idSuffix})`}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <polygon
            points="50,22 56,32 50,38 44,32"
            fill="#ffffff"
            stroke="#ffffff"
            strokeWidth="2"
          />
        </g>
      )}
    </svg>
  );
};

export default ContributorTierBadge;
