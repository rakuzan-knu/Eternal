import React from 'react';
import Avatar from './Avatar';
import { UserSnapshot } from '@/entities/chat/model/types';

interface TypingIndicatorBubbleProps {
  typists: UserSnapshot[];
  isGroup?: boolean;
}

export default function TypingIndicatorBubble({ typists }: TypingIndicatorBubbleProps) {
  if (!typists || typists.length === 0) return null;

  return (
    <div
      data-testid="typing-indicator"
      className="flex items-center px-4 py-1.5 animate-fadeIn select-none"
    >
      <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#181926]/90 border border-white/10 backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        {/* Micro-avatars */}
        <div className="flex items-center -space-x-2 flex-shrink-0">
          {typists.slice(0, 3).map((typist, idx) => (
            <div
              key={typist.id || idx}
              className="w-5 h-5 rounded-full overflow-hidden border-2 border-[#181926] shadow-sm bg-black/40 flex-shrink-0"
            >
              <Avatar size="sm" src={typist.avatar} />
            </div>
          ))}
        </div>

        {/* Text Label */}
        <span className="text-xs text-gray-300">
          {typists.length === 1
            ? `${typists[0].displayName ?? typists[0].username} is typing…`
            : typists.length === 2
              ? `${typists[0].displayName ?? typists[0].username} and ${typists[1].displayName ?? typists[1].username} are typing…`
              : `${typists.length} people are typing…`}
        </span>

        {/* Jumping Neon Purple Dots */}
        <div className="flex items-center gap-1 pl-0.5">
          <span
            className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '800ms' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
            style={{ animationDelay: '180ms', animationDuration: '800ms' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
            style={{ animationDelay: '360ms', animationDuration: '800ms' }}
          />
        </div>
      </div>
    </div>
  );
}
