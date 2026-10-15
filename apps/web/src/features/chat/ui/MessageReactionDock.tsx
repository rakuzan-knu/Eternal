import React, { useRef, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useRecentReactions } from '../model/useRecentReactions';
import { TelegramAppleEmoji } from './Call/TelegramAppleEmoji';
import { triggerReactionBurst } from '../lib/reactionBurstEngine';

export interface MessageReactionDockProps {
  onPick: (emoji: string, origin?: { x: number; y: number }) => void;
  onExpand?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

export default function MessageReactionDock({
  onPick,
  onExpand,
  className = '',
}: MessageReactionDockProps) {
  const itemsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const { dockReactions, recordReaction } = useRecentReactions();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  const handlePick = (
    emoji: string,
    buttonElement?: HTMLButtonElement | null,
    originCoord?: { x: number; y: number },
  ) => {
    let origin: { x: number; y: number } | undefined = originCoord;
    if (!origin && buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      origin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    if (origin) {
      triggerReactionBurst(origin.x, origin.y, emoji);
    }
    recordReaction(emoji);
    onPick(emoji, origin);
  };

  const getTransformStyle = (emoji: string) => {
    if (!mousePos) {
      return {
        transform: 'scale(1) translateY(0px)',
        transition: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      };
    }

    const el = itemsRef.current.get(emoji);
    if (!el) {
      return {
        transform: 'scale(1) translateY(0px)',
        transition: 'transform 60ms ease-out',
      };
    }

    const rect = el.getBoundingClientRect();
    const itemCenterX = rect.left + rect.width / 2;
    const distance = Math.abs(mousePos.x - itemCenterX);

    // iOS Dock Magnification curve (Gaussian falloff)
    const radius = 42;
    const maxScale = 1.38;
    const maxLift = 6;

    const factor = Math.exp(-Math.pow(distance / radius, 2));
    const scale = 1 + (maxScale - 1) * factor;
    const translateY = -maxLift * factor;

    return {
      transform: `scale(${scale.toFixed(3)}) translateY(${translateY.toFixed(2)}px)`,
      transition: 'transform 50ms linear',
      zIndex: Math.round(factor * 20) + 1,
    };
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-center gap-1 bg-[#161522]/95 border border-white/12 rounded-full px-2 py-1 shadow-[0_16px_40px_rgba(0,0,0,0.7)] select-none isolate ${className}`}
    >
      {dockReactions.map((emoji, index) => (
        <button
          key={`${emoji}-${index}`}
          ref={(el) => {
            if (el) itemsRef.current.set(emoji, el);
            else itemsRef.current.delete(emoji);
          }}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePick(emoji, e.currentTarget);
          }}
          style={{
            animationDelay: `${index * 20}ms`,
            ...getTransformStyle(emoji),
          }}
          className="relative w-8 h-8 flex items-center justify-center rounded-full text-xl leading-none cursor-pointer hover:bg-white/10 active:scale-95 transition-colors focus:outline-none"
          title={`React with ${emoji}`}
        >
          <TelegramAppleEmoji
            emoji={emoji}
            size={24}
            playAnimation={true}
            className="pointer-events-none"
          />
        </button>
      ))}

      {/* Telegram-style Circular Chevron Down Button */}
      {onExpand && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand(e);
          }}
          title="All reactions"
          className="w-7 h-7 ml-0.5 flex items-center justify-center rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/70 hover:text-white hover:scale-110 active:scale-90 transition-all duration-150 focus:outline-none cursor-pointer"
        >
          <ChevronDown size={15} />
        </button>
      )}
    </div>
  );
}
