import * as React from 'react';

interface PremiumBadgeProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

const PremiumBadge = ({ className = 'w-6 h-6', ...props }: PremiumBadgeProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="premium-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      fill="url(#premium-grad)"
      stroke="#c084fc"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export default PremiumBadge;
