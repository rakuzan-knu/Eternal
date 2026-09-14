import React from 'react';
import { BubbleShapeType } from '../model/chatTheme';

interface BubbleDecorationProps {
  shape?: BubbleShapeType;
  isOwnMessage: boolean;
  className?: string;
}

/**
 * Renders decorative overlays and peeking characters for custom chat bubbles
 * (TikTok Capybara, Frog, Cat & Dog, Doge, Dino, Heart Pepe, Gummy, Pixel Sparkle).
 */
export const BubbleDecoration: React.FC<BubbleDecorationProps> = ({
  shape,
  isOwnMessage,
  className = '',
}) => {
  if (
    !shape ||
    shape === 'default' ||
    shape === 'ios-classic' ||
    shape === 'telegram-modern' ||
    shape === 'cyber-glass'
  ) {
    return null;
  }

  return (
    <div className={`pointer-events-none select-none ${className}`}>
      {/* 1. Capybara with orange/mandarin on head (TikTok style) */}
      {shape === 'capybara' && (
        <div
          className={`absolute -top-[22px] ${
            isOwnMessage ? 'right-3' : 'left-3'
          } z-20 flex items-center`}
        >
          <svg
            width="48"
            height="26"
            viewBox="0 0 48 26"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
          >
            {/* Mandarin / Orange on Head */}
            <circle cx="28" cy="6" r="4.5" fill="#f97316" />
            <ellipse cx="27" cy="4" rx="1.5" ry="1" fill="#fdba74" />
            <path d="M28 2.5 C29 0.5 32 1.5 31 3 C30 3 29 3 28 2.5 Z" fill="#16a34a" />

            {/* Capybara Ear Left */}
            <ellipse cx="14" cy="11" rx="3" ry="2.2" fill="#6d4320" transform="rotate(-20 14 11)" />
            <ellipse
              cx="14"
              cy="11"
              rx="1.8"
              ry="1.2"
              fill="#451a03"
              transform="rotate(-20 14 11)"
            />

            {/* Capybara Head Body */}
            <path
              d="M12 26 C10 18 14 10 24 9 C35 8 44 12 44 20 C44 24 43 26 43 26 Z"
              fill="#9a6233"
            />
            {/* Snout Area */}
            <path d="M26 12 C32 12 44 14 44 21 C44 26 38 26 26 26 Z" fill="#af7644" />

            {/* Nose Nostril */}
            <ellipse cx="40" cy="17" rx="1.2" ry="1.6" fill="#381a04" />

            {/* Peaceful Sleeping Eye */}
            <path
              d="M24 16 C26 18 29 18 31 16"
              stroke="#381a04"
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Cute Cheeks */}
            <ellipse cx="32" cy="20" rx="2.5" ry="1.2" fill="#f43f5e" opacity="0.45" />

            {/* Tiny paw on border */}
            <rect x="18" y="23" width="7" height="3" rx="1.5" fill="#845025" />
          </svg>
        </div>
      )}

      {/* 2. Frog with peeking eyes & bottom orange belly rim (TikTok style) */}
      {shape === 'frog' && (
        <>
          {/* Top Peeking Frog Eyes */}
          <div
            className={`absolute -top-[14px] ${
              isOwnMessage ? 'right-4' : 'left-4'
            } z-20 flex items-center gap-2`}
          >
            <div className="relative w-5 h-4 bg-emerald-500 rounded-t-full border-2 border-[#065f46] border-b-0 flex items-center justify-center shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-black relative">
                  <span className="w-0.5 h-0.5 rounded-full bg-white absolute top-0 left-0" />
                </div>
              </div>
            </div>
            <div className="relative w-5 h-4 bg-emerald-500 rounded-t-full border-2 border-[#065f46] border-b-0 flex items-center justify-center shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-black relative">
                  <span className="w-0.5 h-0.5 rounded-full bg-white absolute top-0 left-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Orange-Red Belly Rim (as in TikTok screenshot) */}
          <div className="absolute -bottom-1.5 left-2 right-2 h-2 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-red-500 border border-[#065f46] shadow-sm z-10" />
        </>
      )}

      {/* 3. Cat & Dog (Ginger Cat on left, puppy on right) */}
      {shape === 'cat-dog' && (
        <>
          {/* Left: Ginger Kitty */}
          <div className="absolute -top-[18px] left-2.5 z-20">
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
              {/* Cat Ears */}
              <polygon points="4,12 8,2 13,10" fill="#f97316" />
              <polygon points="5,11 8,4 11,9" fill="#fbcfe8" />
              <polygon points="17,10 22,2 25,12" fill="#f97316" />
              <polygon points="18,9 21,4 24,11" fill="#fbcfe8" />
              {/* Cat Head */}
              <ellipse cx="14" cy="14" rx="11" ry="8" fill="#fb923c" />
              {/* Eyes */}
              <ellipse cx="10" cy="13" rx="1.2" ry="1.6" fill="#431407" />
              <ellipse cx="18" cy="13" rx="1.2" ry="1.6" fill="#431407" />
              {/* Nose & Mouth */}
              <polygon points="13,15 15,15 14,16.5" fill="#f43f5e" />
            </svg>
          </div>

          {/* Right: Cute Floppy Puppy */}
          <div className="absolute -top-[18px] right-2.5 z-20">
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
              {/* Floppy Ears */}
              <ellipse cx="5" cy="11" rx="4.5" ry="7" fill="#78350f" transform="rotate(15 5 11)" />
              <ellipse
                cx="23"
                cy="11"
                rx="4.5"
                ry="7"
                fill="#78350f"
                transform="rotate(-15 23 11)"
              />
              {/* Dog Head */}
              <ellipse cx="14" cy="13" rx="10" ry="7.5" fill="#fde68a" />
              <ellipse cx="14" cy="15" rx="5" ry="3.5" fill="#ffffff" />
              {/* Eyes */}
              <circle cx="10.5" cy="11.5" r="1.3" fill="#1e1b4b" />
              <circle cx="17.5" cy="11.5" r="1.3" fill="#1e1b4b" />
              {/* Nose */}
              <ellipse cx="14" cy="14" rx="1.8" ry="1.2" fill="#1e1b4b" />
            </svg>
          </div>
        </>
      )}

      {/* 4. Doge (Shiba Inu) */}
      {shape === 'doge' && (
        <div
          className={`absolute -top-[20px] ${
            isOwnMessage ? 'right-3' : 'left-3'
          } z-20 flex items-center`}
        >
          <svg width="42" height="24" viewBox="0 0 42 24" fill="none">
            {/* Doge Ears */}
            <polygon points="6,14 11,2 17,11" fill="#d97706" />
            <polygon points="8,12 11,5 15,10" fill="#fef3c7" />
            <polygon points="26,11 32,2 37,14" fill="#d97706" />
            <polygon points="28,10 32,5 35,12" fill="#fef3c7" />
            {/* Head */}
            <path d="M8 24 C5 16 11 9 22 9 C33 9 38 16 36 24 Z" fill="#f59e0b" />
            <ellipse cx="22" cy="16" rx="9" ry="6" fill="#fef3c7" />
            {/* White Brow Dots */}
            <circle cx="14" cy="11" r="1.5" fill="#ffffff" />
            <circle cx="29" cy="11" r="1.5" fill="#ffffff" />
            {/* Eyes */}
            <ellipse cx="15" cy="14" rx="1.8" ry="1.5" fill="#1c1917" />
            <ellipse cx="28" cy="14" rx="1.8" ry="1.5" fill="#1c1917" />
            {/* Black Nose */}
            <polygon points="20.5,16 23.5,16 22,18" fill="#1c1917" />
            {/* Paws on border */}
            <rect
              x="12"
              y="21"
              width="6"
              height="3"
              rx="1.5"
              fill="#fef3c7"
              stroke="#d97706"
              strokeWidth="0.8"
            />
            <rect
              x="25"
              y="21"
              width="6"
              height="3"
              rx="1.5"
              fill="#fef3c7"
              stroke="#d97706"
              strokeWidth="0.8"
            />
          </svg>
        </div>
      )}

      {/* 5. Dino */}
      {shape === 'dino' && (
        <div
          className={`absolute -top-[16px] ${
            isOwnMessage ? 'right-3' : 'left-3'
          } z-20 flex items-center`}
        >
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
            {/* Spikes */}
            <polygon points="12,14 16,3 20,13" fill="#0d9488" />
            <polygon points="21,13 25,2 29,13" fill="#0d9488" />
            <polygon points="30,13 33,5 36,15" fill="#0d9488" />
            {/* Head */}
            <path d="M4 20 C2 12 7 8 18 8 C26 8 28 13 28 20 Z" fill="#14b8a6" />
            {/* Eye */}
            <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
            <circle cx="12.5" cy="12" r="1.3" fill="#042f2e" />
            <circle cx="13" cy="11.5" r="0.5" fill="#ffffff" />
            {/* Cheek */}
            <ellipse cx="16" cy="15" rx="2" ry="1" fill="#f43f5e" opacity="0.4" />
          </svg>
        </div>
      )}

      {/* 6. Heart Pepe */}
      {shape === 'heart-pepe' && (
        <div
          className={`absolute -top-[18px] ${
            isOwnMessage ? 'right-3' : 'left-3'
          } z-20 flex items-center gap-1`}
        >
          <svg width="34" height="22" viewBox="0 0 34 22" fill="none">
            {/* Pepe Head */}
            <ellipse cx="15" cy="14" rx="12" ry="7.5" fill="#65a30d" />
            {/* Big Froggo Eyes */}
            <circle cx="10" cy="8" r="4.5" fill="#84cc16" />
            <circle cx="19" cy="8" r="4.5" fill="#84cc16" />
            <circle cx="10" cy="8" r="3" fill="#ffffff" />
            <circle cx="19" cy="8" r="3" fill="#ffffff" />
            <ellipse cx="10" cy="8" rx="1.8" ry="1.5" fill="#14532d" />
            <ellipse cx="19" cy="8" rx="1.8" ry="1.5" fill="#14532d" />
            {/* Pepe Lips */}
            <path
              d="M6 16 C10 19 20 19 24 16"
              stroke="#365314"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {/* Floating Pink Hearts */}
          <span className="text-xs animate-bounce" style={{ animationDuration: '1.8s' }}>
            💖
          </span>
        </div>
      )}

      {/* 7. Gummy Gelatin Specular Gloss Bar */}
      {shape === 'gummy' && (
        <div className="absolute top-1 left-3 right-3 h-2.5 rounded-t-[20px] bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none blur-[0.4px] z-10" />
      )}

      {/* 8. Retro Pixel 8-Bit Sparkle (Vecteezy style) */}
      {shape === 'retro-pixel' && (
        <>
          {/* Top-Left 4-Point Pixel Star Sparkle */}
          <div className="absolute top-1 left-1 z-20">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {/* Center cross */}
              <rect x="5" y="1" width="4" height="12" fill="#000000" />
              <rect x="1" y="5" width="12" height="4" fill="#000000" />
              {/* Inner light blue star */}
              <rect x="6" y="2" width="2" height="10" fill="#93c5fd" />
              <rect x="2" y="6" width="10" height="2" fill="#93c5fd" />
              <rect x="5" y="5" width="4" height="4" fill="#ffffff" />
              {/* Satellite pixel dot */}
              <rect x="11" y="2" width="2" height="2" fill="#000000" />
              <rect x="11.5" y="2.5" width="1" height="1" fill="#bfdbfe" />
            </svg>
          </div>

          {/* Bottom-Right Pixel Plus Marker */}
          <div className="absolute bottom-1 right-1 z-20">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="3" y="1" width="3" height="7" fill="#000000" />
              <rect x="1" y="3" width="7" height="3" fill="#000000" />
              <rect x="4" y="2" width="1" height="5" fill="#64748b" />
              <rect x="2" y="4" width="5" height="1" fill="#64748b" />
            </svg>
          </div>
        </>
      )}

      {/* 9. Liquid Neon - Glowing traveling neon beam */}
      {shape === 'liquid-neon' && (
        <div className="absolute -inset-[1px] rounded-[23px] pointer-events-none z-10 overflow-visible">
          <svg className="w-full h-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="liquidNeonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="neonBeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e879f9" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <rect
              x="1"
              y="1"
              width="calc(100% - 2px)"
              height="calc(100% - 2px)"
              rx="22"
              ry="22"
              fill="none"
              stroke="#7e22ce"
              strokeWidth="1.2"
              opacity="0.3"
            />
            <rect
              x="1"
              y="1"
              width="calc(100% - 2px)"
              height="calc(100% - 2px)"
              rx="22"
              ry="22"
              fill="none"
              pathLength="100"
              stroke="url(#neonBeamGrad)"
              strokeWidth="2.5"
              strokeDasharray="25 75"
              strokeLinecap="round"
              filter="url(#liquidNeonGlow)"
              className="animate-neon-flow"
            />
          </svg>
        </div>
      )}

      {/* 10. Star Bubble - 3D Puffy Star in Top Corner */}
      {shape === 'star-bubble' && (
        <div
          className={`absolute -top-3.5 ${
            isOwnMessage ? '-left-2' : '-left-2'
          } z-20 pointer-events-none drop-shadow-[0_3px_5px_rgba(0,0,0,0.3)]`}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="starBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
              <linearGradient id="starShadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ca8a04" />
                <stop offset="100%" stopColor="#854d0e" />
              </linearGradient>
            </defs>
            <path
              d="M18 2.5 C18.7 2.5 19.3 2.9 19.6 3.6 L23.4 11.2 C23.6 11.5 23.9 11.7 24.3 11.8 L32.6 13 C33.4 13.1 34 13.8 33.9 14.6 C33.8 15 33.6 15.4 33.3 15.7 L27.3 21.5 C27 21.8 26.9 22.2 27 22.5 L28.4 30.8 C28.6 31.6 28 32.4 27.2 32.5 C26.8 32.6 26.4 32.4 26 32.2 L18.6 28.3 C18.2 28.1 17.8 28.1 17.4 28.3 L10 32.2 C9.3 32.6 8.4 32.3 8 31.6 C7.8 31.2 7.8 30.8 7.9 30.4 L9.4 22.2 C9.5 21.8 9.3 21.4 9 21.1 L3 15.3 C2.4 14.7 2.4 13.8 3 13.2 C3.3 12.9 3.7 12.7 4.1 12.6 L12.4 11.4 C12.8 11.3 13.1 11.1 13.3 10.8 L17.1 3.2 C17.4 2.8 17.7 2.5 18 2.5 Z"
              fill="url(#starShadeGrad)"
              transform="translate(0, 1.5)"
            />
            <path
              d="M18 2.5 C18.7 2.5 19.3 2.9 19.6 3.6 L23.4 11.2 C23.6 11.5 23.9 11.7 24.3 11.8 L32.6 13 C33.4 13.1 34 13.8 33.9 14.6 C33.8 15 33.6 15.4 33.3 15.7 L27.3 21.5 C27 21.8 26.9 22.2 27 22.5 L28.4 30.8 C28.6 31.6 28 32.4 27.2 32.5 C26.8 32.6 26.4 32.4 26 32.2 L18.6 28.3 C18.2 28.1 17.8 28.1 17.4 28.3 L10 32.2 C9.3 32.6 8.4 32.3 8 31.6 C7.8 31.2 7.8 30.8 7.9 30.4 L9.4 22.2 C9.5 21.8 9.3 21.4 9 21.1 L3 15.3 C2.4 14.7 2.4 13.8 3 13.2 C3.3 12.9 3.7 12.7 4.1 12.6 L12.4 11.4 C12.8 11.3 13.1 11.1 13.3 10.8 L17.1 3.2 C17.4 2.8 17.7 2.5 18 2.5 Z"
              fill="url(#starBodyGrad)"
            />
            <ellipse
              cx="18"
              cy="8"
              rx="2.5"
              ry="4"
              fill="#ffffff"
              opacity="0.6"
              transform="rotate(-5 18 8)"
            />
          </svg>
        </div>
      )}

      {/* 11. Pink Cream - Top Gloss & Bottom Melting Cream Drops */}
      {shape === 'pink-cream' && (
        <>
          <div className="absolute top-1 left-3 right-3 h-2.5 rounded-t-[20px] bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none blur-[0.3px] z-10" />
          <div className="absolute -bottom-[13px] left-0 right-0 w-full overflow-visible pointer-events-none z-10 filter drop-shadow-[0_3px_3px_rgba(190,24,93,0.35)]">
            <svg
              viewBox="0 0 200 16"
              preserveAspectRatio="none"
              className="w-full h-[15px]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="creamDripGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f472b6" />
                  <stop offset="70%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>
              <path
                d="M0,0 L200,0 L200,3 C192,3 190,8 185,8 C180,8 178,2 170,2 C162,2 160,11 154,11 C148,11 146,3 138,3 C130,3 128,14 121,14 C114,14 112,4 105,4 C98,4 96,12 90,12 C84,12 82,3 74,3 C66,3 64,15 57,15 C50,15 48,2 40,2 C32,2 30,10 24,10 C18,10 16,3 8,3 C4,3 2,1 0,1 Z"
                fill="url(#creamDripGrad)"
              />
              <circle cx="57" cy="12" r="1.3" fill="#ffffff" opacity="0.75" />
              <circle cx="121" cy="11.5" r="1.3" fill="#ffffff" opacity="0.75" />
              <circle cx="154" cy="8.5" r="1.1" fill="#ffffff" opacity="0.75" />
            </svg>
          </div>
        </>
      )}

      {/* 12. Sheetbook Note - Scotch / Washi Tape on Corners */}
      {shape === 'sheetbook-note' && (
        <>
          <div className="absolute -top-2.5 -left-2.5 w-9 h-4 bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.15)] transform -rotate-[35deg] rounded-[1px] pointer-events-none z-20 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-60" />
          </div>

          <div className="absolute -bottom-2.5 -right-2.5 w-9 h-4 bg-white/70 backdrop-blur-sm border border-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.15)] transform -rotate-[35deg] rounded-[1px] pointer-events-none z-20 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-60" />
          </div>
        </>
      )}

      {/* 13. Moon Bubble - Saturn Planet & Twinkling Stars */}
      {shape === 'moon-bubble' && (
        <div
          className={`absolute -top-3.5 ${
            isOwnMessage ? '-right-2' : '-right-2'
          } z-20 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]`}
        >
          <svg
            width="46"
            height="36"
            viewBox="0 0 48 38"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="saturnBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e9d5ff" />
                <stop offset="45%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#6b21a8" />
              </linearGradient>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f3e8ff" />
                <stop offset="50%" stopColor="#d8b4fe" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <path
              d="M8 12 C8 9 9 8 12 8 C9 8 8 7 8 4 C8 7 7 8 4 8 C7 8 8 9 8 12 Z"
              fill="#fef08a"
              className="animate-pulse"
            />
            <path
              d="M17 4 C17 2.5 17.5 2 19 2 C17.5 2 17 1.5 17 0 C17 1.5 16.5 2 15 2 C16.5 2 17 2.5 17 4 Z"
              fill="#fbcfe8"
            />
            <ellipse
              cx="33"
              cy="18"
              rx="15"
              ry="5.5"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="2.8"
              transform="rotate(-24 33 18)"
              opacity="0.85"
            />
            <circle cx="33" cy="18" r="9" fill="url(#saturnBodyGrad)" />
            <path
              d="M20 23.5 C24 26 38 22 45 14"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* 14. Cloudy Bubble - Flowing Cloud Waves at Bottom */}
      {shape === 'cloudy-bubble' && (
        <div className="absolute -bottom-[10px] left-0 right-0 w-full overflow-hidden h-[16px] pointer-events-none z-10">
          <div className="flex w-[200%] h-full animate-cloud-wave">
            <svg
              viewBox="0 0 200 16"
              preserveAspectRatio="none"
              className="w-1/2 h-full flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,0 L200,0 L200,2 C185,2 175,12 160,12 C145,12 135,2 120,2 C105,2 95,12 80,12 C65,12 55,2 40,2 C25,2 15,12 0,12 Z"
                fill="#2563eb"
              />
              <path
                d="M0,1 C15,1 25,11 40,11 C55,11 65,1 80,1 C95,1 105,11 120,11 C135,11 145,1 160,1 C175,1 185,11 200,11"
                fill="none"
                stroke="#93c5fd"
                strokeWidth="1.2"
                opacity="0.6"
              />
            </svg>
            <svg
              viewBox="0 0 200 16"
              preserveAspectRatio="none"
              className="w-1/2 h-full flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,0 L200,0 L200,2 C185,2 175,12 160,12 C145,12 135,2 120,2 C105,2 95,12 80,12 C65,12 55,2 40,2 C25,2 15,12 0,12 Z"
                fill="#2563eb"
              />
              <path
                d="M0,1 C15,1 25,11 40,11 C55,11 65,1 80,1 C95,1 105,11 120,11 C135,11 145,1 160,1 C175,1 185,11 200,11"
                fill="none"
                stroke="#93c5fd"
                strokeWidth="1.2"
                opacity="0.6"
              />
            </svg>
          </div>
        </div>
      )}

      {/* 15. Evil Bubble - Devil Horns */}
      {shape === 'evil-bubble' && (
        <>
          <div className="absolute -top-3.5 left-2.5 z-20 pointer-events-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
            <svg
              width="22"
              height="20"
              viewBox="0 0 24 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="hornLeftGrad" x1="100%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#7f1d1d" />
                  <stop offset="40%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#f87171" />
                </linearGradient>
              </defs>
              <path
                d="M19 22 C19 16 16 9 8 3 C6 1.5 4 1 2 1 C3.5 4 6 10 9 16 C11 20 15 22 19 22 Z"
                fill="url(#hornLeftGrad)"
              />
              <path
                d="M3 2 C6 7 9 13 11 18"
                stroke="#fca5a5"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </div>

          <div className="absolute -top-3.5 right-2.5 z-20 pointer-events-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
            <svg
              width="22"
              height="20"
              viewBox="0 0 24 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="hornRightGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7f1d1d" />
                  <stop offset="40%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#f87171" />
                </linearGradient>
              </defs>
              <path
                d="M5 22 C5 16 8 9 16 3 C18 1.5 20 1 22 1 C20.5 4 18 10 15 16 C13 20 9 22 5 22 Z"
                fill="url(#hornRightGrad)"
              />
              <path
                d="M21 2 C18 7 15 13 13 18"
                stroke="#fca5a5"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </div>
        </>
      )}

      {/* 16. Halo Bubble - Angel Halo */}
      {shape === 'halo-bubble' && (
        <div
          className={`absolute -top-5 ${
            isOwnMessage ? 'left-3' : 'left-3'
          } z-20 pointer-events-none animate-halo-float drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]`}
        >
          <svg
            width="42"
            height="22"
            viewBox="0 0 44 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="haloRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#facc15" />
                <stop offset="70%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
              <filter id="haloGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <ellipse
              cx="22"
              cy="11"
              rx="19"
              ry="7.5"
              fill="none"
              stroke="#fef08a"
              strokeWidth="4"
              opacity="0.45"
              filter="url(#haloGlow)"
            />
            <ellipse
              cx="22"
              cy="11"
              rx="18"
              ry="7"
              fill="none"
              stroke="url(#haloRingGrad)"
              strokeWidth="3.2"
            />
            <ellipse
              cx="21"
              cy="9.5"
              rx="14"
              ry="4.5"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              opacity="0.8"
            />
          </svg>
        </div>
      )}

      {/* 17. System Bubble - Hacker Terminal Prompt >_ */}
      {shape === 'system-bubble' && (
        <div className="absolute top-1 left-2.5 z-20 flex items-center font-mono text-[11px] font-bold text-emerald-400 select-none pointer-events-none drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">
          <span>&gt;</span>
          <span className="inline-block w-1.5 h-2.5 bg-emerald-400 ml-0.5 animate-terminal-cursor shadow-[0_0_6px_#22c55e]" />
        </div>
      )}
    </div>
  );
};
