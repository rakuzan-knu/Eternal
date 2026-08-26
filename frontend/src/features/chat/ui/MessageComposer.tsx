import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, Mic, Video, Send, FileImage as FileIcon, EyeOff } from 'lucide-react';
import { MessageView } from '../../../entities/chat/model/types';
import { useMessageActions } from '../model/useMessageActions';
import { OutgoingAttachment } from '../../../entities/chat/model/types';
import { StagedFile } from '@/shared/model/useStagedAttachments';
import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/shared/lib/attachmentLimits';
import ReplyPreview from './ReplyPreview';
import { AddEmojiButton } from '@/shared/ui/AddEmojiButton';
import { AddGifButton } from '@/shared/ui/AddGifButton';
import PollComposer from './PollComposer';
import AttachMenu from '@/shared/ui/AttachMenu';
import ImageEditorModal from '@/shared/ui/ImageEditorModal';
import { useChatDraftsStore } from '../model/useChatDraftsStore';
import { useMediaRecorderGesture, RecordedPayload } from '../model/useMediaRecorderGesture';
import VoiceRecorderBar from './VoiceRecorderBar';
import VideoNoteRecorderCircle from './VideoNoteRecorderCircle';
import SmartCodePasteBanner from './SmartCodePasteBanner';
import FloatingSelectionToolbar, { SelectionFormatType } from './FloatingSelectionToolbar';
import { detectCodeSnippet, DetectedCodeSnippet } from '../lib/smartCodeDetection';
import { extractFirstUrl } from '@/shared/lib/urlUtils';
import { useLinkPreview } from '@/entities/opengraph/model/useLinkPreview';
import { LinkPreviewBanner } from './LinkPreviewBanner';

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
  stagedFiles: StagedFile[];
  stagedFilesError: string | null;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onReplaceFile: (index: number, file: File, isSpoiler?: boolean) => void;
  onClearFiles: () => void;
  onDismissFilesError: () => void;
  isGroup: boolean;
  permissions?: ChatPermissions;
  slowModeSeconds?: number;
}

type OpenPopover = 'emoji' | 'gif' | 'poll' | null;

