import React, { useState } from 'react';
import { X, Repeat, Send, Link2, Code2, Check, Phone, MessageSquare, Download } from 'lucide-react';
import type { ReelItem } from '../api/reelsApi';
import { useRecordReelShare } from '../api/reelsApi';
import { ReelSendFriendsModal } from './ReelSendFriendsModal';

interface ReelShareModalProps {
  reel: ReelItem;
  isOpen: boolean;
  onClose: () => void;
}

export const ReelShareModal: React.FC<ReelShareModalProps> = ({ reel, isOpen, onClose }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSendFriendsOpen, setIsSendFriendsOpen] = useState(false);
  const recordShareMutation = useRecordReelShare();

  if (!isOpen) return null;

  const reelUrl = `${window.location.origin}/reels?id=${reel.id}`;
  const shareTitle = reel.caption || `Reel by @${reel.author.username}`;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(reelUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = reelUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setIsCopied(true);
      recordShareMutation.mutate(reel.id);
      triggerToast('Посилання скопійовано!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      triggerToast('Не вдалося скопіювати посилання');
    }
  };

  const handleDownload = async () => {
    recordShareMutation.mutate(reel.id);
    triggerToast('⬇ Завантаження відео...');
    try {
      const response = await fetch(reel.videoUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `reel-${reel.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const a = document.createElement('a');
      a.href = reel.videoUrl;
      a.download = `reel-${reel.id}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleRepost = () => {
    recordShareMutation.mutate(reel.id);
    triggerToast('Репост опубліковано у вашій стрічці!');
    setTimeout(() => onClose(), 1200);
  };

  const handleSendToFriends = () => {
    setIsSendFriendsOpen(true);
  };

  const handleEmbed = async () => {
    const embedCode = `<iframe src="${reelUrl}&embed=1" width="360" height="640" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
    try {
      await navigator.clipboard.writeText(embedCode);
      recordShareMutation.mutate(reel.id);
      triggerToast('HTML-код для вбудовування скопійовано!');
    } catch {
      triggerToast('Не вдалося скопіювати код');
    }
  };

  const handleExternalShare = (platform: string, url: string) => {
    recordShareMutation.mutate(reel.id);
    window.open(url, `_share_${platform}`, 'width=600,height=500,location=no,menubar=no');
  };

  const shareActions = [
    {
      id: 'repost',
      label: 'Репост',
      icon: <Repeat className="w-6 h-6 text-black stroke-[2.5]" />,
      bg: 'bg-[#FFB703] hover:bg-[#ffaa00]',
      onClick: handleRepost,
    },
    {
      id: 'send',
      label: 'Надіслати друзям',
      icon: <Send className="w-6 h-6 text-white stroke-[2.5] -translate-y-0.5 translate-x-0.5" />,
      bg: 'bg-gradient-to-tr from-[#D62976] via-[#FA7E1E] to-[#962FBF] hover:opacity-90',
      onClick: handleSendToFriends,
    },
    {
      id: 'copy',
      label: isCopied ? 'Скопійовано' : 'Копіювати',
      icon: isCopied ? (
        <Check className="w-6 h-6 text-white stroke-[2.5]" />
      ) : (
        <Link2 className="w-6 h-6 text-white stroke-[2.5]" />
      ),
      bg: isCopied ? 'bg-emerald-600' : 'bg-[#0077B6] hover:bg-[#006ba6]',
      onClick: handleCopyLink,
    },
    {
      id: 'download',
      label: 'Завантажити',
      icon: <Download className="w-6 h-6 text-white stroke-[2.5]" />,
      bg: 'bg-emerald-600 hover:bg-emerald-500',
      onClick: handleDownload,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: (
        <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-10.416c-4.409 0-7.994 3.586-7.994 7.995 0 1.408.368 2.784 1.066 3.993l-1.134 4.143 4.241-1.113c1.164.635 2.476.97 3.821.971 4.41 0 7.995-3.586 7.995-7.995 0-4.41-3.585-7.994-7.995-7.994z" />
        </svg>
      ),
      bg: 'bg-[#25D366] hover:bg-[#20ba5a]',
      onClick: () =>
        handleExternalShare(
          'whatsapp',
          `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle} ${reelUrl}`)}`,
        ),
    },
    {
      id: 'embed',
      label: 'Вбудувати',
      icon: <Code2 className="w-6 h-6 text-white stroke-[2.5]" />,
      bg: 'bg-[#00A896] hover:bg-[#009282]',
      onClick: handleEmbed,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: (
        <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      bg: 'bg-[#1877F2] hover:bg-[#166fe5]',
      onClick: () =>
        handleExternalShare(
          'facebook',
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reelUrl)}`,
        ),
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: (
        <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.536-.196 1.006.128.832.943z" />
        </svg>
      ),
      bg: 'bg-[#229ED9] hover:bg-[#1f8ec4]',
      onClick: () =>
        handleExternalShare(
          'telegram',
          `https://t.me/share/url?url=${encodeURIComponent(reelUrl)}&text=${encodeURIComponent(shareTitle)}`,
        ),
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      icon: (
        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      bg: 'bg-zinc-800 border border-white/20 hover:bg-zinc-700',
      onClick: () =>
        handleExternalShare(
          'x',
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(reelUrl)}&text=${encodeURIComponent(shareTitle)}`,
        ),
    },
    {
      id: 'viber',
      label: 'Viber',
      icon: <Phone className="w-6 h-6 text-white stroke-[2.5]" />,
      bg: 'bg-[#7360F2] hover:bg-[#6754e0]',
      onClick: () => {
        window.location.assign(
          `viber://forward?text=${encodeURIComponent(`${shareTitle} ${reelUrl}`)}`,
        );
        recordShareMutation.mutate(reel.id);
      },
    },
    {
      id: 'direct',
      label: 'Повідомлення',
      icon: <MessageSquare className="w-6 h-6 text-white stroke-[2.5]" />,
      bg: 'bg-indigo-600 hover:bg-indigo-500',
      onClick: () => {
        handleCopyLink();
        triggerToast('Посилання скопійовано! Вставте в будь-який чат.');
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#18181b]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast notification overlay */}
        {toastMessage && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-full shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50 whitespace-nowrap">
            {toastMessage}
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="w-8" />
          <h3 className="text-white font-bold text-base sm:text-lg tracking-wide text-center">
            Поділитися
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Закрити"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Horizontal Action Buttons Row (Matching the photo) */}
        <div className="flex items-start gap-4 sm:gap-5 overflow-x-auto py-3 px-1 scrollbar-none snap-x touch-pan-x">
          {shareActions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 group shrink-0 snap-start focus:outline-none cursor-pointer"
              style={{ width: '72px' }}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110 active:scale-95 ${action.bg}`}
              >
                {action.icon}
              </div>
              <span className="text-[12px] font-medium text-zinc-300 group-hover:text-white text-center leading-tight line-clamp-2 transition-colors">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom Copy Link Shortcut Bar */}
        <div className="flex items-center gap-2 bg-zinc-900/90 border border-white/10 rounded-2xl p-1.5 pl-3">
          <span className="text-xs text-zinc-400 truncate flex-1 select-all font-mono">
            {reelUrl}
          </span>
          <button
            onClick={handleCopyLink}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              isCopied
                ? 'bg-emerald-600 text-white'
                : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'
            }`}
          >
            {isCopied ? 'Скопійовано!' : 'Копіювати'}
          </button>
        </div>
      </div>

      <ReelSendFriendsModal
        reel={reel}
        isOpen={isSendFriendsOpen}
        onClose={() => setIsSendFriendsOpen(false)}
        onShowToast={triggerToast}
      />
    </div>
  );
};
