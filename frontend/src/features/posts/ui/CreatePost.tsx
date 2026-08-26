import React, { useState, useRef } from 'react';
import { X, Loader2, AlertCircle, Eye, Edit3 } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { PollCreator } from './PollCreator';
import { AddFileButton } from './AddFileButton';
import { AddEmojiButton } from '../../../shared/ui/AddEmojiButton';
import { AddGifButton } from '../../../shared/ui/AddGifButton';
import { AddPollButton } from './AddPollButton';
import { MentionAutocomplete } from './MentionAutocomplete';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { PollOptionDraft, MediaDraft } from '../model/types';
import { compressMediaFiles } from '@/shared/lib/compressImage';
import { PostType, PostMedia } from '@/entities/post/model/types';
import MarkdownContent from '@/shared/ui/MarkdownContent';
import SmartCodePasteBanner from '@/features/chat/ui/SmartCodePasteBanner';
import FloatingSelectionToolbar, {
  SelectionFormatType,
} from '@/features/chat/ui/FloatingSelectionToolbar';
import { detectCodeSnippet, DetectedCodeSnippet } from '@/features/chat/lib/smartCodeDetection';

const MAX_MEDIA = 5;

const emptyPollOptions = (): PollOptionDraft[] => [
  { id: crypto.randomUUID(), text: '' },
  { id: crypto.randomUUID(), text: '' },
];

const WRAP_PAIRS: Record<string, [string, string]> = {
  '"': ['"', '"'],
  "'": ["'", "'"],
  '`': ['`', '`'],
  '(': ['(', ')'],
  '[': ['[', ']'],
  '{': ['{', '}'],
  '<': ['<', '>'],
};

interface CreatePostProps {
  onSubmitFormData: (fd: FormData, optimisticPost?: Partial<PostType>) => void | Promise<unknown>;
  isPending?: boolean;
}

