import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Play, X } from 'lucide-react';
import { useJamStore } from '@/features/music/model/useJamStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';

export const JamAutoplayBanner: React.FC = () => {
  const isAutoplayBlocked = useJamStore((s) => s.isAutoplayBlocked);
  const setAutoplayBlocked = useJamStore((s) => s.setAutoplayBlocked);
  const hostUsername = useJamStore((s) => s.hostUsername);

  const handleStartListening = () => {
    setAutoplayBlocked(false);
    useSpotifyPlayerStore.getState().resume();
  };

  return (
    <AnimatePresence>
      {isAutoplayBlocked && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer select-none group/autoplay max-w-[calc(100vw-32px)]"
          style={{
            background:
              'linear-gradient(135deg, rgba(26, 28, 38, 0.92) 0%, rgba(13, 14, 20, 0.96) 100%)',
            backdropFilter: 'blur(40px) saturate(220%) brightness(106%)',
            WebkitBackdropFilter: 'blur(40px) saturate(220%) brightness(106%)',
            border: 'none',
            boxShadow:
              'inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 1.5px 0 rgba(255, 255, 255, 0.1), 0 20px 40px -10px rgba(0, 0, 0, 0.75), 0 0 20px rgba(29, 185, 84, 0.25)',
          }}
          onClick={handleStartListening}
        >
          {/* Pulsing Audio Indicator Icon */}
          <div className="relative w-9 h-9 rounded-xl bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center shrink-0 text-[#1DB954] shadow-[0_0_12px_rgba(29,185,84,0.3)]">
            <Headphones size={18} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#1DB954] ring-2 ring-black" />
          </div>

          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-xs font-bold text-white tracking-wide truncate">
              You joined the Jam room{hostUsername ? ` (@${hostUsername})` : ''}
            </span>
            <span className="text-[11px] text-gray-400 truncate">
              Browser interaction required. Click to listen together!
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStartListening();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer ml-1"
          >
            <Play size={13} className="fill-black" />
            <span>Play</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAutoplayBlocked(false);
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
