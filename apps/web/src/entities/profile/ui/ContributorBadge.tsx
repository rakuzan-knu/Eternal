import * as React from 'react';

interface ContributorBadgeProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

const ContributorBadge = ({ className = 'w-6 h-6', ...props }: ContributorBadgeProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="contributor-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <path
      d="M12 2L15 8L21 9L16.5 13.5L18 19.5L12 16.5L6 19.5L7.5 13.5L3 9L9 8L12 2Z"
      fill="url(#contributor-grad)"
      stroke="#f472b6"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export default ContributorBadge;
