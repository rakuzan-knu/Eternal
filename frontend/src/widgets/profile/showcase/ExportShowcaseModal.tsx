import React, { useRef, useState, useEffect } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { X, Copy, Download, Check, Loader2, Share2, Sparkles, Flame, Star } from 'lucide-react';
import type { ProfileShowcaseDto } from '@backend/common/contracts';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import Avatar from '@/shared/ui/Avatar';

interface ExportShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  showcase: ProfileShowcaseDto;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string | null;
    banner?: string | null;
    isVerified?: boolean;
    primaryBadge?: string | null;
  };
}

export const ExportShowcaseModal: React.FC<ExportShowcaseModalProps> = ({
  isOpen,
  onClose,
  showcase,
  user,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const accent = showcase.accentColor || '#6366f1';
  const topMedia = showcase.mediaItems.slice(0, 3);

  const generateCard = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      // 1. Tainted Canvas Protection options
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        skipAutoScale: true,
      });
      setPreviewUrl(dataUrl);
    } catch (err) {
      console.warn('HTML-to-image preview generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(null);
      setCopied(false);
      const timer = setTimeout(generateCard, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.download = `showcase-${user.username}.png`;
    link.href = previewUrl;
    link.click();

    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}`,
      conversationId: '',
      messageId: '',
      title: 'Card Downloaded',
      body: `File showcase-${user.username}.png saved successfully.`,
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
  };

  const handleCopyToClipboard = async () => {
    if (!cardRef.current) return;

    try {
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        skipAutoScale: true,
      });

      if (blob && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);

        useMessageToastStore.getState().addToast({
          id: `toast-${Date.now()}`,
          conversationId: '',
          messageId: '',
          title: 'Copied to Clipboard',
          body: 'Showcase card PNG copied to clipboard.',
          avatar: null,
          memberAvatars: [],
          isGroup: false,
        });
        return;
      }
      throw new Error('Clipboard API unavailable');
    } catch {
      // Automatic download fallback on browser security restriction
      handleDownload();
    }
  };

  const bannerSource =
    showcase.spotlightMedia?.customBannerUrl || showcase.spotlightMedia?.posterUrl || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-xl max-h-[95vh] bg-[#0d0d10] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-white overflow-hidden"
        style={{
          boxShadow: `0 0 50px -10px ${accent}40`,
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300">
              <Share2 size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Share Showcase Card</h3>
              <p className="text-[11px] text-gray-400">
                Export a stylish profile showcase card for Discord, Telegram & social media
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Preview Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center p-2">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
              <span className="text-xs font-semibold">Generating card...</span>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Showcase Card Preview"
              className="max-h-[50vh] w-auto rounded-2xl shadow-2xl border border-white/10"
            />
          ) : (
            <div className="text-xs text-gray-500 py-12">Preparing image...</div>
          )}
        </div>

        {/* HIDDEN OFF-SCREEN RENDER CONTAINER FOR HTML-TO-IMAGE */}
        <div className="absolute -left-[9999px] top-0 pointer-events-none">
          <div
            ref={cardRef}
            className="w-[480px] bg-[#0c0c0f] text-white p-5 rounded-[2.5rem] border border-white/10 flex flex-col gap-4 relative overflow-hidden font-sans"
            style={{
              boxShadow: `0 20px 50px rgba(0,0,0,0.9)`,
            }}
          >
            {/* Ambient Background Gradient */}
            <div
              className="absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-35 blur-3xl pointer-events-none"
              style={{ backgroundColor: accent }}
            />
            <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-purple-600/25 blur-3xl pointer-events-none" />

            {/* Profile Header Block */}
            <div className="relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.08] p-3 flex items-center gap-3.5 backdrop-blur-xl">
              {user.banner && (
                <img
                  src={user.banner}
                  alt="Banner"
                  crossOrigin="anonymous"
                  className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xs pointer-events-none"
                />
              )}
              <Avatar
                src={user.avatar}
                alt={user.displayName}
                size="md"
                className="w-13 h-13 rounded-2xl border-2 border-white/20 shrink-0"
              />
              <div className="flex flex-col min-w-0 z-10">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base text-white truncate">
                    {user.displayName}
                  </span>
                  {user.isVerified && <span className="text-blue-400 text-xs">✓</span>}
                </div>
                <span className="text-xs text-gray-400 font-medium truncate">@{user.username}</span>
              </div>
            </div>

            {/* Spotlight Card */}
            {showcase.spotlightMedia && (
              <div className="relative rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.08] p-3 flex flex-col gap-2 backdrop-blur-xl">
                <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                  <Flame size={13} />
                  <span>Spotlight Title</span>
                </div>

                <div className="relative rounded-xl overflow-hidden aspect-[16/9] border border-white/10 bg-black/40">
                  <img
                    src={bannerSource}
                    alt={showcase.spotlightMedia.title}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-sm text-white drop-shadow-md">
                          {showcase.spotlightMedia.title}
                        </span>
                        {showcase.spotlightMedia.subtitle && (
                          <span className="text-[11px] font-medium text-gray-300">
                            {showcase.spotlightMedia.subtitle}
                          </span>
                        )}
                      </div>

                      {showcase.spotlightMedia.rating && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-amber-300 text-xs font-bold border border-amber-500/30">
                          <Star size={10} className="fill-amber-400 text-amber-400" />
                          <span>{showcase.spotlightMedia.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {showcase.spotlightMedia.tags && showcase.spotlightMedia.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {showcase.spotlightMedia.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-[10px] text-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Top 3 Posters Row */}
            {topMedia.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Top Favorites
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {topMedia.map((m, idx) => (
                    <div
                      key={idx}
                      className="aspect-[2/3] rounded-xl overflow-hidden border border-white/10 bg-black/40 relative"
                    >
                      <img
                        src={m.posterUrl}
                        alt={m.title}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex items-end">
                        <span className="text-[9px] font-bold text-white truncate">{m.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Brand Watermark Footer */}
            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-gray-400 font-medium">
              <div className="flex items-center gap-1 text-indigo-300">
                <Sparkles size={11} />
                <span className="font-bold">Social Network</span>
              </div>
              <span>Profile Showcase 2.1</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={handleCopyToClipboard}
            disabled={!previewUrl || isGenerating}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy to Clipboard</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!previewUrl || isGenerating}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg hover:scale-105 cursor-pointer disabled:opacity-40"
            style={{ backgroundColor: accent }}
          >
            <Download size={14} />
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