export default function CreatePost({ onSubmitFormData, isPending = false }: CreatePostProps) {
  const { data: currentUser } = useCurrentUser();
  const [text, setText] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [activeMenu, setActiveMenu] = useState<'emoji' | 'gif' | null>(null);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<PollOptionDraft[]>(emptyPollOptions());
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedSnippet, setDetectedSnippet] = useState<DetectedCodeSnippet | null>(null);
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canAddMore = media.length < MAX_MEDIA;
  const isBusy = isPending || isCompressing;

  const handleFilesSelect = async (files: File[]) => {
    const room = MAX_MEDIA - media.length;
    const selected = files.slice(0, room);
    if (selected.length === 0) return;

    try {
      setIsCompressing(true);
      const compressed = await compressMediaFiles(selected);
      const accepted = compressed.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setMedia((prev) => [...prev, ...accepted]);
    } catch {
      // Fallback: use original files if compression fails
      const accepted = selected.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setMedia((prev) => [...prev, ...accepted]);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    if (!canAddMore) return;
    setMedia((prev) => [...prev, { gifUrl, previewUrl: gifUrl }]);
    setActiveMenu(null);
  };

  const removeMedia = (idx: number) => setMedia((prev) => prev.filter((_, i) => i !== idx));

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
    if (errorMessage) setErrorMessage(null);
  };

  const handleCursorMove = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPos(target.selectionStart || 0);
    updateSelectionToolbar();
  };

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

  const handleFormattingHotkey = (prefix: string, suffix: string, defaultPlaceholder = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = text.slice(start, end);
    const content = selected || defaultPlaceholder;
    const replacement = `${prefix}${content}${suffix}`;
    const nextText = text.slice(0, start) + replacement + text.slice(end);

    setText(nextText);
    setCursorPos(start + replacement.length);

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
      setText((prev) => prev.replace(detectedSnippet.rawCode, formatted));
    } else {
      setText((prev) => (prev ? `${prev}\n${formatted}` : formatted));
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
    handleFilesSelect([file]);

    if (text.includes(detectedSnippet.rawCode)) {
      setText((prev) => prev.replace(detectedSnippet.rawCode, '').trim());
    } else if (text.trim() === detectedSnippet.rawCode.trim()) {
      setText('');
    }
    setDetectedSnippet(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
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
      if (key === 'b' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey('**', '**', 'bold');
        return;
      }
      if (key === 'i' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey('*', '*', 'italic');
        return;
      }
      if (key === 'u' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleFormattingHotkey('__', '__', 'underline');
        return;
      }
      if (e.shiftKey && key === 'x') {
        e.preventDefault();
        handleFormattingHotkey('~~', '~~', 'strikethrough');
        return;
      }
      if ((e.shiftKey && key === 'c') || (e.altKey && key === 'c')) {
        e.preventDefault();
        handleFormattingHotkey('```\n', '\n```', 'code');
        return;
      }
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
  };

  const handleMentionSelect = (newText: string, newPos: number) => {
    setText(newText);
    setCursorPos(newPos);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  const handleSubmit = async () => {
    if ((!text.trim() && media.length === 0) || isBusy) return;

    setErrorMessage(null);

    const fd = new FormData();
    fd.append('content', text.trim());

    const optimisticMedia: PostMedia[] = [];

    media.forEach((m) => {
      if (m.file) {
        fd.append('media', m.file);
        optimisticMedia.push({
          type: m.file.type.startsWith('video') ? 'video' : 'image',
          url: m.previewUrl,
        });
      } else if (m.gifUrl) {
        fd.append('gifUrls', m.gifUrl);
        optimisticMedia.push({
          type: 'image',
          url: m.gifUrl,
        });
      }
    });

    const validOptions = pollOptions.map((o) => o.text.trim()).filter(Boolean);
    let optimisticPoll = null;

    if (showPoll && validOptions.length >= 2) {
      fd.append('poll', JSON.stringify(validOptions));
      optimisticPoll = {
        id: `poll-temp-${Date.now()}`,
        totalVotes: 0,
        myVoteOptionId: null,
        options: validOptions.map((optText, i) => ({
          id: `opt-${i}`,
          text: optText,
          votes: 0,
        })),
      };
    }

    try {
      await onSubmitFormData(fd, {
        media: optimisticMedia,
        poll: optimisticPoll,
      });

      setText('');
      setMedia([]);
      setShowPoll(false);
      setActiveMenu(null);
      setPollOptions(emptyPollOptions());
      setActiveTab('write');
    } catch {
      setErrorMessage('Failed to publish post. Please check your connection and try again.');
    }
  };

  return (
    <div className="w-full bg-[#111111] border border-white/[0.05] rounded-3xl p-4 flex flex-col gap-3 relative">
      {errorMessage && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-300 font-bold ml-2 cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Write vs Preview Toggle Bar */}
      <div className="flex items-center justify-between pb-1 border-b border-white/5">
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'write'
                ? 'bg-purple-600/70 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Edit3 size={12} />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-purple-600/70 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye size={12} />
            <span>Preview</span>
          </button>
        </div>

        {activeTab === 'preview' && (
          <span className="text-[11px] font-mono text-purple-300/70">
            Markdown & Math Live Preview
          </span>
        )}
      </div>

      {detectedSnippet && (
        <SmartCodePasteBanner
          snippet={detectedSnippet}
          onFormatMarkdown={handleFormatSnippetAsMarkdown}
          onAttachAsFile={handleAttachSnippetAsFile}
          onDismiss={() => setDetectedSnippet(null)}
        />
      )}

      <div className="flex gap-4 items-start">
        <Avatar size="md" src={currentUser?.avatar} />
        <div className="flex-1 flex flex-col gap-3 relative min-w-0">
          {activeTab === 'write' ? (
            <>
              <textarea
                id="create-post-textarea"
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onSelect={updateSelectionToolbar}
                onKeyUp={handleCursorMove}
                onClick={handleCursorMove}
                placeholder="What's new?"
                disabled={isBusy}
                className="w-full bg-transparent resize-none text-white placeholder-gray-500 focus:outline-none text-[15px] min-h-[65px] pt-2 disabled:opacity-60 leading-relaxed"
              />
              <MentionAutocomplete
                text={text}
                cursorPos={cursorPos}
                onSelect={handleMentionSelect}
              />
            </>
          ) : (
            <div className="min-h-[65px] p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-gray-200 text-[15px] leading-relaxed">
              {text.trim() ? (
                <MarkdownContent content={text} />
              ) : (
                <p className="text-gray-500 italic text-sm">
                  Nothing to preview yet. Start typing markdown...
                </p>
              )}
            </div>
          )}

          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {media.map((m, idx) => (
                <div
                  key={idx}
                  className="relative rounded-2xl overflow-hidden border border-white/10 aspect-square group"
                >
                  {m.file?.type.startsWith('video') ? (
                    <video src={m.previewUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={m.previewUrl} alt="preview" className="w-full h-full object-cover" />
                  )}
                  {!isBusy && (
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 p-1 rounded-full text-white transition-all cursor-pointer"
                      aria-label="Remove media"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PollCreator
        isOpen={showPoll}
        options={pollOptions}
        onChange={setPollOptions}
        onClose={() => setShowPoll(false)}
      />

      <div className="h-px bg-white/5 w-full mt-2" />

      <div className="flex justify-between items-center relative">
        <div className="flex gap-1 -ml-2">
          <AddFileButton
            onFilesSelect={handleFilesSelect}
            disabled={!canAddMore || isBusy}
            multiple
          />
          <AddEmojiButton
            isOpen={activeMenu === 'emoji'}
            onToggle={() => setActiveMenu((v) => (v === 'emoji' ? null : 'emoji'))}
            onEmojiSelect={(e) => {
              setText((p) => p + e);
              setCursorPos((p) => p + e.length);
            }}
            usePortal={true}
          />
          <AddGifButton
            isOpen={activeMenu === 'gif'}
            onToggle={() => setActiveMenu((v) => (v === 'gif' ? null : 'gif'))}
            onGifSelect={handleGifSelect}
            usePortal={true}
          />
          <AddPollButton isOpen={showPoll} onToggle={() => setShowPoll((v) => !v)} />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={(!text.trim() && media.length === 0) || isBusy}
          className="flex items-center gap-1.5 bg-white text-black font-bold px-5 py-1.5 rounded-full hover:bg-gray-200 disabled:opacity-40 transition-all text-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {isBusy && <Loader2 size={14} className="animate-spin" />}
          {isBusy ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      {floatingToolbarPos && activeTab === 'write' && (
        <FloatingSelectionToolbar
          position={floatingToolbarPos}
          onFormat={handleSelectionFormat}
          onClose={() => setFloatingToolbarPos(null)}
        />
      )}
    </div>
  );
}
