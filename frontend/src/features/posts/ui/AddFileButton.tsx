import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';

interface AddFileButtonProps {
  onImageSelect: (image: string) => void;
}

export const AddFileButton: React.FC<AddFileButtonProps> = ({ onImageSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onImageSelect(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Прикріпити фото"
        className="p-2.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all duration-200"
      >
        <Paperclip size={18} />
      </button>
    </>
  );
};
