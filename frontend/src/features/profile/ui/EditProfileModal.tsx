import React, { useState, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Palette,
  Shield,
  Hand,
  Bell,
  X,
  Upload,
  Check,
  Image as ImageIcon,
  MoveVertical,
} from 'lucide-react';
import { useUIStore } from '../../../shared/model/useUIStore';
import { profileSchema, ProfileFormValues } from '../model/profileSchema';

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${checked ? 'bg-white' : 'bg-[#333]'}`}
  >
    <div
      className={`w-4 h-4 rounded-full transition-transform ${checked ? 'bg-black translate-x-5' : 'bg-gray-400 translate-x-0'}`}
    />
  </button>
);

export default function EditProfileModal() {
  const { isEditProfileOpen, closeEditProfile } = useUIStore();
  const [activeTab, setActiveTab] = useState('account');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerPos, setBannerPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef({ startY: 0, startPos: 50 });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: 'my_profile',
      bio: 'Rozroblyayu Eternal.',
      onlineStatus: true,
      notifMain: true,
      notifSound: false,
    },
  });

  const onlineStatus = useWatch({ control, name: 'onlineStatus' });
  const notifMain = useWatch({ control, name: 'notifMain' });
  const notifSound = useWatch({ control, name: 'notifSound' });

  if (!isEditProfileOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
        setBannerPos(50);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (!bannerPreview) return;
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    dragRef.current = { startY: clientY || 0, startPos: bannerPos };
  };

  const handleDragMove = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (!isDragging || !bannerPreview) return;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    if (clientY === undefined) return;

    const deltaY = clientY - dragRef.current.startY;
    const newPos = dragRef.current.startPos - deltaY * 0.4;
    setBannerPos(Math.max(0, Math.min(100, newPos)));
  };

  const onSubmit = (data: ProfileFormValues) => {
    console.log('Дані готові для відправки на бекенд NestJS:', {
      ...data,
      avatarPreview,
      bannerPreview,
      bannerPos,
    });
    closeEditProfile();
  };

  const menuItems = [
    { id: 'account', icon: User, label: 'Аккаунт' },
    { id: 'appearance', icon: Palette, label: 'Оформлення' },
    { id: 'security', icon: Shield, label: 'Безпека' },
    { id: 'privacy', icon: Hand, label: 'Приватність' },
    { id: 'notifications', icon: Bell, label: 'Сповіщення' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative flex w-full max-w-[850px] h-[650px] bg-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden border border-[#2a2a2a]"
      >
        <button
          type="button"
          onClick={closeEditProfile}
          className="absolute top-4 right-4 z-10 p-2 text-gray-500 hover:text-white hover:bg-[#333] rounded-full transition-colors flex items-center justify-center"
        >
          <X size={20} />
        </button>

        <div className="w-[280px] bg-[#161616] border-r border-[#2a2a2a] p-4 flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6 px-4 pt-2">Налаштування</h2>
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === item.id ? 'bg-[#2a2a2a] text-white font-medium' : 'text-gray-400 hover:bg-[#222] hover:text-gray-200'}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#333] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#444]">
          {activeTab === 'account' && (
            <div className="text-white">
              <h3 className="text-xl font-bold mb-6">Аккаунт</h3>

              <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#2a2a2a]">
                <div>
                  <h4 className="font-medium text-gray-200">Фото профілю</h4>
                  <p className="text-sm text-gray-500">Рекомендований розмір 80x80px</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#333] overflow-hidden flex items-center justify-center border border-[#444]">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={32} className="text-gray-500" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="bg-[#2a2a2a] hover:bg-[#333] text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                  >
                    <Upload size={14} /> Вибрати
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 mb-8 pb-8 border-b border-[#2a2a2a]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-200">Баннер профілю</h4>
                    <p className="text-sm text-gray-500">
                      Завантажте та перетягніть для позиціонування
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={bannerInputRef}
                    onChange={handleBannerChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="bg-[#2a2a2a] hover:bg-[#333] text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                  >
                    <Upload size={14} /> Вибрати
                  </button>
                </div>

                <div
                  className={`w-full h-32 bg-[#111] rounded-xl overflow-hidden border border-[#333] relative group ${bannerPreview ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragMove}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                  onTouchStart={handleDragStart}
                  onTouchMove={handleDragMove}
                  onTouchEnd={() => setIsDragging(false)}
                >
                  {bannerPreview ? (
                    <>
                      <img
                        src={bannerPreview}
                        alt="Banner"
                        className="w-full h-full object-cover select-none pointer-events-none"
                        style={{ objectPosition: `50% ${bannerPos}%` }}
                      />
                      <div
                        className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
                      >
                        <div className="flex items-center gap-2 bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md">
                          <MoveVertical size={16} />{' '}
                          <span className="text-sm font-medium">Потягніть для позиціонування</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
                      <ImageIcon size={28} className="opacity-50" />{' '}
                      <span className="text-xs">Банер не встановлено</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Ім'я</label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gray-500 transition"
                    placeholder="Ваше ім'я"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Юзернейм</label>
                  <input
                    type="text"
                    {...register('username')}
                    className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gray-500 transition"
                  />
                  {errors.username && (
                    <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Про себе</label>
                  <textarea
                    rows={3}
                    {...register('bio')}
                    className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gray-500 transition resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  className="bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2"
                >
                  <Check size={16} /> Зберегти зміни
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="text-white">
              <h3 className="text-xl font-bold mb-6">Оформлення</h3>
              <div className="flex items-center justify-between py-4 border-b border-[#2a2a2a]">
                <div>
                  <h4 className="font-medium text-gray-200">Тема</h4>
                  <p className="text-sm text-gray-500">Виберіть кольорову схему додатку</p>
                </div>
                <select className="bg-[#222] border border-[#333] rounded-lg px-4 py-2 text-white outline-none text-sm cursor-pointer">
                  <option>Темна</option>
                  <option>Світла</option>
                </select>
              </div>
            </div>
          )}
          {activeTab === 'security' && (
            <div className="text-white">
              <h3 className="text-xl font-bold mb-6">Безпека</h3>
              <div className="flex items-center justify-between py-4 border-b border-[#2a2a2a]">
                <div>
                  <h4 className="font-medium text-gray-200">Пароль</h4>
                  <p className="text-sm text-gray-500">
                    Змінити поточний пароль від облікового запису
                  </p>
                </div>
                <button
                  type="button"
                  className="bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-full font-bold text-xs transition"
                >
                  Змінити пароль
                </button>
              </div>
            </div>
          )}
          {activeTab === 'privacy' && (
            <div className="text-white space-y-4">
              <h3 className="text-xl font-bold mb-6">Приватність</h3>
              <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2a]">
                <div>
                  <h4 className="font-medium text-gray-200">Онлайн-статус</h4>
                  <p className="text-sm text-gray-500">Показувати час останнього візиту</p>
                </div>
                <Toggle
                  checked={onlineStatus}
                  onChange={() => setValue('onlineStatus', !onlineStatus)}
                />
              </div>
            </div>
          )}
          {activeTab === 'notifications' && (
            <div className="text-white">
              <h3 className="text-xl font-bold mb-6">Сповіщення</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2a]">
                  <div>
                    <h4 className="font-medium text-gray-200">Ввімкнути сповіщення</h4>
                    <p className="text-sm text-gray-500">Отримувати пуш-сповіщення</p>
                  </div>
                  <Toggle checked={notifMain} onChange={() => setValue('notifMain', !notifMain)} />
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2a]">
                  <div>
                    <h4 className="font-medium text-gray-200">Звукові сигнали</h4>
                    <p className="text-sm text-gray-500">Відтворювати звуки</p>
                  </div>
                  <Toggle
                    checked={notifSound}
                    onChange={() => setValue('notifSound', !notifSound)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
