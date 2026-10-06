import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  X,
  Mic,
  Video,
  Send,
  FileImage as FileIcon,
  EyeOff,
  Check,
  Image as ImageIcon,
  FileText,
  Paintbrush,
  VolumeX,
} from 'lucide-react';
import {
  MessageView,
  OutgoingAttachment,
  AttachmentView,
} from '../../../entities/chat/model/types';
import { useMessageActions } from '../model/useMessageActions';
import { StagedFile } from '@/shared/model/useStagedAttachments';
import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/shared/lib/attachmentLimits';
import ReplyPreview from './ReplyPreview';
import EditPreview from './EditPreview';
import { E2eePinChangedError, extractPlainPreview } from '../lib/e2ee/messageE2ee';
import { AddEmojiButton } from '@/shared/ui/AddEmojiButton';
import { AddGifButton } from '@/shared/ui/AddGifButton';
import PollComposer from './PollComposer';
import AttachMenu from '@/shared/ui/AttachMenu';
import ImageEditorModal from '@/shared/ui/ImageEditorModal';
import VideoEditorModal from '@/shared/ui/VideoEditorModal';
import CircularProgress from '@/shared/ui/CircularProgress';
import FileIconBadge from './FileIconBadge';
import DocumentPreviewModal from './DocumentPreviewModal';
import { useChatDraftsStore } from '../model/useChatDraftsStore';
import { useMediaRecorderGesture, RecordedPayload } from '../model/useMediaRecorderGesture';
import VoiceRecorderBar from './VoiceRecorderBar';
import VideoNoteRecorderCircle from './VideoNoteRecorderCircle';
import SmartCodePasteBanner from './SmartCodePasteBanner';
import FloatingSelectionToolbar, { SelectionFormatType } from './FloatingSelectionToolbar';
import { detectCodeSnippet, DetectedCodeSnippet } from '../lib/smartCodeDetection';
import { getTextareaSelectionCoordinates } from '@/shared/lib/editor';
import { extractFirstUrl } from '@/shared/lib/urlUtils';
import { useLinkPreview } from '@/entities/opengraph/model/useLinkPreview';
import { LinkPreviewBanner } from './LinkPreviewBanner';
import { Permission } from '@/shared/lib/permissions';
import { compressImage } from '@/shared/lib/compressImage';
import { useThemeStore, isCurrentThemeLight } from '@/shared/model/useThemeStore';
import {
  parseEmojiSegments,
  emojiToUnified,
  APPLE_PNG_CDN,
  APPLE_PNG_FALLBACK_CDN,
} from './Call/TelegramAppleEmoji';
import {
  VIDEO_EXTENSIONS_REGEX,
  IMAGE_EXTENSIONS_REGEX,
  formatVideoTime,
} from '../lib/chatMediaUtils';

function TelegramReplaceMediaIcon({
  size = 19,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
      <path d="M13.5 6.5h3a2 2 0 0 1 2 2V10.5" />
      <path d="m16.5 8.5 2 2 2-2" />
      <path d="M10.5 17.5h-3a2 2 0 0 1-2-2V13.5" />
      <path d="m3.5 15.5 2-2 2 2" />
    </svg>
  );
}

export interface ChatPermissions {
  canSendMedia?: boolean;
  canSendVoice?: boolean;
  canSendPolls?: boolean;
}

interface MessageComposerProps {
  conversationId: string;
  actions: ReturnType<typeof useMessageActions>;
  replyingTo: MessageView | null;
  onCancelReply: () => void;
  onSetReplyingTo?: (message: MessageView | null) => void;
  editingMessage?: MessageView | null;
  onCancelEdit?: () => void;
  stagedFiles: StagedFile[];
  stagedFilesError: string | null;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onReplaceFile: (
    index: number,
    file: File,
    isSpoiler?: boolean,
    meta?: Partial<StagedFile>,
  ) => void;
  onClearFiles: () => void;
  onDismissFilesError: () => void;
  isGroup: boolean;
  permissions?: ChatPermissions;
  permissionsMask?: number;
  slowModeSeconds?: number;
  /** 1:1 peer for E2EE reply-quote decrypt; null/undefined = groups or unknown. */
  e2eePeerUserId?: string | null;
  /** Controls if pressing regular keys while idle focuses and types into composer */
  canAutoFocus?: boolean;
}

type OpenPopover = 'emoji' | 'gif' | 'poll' | null;

const MIN_TEXTAREA_HEIGHT = 36;
const MAX_TEXTAREA_HEIGHT = 160;
export const MAX_MESSAGE_LENGTH = 2000;
const WARN_THRESHOLD = 1500;
const CRITICAL_THRESHOLD = 1900;
const CIRCUMFERENCE = 2 * Math.PI * 9; // ~56.5487

