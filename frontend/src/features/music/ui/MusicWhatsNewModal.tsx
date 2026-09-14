import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Cloud, Music, Radio, Heart } from 'lucide-react';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';

interface MusicWhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MusicWhatsNewModal: React.FC<MusicWhatsNewModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-2xl bg-[#121217]/95 border border-white/10 p-6 shadow-2xl backdrop-blur-2xl text-white"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 shadow-lg shadow-purple-500/25">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">What's New in Music Hub?</h2>
              <p className="text-xs text-gray-400">Eternal Music Ecosystem Update</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
              <div className="p-2 rounded-xl bg-[#FF5500]/15 text-[#FF5500] shrink-0">
                <SoundCloudBrandIcon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">Free SoundCloud Streaming</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Listen to millions of tracks, remixes, and exclusive releases directly in the
                  player without requiring a subscription!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
              <div className="p-2 rounded-xl bg-[#1DB954]/15 text-[#1DB954] shrink-0">
                <SpotifyBrandIcon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">Global Spotify Search</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Instantly discover your favorite tracks and albums across the Spotify catalog, add
                  them to your playlists, and share them across the network.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                <Heart size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">Liked Songs Synchronization</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Like any track in the dock or catalog, and it will instantly sync to your personal
                  Liked Songs collection.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-gray-200 transition-colors"
            >
              Got it, let's play music!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
