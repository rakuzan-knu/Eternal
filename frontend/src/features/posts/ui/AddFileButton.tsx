import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';

interface AddFileButtonProps {
  onFilesSelect: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
}

export const AddFileButton: React.FC<AddFileButtonProps> = ({
  onFilesSelect,
  multiple,
  disabled,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFilesSelect(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesChange}
        accept="image/*,video/*"
        multiple={multiple}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        title="Attach a photo or video"
        className="p-2.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Paperclip size={18} />
      </button>
    </>
  );
};