const MIN_TEXTAREA_HEIGHT = 44;
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
  stagedFiles,
  stagedFilesError,
  onAddFiles,
  onRemoveFile,
  onReplaceFile,
  onClearFiles,
  onDismissFilesError,
  isGroup,
  permissions = { canSendMedia: true, canSendVoice: true, canSendPolls: true },
  slowModeSeconds = 0,
}: MessageComposerProps) {
  const [text, setText] = useState(() => {
    const draft = useChatDraftsStore.getState().getDraft(conversationId);
    return draft?.text || '';
  });
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [isSending, setIsSending] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [slowModeSecondsRemaining, setSlowModeSecondsRemaining] = useState<number>(0);
  const [debouncedUrl, setDebouncedUrl] = useState<string | null>(null);
  const [dismissedUrls, setDismissedUrls] = useState<Set<string>>(() => new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const canSendMedia = permissions.canSendMedia ?? true;
  const canSendVoice = permissions.canSendVoice ?? true;
  const canSendPolls = permissions.canSendPolls ?? true;

  const hasContent = text.trim().length > 0 || stagedFiles.length > 0;

  const handleSendRecordedMedia = async (payload: RecordedPayload) => {
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
            mimeType: payload.file.type || (payload.mode === 'voice' ? 'audio/webm' : 'video/webm'),
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
      setIsSending(false);
    }
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

  // Restore draft when switching conversation
  useEffect(() => {
    if (!conversationId) return;
    const draft = useChatDraftsStore.getState().getDraft(conversationId);
    if (draft) {
      setText(draft.text || '');
      if (draft.replyingTo && !replyingToRef.current) {
        onSetReplyingToRef.current?.(draft.replyingTo);
      }
    } else {
      setText('');
    }
  }, [conversationId]);

  // Sync draft to store
  useEffect(() => {
    if (!conversationId) return;
    const timeout = setTimeout(() => {
      useChatDraftsStore.getState().setDraft(conversationId, text, replyingTo);
    }, 150);
    return () => clearTimeout(timeout);
  }, [conversationId, text, replyingTo]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, MIN_TEXTAREA_HEIGHT), MAX_TEXTAREA_HEIGHT);
    el.style.height = `${next}px`;
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

  const handleSend = async () => {
    if (!hasContent) return;

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

    try {
      setIsSending(true);
      let attachments: OutgoingAttachment[] | undefined;

      if (filesToSend.length > 0) {
        attachments = await Promise.all(
          filesToSend.map(async (staged) => {
            try {
              const uploaded = await actions.uploadAttachment(staged.file);
              return {
                ...uploaded,
                isSpoiler: staged.isSpoiler,
              };
            } catch {
              // Resilient data URL fallback if server upload endpoint encounters an issue
              const reader = new FileReader();
              const dataUrlPromise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => resolve(staged.previewUrl);
              });
              reader.readAsDataURL(staged.file);
              const dataUrl = await dataUrlPromise;
              return {
                url: dataUrl,
                type: staged.file.type.startsWith('image/')
                  ? ('IMAGE' as const)
                  : staged.file.type.startsWith('video/')
                    ? ('VIDEO' as const)
                    : staged.file.type.startsWith('audio/')
                      ? ('AUDIO' as const)
                      : ('FILE' as const),
                fileName: staged.file.name,
                mimeType: staged.file.type,
                size: staged.file.size,
                isSpoiler: staged.isSpoiler,
              };
            }
          }),
        );
      }

      await actions.sendMessage(textToSend, replyToSend?.id, attachments);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const [detectedSnippet, setDetectedSnippet] = useState<DetectedCodeSnippet | null>(null);
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const updateSelectionToolbar = () => {
    const el = textareaRef.current;
    if (!el) {
      setFloatingToolbarPos(null);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (
      start !== null &&
      end !== null &&
      start !== end &&
      el.value.slice(start, end).trim().length > 0
    ) {
      const rect = el.getBoundingClientRect();
      setFloatingToolbarPos({
        top: rect.top - 46,
        left: rect.left + rect.width / 2,
      });
    } else {
      setFloatingToolbarPos(null);
    }
  };

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

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      const snippet = detectCodeSnippet(pastedText);
      if (snippet.isCode) {
        setDetectedSnippet(snippet);
      }
    }
  };

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

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (hasContent) {
        handleSend();
      }
    }
  };

  const remainingChars = MAX_MESSAGE_LENGTH - text.length;

  return (
    <div className="pt-2">
      {replyingTo && <ReplyPreview message={replyingTo} onCancel={onCancelReply} />}

      {recordingError && (
        <div className="mx-4 mb-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-400/30 text-xs text-red-300 backdrop-blur-xl animate-fadeIn">
          {recordingError}
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
          {stagedFiles.map((staged, index) => (
            <div
              key={index}
              onClick={() => {
                if (staged.file.type.startsWith('image/')) {
                  setEditingIndex(index);
                }
              }}
              className={`group relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md shadow-md ${
                staged.file.type.startsWith('image/')
                  ? 'cursor-pointer hover:border-purple-400/50 hover:shadow-lg transition-all'
                  : ''
              }`}
              title={staged.file.type.startsWith('image/') ? 'Click to edit image' : undefined}
            >
              {staged.file.type.startsWith('image/') ? (
                <img
                  src={staged.previewUrl}
                  alt={staged.file.name}
                  className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                />
              ) : staged.file.type.startsWith('video/') ? (
                <video src={staged.previewUrl} className="w-full h-full object-cover" muted />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <FileIcon size={18} />
                </div>
              )}

              {staged.isSpoiler && (
                <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/80 border border-purple-400/40 text-[9px] font-bold text-purple-300 flex items-center gap-0.5 pointer-events-none z-10 shadow">
                  <EyeOff size={10} />
                  <span>Spoiler</span>
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
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-4 pb-4">
        <div className="relative pb-0.5 flex-shrink-0">
          <AttachMenu
            isGroup={isGroup}
            disabled={isSending || stagedFiles.length >= MAX_ATTACHMENTS_PER_MESSAGE}
            canSendMedia={canSendMedia}
            canSendPolls={canSendPolls}
            onPickMedia={onAddFiles}
            onPickFile={onAddFiles}
            onTogglePoll={() => togglePopover('poll')}
          />
          {openPopover === 'poll' && (
            <PollComposer onClose={() => setOpenPopover(null)} onCreatePoll={handleCreatePoll} />
          )}
        </div>

        <div
          className={`flex-1 flex items-end gap-2 bg-white/5 border border-white/5 rounded-3xl pl-4 pr-2 py-1 min-h-[44px] transition-transform ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
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
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none resize-none py-2 custom-scrollbar leading-normal"
          />

          <div className="flex items-center gap-1 pb-1 flex-shrink-0">
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
            />

            <AddGifButton
              isOpen={openPopover === 'gif'}
              disabled={!canSendMedia}
              title={canSendMedia ? 'Add GIF' : 'This action is restricted in this chat'}
              onToggle={() => togglePopover('gif')}
              onGifSelect={handleGifSelect}
              usePortal={true}
            />

            {slowModeSecondsRemaining > 0 ? (
              <div
                className="w-8 h-8 flex-shrink-0 relative flex items-center justify-center rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-200 font-mono text-[11px] font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)] select-none"
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
            ) : hasContent ? (
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-[0_0_14px_rgba(168,85,247,0.6)] transition-all active:scale-95 disabled:opacity-50"
                title="Send message"
              >
                <Send size={14} className={isSending ? 'animate-pulse' : 'translate-x-[0.5px]'} />
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
                disabled={!canSendVoice || isSending}
                className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                  !canSendVoice
                    ? 'opacity-40 cursor-not-allowed text-gray-600'
                    : recorder.recordState !== 'idle'
                      ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] scale-110'
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

      {floatingToolbarPos && (
        <FloatingSelectionToolbar
          position={floatingToolbarPos}
          onFormat={handleSelectionFormat}
          onClose={() => setFloatingToolbarPos(null)}
        />
      )}
    </div>
  );
}
