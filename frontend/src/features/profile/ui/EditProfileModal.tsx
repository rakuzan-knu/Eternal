import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
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
  Loader2,
} from 'lucide-react';
import { useUIStore } from '../../../shared/model/useUIStore';
import { useCheckUsername } from '@/entities/profile/model/useCheckUsername';
import { USER_KEY } from '@/shared/api/queryKeys';
import { profileSchema, ProfileFormValues } from '../model/profileSchema';
import { useUploadAvatar } from '../../../shared/model/useUploadAvatar';
import { useUploadBanner } from '../../../shared/model/useUploadBanner';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useDebounce } from '@/shared/lib/useDebounce';
import { useMessageToastStore } from '../../../shared/model/useMessageToastStore';
import Avatar from '../../../shared/ui/Avatar';
import { SettingsPanelHost } from '@/shared/ui/SettingsPanelHost';
import SecurityTab from './security/SecurityTab';
import PrivacyTab from './privacy/PrivacyTab';
import NotificationsTab from './notifications/NotificationsTab';

export default function EditProfileModal() {
  const { isEditProfileOpen, closeEditProfile } = useUIStore();
  const [activeTab, setActiveTab] = useState('account');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser } = useCurrentUser();
  const uploadAvatarMutation = useUploadAvatar();
  const uploadBannerMutation = useUploadBanner();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(null);
  const [localBannerPos, setLocalBannerPos] = useState<number | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startPos: number }>({ startY: 0, startPos: 50 });

  const avatarPreview = localAvatarPreview ?? currentUser?.avatar ?? null;
  const bannerPreview = localBannerPreview ?? currentUser?.banner ?? null;
  const bannerPos = localBannerPos ?? currentUser?.bannerPosition ?? 50;

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: '',
      displayName: '',
      username: '',
      onlineStatus: true,
      notifMain: true,
      notifSound: false,
    },
  });

  const usernameValue = useWatch({ control, name: 'username' });
  const debouncedUsername = useDebounce(usernameValue, 400);
  const isUsernameUnchanged = debouncedUsername === currentUser?.username;

  const shouldCheckUsername = Boolean(
    debouncedUsername && debouncedUsername.length >= 2 && !isUsernameUnchanged,
  );

  const { data: usernameStatus, isFetching: isCheckingUsername } = useCheckUsername(
    debouncedUsername || '',
    shouldCheckUsername,
  );

  const isUsernameTaken = !isUsernameUnchanged && usernameStatus?.isAvailable === false;

  const bioValue = useWatch({ control, name: 'bio' });

  useEffect(() => {
    if (currentUser) {
      reset({
        username: currentUser.username || '',
        bio: currentUser.bio || '',
        displayName: currentUser.displayName || '',
        onlineStatus: true,
        notifMain: true,
        notifSound: false,
      });
    }
  }, [currentUser, reset]);

  if (!isEditProfileOpen) return null;

  const addToast = useMessageToastStore.getState().addToast;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast({
          id: `error-${Date.now()}`,
          conversationId: '',
          messageId: '',
          title: 'Avatar upload error',
          body: 'Only image and GIF files are allowed.',
          avatar: null,
          memberAvatars: [],
          isGroup: false,
        });
        e.target.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        addToast({
          id: `error-${Date.now()}`,
          conversationId: '',
          messageId: '',
          title: 'Avatar upload error',
          body: 'Avatar file size exceeds the maximum limit of 10 MB.',
          avatar: null,
          memberAvatars: [],
          isGroup: false,
        });
        e.target.value = '';
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLocalAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast({
          id: `error-${Date.now()}`,
          conversationId: '',
          messageId: '',
          title: 'Banner upload error',
          body: 'Only image and GIF files are allowed.',
          avatar: null,
          memberAvatars: [],
          isGroup: false,
        });
        e.target.value = '';
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        addToast({
          id: `error-${Date.now()}`,
          conversationId: '',
          messageId: '',
          title: 'Banner upload error',
          body: 'Profile banner size exceeds the maximum limit of 20 MB.',
          avatar: null,
          memberAvatars: [],
          isGroup: false,
        });
        e.target.value = '';
        return;
      }
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalBannerPreview(reader.result as string);
        setLocalBannerPos(50);
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
    setLocalBannerPos(Math.max(0, Math.min(100, newPos)));
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (isUsernameTaken) return;
    try {
      if (!currentUser) return;

      if (avatarFile && currentUser?.id) {
        await uploadAvatarMutation.mutateAsync({
          userId: currentUser.id,
          file: avatarFile,
        });
      }

      if (bannerFile && currentUser?.id) {
        await uploadBannerMutation.mutateAsync({
          userId: currentUser.id,
          file: bannerFile,
          positionY: bannerPos,
        });
      }

      const token = localStorage.getItem('accessToken');

      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: data.username,
          displayName: data.displayName,
          bio: data.bio,
          bannerPosition: bannerPos,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile text data');
      }

      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
      if (data.username !== currentUser.username) {
        navigate(`/${data.username}`, { replace: true });
      }
      closeEditProfile();
      setAvatarFile(null);
      setBannerFile(null);
    } catch (error) {
      console.error('Saving error:', error);
    }
  };

  const handleClose = () => {
    closeEditProfile();
    setAvatarFile(null);
    setBannerFile(null);
    setLocalAvatarPreview(null);
    setLocalBannerPreview(null);
    setLocalBannerPos(null);
  };

  const menuItems = [
    { id: 'account', icon: User, label: 'Account' },
    { id: 'appearance', icon: Palette, label: 'Design' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'privacy', icon: Hand, label: 'Privacy' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative flex w-full max-w-[850px] h-[650px] bg-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden border border-[#2a2a2a]"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-500 hover:text-white hover:bg-[#333] rounded-full transition-colors flex items-center justify-center"
        >
          <X size={20} />
        </button>

        <div className="w-[280px] bg-[#161616] border-r border-[#2a2a2a] p-4 flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6 px-4 pt-2">Settings</h2>
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

        <div className="flex-1 relative overflow-hidden">
          <SettingsPanelHost>
            <div className="absolute inset-0 overflow-y-auto p-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#333] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#444]">
              {activeTab === 'account' && (
                <div className="text-white">
                  <h3 className="text-xl font-bold mb-6">Account</h3>

                  <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#2a2a2a]">
                    <div>
                      <h4 className="font-medium text-gray-200">Profile photo</h4>
                      <p className="text-sm text-gray-500">Recommended size 80x80px</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Avatar src={avatarPreview} size="lg" alt="Avatar" />
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
                        <Upload size={14} /> Choose
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mb-8 pb-8 border-b border-[#2a2a2a]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-200">Profile banner</h4>
                        <p className="text-sm text-gray-500">Upload and drag to position</p>
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
                        <Upload size={14} /> Choose
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
                              <span className="text-sm font-medium">Pull to position</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
                          <ImageIcon size={28} className="opacity-50" />{' '}
                          <span className="text-xs">Banner not installed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
                      <input
                        type="text"
                        maxLength={32}
                        {...register('displayName')}
                        className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gray-500 transition"
                        placeholder="Your name"
                      />
                      {errors.displayName && (
                        <p className="text-xs text-red-500 font-medium mt-1">
                          {errors.displayName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">
                        Username
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-gray-500 select-none text-sm font-medium pointer-events-none">
                          @
                        </span>
                        <input
                          {...register('username')}
                          type="text"
                          maxLength={32}
                          placeholder="username"
                          className="w-full bg-[#111] border border-[#333] rounded-xl py-2.5 pl-8 pr-9 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors"
                        />
                        {isCheckingUsername && (
                          <Loader2
                            size={16}
                            className="absolute right-3 animate-spin text-gray-500"
                          />
                        )}
                      </div>

                      {errors.username && (
                        <p className="text-xs text-red-500 font-medium mt-1">
                          {errors.username.message}
                        </p>
                      )}
                      {!errors.username && isUsernameTaken && (
                        <p className="text-xs text-red-500 font-medium mt-1">
                          This username is already taken.
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-gray-400">
                          About myself
                        </label>
                        <span className="text-[11px] text-gray-500 font-medium">
                          {(bioValue || '').length}/200
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={200}
                        {...register('bio')}
                        className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-gray-500 transition resize-none"
                      />
                      {errors.bio && (
                        <p className="text-xs text-red-500 font-medium mt-1">
                          {errors.bio.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      type="submit"
                      disabled={isUsernameTaken || isCheckingUsername}
                      className={`bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                        isUsernameTaken || isCheckingUsername ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      <Check size={16} /> Save changes
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="text-white">
                  <h3 className="text-xl font-bold mb-6">Design</h3>
                  <div className="flex items-center justify-between py-4 border-b border-[#2a2a2a]">
                    <div>
                      <h4 className="font-medium text-gray-200">Theme</h4>
                      <p className="text-sm text-gray-500">Choose an app color scheme</p>
                    </div>
                    <select className="bg-[#222] border border-[#333] rounded-lg px-4 py-2 text-white outline-none text-sm cursor-pointer">
                      <option>Dark</option>
                      <option>Light</option>
                    </select>
                  </div>
                </div>
              )}
              {activeTab === 'security' && (
                <div className="text-white">
                  <h3 className="text-xl font-bold mb-6">Security</h3>
                  <SecurityTab />
                </div>
              )}
              {activeTab === 'privacy' && (
                <div className="text-white">
                  <h3 className="text-xl font-bold mb-6">Privacy</h3>
                  <PrivacyTab />
                </div>
              )}
              {activeTab === 'notifications' && (
                <div className="text-white">
                  <h3 className="text-xl font-bold mb-6">Notifications</h3>
                  <NotificationsTab />
                </div>
              )}
            </div>
          </SettingsPanelHost>
        </div>
      </form>
    </div>
  );
}
