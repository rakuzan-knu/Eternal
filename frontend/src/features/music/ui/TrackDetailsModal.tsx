import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Music,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Disc3,
  UserCheck,
} from 'lucide-react';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { SoundCloudBrandIcon, SpotifyBrandIcon } from '@/shared/ui/BrandIcons';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { isSoundCloudUrl } from '@/shared/lib/urlSecurity';

interface TrackDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: SpotifyTrack;
}

export const TrackDetailsModal: React.FC<TrackDetailsModalProps> = ({ isOpen, onClose, track }) => {
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState('Audio unavailable or corrupted');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const showToast = (title: string, body: string) => {
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId: '',
      messageId: '',
      title,
      body,
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setIsReporting(false);
      setReportSubmitted(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSoundCloud =
    track.source === 'soundcloud' || Boolean(track.streamUrl) || isSoundCloudUrl(track.spotifyUrl);

  const formatDuration = (ms?: number) => {
    if (!ms) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSendReport = () => {
    setReportSubmitted(true);
    showToast(
      'Report submitted',
      `Thank you! Your report regarding track «${track.title}» has been forwarded to moderators.`,
    );
    setTimeout(() => {
      setIsReporting(false);
      setReportSubmitted(false);
      onClose();
    }, 1200);
  };

  const sourceUrl =
    track.spotifyUrl ||
    (isSoundCloud
      ? `https://soundcloud.com/search?q=${encodeURIComponent(`${track.artist} ${track.title}`)}`
      : `https://open.spotify.com/track/${track.id}`);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="relative w-full max-w-md rounded-3xl bg-[#18181f]/95 backdrop-blur-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] p-6 text-white overflow-hidden"
        >
          {/* Subtle top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Music size={16} />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Track Info</h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Track Preview Header */}
          <div className="flex items-center gap-4 py-4 border-b border-white/10">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-lg shrink-0">
              {track.albumArt ? (
                <img
                  src={track.albumArt}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <Music size={24} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
              <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist}</p>
              {track.album && (
                <p className="text-[11px] text-gray-500 truncate mt-0.5">Album: {track.album}</p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="py-4 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-gray-400 flex items-center gap-2">
                <UserCheck size={14} className="text-purple-400" />
                Artist
              </span>
              <span className="font-semibold text-white truncate max-w-[200px] text-right">
                {track.artist}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-gray-400 flex items-center gap-2">
                <Disc3 size={14} className="text-purple-400" />
                Album / Release
              </span>
              <span className="font-semibold text-white truncate max-w-[200px] text-right">
                {track.album || track.title}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-gray-400 flex items-center gap-2">
                <Clock size={14} className="text-purple-400" />
                Duration
              </span>
              <span className="font-mono text-white">{formatDuration(track.durationMs)}</span>
            </div>

            {track.releaseDate && (
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-gray-400 flex items-center gap-2">
                  <Calendar size={14} className="text-purple-400" />
                  Release Date
                </span>
                <span className="font-medium text-white">{track.releaseDate}</span>
              </div>
            )}

            {/* Source */}
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-gray-400">Catalog Source</span>
              <div className="flex items-center gap-2">
                {isSoundCloud ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30">
                    <SoundCloudBrandIcon size={14} />
                    SoundCloud
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30">
                    <SpotifyBrandIcon size={14} />
                    Spotify
                  </span>
                )}

                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Open original track page"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          {/* Report Section */}
          <div className="pt-3 border-t border-white/10">
            {!isReporting ? (
              <button
                type="button"
                onClick={() => setIsReporting(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-white/10 hover:border-red-500/40 bg-white/[0.02] hover:bg-red-500/10 text-gray-300 hover:text-red-400 transition-all duration-200 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <AlertTriangle size={14} />
                Report an issue
              </button>
            ) : reportSubmitted ? (
              <div className="flex items-center justify-center gap-2 py-3 text-emerald-400 text-xs font-semibold animate-fadeIn">
                <CheckCircle2 size={16} />
                Report submitted successfully
              </div>
            ) : (
              <div className="space-y-2.5 animate-fadeIn">
                <p className="text-xs font-semibold text-gray-300">Reason for report:</p>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Audio unavailable or corrupted">
                    Audio unavailable or corrupted
                  </option>
                  <option value="Incorrect title or artist">Incorrect title or artist</option>
                  <option value="Incorrect cover or release">Incorrect cover or release</option>
                  <option value="Copyright infringement">Copyright infringement</option>
                </select>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsReporting(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReport}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg transition-all"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};
