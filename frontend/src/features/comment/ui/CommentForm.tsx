import React, { useState, useRef } from 'react';
import { Send, Image, X } from 'lucide-react';
import { AddEmojiButton } from '../../../shared/ui/AddEmojiButton';
import { MentionAutocomplete } from '../../posts/ui/MentionAutocomplete';
import SmartCodePasteBanner from '@/features/chat/ui/SmartCodePasteBanner';
import FloatingSelectionToolbar, {
  SelectionFormatType,
} from '@/features/chat/ui/FloatingSelectionToolbar';
import { detectCodeSnippet, DetectedCodeSnippet } from '@/features/chat/lib/smartCodeDetection';

interface CommentFormProps {
  currentUserHandle: string;
  onSubmitComment?: (text: string, images?: string[]) => void;
  isSubmitting?: boolean;
}

const WRAP_PAIRS: Record<string, [string, string]> = {
  '"': ['"', '"'],
  "'": ["'", "'"],
  '`': ['`', '`'],
  '(': ['(', ')'],
  '[': ['[', ']'],
  '{': ['{', '}'],
  '<': ['<', '>'],
};

export function CommentForm({
  currentUserHandle,
  onSubmitComment,
  isSubmitting = false,
}: CommentFormProps) {
  const [text, setText] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [detectedSnippet, setDetectedSnippet] = useState<DetectedCodeSnippet | null>(null);
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
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
    const textToWrap = selected || defaultPlaceholder;
    const replacement = `${prefix}${textToWrap}${suffix}`;
    const nextText = text.slice(0, start) + replacement + text.slice(end);

    setText(nextText);
    setCursorPos(start + replacement.length);

    requestAnimationFrame(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start + prefix.length, start + prefix.length + textToWrap.length);
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

  const handleCommentSubmit = () => {
    if (!text.trim() && images.length === 0) return;

    if (onSubmitComment) {
      onSubmitComment(text.trim(), images);
    }

    setText('');
    setImages([]);
    setIsEmojiOpen(false);
    setDetectedSnippet(null);
    setFloatingToolbarPos(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCommentSubmit();
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

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommentSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).map((file) => URL.createObjectURL(file));
      setImages((prev) => [...prev, ...filesArray]);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 mt-2 w-full relative"
    >
      {detectedSnippet && (
        <SmartCodePasteBanner
          snippet={detectedSnippet}
          onFormatMarkdown={handleFormatSnippetAsMarkdown}
          onAttachAsFile={() => {
            handleFormatSnippetAsMarkdown();
          }}
          onDismiss={() => setDetectedSnippet(null)}
        />
      )}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-white/[0.01] border border-white/[0.04] rounded-2xl">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="relative group w-16 h-16 rounded-xl overflow-hidden border border-white/[0.1]"
            >
              <img src={url} className="w-full h-full object-cover" alt="preview" />
              <button
                type="button"
                onClick={() => setImages(images.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 bg-black/75 p-0.5 rounded-full text-white transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <MentionAutocomplete text={text} cursorPos={cursorPos} onSelect={handleMentionSelect} />

      <div className="flex gap-3 items-end">
        <div className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-2 flex items-end gap-2 focus-within:border-white/[0.2] transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={`Comment as ${currentUserHandle}...`}
            value={text}
            onChange={handleTextChange}
            onKeyUp={handleCursorMove}
            onClick={handleCursorMove}
            onSelect={updateSelectionToolbar}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none resize-none max-h-24 py-1 custom-scrollbar min-h-[24px]"
          />
          <div className="flex items-center gap-2 text-gray-400 pb-0.5">
            <AddEmojiButton
              isOpen={isEmojiOpen}
              onToggle={() => setIsEmojiOpen(!isEmojiOpen)}
              onEmojiSelect={(emoji) => {
                setText((prev) => prev + emoji);
                setCursorPos((prev) => prev + emoji.length);
              }}
              usePortal={true}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-white transition-colors cursor-pointer"
            >
              <Image size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={(!text.trim() && images.length === 0) || isSubmitting}
          className="text-blue-500 hover:text-blue-400 disabled:opacity-20 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] p-3 mb-1 rounded-xl transition-all cursor-pointer flex items-center justify-center h-[50px] w-[50px]"
        >
          <Send size={20} />
        </button>
      </div>

      {floatingToolbarPos && (
        <FloatingSelectionToolbar
          position={floatingToolbarPos}
          onFormat={handleSelectionFormat}
          onClose={() => setFloatingToolbarPos(null)}
        />
      )}
    </form>
  );
}
