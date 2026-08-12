import React, { useState } from 'react';
import { X } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { PollCreator } from './PollCreator';
import { AddFileButton } from './AddFileButton';
import { AddEmojiButton } from '../../../shared/ui/AddEmojiButton';
import { AddGifButton } from '../../../shared/ui/AddGifButton';
import { AddPollButton } from './AddPollButton';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { PollOptionDraft, MediaDraft } from '../model/types';

const MAX_MEDIA = 5;

const emptyPollOptions = (): PollOptionDraft[] => [
  { id: crypto.randomUUID(), text: '' },
  { id: crypto.randomUUID(), text: '' },
];

export default function CreatePost({
  onSubmitFormData,
}: {
  onSubmitFormData: (fd: FormData) => void;
}) {
  const { data: currentUser } = useCurrentUser();
  const [text, setText] = useState('');
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [activeMenu, setActiveMenu] = useState<'emoji' | 'gif' | null>(null);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<PollOptionDraft[]>(emptyPollOptions());

  const canAddMore = media.length < MAX_MEDIA;

  const handleFilesSelect = (files: File[]) => {
    const room = MAX_MEDIA - media.length;
    const accepted = files
      .slice(0, room)
      .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setMedia((prev) => [...prev, ...accepted]);
  };

  const handleGifSelect = (gifUrl: string) => {
    if (!canAddMore) return;
    setMedia((prev) => [...prev, { gifUrl, previewUrl: gifUrl }]);
    setActiveMenu(null);
  };

  const removeMedia = (idx: number) => setMedia((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!text.trim() && media.length === 0) return;

    const fd = new FormData();
    fd.append('content', text.trim());
    media.forEach((m) => {
      if (m.file) fd.append('media', m.file);
      else if (m.gifUrl) fd.append('gifUrls', m.gifUrl);
    });

    const validOptions = pollOptions.map((o) => o.text.trim()).filter(Boolean);
    if (showPoll && validOptions.length >= 2) {
      fd.append('poll', JSON.stringify(validOptions));
    }

    onSubmitFormData(fd);

    setText('');
    setMedia([]);
    setShowPoll(false);
    setActiveMenu(null);
    setPollOptions(emptyPollOptions());
  };

  return (
    <div className="w-full bg-[#111111] border border-white/[0.05] rounded-3xl p-4 flex flex-col gap-3">
      <div className="flex gap-4 items-start">
        <Avatar size="md" src={currentUser?.avatar} />
        <div className="flex-1 flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Що нового?"
            className="w-full bg-transparent resize-none text-white placeholder-gray-500 focus:outline-none text-[15px] min-h-[50px] pt-2"
          />

          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {media.map((m, idx) => (
                <div
                  key={idx}
                  className="relative rounded-2xl overflow-hidden border border-white/10 aspect-square"
                >
                  {m.file?.type.startsWith('video') ? (
                    <video src={m.previewUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={m.previewUrl} alt="preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(idx)}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 p-1 rounded-full text-white transition-all cursor-pointer"
                  >
                    <X size={14} />
                  </button>
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
          <AddFileButton onFilesSelect={handleFilesSelect} disabled={!canAddMore} multiple />
          <AddEmojiButton
            isOpen={activeMenu === 'emoji'}
            onToggle={() => setActiveMenu((v) => (v === 'emoji' ? null : 'emoji'))}
            onEmojiSelect={(e) => setText((p) => p + e)}
          />
          <AddGifButton
            isOpen={activeMenu === 'gif'}
            onToggle={() => setActiveMenu((v) => (v === 'gif' ? null : 'gif'))}
            onGifSelect={handleGifSelect}
          />
          <AddPollButton isOpen={showPoll} onToggle={() => setShowPoll((v) => !v)} />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() && media.length === 0}
          className="bg-white text-black font-bold px-5 py-1.5 rounded-full hover:bg-gray-200 disabled:opacity-40 transition-all text-sm"
        >
          Опублікувати
        </button>
      </div>
    </div>
  );
}
