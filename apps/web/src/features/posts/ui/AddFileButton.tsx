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
        className="p-2.5 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <Paperclip size={18} />
      </button>
    </>
  );
};
