import React from 'react';
import { X, FileText, Link2 } from 'lucide-react';
import { QueryClientContext } from '@tanstack/react-query';
import { MessageView } from '../../../entities/chat/model/types';
import { useDecryptedMessageBody } from '../model/useDecryptedMessageBody';
import { extractFirstUrl } from '../../../shared/lib/urlUtils';
import { useLinkPreview } from '../../../entities/opengraph/model/useLinkPreview';
import { isSpotifyUrl } from '../../../shared/lib/urlSecurity';

export interface TelegramPeerColor {
  accent: string;
  tint: string;
  hover: string;
}

function ReplyLinkThumbnailInner({ url, ogImage }: { url: string; ogImage?: string | null }) {
  const [resolvedImage, setResolvedImage] = React.useState<string | null>(ogImage ?? null);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    if (ogImage) {
      setResolvedImage(ogImage);
      return;
    }

    let active = true;

    // Spotify oEmbed: instant genuine cover art
    if (isSpotifyUrl(url)) {
      fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
        .then((res) => res.json())
        .then((data) => {
          if (active && data?.thumbnail_url) {
            setResolvedImage(data.thumbnail_url);
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }

    // YouTube: instant direct thumbnail
    const ytMatch = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    );
    if (ytMatch && ytMatch[1]) {
      setResolvedImage(`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`);
    }

    return () => {
      active = false;
    };
  }, [url, ogImage]);

  const activeImg = !hasError && resolvedImage ? resolvedImage : null;

  if (activeImg) {
    return (
      <div className="relative w-[34px] h-[34px] rounded-md overflow-hidden bg-black/40 border border-white/10 shadow-xs shrink-0 flex items-center justify-center">
        <img
          src={activeImg}
          alt="Link preview"
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div className="w-[34px] h-[34px] rounded-md bg-white/95 flex items-center justify-center shrink-0 shadow-xs border border-white/20">
      <Link2 size={16} className="text-gray-800" />
    </div>
  );
}

function ReplyLinkThumbnailWithQuery({ url }: { url: string }) {
  const { data } = useLinkPreview(url);
  return <ReplyLinkThumbnailInner url={url} ogImage={data?.image || data?.favicon} />;
}

function ReplyLinkThumbnail({ url }: { url: string }) {
  const queryClient = React.useContext(QueryClientContext);
  if (queryClient) {
    return <ReplyLinkThumbnailWithQuery url={url} />;
  }
  return <ReplyLinkThumbnailInner url={url} ogImage={null} />;
}

export function getTelegramPeerColor(senderKey?: string | null): TelegramPeerColor {
  const TELEGRAM_PALETTE: TelegramPeerColor[] = [
    { accent: '#e55050', tint: 'rgba(229, 80, 80, 0.08)', hover: 'rgba(229, 80, 80, 0.16)' }, // Red / Coral
    { accent: '#29b6f6', tint: 'rgba(41, 182, 246, 0.08)', hover: 'rgba(41, 182, 246, 0.16)' }, // Cyan Sky
    { accent: '#ab47bc', tint: 'rgba(171, 71, 188, 0.08)', hover: 'rgba(171, 71, 188, 0.16)' }, // Purple / Violet
    { accent: '#4caf50', tint: 'rgba(76, 175, 80, 0.08)', hover: 'rgba(76, 175, 80, 0.16)' }, // Green
    { accent: '#ffa726', tint: 'rgba(255, 167, 38, 0.08)', hover: 'rgba(255, 167, 38, 0.16)' }, // Orange / Amber
    { accent: '#ec407a', tint: 'rgba(236, 64, 122, 0.08)', hover: 'rgba(236, 64, 122, 0.16)' }, // Pink
    { accent: '#26a69a', tint: 'rgba(38, 166, 154, 0.08)', hover: 'rgba(38, 166, 154, 0.16)' }, // Teal
  ];

  if (!senderKey) return TELEGRAM_PALETTE[1];

  const lower = senderKey.toLowerCase();
  if (lower.includes('ayate')) return TELEGRAM_PALETTE[0];
  if (
    lower.includes('артем') ||
    lower.includes('миша') ||
    lower.includes('artem') ||
    lower.includes('misha')
  ) {
    return TELEGRAM_PALETTE[1];
  }

  let hash = 0;
  for (let i = 0; i < senderKey.length; i++) {
    hash = (hash << 5) - hash + senderKey.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % TELEGRAM_PALETTE.length;
  return TELEGRAM_PALETTE[idx];
}

interface ReplyPreviewProps {
  message: MessageView;
  onCancel: () => void;
  /** 1:1 peer for E2EE quote decrypt; null/undefined = groups or unknown. */
  e2eePeerUserId?: string | null;
}

export default function ReplyPreview({
  message,
  onCancel,
  e2eePeerUserId = null,
}: ReplyPreviewProps) {
  const senderName = message.sender.displayName ?? message.sender.username ?? 'User';
  const previewBody = useDecryptedMessageBody(
    message.body,
    e2eePeerUserId,
    message.conversationId,
    message.sender?.id ?? null,
  );

  const peerColor = getTelegramPeerColor(senderName || message.sender.id);

  const replyAttachment = message.attachments?.[0];
  const replyThumbnail = replyAttachment?.thumbnailUrl || replyAttachment?.url;

  const isVideoNote = Boolean(
    replyAttachment &&
    (replyAttachment.type === 'VIDEO_NOTE' ||
      (replyAttachment.type === 'VIDEO' &&
        (replyAttachment.fileName?.includes('video_note') ||
          replyAttachment.mimeType?.includes('video_note') ||
          (replyAttachment.width &&
            replyAttachment.height &&
            replyAttachment.width === replyAttachment.height)))),
  );

  const isPhoto = Boolean(
    replyAttachment &&
    !isVideoNote &&
    (replyAttachment.type === 'IMAGE' || replyAttachment.mimeType?.startsWith('image/')),
  );

  const isVideo = Boolean(
    replyAttachment &&
    !isVideoNote &&
    (replyAttachment.type === 'VIDEO' || replyAttachment.mimeType?.startsWith('video/')),
  );

  const isVoice = Boolean(
    replyAttachment &&
    (replyAttachment.type === 'VOICE' ||
      replyAttachment.type === 'AUDIO' ||
      replyAttachment.mimeType?.startsWith('audio/')),
  );

  const isSticker = Boolean(
    replyAttachment &&
    (replyAttachment.type === 'STICKER' ||
      replyAttachment.mimeType === 'image/webp' ||
      replyAttachment.url?.includes('/stickers/')),
  );

  const isFile = Boolean(
    replyAttachment &&
    !isPhoto &&
    !isVideo &&
    !isVideoNote &&
    !isVoice &&
    !isSticker &&
    (replyAttachment.type === 'FILE' || Boolean(replyAttachment.fileName)),
  );

  const firstUrl = extractFirstUrl(previewBody);
  const isLinkMessage = Boolean(
    !replyAttachment &&
    firstUrl &&
    (previewBody?.includes('http') || previewBody?.toLowerCase().includes('links:')),
  );

  const displayThumbnail = !isVoice
    ? replyThumbnail ||
      (isVideoNote ? message.sender.avatar || (message.sender as any).avatarUrl : null)
    : null;

  const getPreviewText = () => {
    if (isVideoNote) return 'Video message';
    if (isSticker) {
      const emoji = (replyAttachment as any)?.emoji || (replyAttachment as any)?.stickerEmoji;
      return `${emoji || '⭐'} Sticker`;
    }
    if (isPhoto) {
      return previewBody?.trim() ? `Photo, ${previewBody.trim().replace(/\s+/g, ' ')}` : '🖼️ Photo';
    }
    if (isVideo) {
      return previewBody?.trim() ? `Video, ${previewBody.trim().replace(/\s+/g, ' ')}` : '📹 Video';
    }
    if (isVoice) return 'Voice message';
    if (isFile) return `📄 ${replyAttachment?.fileName || 'Document'}`;
    if (isLinkMessage) {
      const cleaned = (previewBody || firstUrl || '').replace(/\s+/g, ' ');
      return cleaned.toLowerCase().startsWith('links:') ? cleaned : `Links: ${cleaned}`;
    }
    if (previewBody) return previewBody.replace(/\s+/g, ' ');
    if (replyAttachment) return 'Attachment';
    return 'Message';
  };

  const handleJumpToOriginal = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = document.getElementById(`msg-${message.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('animate-jumpHighlight');
      setTimeout(() => el.classList.remove('animate-jumpHighlight'), 1200);
    }
  };

  return (
    <div
      onClick={handleJumpToOriginal}
      className="group/reply relative w-full flex items-center justify-between gap-2.5 px-3.5 pt-2 pb-1.5 select-none cursor-pointer bg-transparent transition-colors duration-200"
      title="Jump to message"
    >
      <div
        key={message.id}
        className="flex items-center gap-2.5 min-w-0 flex-1 animate-fadeIn duration-150"
      >
        {/* Telegram Curved Left Arrow */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={peerColor.accent}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v3.5" />
        </svg>

        {/* Vertical Colored Accent Line */}
        <div
          className="w-[3px] h-[34px] rounded-full shrink-0"
          style={{ backgroundColor: peerColor.accent }}
        />

        {/* Media Thumbnail */}
        {displayThumbnail ? (
          <div
            className={`relative w-[34px] h-[34px] shrink-0 overflow-hidden ${
              isVideoNote
                ? 'rounded-full bg-black/40 border border-white/10'
                : isSticker
                  ? 'rounded-md bg-transparent'
                  : 'rounded-md bg-black/40 border border-white/10'
            } shadow-xs flex items-center justify-center`}
          >
            <img
              src={displayThumbnail}
              alt="Reply attachment preview"
              className={`w-full h-full ${isSticker ? 'object-contain' : 'object-cover'}`}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : isSticker ? (
          <div className="w-[34px] h-[34px] flex items-center justify-center shrink-0 text-xl select-none">
            {(replyAttachment as any)?.emoji || (replyAttachment as any)?.stickerEmoji || '⭐'}
          </div>
        ) : isFile ? (
          <div
            className="w-[34px] h-[34px] rounded-md flex items-center justify-center shrink-0 border border-white/10 shadow-xs text-white/70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: peerColor.accent }}
          >
            <FileText size={17} />
          </div>
        ) : isLinkMessage && firstUrl ? (
          <ReplyLinkThumbnail url={firstUrl} />
        ) : null}

        {/* Text Details (Reply to <Name> + Message Snippet) */}
        <div className="min-w-0 flex-1 flex flex-col justify-center leading-tight">
          <p
            className="text-[13px] font-semibold truncate tracking-tight flex items-center gap-1"
            style={{ color: peerColor.accent }}
          >
            <span>Reply to</span>
            <span>{senderName}</span>
          </p>
          <p className="text-[12.5px] text-gray-700 dark:text-white/75 truncate mt-0.5 whitespace-nowrap font-normal">
            {getPreviewText()}
          </p>
        </div>
      </div>

      {/* Cancel / Close Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
        style={{ color: peerColor.accent }}
        title="Cancel reply (Esc)"
      >
        <X size={17} strokeWidth={2.4} />
      </button>
    </div>
  );
}
