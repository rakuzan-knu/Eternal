import React from 'react';

export interface BubbleTailProps {
  tailType: 'ios' | 'telegram';
  isOwnMessage: boolean;
  color: string;
}

export const BubbleTail: React.FC<BubbleTailProps> = React.memo(
  ({ tailType, isOwnMessage, color }) => {
    if (tailType === 'telegram') {
      return (
        <svg
          width="11"
          height="14"
          viewBox="0 0 11 14"
          className={`absolute bottom-0 pointer-events-none z-10 ${
            isOwnMessage ? '-right-[7px]' : '-left-[7px] scale-x-[-1]'
          }`}
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
          aria-hidden="true"
        >
          <path d="M0 0 C1 6 4 11 11 14 C4 14 0 14 0 14 Z" fill={color} />
        </svg>
      );
    }

    // iOS classic squircle curved tail
    return (
      <svg
        width="13"
        height="15"
        viewBox="0 0 13 15"
        className={`absolute bottom-0 pointer-events-none z-10 ${
          isOwnMessage ? '-right-[8px]' : '-left-[8px] scale-x-[-1]'
        }`}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
        aria-hidden="true"
      >
        <path d="M0 0 C2 4 6 10 13 15 C8 15 2 14 0 11 Z" fill={color} />
      </svg>
    );
  },
);

BubbleTail.displayName = 'BubbleTail';
export default BubbleTail;
