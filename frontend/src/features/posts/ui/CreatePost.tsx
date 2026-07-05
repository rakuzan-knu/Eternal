import React, { useState } from 'react';
import { X } from 'lucide-react';

import Avatar from '../../../shared/ui/Avatar';
import { PollCreator } from './PollCreator';
import { AddFileButton } from './AddFileButton';
import { AddEmojiButton } from './AddEmojiButton';
import { AddGifButton } from './AddGifButton';
import { AddPollButton } from './AddPollButton';

export interface PostSubmitData {
  text: string;
  image: string | null;
  gif: string | null;
  poll: { option1: string; option2: string } | null;
}

export default function CreatePost({
  onPostSubmit,
}: {
  onPostSubmit: (data: PostSubmitData) => void;
}) {
  const [text, setText] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<'emoji' | 'gif' | null>(null);
  const [showPoll, setShowPoll] = useState<boolean>(false);
  const [pollOptions, setPollOptions] = useState({ option1: '', option2: '' });

  const handleImageSelect = (image: string) => {
    setImagePreview(image);
    setSelectedGif(null);
  };

  const handleGifSelect = (gifUrl: string) => {
    setSelectedGif(gifUrl);
    setImagePreview(null);
    setActiveMenu(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  const toggleMenu = (menu: 'emoji' | 'gif') => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const handleSubmit = () => {
    if (!text.trim() && !imagePreview && !selectedGif) return;

    onPostSubmit({
      text,
      image: imagePreview,
      gif: selectedGif,
      poll: showPoll ? pollOptions : null,
    });

    setText('');
    setImagePreview(null);
    setSelectedGif(null);
    setShowPoll(false);
    setActiveMenu(null);
    setPollOptions({ option1: '', option2: '' });
  };

  return (
    <div className="w-full bg-[#111111] border border-white/[0.05] rounded-3xl p-4 flex flex-col gap-3">
      <div className="flex gap-4 items-start">
        <Avatar size="md" emoji="💀" />
        <div className="flex-1 flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Що нового?"
            className="w-full bg-transparent resize-none text-white placeholder-gray-500 focus:outline-none text-[15px] min-h-[50px] pt-2"
          />

          {imagePreview && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-[350px]">
              <img src={imagePreview} alt="Upload preview" className="w-full h-full object-cover" />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 p-1.5 rounded-full text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {selectedGif && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-[350px]">
              <img src={selectedGif} alt="GIF preview" className="w-full h-full object-cover" />
              <button
                onClick={() => setSelectedGif(null)}
                className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 p-1.5 rounded-full text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <PollCreator
            isOpen={showPoll}
            options={pollOptions}
            onChange={setPollOptions}
            onClose={() => setShowPoll(false)}
          />
        </div>
      </div>

      <div className="h-px bg-white/5 w-full mt-2" />

      <div className="flex justify-between items-center relative">
        <div className="flex gap-1 -ml-2">
          <AddFileButton onImageSelect={handleImageSelect} />
          <AddEmojiButton
            isOpen={activeMenu === 'emoji'}
            onToggle={() => toggleMenu('emoji')}
            onEmojiSelect={handleEmojiSelect}
          />
          <AddGifButton
            isOpen={activeMenu === 'gif'}
            onToggle={() => toggleMenu('gif')}
            onGifSelect={handleGifSelect}
          />
          <AddPollButton isOpen={showPoll} onToggle={() => setShowPoll((prev) => !prev)} />
        </div>
        <button
          onClick={handleSubmit}
          className="bg-white text-black font-bold px-5 py-1.5 rounded-full hover:bg-gray-200 transition-all text-sm"
        >
          Опублікувати
        </button>
      </div>
    </div>
  );
}
