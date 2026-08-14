import React from 'react';

interface VerifiedCheckmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerifiedCheckmark({ size = 'md', className = '' }: VerifiedCheckmarkProps) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const dim = sizeMap[size];

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${dim} ${className}`}
      title="Verified Profile"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_6px_rgba(0,149,246,0.4)]"
      >
        <path
          d="M12 2.25C12.4 2.25 12.8 2.45 13.1 2.85L13.8 3.75C14.1 4.15 14.6 4.35 15.1 4.25L16.2 4.05C16.7 3.95 17.2 4.15 17.5 4.55L18.1 5.35C18.4 5.75 18.9 5.95 19.4 5.85L20.5 5.65C21 5.55 21.5 5.85 21.75 6.35L22.1 7.45C22.25 7.95 22.65 8.35 23.15 8.5L24 8.9C24.45 9.15 24.7 9.65 24.6 10.15L24.35 11.25C24.25 11.75 24.45 12.25 24.85 12.55L25.65 13.15"
          fill="#0095F6"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C12.45 2 12.85 2.2 13.15 2.55L13.8 3.35C14.15 3.8 14.75 4 15.3 3.85L16.3 3.6C16.85 3.45 17.4 3.7 17.65 4.2L18.1 5.1C18.35 5.6 18.9 5.9 19.45 5.85L20.45 5.75C21.05 5.7 21.55 6.05 21.7 6.6L22 7.6C22.15 8.15 22.6 8.55 23.15 8.65L24.1 8.85C24.65 8.95 25.05 9.4 25.05 9.95"
          fill="#0095F6"
        />
        <path
          d="M22.5 12.5c0-1.58-.8-2.97-2-3.79.44-1.46.15-3.11-.93-4.19-1.08-1.08-2.73-1.37-4.19-.93C14.56 2.38 13.17 1.5 11.59 1.5s-2.97.88-3.79 2.08c-1.46-.44-3.11-.15-4.19.93-1.08 1.08-1.37 2.73-.93 4.19C1.48 9.53.6 10.92.6 12.5s.88 2.97 2.08 3.79c-.44 1.46-.15 3.11.93 4.19 1.08 1.08 2.73 1.37 4.19.93 1.22 1.2 2.61 2.08 4.19 2.08s2.97-.88 3.79-2.08c1.46.44 3.11.15 4.19-.93 1.08-1.08 1.37-2.73.93-4.19 1.2-.82 2.08-2.21 2.08-3.79z"
          fill="#0095F6"
        />
        <path
          d="M9.75 15.5a.75.75 0 0 1-.53-.22l-3-3a.75.75 0 1 1 1.06-1.06l2.47 2.47 6.47-6.47a.75.75 0 1 1 1.06 1.06l-7 7a.75.75 0 0 1-.53.22z"
          fill="#09090b"
        />
      </svg>
    </span>
  );
}

export default VerifiedCheckmark;