export default function MessageComposer({
  conversationId,
  actions,
  replyingTo,
  onCancelReply,
  onSetReplyingTo,
  editingMessage = null,
  onCancelEdit,
  stagedFiles,
  stagedFilesError,
  onAddFiles,
  onRemoveFile,
  onReplaceFile,
  onClearFiles,
  onDismissFilesError,
  isGroup,
  permissions = { canSendMedia: true, canSendVoice: true, canSendPolls: true },
  permissionsMask,
  slowModeSeconds = 0,
  e2eePeerUserId = null,
  canAutoFocus = true,
}: MessageComposerProps) {
  const [text, setText] = useState(() => {
    if (editingMessage) {
      return extractPlainPreview(editingMessage.body || '');
    }
    const draft = useChatDraftsStore.getState().getDraft(conversationId);
    return draft?.text || '';
  });
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSendingTransition, startSendTransition] = useTransition();
  const isSendingEffective = isSending || isSendingTransition;
  const isSendingRef = useRef(false);
  const [isShaking, setIsShaking] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingVideoIndex, setEditingVideoIndex] = useState<number | null>(null);
  const [previewingDocumentIndex, setPreviewingDocumentIndex] = useState<number | null>(null);
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
  const [uploadProgressMap, setUploadProgressMap] = useState<Record<string, number>>({});
  const [slowModeSecondsRemaining, setSlowModeSecondsRemaining] = useState<number>(0);
  const [debouncedUrl, setDebouncedUrl] = useState<string | null>(null);
  const [dismissedUrls, setDismissedUrls] = useState<Set<string>>(() => new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLight = useThemeStore((s) => isCurrentThemeLight(s));

  const [activeReply, setActiveReply] = useState<MessageView | null>(replyingTo ?? null);
  const [isReplyOpen, setIsReplyOpen] = useState(Boolean(replyingTo));
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeEdit, setActiveEdit] = useState<MessageView | null>(editingMessage ?? null);
  const [isEditOpen, setIsEditOpen] = useState(Boolean(editingMessage));
  const closeEditTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousDraftRef = useRef<string | null>(
    editingMessage ? useChatDraftsStore.getState().getDraft(conversationId)?.text || '' : null,
  );

  const [isReplaceMenuOpen, setIsReplaceMenuOpen] = useState(false);
  const [replacedMedia, setReplacedMedia] = useState<{
    file: File;
    previewUrl: string;
    type: 'IMAGE' | 'VIDEO' | 'FILE';
    name: string;
  } | null>(null);
  const [editingPhotoFile, setEditingPhotoFile] = useState<File | null>(null);
  const replaceMediaInputRef = useRef<HTMLInputElement>(null);
  const replaceDocInputRef = useRef<HTMLInputElement>(null);

  const currentEditMedia = replacedMedia
    ? {
        type: replacedMedia.type,
        url: replacedMedia.previewUrl,
        fileName: replacedMedia.name,
      }
    : activeEdit?.attachments?.[0];

  const editingHasMedia = Boolean(
    activeEdit &&
    (activeEdit.attachments?.length ||
      activeEdit.messageType === 'IMAGE' ||
      activeEdit.messageType === 'VIDEO' ||
      activeEdit.messageType === 'FILE' ||
      replacedMedia),
  );

  const isEditingPhoto = Boolean(
    currentEditMedia &&
    (currentEditMedia.type === 'IMAGE' ||
      (currentEditMedia as any).mimeType?.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|svg)$/i.test(
        (currentEditMedia as any).url || (currentEditMedia as any).name || '',
      )),
  );

  const handleOpenPhotoEditor = async () => {
    if (replacedMedia?.file) {
      setEditingPhotoFile(replacedMedia.file);
      return;
    }
    const att = activeEdit?.attachments?.[0];
    if (!att?.url) return;
    try {
      const res = await fetch(att.url);
      const blob = await res.blob();
      const file = new File([blob], att.fileName || (att as any).name || 'photo.png', {
        type: blob.type || 'image/png',
      });
      setEditingPhotoFile(file);
    } catch (err) {
      console.error('Failed to load image for photo editor:', err);
    }
  };

  const handlePickReplaceMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = file.type.startsWith('video/') || VIDEO_EXTENSIONS_REGEX.test(file.name);
    const previewUrl = URL.createObjectURL(file);
    setReplacedMedia({
      file,
      previewUrl,
      type: isVid ? 'VIDEO' : 'IMAGE',
      name: file.name,
    });
    e.target.value = '';
  };

  const handlePickReplaceDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setReplacedMedia({
      file,
      previewUrl,
      type: 'FILE',
      name: file.name,
    });
    e.target.value = '';
  };

  useEffect(() => {
    if (replyingTo) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setActiveReply(replyingTo);
      setIsReplyOpen(true);
    } else {
      setIsReplyOpen(false);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      closeTimeoutRef.current = setTimeout(() => {
        setActiveReply(null);
        closeTimeoutRef.current = null;
      }, 300);
    }
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [replyingTo]);

  useEffect(() => {
    if (editingMessage) {
      if (closeEditTimeoutRef.current) {
        clearTimeout(closeEditTimeoutRef.current);
        closeEditTimeoutRef.current = null;
      }
      setActiveEdit(editingMessage);
      setIsEditOpen(true);
      setReplacedMedia(null);
      setIsReplaceMenuOpen(false);
      setEditingPhotoFile(null);
      if (previousDraftRef.current === null) {
        previousDraftRef.current = text;
      }
      const rawBody = editingMessage.body || '';
      const initialText = extractPlainPreview(rawBody);
      setText(initialText);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(initialText.length, initialText.length);
          textareaRef.current.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
          textareaRef.current.style.height = `${Math.min(
            textareaRef.current.scrollHeight,
            MAX_TEXTAREA_HEIGHT,
          )}px`;
        }
      });
    } else {
      setIsEditOpen(false);
      setReplacedMedia(null);
      setIsReplaceMenuOpen(false);
      setEditingPhotoFile(null);
      if (closeEditTimeoutRef.current) {
        clearTimeout(closeEditTimeoutRef.current);
      }
      closeEditTimeoutRef.current = setTimeout(() => {
        setActiveEdit(null);
        closeEditTimeoutRef.current = null;
      }, 300);
    }
    return () => {
      if (closeEditTimeoutRef.current) {
        clearTimeout(closeEditTimeoutRef.current);
      }
    };
  }, [editingMessage]);

  const handleCancelEdit = useCallback(() => {
    if (replacedMedia?.previewUrl) {
      URL.revokeObjectURL(replacedMedia.previewUrl);
    }
    setReplacedMedia(null);
    setIsReplaceMenuOpen(false);
    setEditingPhotoFile(null);
    if (previousDraftRef.current !== null) {
      setText(previousDraftRef.current);
      previousDraftRef.current = null;
    } else {
      setText('');
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
    }
    onCancelEdit?.();
  }, [onCancelEdit, replacedMedia]);

  const handleSaveEdit = () => {
    if (!editingMessage || isSendingRef.current || isSendingEffective) return;
    const trimmed = text.trim();
    if (!trimmed && (editingMessage.body || '').trim() && !replacedMedia) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }
    if (trimmed === (editingMessage.body || '').trim() && !replacedMedia) {
      handleCancelEdit();
      return;
    }

    isSendingRef.current = true;
    startSendTransition(async () => {
      try {
        setIsSending(true);
        let newAttachment: AttachmentView | null = null;
        if (replacedMedia) {
          try {
            const uploaded = await actions.uploadAttachment(replacedMedia.file);
            if (uploaded) {
              newAttachment = {
                id: `att-${Date.now()}`,
                type: uploaded.type || replacedMedia.type,
                url: uploaded.url,
                fileName: uploaded.fileName || replacedMedia.name,
                mimeType: uploaded.mimeType || replacedMedia.file.type,
                size: uploaded.size ?? replacedMedia.file.size,
                width: uploaded.width ?? null,
                height: uploaded.height ?? null,
                duration: uploaded.duration ?? null,
                thumbnailUrl: uploaded.thumbnailUrl ?? null,
              };
            }
          } catch (uploadErr) {
            console.error('Failed to upload replaced media:', uploadErr);
            newAttachment = {
              id: `att-${Date.now()}`,
              type: replacedMedia.type,
              url: replacedMedia.previewUrl,
              fileName: replacedMedia.name,
              size: replacedMedia.file.size,
              mimeType: replacedMedia.file.type,
              width: null,
              height: null,
              duration: null,
              thumbnailUrl: null,
            };
          }
        }
        if (newAttachment) {
          await actions.editMessage(editingMessage.id, text, editingMessage.body, newAttachment);
        } else {
          await actions.editMessage(editingMessage.id, text, editingMessage.body);
        }
        setReplacedMedia(null);
        previousDraftRef.current = null;
        setText('');
        if (textareaRef.current) {
          textareaRef.current.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
        }
        onCancelEdit?.();
      } catch (err) {
        console.error('Failed to edit message:', err);
        setSendError('Failed to save edit. Please try again.');
        setTimeout(() => setSendError(null), 4000);
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    });
  };

  useEffect(() => {
    const firstUrl = extractFirstUrl(text);
    const handler = setTimeout(() => {
      setDebouncedUrl(firstUrl);
    }, 500);

    return () => clearTimeout(handler);
  }, [text]);

  const isEmbedDismissed = Boolean(
    (debouncedUrl && dismissedUrls.has(debouncedUrl)) ||
    (extractFirstUrl(text) && dismissedUrls.has(extractFirstUrl(text)!)),
  );
  const activePreviewUrl = !isEmbedDismissed ? debouncedUrl : null;
  const { data: linkPreviewData } = useLinkPreview(activePreviewUrl);

  const handleDismissLinkPreview = () => {
    const currentUrl = extractFirstUrl(text);
    const target = debouncedUrl || currentUrl;
    if (target) {
      setDismissedUrls((prev) => new Set([...prev, target]));
    }
  };

  useEffect(() => {
    if (slowModeSecondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSlowModeSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [slowModeSecondsRemaining]);

  const canSendMedia =
    permissionsMask !== undefined
      ? (permissionsMask & Permission.CAN_SEND_MEDIA) !== 0
      : (permissions.canSendMedia ?? true);
  const canSendVoice =
    permissionsMask !== undefined
      ? (permissionsMask & Permission.CAN_SEND_VOICE) !== 0
      : (permissions.canSendVoice ?? true);
  const canSendPolls =
    permissionsMask !== undefined
      ? (permissionsMask & Permission.CAN_SEND_POLLS) !== 0
      : (permissions.canSendPolls ?? true);

  const hasContent = text.trim().length > 0 || stagedFiles.length > 0;

  const handleSendRecordedMedia = (payload: RecordedPayload) => {
    if (isSendingRef.current || isSendingEffective) return;
    isSendingRef.current = true;
    startSendTransition(async () => {
      try {
        setIsSending(true);
        let uploaded: Partial<OutgoingAttachment> = {};

        try {
          uploaded = await actions.uploadAttachment(payload.file);
        } catch (uploadErr) {
          // Resilient fallback: convert recorded Blob to Data URL if server upload endpoint fails
          try {
            const reader = new FileReader();
            const dataUrlPromise = new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve(payload.previewUrl);
            });
            reader.readAsDataURL(payload.file);
            const dataUrl = await dataUrlPromise;
            uploaded = {
              url: dataUrl,
              type: payload.mode === 'voice' ? 'AUDIO' : 'VIDEO',
              fileName: payload.file.name,
              mimeType:
                payload.file.type || (payload.mode === 'voice' ? 'audio/webm' : 'video/webm'),
              size: payload.file.size,
            };
          } catch {
            throw uploadErr;
          }
        }

        const outgoing: OutgoingAttachment = {
          type: payload.mode === 'voice' ? 'AUDIO' : 'VIDEO',
          url: uploaded.url || payload.previewUrl,
          size: payload.file.size,
          duration: payload.duration ? Math.round(payload.duration) : 0,
          waveform: payload.waveform,
          fileName: payload.file.name,
          mimeType: payload.file.type || (payload.mode === 'voice' ? 'audio/webm' : 'video/webm'),
        };

        await actions.sendMessage('', replyingTo?.id, [outgoing]);
        onCancelReply();
        useChatDraftsStore.getState().clearDraft(conversationId);
      } catch {
        setRecordingError('Failed to send recording. Please try again.');
        setTimeout(() => setRecordingError(null), 4000);
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    });
  };

  const recorder = useMediaRecorderGesture({
    onSend: handleSendRecordedMedia,
    onError: (err) => {
      setRecordingError(err);
      setTimeout(() => setRecordingError(null), 4000);
    },
  });

  const onSetReplyingToRef = useRef(onSetReplyingTo);
  onSetReplyingToRef.current = onSetReplyingTo;
  const replyingToRef = useRef(replyingTo);
  replyingToRef.current = replyingTo;

  // Restore draft when switching conversation (skip if currently editing a message)
  useEffect(() => {
    if (!conversationId || editingMessage) return;
    const draft = useChatDraftsStore.getState().getDraft(conversationId);
    if (draft) {
      setText(draft.text || '');
      if (draft.replyingTo && !replyingToRef.current) {
        onSetReplyingToRef.current?.(draft.replyingTo);
      }
    } else {
      setText('');
    }
  }, [conversationId, editingMessage]);

  // Sync draft to store (skip while editing so we don't clobber the user's draft)
  useEffect(() => {
    if (!conversationId || editingMessage) return;
    const timeout = setTimeout(() => {
      useChatDraftsStore.getState().setDraft(conversationId, text, replyingTo);
    }, 150);
    return () => clearTimeout(timeout);
  }, [conversationId, text, replyingTo, editingMessage]);

  const backdropRef = useRef<HTMLDivElement | null>(null);
  const hasEmoji = Boolean(text) && /\p{Extended_Pictographic}/u.test(text);

  const handleTextareaScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const renderedBackdropContent = React.useMemo(() => {
    if (!hasEmoji) return null;
    const segments = parseEmojiSegments(text);
    return (
      <>
        {segments.map((seg, idx) => {
          if (seg.type === 'emoji') {
            const unified = emojiToUnified(seg.content);
            return (
              <span key={idx} className="relative inline-block select-none">
                {/* Natural ghost glyph: guarantees 100% exact advance width matching the textarea */}
                <span
                  className="invisible opacity-0 select-none pointer-events-none"
                  aria-hidden="true"
                >
                  {seg.content}
                </span>
                {/* Visual Apple Emoji overlay centered in the glyph bounding box */}
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 rounded-full pointer-events-none select-none ${
                      isLight ? 'bg-white' : 'bg-[#14151f]'
                    }`}
                  />
                  <img
                    src={`${APPLE_PNG_CDN}/${unified}.png`}
                    alt={seg.content}
                    className="relative z-10 w-[1.22em] h-[1.22em] max-w-none object-contain pointer-events-none select-none"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (!target.dataset.triedFallback) {
                        target.dataset.triedFallback = 'true';
                        target.src = `${APPLE_PNG_FALLBACK_CDN}/${unified}.png`;
                      } else {
                        target.style.display = 'none';
                      }
                    }}
                  />
                </span>
              </span>
            );
          }
          return <span key={idx}>{seg.content}</span>;
        })}
        {text.endsWith('\n') ? ' ' : ''}
      </>
    );
  }, [text, hasEmoji, isLight]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, MIN_TEXTAREA_HEIGHT), MAX_TEXTAREA_HEIGHT);
    el.style.height = `${next}px`;
    if (backdropRef.current) {
      backdropRef.current.scrollTop = el.scrollTop;
    }
  }, [text]);

  useEffect(() => {
    if (!stagedFilesError) return;
    const id = setTimeout(onDismissFilesError, 4000);
    return () => clearTimeout(id);
  }, [stagedFilesError, onDismissFilesError]);

  const togglePopover = (key: Exclude<OpenPopover, null>) =>
    setOpenPopover((prev) => (prev === key ? null : key));

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 350);
  };

  const handleTextChange = (value: string) => {
    if (value.length > MAX_MESSAGE_LENGTH) {
      setText(value.slice(0, MAX_MESSAGE_LENGTH));
      triggerShake();
    } else {
      setText(value);
      if (value.length === MAX_MESSAGE_LENGTH) {
        triggerShake();
      }
    }
    actions.setTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => actions.setTyping(false), 2000);
  };

  // auto-focus typing:
  // When pressing an ordinary alphanumeric/punctuation key while idle in chat,
  // automatically focus the textarea and type the character seamlessly.
  useEffect(() => {
    const handleGlobalType = (e: KeyboardEvent) => {
      // 1. Skip if shortcut modifiers are pressed (Ctrl, Meta/Cmd, Alt)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // 2. Only single printable characters (length === 1)
      if (e.key.length !== 1) return;
      if (e.key.charCodeAt(0) < 32) return;

      // Avoid capturing spacebar when input is empty
      if (e.key === ' ' && !text.length) return;

      // 3. Skip if already typing in an editable field or textarea
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if ((active as HTMLElement).isContentEditable) return;
        if (active.getAttribute('role') === 'textbox') return;
      }

      const textarea = textareaRef.current;
      if (!textarea || active === textarea) return;

      // 4. Skip if disabled, slow-mode ticking, or sending in progress
      if (slowModeSecondsRemaining > 0 || isSendingEffective) return;
      if (openPopover !== null || editingIndex !== null) return;
      if (recorder.recordState !== 'idle') return;

      // 5. Skip if any modal / dialog / popover is open on page
      if (document.querySelector('[role="dialog"], [aria-modal="true"], .glass-modal')) return;

      // 6. Skip if external prop forbids auto-focus (e.g. selection mode, search panel open)
      if (!canAutoFocus) return;

      // Focus textarea and append character at current selection / end
      e.preventDefault();
      textarea.focus();

      const start = textarea.selectionStart ?? text.length;
      const end = textarea.selectionEnd ?? text.length;
      const nextText = text.slice(0, start) + e.key + text.slice(end);

      handleTextChange(nextText);

      const nextPos = start + e.key.length;
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      });
    };

    window.addEventListener('keydown', handleGlobalType);
    return () => window.removeEventListener('keydown', handleGlobalType);
  }, [
    text,
    slowModeSecondsRemaining,
    isSendingEffective,
    openPopover,
    editingIndex,
    recorder.recordState,
    canAutoFocus,
  ]);

  const handleEmojiSelect = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      handleTextChange(text + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    handleTextChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const handleGifSelect = (gifUrl: string) => {
    if (!canSendMedia) return;
    setOpenPopover(null);
    actions
      .sendMessage('', replyingTo?.id, [{ type: 'GIF', url: gifUrl, mimeType: 'image/gif' }])
      .catch(() => {});
    useChatDraftsStore.getState().clearDraft(conversationId);
    onCancelReply();
  };

  const handleCreatePoll = (question: string, options: string[]) => {
    if (!canSendPolls) return;
    setOpenPopover(null);
    const pollPayload = JSON.stringify({
      type: 'POLL',
      question,
      options: options.map((optText, idx) => ({ id: `opt-${idx + 1}`, text: optText, votes: 0 })),
    });
    actions.sendMessage(pollPayload, replyingTo?.id).catch(() => {});
    useChatDraftsStore.getState().clearDraft(conversationId);
    onCancelReply();
  };

  const handleSend = () => {
    if (!hasContent || isSendingRef.current || isSendingEffective) return;
    isSendingRef.current = true;

    const textToSend = text;
    const filesToSend = [...stagedFiles];
    const replyToSend = replyingTo;

    // Immediately clear input fields & draft for responsive Telegram-style UX
    setText('');
    onClearFiles();
    onCancelReply();
    useChatDraftsStore.getState().clearDraft(conversationId);
    actions.setTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
      textareaRef.current.focus();
    }

    startSendTransition(async () => {
      try {
        setIsSending(true);
        let attachments: OutgoingAttachment[] | undefined;

        if (filesToSend.length > 0) {
          attachments = await Promise.all(
            filesToSend.map(async (staged) => {
              const fileToUpload = await compressImage(staged.file);
              let naturalWidth: number | undefined;
              let naturalHeight: number | undefined;

              if (
                process.env.NODE_ENV !== 'test' &&
                (fileToUpload.type.startsWith('image/') || staged.file.type.startsWith('image/'))
              ) {
                try {
                  const dims = await new Promise<{ width: number; height: number }>((resolve) => {
                    const timer = setTimeout(() => resolve({ width: 0, height: 0 }), 100);
                    const img = new Image();
                    img.onload = () => {
                      clearTimeout(timer);
                      resolve({ width: img.naturalWidth, height: img.naturalHeight });
                    };
                    img.onerror = () => {
                      clearTimeout(timer);
                      resolve({ width: 0, height: 0 });
                    };
                    img.src = staged.previewUrl;
                  });
                  if (dims.width > 0 && dims.height > 0) {
                    naturalWidth = dims.width;
                    naturalHeight = dims.height;
                  }
                } catch {}
              }

              try {
                const uploaded = await actions.uploadAttachment(fileToUpload, (percent) => {
                  setUploadProgressMap((prev) => ({
                    ...prev,
                    [staged.previewUrl]: percent,
                  }));
                });
                return {
                  ...uploaded,
                  type: staged.sendAsFile ? ('FILE' as const) : uploaded.type,
                  width: uploaded.width || naturalWidth,
                  height: uploaded.height || naturalHeight,
                  isSpoiler: staged.isSpoiler,
                };
              } catch {
                // Resilient data URL fallback if server upload endpoint encounters an issue
                const reader = new FileReader();
                const dataUrlPromise = new Promise<string>((resolve) => {
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => resolve(staged.previewUrl);
                });
                reader.readAsDataURL(fileToUpload);
                const dataUrl = await dataUrlPromise;
                const isGifType =
                  fileToUpload.type === 'image/gif' ||
                  fileToUpload.name.toLowerCase().endsWith('.gif');
                return {
                  url: dataUrl,
                  type: staged.sendAsFile
                    ? ('FILE' as const)
                    : isGifType
                      ? ('GIF' as const)
                      : fileToUpload.type.startsWith('image/') ||
                          IMAGE_EXTENSIONS_REGEX.test(fileToUpload.name)
                        ? ('IMAGE' as const)
                        : fileToUpload.type.startsWith('video/') ||
                            VIDEO_EXTENSIONS_REGEX.test(fileToUpload.name)
                          ? ('VIDEO' as const)
                          : fileToUpload.type.startsWith('audio/')
                            ? ('AUDIO' as const)
                            : ('FILE' as const),
                  fileName: fileToUpload.name,
                  mimeType: fileToUpload.type,
                  size: fileToUpload.size,
                  width: naturalWidth,
                  height: naturalHeight,
                  isSpoiler: staged.isSpoiler,
                };
              }
            }),
          );
        }

        await actions.sendMessage(textToSend, replyToSend?.id, attachments);
      } catch (err) {
        if (err instanceof E2eePinChangedError) {
          // Suspected key substitution: the message was NOT sent (fail closed).
          // The optimistic bubble sits in ERROR; retry stays blocked until the
          // new key is accepted. Explain instead of failing silently.
          setSendError(
            'This contact\u2019s security key changed. Sending is blocked to protect your messages.',
          );
          setTimeout(() => setSendError(null), 6000);
        }
        console.error('Failed to send message:', err);
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    });
  };

  const [detectedSnippet, setDetectedSnippet] = useState<DetectedCodeSnippet | null>(null);
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const updateSelectionToolbar = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      setFloatingToolbarPos(null);
      return;
    }
    const coords = getTextareaSelectionCoordinates(el);
    setFloatingToolbarPos(coords);
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      const el = textareaRef.current;
      if (!el) return;
      if (document.activeElement !== el) {
        setFloatingToolbarPos(null);
        return;
      }
      if (el.selectionStart === el.selectionEnd) {
        setFloatingToolbarPos(null);
        return;
      }
      updateSelectionToolbar();
    };

    const handleScrollOrResize = () => {
      if (floatingToolbarPos) {
        updateSelectionToolbar();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [floatingToolbarPos, updateSelectionToolbar]);

  const handleSelectionFormat = (type: SelectionFormatType, linkUrl?: string) => {
    switch (type) {
      case 'bold':
        handleFormattingHotkey('**', '**', 'bold');
        break;
      case 'italic':
        handleFormattingHotkey('*', '*', 'italic');
        break;
      case 'underline':
        handleFormattingHotkey('__', '__', 'underline');
        break;
      case 'strike':
        handleFormattingHotkey('~~', '~~', 'strikethrough');
        break;
      case 'spoiler':
        handleFormattingHotkey('||', '||', 'spoiler');
        break;
      case 'quote':
        handleFormattingHotkey('> ', '', 'quote');
        break;
      case 'code':
        handleFormattingHotkey('`', '`', 'code');
        break;
      case 'link':
        if (linkUrl) {
          handleFormattingHotkey('[', `](${linkUrl})`, 'link');
        }
        break;
    }
    setFloatingToolbarPos(null);
  };

  const handleClipboardData = useCallback(
    (clipboardData: DataTransfer, e?: { preventDefault: () => void }) => {
      const items = clipboardData?.items;
      const pastedFiles: File[] = [];

      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
              let fileName = file.name;
              if (!fileName || fileName === 'image.png' || fileName === 'blob') {
                const ext = file.type.split('/')[1]?.replace('+xml', '') || 'png';
                fileName = `image_${Date.now()}_${i}.${ext}`;
              }
              const namedFile = new File([file], fileName, { type: file.type });
              pastedFiles.push(namedFile);
            }
          }
        }
      } else if (clipboardData?.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          pastedFiles.push(clipboardData.files[i]);
        }
      }

      if (pastedFiles.length > 0) {
        e?.preventDefault();

        if (!canSendMedia) return;

        // If editing a message with media, replace the media with the pasted image/video/file
        if (editingHasMedia) {
          const mediaFile =
            pastedFiles.find(
              (f) =>
                f.type.startsWith('image/') ||
                f.type.startsWith('video/') ||
                VIDEO_EXTENSIONS_REGEX.test(f.name) ||
                IMAGE_EXTENSIONS_REGEX.test(f.name),
            ) || pastedFiles[0];

          if (mediaFile) {
            const isVid =
              mediaFile.type.startsWith('video/') || VIDEO_EXTENSIONS_REGEX.test(mediaFile.name);
            const isImg =
              mediaFile.type.startsWith('image/') || IMAGE_EXTENSIONS_REGEX.test(mediaFile.name);
            const previewUrl = URL.createObjectURL(mediaFile);
            setReplacedMedia({
              file: mediaFile,
              previewUrl,
              type: isVid ? 'VIDEO' : isImg ? 'IMAGE' : 'FILE',
              name: mediaFile.name,
            });
            textareaRef.current?.focus();
            return;
          }
        }

        // Normal mode: attach files to composer
        onAddFiles(pastedFiles);
        textareaRef.current?.focus();
        return;
      }

      const pastedText = clipboardData?.getData('text');
      if (pastedText) {
        const snippet = detectCodeSnippet(pastedText);
        if (snippet.isCode) {
          setDetectedSnippet(snippet);
        }

        // If paste was triggered globally while textarea wasn't focused, insert text into composer
        if (document.activeElement !== textareaRef.current) {
          e?.preventDefault();
          handleTextChange(text ? `${text} ${pastedText}` : pastedText);
          textareaRef.current?.focus();
        }
      }
    },
    [canSendMedia, editingHasMedia, onAddFiles, text, handleTextChange],
  );

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    handleClipboardData(e.clipboardData, e);
  };

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (e.defaultPrevented) return;

      const active = document.activeElement;
      if (active) {
        if (active === textareaRef.current) return;
        const tag = active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if ((active as HTMLElement).isContentEditable) return;
        if (active.getAttribute('role') === 'textbox') return;
      }

      if (document.querySelector('[role="dialog"], [aria-modal="true"], .glass-modal')) return;
      if (!canAutoFocus) return;
      if (!e.clipboardData) return;

      handleClipboardData(e.clipboardData, e);
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [canAutoFocus, handleClipboardData]);

  const handleFormatSnippetAsMarkdown = () => {
    if (!detectedSnippet) return;
    const lang = detectedSnippet.language || '';
    const formatted = `\`\`\`${lang}\n${detectedSnippet.rawCode}\n\`\`\``;

    if (text.includes(detectedSnippet.rawCode)) {
      handleTextChange(text.replace(detectedSnippet.rawCode, formatted));
    } else {
      handleTextChange(text ? `${text}\n${formatted}` : formatted);
    }
    setDetectedSnippet(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleAttachSnippetAsFile = () => {
    if (!detectedSnippet) return;
    const extension = detectedSnippet.extension || 'txt';
    const file = new File([detectedSnippet.rawCode], `snippet.${extension}`, {
      type: 'text/plain;charset=utf-8',
    });
    onAddFiles([file]);

    if (text.includes(detectedSnippet.rawCode)) {
      handleTextChange(text.replace(detectedSnippet.rawCode, '').trim());
    } else if (text.trim() === detectedSnippet.rawCode.trim()) {
      handleTextChange('');
    }
    setDetectedSnippet(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleFormattingHotkey = (prefix: string, suffix: string, defaultPlaceholder = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = text.slice(start, end);
    const content = selected || defaultPlaceholder;
    const replacement = `${prefix}${content}${suffix}`;
    const nextText = text.slice(0, start) + replacement + text.slice(end);

    handleTextChange(nextText);

    requestAnimationFrame(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start + prefix.length, start + prefix.length + content.length);
      } else {
        el.setSelectionRange(
          start + prefix.length,
          start + prefix.length + defaultPlaceholder.length,
        );
      }
    });
  };

  const WRAP_PAIRS: Record<string, [string, string]> = {
    '"': ['"', '"'],
    "'": ["'", "'"],
    '`': ['`', '`'],
    '(': ['(', ')'],
    '[': ['[', ']'],
    '{': ['{', '}'],
    '<': ['<', '>'],
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;

    // Auto-Wrap Brackets & Quotes on selection
    if (
      el &&
      el.selectionStart !== null &&
      el.selectionEnd !== null &&
      el.selectionStart !== el.selectionEnd
    ) {
      const pair = WRAP_PAIRS[e.key];
      if (pair && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey(pair[0], pair[1]);
        return;
      }
    }

    const isCmdOrCtrl = e.ctrlKey || e.metaKey;

    if (isCmdOrCtrl) {
      const key = e.key.toLowerCase();
      // Ctrl+B / Cmd+B -> Bold
      if (key === 'b' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey('**', '**', 'bold');
        return;
      }
      // Ctrl+I / Cmd+I -> Italic
      if (key === 'i' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey('*', '*', 'italic');
        return;
      }
      // Ctrl+U / Cmd+U -> Underline
      if (key === 'u' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey('__', '__', 'underline');
        return;
      }
      // Ctrl+Shift+X / Cmd+Shift+X -> Strikethrough
      if (e.shiftKey && key === 'x') {
        e.preventDefault();
        handleFormattingHotkey('~~', '~~', 'strikethrough');
        return;
      }
      // Ctrl+Shift+C / Ctrl+Alt+C / Cmd+Shift+C -> Code Block
      if ((e.shiftKey && key === 'c') || (e.altKey && key === 'c')) {
        e.preventDefault();
        handleFormattingHotkey('```\n', '\n```', 'code');
        return;
      }
      // Ctrl+K / Cmd+K -> Link [text](url)
      if (key === 'k' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const start = el?.selectionStart ?? 0;
        const end = el?.selectionEnd ?? 0;
        const selected = text.slice(start, end);
        if (selected.startsWith('http://') || selected.startsWith('https://')) {
          handleFormattingHotkey('[link](', ')', '');
        } else {
          handleFormattingHotkey('[', '](https://)', selected ? '' : 'text');
        }
        return;
      }
    }

    if (e.key === 'Escape') {
      if (editingMessage) {
        e.preventDefault();
        e.stopPropagation();
        handleCancelEdit();
        return;
      }
      if (replyingTo) {
        e.preventDefault();
        e.stopPropagation();
        onCancelReply();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.repeat || isSendingRef.current || isSendingEffective) return;
      if (editingMessage) {
        handleSaveEdit();
      } else if (hasContent) {
        handleSend();
      }
    }
  };

  const remainingChars = MAX_MESSAGE_LENGTH - text.length;

  return (
    <div className="pt-2">
      {recordingError && (
        <div className="mx-4 mb-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-400/30 text-xs text-red-300 backdrop-blur-xl animate-fadeIn">
          {recordingError}
        </div>
      )}

      {sendError && (
        <div className="mx-4 mb-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 backdrop-blur-xl animate-fadeIn">
          {sendError}
        </div>
      )}

      {/* Voice Recorder Bar */}
      {recorder.recordState !== 'idle' && recorder.mode === 'voice' && (
        <VoiceRecorderBar
          recordState={recorder.recordState}
          duration={recorder.duration}
          liveAmplitudes={recorder.liveAmplitudes}
          previewPayload={recorder.previewPayload}
          dragOffset={recorder.dragOffset}
          onDiscard={recorder.discardRecording}
          onPausePreview={recorder.stopToPreview}
          onSend={recorder.stopAndSend}
        />
      )}

      {/* Video Note Recorder Circle */}
      {recorder.recordState !== 'idle' && recorder.mode === 'video' && (
        <VideoNoteRecorderCircle
          recordState={recorder.recordState}
          duration={recorder.duration}
          stream={recorder.stream}
          previewPayload={recorder.previewPayload}
          dragOffset={recorder.dragOffset}
          availableCameras={recorder.availableCameras}
          activeCameraId={recorder.activeCameraId}
          cameraToast={recorder.cameraToast}
          onToggleFacing={recorder.toggleFacingMode}
          onSelectCamera={recorder.switchCamera}
          onDiscard={recorder.discardRecording}
          onPausePreview={recorder.stopToPreview}
          onSend={recorder.stopAndSend}
        />
      )}

      {/* 1-Second Center Chat Screen Dissolving Mode Toast */}
      {recorder.modeToast && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <div
            className={`px-4 py-2.5 rounded-2xl bg-[#14151f]/90 border border-white/10 backdrop-blur-2xl text-white text-[13px] sm:text-sm font-medium shadow-[0_12px_40px_rgba(0,0,0,0.7)] select-none transition-all duration-300 ease-out ${
              recorder.modeToast.isFading
                ? 'opacity-0 scale-95'
                : 'opacity-100 scale-100 animate-popIn'
            }`}
          >
            {recorder.modeToast.text}
          </div>
        </div>
      )}

      {stagedFilesError && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/20 text-xs text-red-300 animate-fadeIn">
          {stagedFilesError}
        </div>
      )}

      {/* Live Link Preview Banner (Dismissable with X) */}
      {linkPreviewData && !isEmbedDismissed && (
        <LinkPreviewBanner data={linkPreviewData} onDismiss={handleDismissLinkPreview} />
      )}

      {/* Smart Code Snippet Paste Detection Banner */}
      {detectedSnippet && (
        <SmartCodePasteBanner
          snippet={detectedSnippet}
          onFormatMarkdown={handleFormatSnippetAsMarkdown}
          onAttachAsFile={handleAttachSnippetAsFile}
          onDismiss={() => setDetectedSnippet(null)}
        />
      )}

      {/* Compact Attachment Preview Bar */}
      {stagedFiles.length > 0 && (
        <div className="flex items-center gap-2 px-4 mb-2 overflow-x-auto custom-scrollbar">
          {stagedFiles.map((staged, index) => {
            const isVid =
              staged.file.type.startsWith('video/') ||
              VIDEO_EXTENSIONS_REGEX.test(staged.file.name);
            const isImg =
              staged.file.type.startsWith('image/') ||
              IMAGE_EXTENSIONS_REGEX.test(staged.file.name);
            const durationSec = staged.duration ?? videoDurations[staged.previewUrl] ?? 0;
            const progress = uploadProgressMap[staged.previewUrl];

            return (
              <div
                key={index}
                onClick={() => {
                  if (isImg) {
                    setEditingIndex(index);
                  } else if (isVid) {
                    setEditingVideoIndex(index);
                  } else {
                    setPreviewingDocumentIndex(index);
                  }
                }}
                className="group relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md shadow-md cursor-pointer hover:border-purple-400/50 hover:shadow-lg transition-all"
                title={
                  isImg
                    ? 'Click to edit image'
                    : isVid
                      ? 'Click to edit video'
                      : 'Click to preview document'
                }
              >
                {isImg ? (
                  <img
                    src={staged.previewUrl}
                    alt={staged.file.name}
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                  />
                ) : isVid ? (
                  <div className="relative w-full h-full">
                    <video
                      src={staged.previewUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      onLoadedMetadata={(e) => {
                        const d = e.currentTarget.duration;
                        if (d && !isNaN(d) && isFinite(d)) {
                          setVideoDurations((prev) => ({ ...prev, [staged.previewUrl]: d }));
                        }
                      }}
                    />
                    {/* Telegram Video Duration Glass Badge */}
                    <div className="absolute top-1 left-1 px-1 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-bold text-white flex items-center gap-0.5 shadow pointer-events-none z-10 leading-none">
                      <span>{formatVideoTime(durationSec)}</span>
                      {staged.isMuted && <VolumeX size={9} className="text-amber-300 ml-0.5" />}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-black/20 hover:bg-black/30 transition-colors">
                    <FileIconBadge
                      fileName={staged.file.name}
                      mimeType={staged.file.type}
                      size="sm"
                    />
                  </div>
                )}

                {/* Send as File Indicator */}
                {staged.sendAsFile && (
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-blue-600/80 text-[8px] font-bold text-white flex items-center gap-0.5 pointer-events-none z-10 shadow">
                    <FileText size={8} />
                  </div>
                )}

                {/* Spoiler Overlay Indicator */}
                {staged.isSpoiler && (
                  <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/80 border border-purple-400/40 text-[9px] font-bold text-purple-300 flex items-center gap-0.5 pointer-events-none z-10 shadow">
                    <EyeOff size={10} />
                    <span>Spoiler</span>
                  </div>
                )}

                {/* Telegram Circular Progress Loader while uploading / sending */}
                {(isSendingEffective || progress !== undefined) && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-20">
                    <CircularProgress
                      percent={progress ?? 47}
                      size={36}
                      strokeWidth={3}
                      color="#ffffff"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/75 hover:bg-black text-white text-[10px] transition-colors z-10 shadow cursor-pointer"
                  title="Remove attachment"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="w-full">
        <div
          className={`relative w-full flex flex-col rounded-2xl sm:rounded-[26px] overflow-visible transition-all duration-200 ${
            isLight
              ? 'border border-black/10 focus-within:border-black/25 shadow-[0_8px_30px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)] bg-white/95'
              : 'border border-white/15 focus-within:border-white/30 shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)]'
          } backdrop-blur-3xl ${isShaking ? 'animate-shake' : ''}`}
          style={{
            background: isLight
              ? 'rgba(255, 255, 255, 0.96)'
              : 'linear-gradient(135deg, rgba(20, 21, 30, 0.85) 0%, rgba(12, 13, 18, 0.92) 50%, rgba(18, 19, 27, 0.88) 100%)',
            backdropFilter: 'blur(40px) saturate(210%) brightness(105%)',
            WebkitBackdropFilter: 'blur(40px) saturate(210%) brightness(105%)',
          }}
        >
          {/* Specular Liquid Glass Top Reflection Sweep */}
          <div
            className={`absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent ${
              isLight ? 'via-black/10' : 'via-white/40'
            } to-transparent pointer-events-none rounded-t-full z-10`}
          />

          {/* Telegram-style Integrated Reply / Edit Bar Drawer */}
          <div
            className="w-full overflow-hidden rounded-t-2xl sm:rounded-t-[26px] transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              display: 'grid',
              gridTemplateRows: isEditOpen || isReplyOpen ? '1fr' : '0fr',
              opacity: isEditOpen || isReplyOpen ? 1 : 0,
            }}
          >
            <div className="min-h-0 overflow-hidden w-full rounded-t-2xl sm:rounded-t-[26px]">
              {activeEdit ? (
                <EditPreview
                  message={activeEdit}
                  onCancel={handleCancelEdit}
                  e2eePeerUserId={e2eePeerUserId}
                  replacedAttachment={
                    replacedMedia
                      ? {
                          id: 'replaced-preview',
                          type: replacedMedia.type,
                          url: replacedMedia.previewUrl,
                          fileName: replacedMedia.name,
                          mimeType: replacedMedia.file.type,
                          size: replacedMedia.file.size,
                          width: null,
                          height: null,
                          duration: null,
                          thumbnailUrl: null,
                        }
                      : null
                  }
                />
              ) : activeReply ? (
                <ReplyPreview
                  message={activeReply}
                  onCancel={onCancelReply}
                  e2eePeerUserId={e2eePeerUserId}
                />
              ) : null}
            </div>
          </div>

          {/* Main Input Row */}
          <div className="relative w-full flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-3 sm:py-1.5 min-h-11.5">
            <div className="relative shrink-0 flex items-center">
              {editingHasMedia ? (
                <div className="relative animate-fadeIn duration-200">
                  <button
                    type="button"
                    onClick={() => setIsReplaceMenuOpen((v) => !v)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                      isReplaceMenuOpen
                        ? 'bg-purple-500/20 text-purple-400 rotate-90 scale-105'
                        : isLight
                          ? 'text-gray-700 hover:text-gray-950 hover:bg-black/5'
                          : 'text-purple-400 hover:text-purple-300 hover:bg-white/10'
                    }`}
                    title="Replace media"
                    aria-label="Replace media"
                  >
                    <TelegramReplaceMediaIcon size={19} />
                  </button>

                  {/* Hidden File Pickers */}
                  <input
                    ref={replaceMediaInputRef}
                    type="file"
                    accept="image/*,video/*,.mp4,.mov,.mkv,.avi,.webm,.wmv,.3gp,.3g2,.mpeg,.mpg,.m4v"
                    className="hidden"
                    onChange={handlePickReplaceMedia}
                  />
                  <input
                    ref={replaceDocInputRef}
                    type="file"
                    accept="*/*"
                    className="hidden"
                    onChange={handlePickReplaceDoc}
                  />

                  {/* Popup Menu*/}
                  {isReplaceMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-transparent select-none cursor-default"
                        onClick={() => setIsReplaceMenuOpen(false)}
                      />
                      <div
                        role="menu"
                        className="absolute bottom-full mb-2 left-0 z-50 w-52 rounded-2xl bg-[#181926]/95 dark:bg-[#181926]/95 backdrop-blur-2xl border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.65)] py-1.5 px-1 flex flex-col animate-popIn duration-150 origin-bottom-left select-none"
                      >
                        {/* 3.1 Photo or Video */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsReplaceMenuOpen(false);
                            replaceMediaInputRef.current?.click();
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[13.5px] font-medium text-white/90 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-100 active:scale-[0.98] cursor-pointer text-left group"
                        >
                          <ImageIcon
                            size={18}
                            className="text-white/70 group-hover:text-white shrink-0 transition-colors"
                          />
                          <span>Photo or Video</span>
                        </button>

                        {/* 3.2 Document */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsReplaceMenuOpen(false);
                            replaceDocInputRef.current?.click();
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[13.5px] font-medium text-white/90 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-100 active:scale-[0.98] cursor-pointer text-left group"
                        >
                          <FileText
                            size={18}
                            className="text-white/70 group-hover:text-white shrink-0 transition-colors"
                          />
                          <span>Document</span>
                        </button>

                        {/* 3.3 Edit this photo (only if photo) */}
                        {isEditingPhoto && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsReplaceMenuOpen(false);
                              handleOpenPhotoEditor();
                            }}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[13.5px] font-medium text-white/90 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-100 active:scale-[0.98] cursor-pointer text-left group"
                          >
                            <Paintbrush
                              size={18}
                              className="text-white/70 group-hover:text-white shrink-0 transition-colors"
                            />
                            <span>Edit this photo</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <AttachMenu
                  isGroup={isGroup}
                  disabled={isSendingEffective || stagedFiles.length >= MAX_ATTACHMENTS_PER_MESSAGE}
                  canSendMedia={canSendMedia}
                  canSendPolls={canSendPolls}
                  onPickMedia={onAddFiles}
                  onPickFile={onAddFiles}
                  onTogglePoll={() => togglePopover('poll')}
                  buttonClassName={`w-8 h-8 rounded-full ${
                    isLight
                      ? 'text-gray-700 hover:text-gray-950 hover:bg-black/5'
                      : 'text-purple-400 hover:text-purple-300 hover:bg-white/10'
                  }`}
                  iconSize={18}
                />
              )}
              {openPopover === 'poll' && (
                <PollComposer
                  onClose={() => setOpenPopover(null)}
                  onCreatePoll={handleCreatePoll}
                />
              )}
            </div>

            <div className="relative flex-1 self-center min-h-[36px] flex items-center">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onScroll={handleTextareaScroll}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onSelect={updateSelectionToolbar}
                onKeyUp={updateSelectionToolbar}
                onMouseUp={updateSelectionToolbar}
                placeholder={
                  slowModeSecondsRemaining > 0
                    ? `Slow mode is active (${slowModeSecondsRemaining}s)`
                    : 'Message'
                }
                disabled={slowModeSecondsRemaining > 0}
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                style={{
                  maxHeight: MAX_TEXTAREA_HEIGHT,
                  scrollbarColor: isLight
                    ? 'rgba(0, 0, 0, 0.28) transparent'
                    : 'rgba(255, 255, 255, 0.14) transparent',
                }}
                className={`w-full bg-transparent text-sm focus:outline-none resize-none pt-[8.5px] pb-[7.5px] px-1 custom-scrollbar leading-5 self-center min-h-[36px] ${
                  hasEmoji
                    ? isLight
                      ? 'text-transparent caret-gray-950 placeholder:text-gray-500'
                      : 'text-transparent caret-white placeholder:text-gray-400'
                    : isLight
                      ? 'text-gray-950 placeholder:text-gray-500'
                      : 'text-white placeholder:text-gray-400'
                }`}
              />

              {hasEmoji && (
                <div
                  aria-hidden="true"
                  ref={backdropRef}
                  className={`pointer-events-none absolute inset-0 z-10 pt-[8.5px] pb-[7.5px] px-1 text-sm leading-5 font-normal select-none overflow-hidden whitespace-pre-wrap break-words ${
                    isLight ? 'text-gray-950' : 'text-white'
                  }`}
                  style={{
                    maxHeight: MAX_TEXTAREA_HEIGHT,
                    fontFamily: 'inherit',
                  }}
                >
                  {renderedBackdropContent}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Twitter-Style Progress Ring Limit Indicator */}
              {text.length >= WARN_THRESHOLD && (
                <div
                  data-testid="composer-limit-ring"
                  className="relative flex items-center justify-center w-6 h-6 mr-1"
                  title={`${remainingChars} characters remaining`}
                >
                  <svg className="w-6 h-6 -rotate-90 transform" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      fill="transparent"
                      stroke="rgba(255, 255, 255, 0.12)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      fill="transparent"
                      stroke={
                        text.length >= MAX_MESSAGE_LENGTH
                          ? '#f43f5e'
                          : text.length >= CRITICAL_THRESHOLD
                            ? '#f59e0b'
                            : '#a855f7'
                      }
                      strokeWidth="2.2"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={
                        CIRCUMFERENCE * (1 - Math.min(text.length / MAX_MESSAGE_LENGTH, 1))
                      }
                      strokeLinecap="round"
                      className="transition-all duration-150 ease-out"
                    />
                  </svg>
                  {text.length >= CRITICAL_THRESHOLD && (
                    <span
                      className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold select-none ${
                        text.length >= MAX_MESSAGE_LENGTH ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      {remainingChars}
                    </span>
                  )}
                </div>
              )}

              <AddEmojiButton
                isOpen={openPopover === 'emoji'}
                onToggle={() => togglePopover('emoji')}
                onEmojiSelect={handleEmojiSelect}
                usePortal={true}
                buttonClassName={
                  isLight ? 'text-gray-700 hover:text-gray-950 hover:bg-black/5' : undefined
                }
              />

              <AddGifButton
                isOpen={openPopover === 'gif'}
                disabled={!canSendMedia}
                title={canSendMedia ? 'Add GIF' : 'This action is restricted in this chat'}
                onToggle={() => togglePopover('gif')}
                onGifSelect={handleGifSelect}
                usePortal={true}
                buttonClassName={
                  isLight ? 'text-gray-700 hover:text-gray-950 hover:bg-black/5' : undefined
                }
              />

              {slowModeSecondsRemaining > 0 ? (
                <div
                  className="w-8 h-8 shrink-0 relative flex items-center justify-center rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-200 font-mono text-[11px] font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)] select-none"
                  title={`Slow mode active: wait ${slowModeSecondsRemaining}s`}
                >
                  <svg
                    className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                    viewBox="0 0 32 32"
                  >
                    <circle
                      cx="16"
                      cy="16"
                      r="13"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="13"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="2.5"
                      strokeDasharray={2 * Math.PI * 13}
                      strokeDashoffset={
                        2 * Math.PI * 13 * (1 - slowModeSecondsRemaining / (slowModeSeconds || 10))
                      }
                      strokeLinecap="round"
                      className="transition-all duration-1000 linear"
                    />
                  </svg>
                  <span>{slowModeSecondsRemaining}s</span>
                </div>
              ) : editingMessage ? (
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSendingEffective || isSendingRef.current}
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-linear-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-[0_0_14px_rgba(168,85,247,0.6)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Save changes (Enter)"
                >
                  <Check
                    size={18}
                    strokeWidth={2.8}
                    className={isSendingEffective ? 'animate-pulse' : ''}
                  />
                </button>
              ) : hasContent ? (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSendingEffective || isSendingRef.current}
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-linear-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-[0_0_14px_rgba(168,85,247,0.6)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Send message"
                >
                  <Send
                    size={14}
                    className={isSendingEffective ? 'animate-pulse' : 'translate-x-[0.5px]'}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onPointerDown={recorder.handlePointerDown}
                  onPointerMove={recorder.handlePointerMove}
                  onPointerUp={recorder.handlePointerUp}
                  onPointerCancel={recorder.discardRecording}
                  title={
                    !canSendVoice
                      ? 'Voice and video notes are restricted in this chat'
                      : recorder.mode === 'voice'
                        ? 'Hold to record voice message, click to switch to video'
                        : 'Hold to record video note, click to switch to voice'
                  }
                  disabled={!canSendVoice || isSendingEffective}
                  className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                    !canSendVoice
                      ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600'
                      : recorder.recordState !== 'idle'
                        ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] scale-110'
                        : isLight
                          ? 'text-gray-700 hover:text-gray-950 hover:bg-black/5'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div
                    className={`transition-transform duration-200 ${
                      recorder.mode === 'video' ? 'rotate-y-180' : ''
                    }`}
                  >
                    {recorder.mode === 'voice' ? <Mic size={18} /> : <Video size={18} />}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingIndex !== null && stagedFiles[editingIndex] && (
        <ImageEditorModal
          file={stagedFiles[editingIndex].file}
          initialSpoiler={stagedFiles[editingIndex].isSpoiler}
          onCancel={() => setEditingIndex(null)}
          onSave={(editedFile, isSpoiler) => {
            onReplaceFile(editingIndex, editedFile, isSpoiler);
            setEditingIndex(null);
          }}
        />
      )}

      {editingVideoIndex !== null && stagedFiles[editingVideoIndex] && (
        <VideoEditorModal
          file={stagedFiles[editingVideoIndex].file}
          previewUrl={stagedFiles[editingVideoIndex].previewUrl}
          initialDuration={
            stagedFiles[editingVideoIndex].duration ??
            videoDurations[stagedFiles[editingVideoIndex].previewUrl] ??
            0
          }
          initialSpoiler={stagedFiles[editingVideoIndex].isSpoiler}
          initialSendAsFile={stagedFiles[editingVideoIndex].sendAsFile}
          initialMuted={stagedFiles[editingVideoIndex].isMuted}
          initialTrim={
            stagedFiles[editingVideoIndex].trimStart !== undefined
              ? {
                  start: stagedFiles[editingVideoIndex].trimStart!,
                  end: stagedFiles[editingVideoIndex].trimEnd ?? 0,
                }
              : undefined
          }
          onCancel={() => setEditingVideoIndex(null)}
          onSave={(editedFile, meta) => {
            onReplaceFile(editingVideoIndex, editedFile, meta.isSpoiler, meta);
            setEditingVideoIndex(null);
          }}
          onSendDirectly={(editedFile, caption, meta) => {
            onReplaceFile(editingVideoIndex, editedFile, meta.isSpoiler, meta);
            setEditingVideoIndex(null);
            if (caption.trim()) {
              setText(caption);
            }
            setTimeout(() => {
              handleSend();
            }, 60);
          }}
        />
      )}

      {editingPhotoFile && (
        <ImageEditorModal
          file={editingPhotoFile}
          onCancel={() => setEditingPhotoFile(null)}
          onSave={(editedFile) => {
            const previewUrl = URL.createObjectURL(editedFile);
            setReplacedMedia({
              file: editedFile,
              previewUrl,
              type: 'IMAGE',
              name: editedFile.name,
            });
            setEditingPhotoFile(null);
          }}
        />
      )}

      {previewingDocumentIndex !== null && stagedFiles[previewingDocumentIndex] && (
        <DocumentPreviewModal
          fileOrUrl={stagedFiles[previewingDocumentIndex].file}
          onClose={() => setPreviewingDocumentIndex(null)}
          onSave={(editedFile) => {
            onReplaceFile(previewingDocumentIndex, editedFile);
          }}
          onSendDirectly={(editedFile) => {
            onReplaceFile(previewingDocumentIndex, editedFile);
            setPreviewingDocumentIndex(null);
            setTimeout(() => {
              handleSend();
            }, 60);
          }}
        />
      )}

      {floatingToolbarPos && (
        <FloatingSelectionToolbar
          position={floatingToolbarPos}
          usePortal={true}
          onFormat={handleSelectionFormat}
          onClose={() => setFloatingToolbarPos(null)}
        />
      )}
    </div>
  );
}
