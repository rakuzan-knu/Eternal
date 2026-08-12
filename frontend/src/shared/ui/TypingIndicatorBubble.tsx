import React from 'react';
import Avatar from '../../shared/ui/Avatar';
import { UserSnapshot } from '@/entities/chat/model/types';

interface TypingIndicatorBubbleProps {
  typists: UserSnapshot[];
  isGroup: boolean;
}

export default function TypingIndicatorBubble({ typists, isGroup }: TypingIndicatorBubbleProps) {
  if (typists.length === 0) return null;

  const label =
    typists.length === 1
      ? `${typists[0].displayName ?? typists[0].username} is typing…`
      : typists.length === 2
        ? `${typists[0].displayName ?? typists[0].username} and ${typists[1].displayName ?? typists[1].username} are typing…`
        : `${typists.length} people are typing…`;

  return (
    <div className="flex items-end gap-2 px-4 py-0.5 animate-fadeIn">
      <div className="w-8 flex-shrink-0">
        <Avatar size="sm" src={typists[0].avatar} />
      </div>

      <div className="flex flex-col gap-1">
        {isGroup && <span className="text-[11px] text-gray-500 px-1">{label}</span>}
        <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-md bg-white/10">
          <span
            className="w-2 h-2 rounded-full bg-gray-300 animate-typingDot"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-gray-300 animate-typingDot"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-gray-300 animate-typingDot"
            style={{ animationDelay: '300ms' }}
          />
        </div>
        {!isGroup && <span className="text-[11px] text-gray-500 px-1">{label}</span>}
      </div>
    </div>
  );
}
