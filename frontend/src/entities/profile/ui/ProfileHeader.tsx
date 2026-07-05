import React from 'react';
import { Calendar, Edit3 } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';

interface ProfileHeaderProps {
  username: string;
  onEditClick: () => void;
}

export default function ProfileHeader({ username, onEditClick }: ProfileHeaderProps) {
  return (
    <div className="w-full relative">
      <div className="h-44 w-full bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 relative border-b border-white/[0.05]">
        <div className="absolute inset-0 bg-white/[0.01] backdrop-blur-[2px]"></div>
      </div>

      <div className="px-6 pb-6 relative">
        <div className="absolute -top-16 left-6">
          <div className="p-1 bg-[#0b0b0c] rounded-full shadow-2xl">
            <Avatar size="xl" emoji="💀" />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onEditClick}
            className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] text-white font-medium text-xs px-4 py-2 rounded-xl transition-all duration-200"
          >
            <Edit3 size={14} /> Редагувати
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-white tracking-wide">Ayate</h2>
          <p className="text-sm text-gray-400 font-medium">@{username}</p>
        </div>

        <p className="text-sm text-gray-300 mt-3 leading-relaxed">
          Розробляю Eternal. Поклонник чистого коду і футуристичних інтерфейсів. 🌌
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-500 mt-4 font-medium">
          <Calendar size={14} /> <span>Реєстрація: травень 2026 р.</span>
        </div>

        <div className="flex gap-6 mt-4 text-sm text-gray-300 border-t border-white/[0.03] pt-4">
          <span
            className="cursor-pointer hover:underline"
            onClick={() => alert('Вікно підписників')}
          >
            <strong className="text-white font-semibold">1,245</strong> підписників
          </span>
          <span className="cursor-pointer hover:underline" onClick={() => alert('Вікно підписок')}>
            <strong className="text-white font-semibold">348</strong> підписок
          </span>
        </div>
      </div>
    </div>
  );
}
