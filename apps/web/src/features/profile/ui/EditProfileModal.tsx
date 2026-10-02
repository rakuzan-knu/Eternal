import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  User as UserIcon,
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
  Pencil,
  Search,
  ChevronDown,
  ChevronRight,
  Lock,
  Users,
  Moon,
  Smartphone,
  Eye,
  UserX,
  Volume2,
  LogOut,
  Link as LinkIcon,
  Unlink,
  ShieldCheck,
  Mic,
} from 'lucide-react';
import AccountReputationPanel from './account/AccountReputationPanel';
import FamilyCenterPanel from './account/FamilyCenterPanel';
import DeactivateAccountModal from './account/DeactivateAccountModal';
import DeleteAccountModal from './security/DeleteAccountModal';
import { useUIStore } from '../../../shared/model/useUIStore';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import { useCheckUsername } from '@/entities/profile/model/useCheckUsername';
import { USER_KEY } from '@/shared/api/queryKeys';
import { profileSchema, ProfileFormValues } from '../model/profileSchema';
import { useUploadAvatar } from '../../../shared/model/useUploadAvatar';
import { useUploadBanner } from '../../../shared/model/useUploadBanner';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { userApi } from '@/entities/profile/api/userApi';
import { apiClient } from '@/shared/api/httpClient';
import { useDebounce } from '@/shared/lib/useDebounce';
import { useMessageToastStore } from '../../../shared/model/useMessageToastStore';
import { isTrustedMessageOrigin } from '@/shared/lib/urlSecurity';
import Avatar from '../../../shared/ui/Avatar';
import { SettingsPanelHost } from '@/shared/ui/SettingsPanelHost';
import SecurityTab from './security/SecurityTab';
import PrivacyTab from './privacy/PrivacyTab';
import NotificationsTab from './notifications/NotificationsTab';
import AppearanceTab from './appearance/AppearanceTab';
import VoiceVideoTab from './voice/VoiceVideoTab';
import BadgeSettingsSection from './BadgeSettingsSection';
import { ProfileShowcaseSettingsSection } from './ProfileShowcaseSettingsSection';
import { compressImage } from '@/shared/lib/compressImage';
import { useShowcase } from '@/entities/showcase/model/useShowcase';
import { ConfigureIntegrationModal } from './integrations/ConfigureIntegrationModal';
import { PLATFORMS_LIST, type PlatformConfig } from './integrations/platforms';
import { UnlinkConfirmationModal } from './integrations/UnlinkConfirmationModal';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { FloatingSelectionToolbar, SelectionFormatType } from '@/shared/ui/editor';

function addProfileToast(title: string, body: string) {
  useMessageToastStore.getState().addToast({
    id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    conversationId: '',
    messageId: '',
    title,
    body,
    avatar: null,
    memberAvatars: [],
    isGroup: false,
  });
}

interface SubSection {
  id: string;
  label: string;
}

interface MainTab {
  id: string;
  label: string;
  subsections: SubSection[];
}

const TABS_CONFIG: MainTab[] = [
  {
    id: 'account',
    label: 'Account',
    subsections: [
      { id: 'sec-account-info', label: 'Account Information' },
      { id: 'sec-badges', label: 'Profile Badges' },
      { id: 'sec-showcase', label: 'Profile Showcase' },
      { id: 'sec-integrations', label: 'Integrations' },
      { id: 'sec-reputation', label: 'Account Reputation' },
      { id: 'sec-family', label: 'Family Center' },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    subsections: [
      { id: 'sec-theme', label: 'Color Theme' },
      { id: 'sec-interface', label: 'Font & Layout' },
      { id: 'sec-cursors', label: 'Custom Cursors' },
    ],
  },
  {
    id: 'voice-video',
    label: 'Voice & Video',
    subsections: [
      { id: 'sec-voice', label: 'Voice' },
      { id: 'sec-video', label: 'Video' },
      { id: 'sec-screen-share', label: 'Screen Share' },
      { id: 'sec-sounds', label: 'Soundboard' },
      { id: 'sec-advanced-voice', label: 'Advanced' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    subsections: [{ id: 'sec-security', label: 'Password & Security' }],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    subsections: [{ id: 'sec-privacy-opts', label: 'Profile Privacy' }],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    subsections: [{ id: 'sec-notifs', label: 'Sound & Push Notifications' }],
  },
];

export default function EditProfileModal() {
  const isEditProfileOpen = useUIStore((s) => s.isEditProfileOpen);
  const closeEditProfile = useUIStore((s) => s.closeEditProfile);
  const editProfileInitialTab = useUIStore((s) => s.editProfileInitialTab);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const targetTab =
    typeof editProfileInitialTab === 'string' &&
    TABS_CONFIG.some((t) => t.id === editProfileInitialTab)
      ? editProfileInitialTab
      : 'account';

  const [activeTab, setActiveTab] = useState(targetTab);
  const [activeSection, setActiveSection] = useState('sec-account-info');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({
    account: true,
    appearance: false,
    'voice-video': false,
    security: false,
    privacy: false,
    notifications: false,
  });

  useEffect(() => {
    if (isEditProfileOpen) {
      if (
        editProfileInitialTab === 'voice-video' ||
        editProfileInitialTab === 'voice' ||
        editProfileInitialTab === 'video' ||
        editProfileInitialTab === 'sounds' ||
        editProfileInitialTab === 'sec-sounds' ||
        editProfileInitialTab === 'advanced-voice' ||
        editProfileInitialTab === 'sec-advanced-voice' ||
        (typeof editProfileInitialTab === 'string' &&
          editProfileInitialTab.startsWith('sec-voice')) ||
        editProfileInitialTab === 'sec-video' ||
        editProfileInitialTab === 'sec-screen-share'
      ) {
        setActiveTab('voice-video');
        setExpandedTabs((prev) => ({ ...prev, 'voice-video': true }));
        const targetSec =
          typeof editProfileInitialTab === 'string' && editProfileInitialTab.startsWith('sec-')
            ? editProfileInitialTab
            : editProfileInitialTab === 'video'
              ? 'sec-video'
              : 'sec-voice';
        setActiveSection(targetSec);
        setTimeout(() => {
          const el = document.getElementById(targetSec);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
        return;
      }

      if (
        editProfileInitialTab === 'family' ||
        editProfileInitialTab === 'family-center' ||
        editProfileInitialTab === 'sec-family'
      ) {
        setActiveTab('account');
        setExpandedTabs((prev) => ({ ...prev, account: true }));
        setActiveSection('sec-family');
        setTimeout(() => {
          const el = document.getElementById('sec-family');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
        return;
      }

      if (
        editProfileInitialTab === 'integrations' ||
        editProfileInitialTab === 'sec-integrations' ||
        editProfileInitialTab === 'connections'
      ) {
        setActiveTab('account');
        setExpandedTabs((prev) => ({ ...prev, account: true }));
        setActiveSection('sec-integrations');
        setTimeout(() => {
          const el = document.getElementById('sec-integrations');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
        return;
      }

      const validTab =
        typeof editProfileInitialTab === 'string' &&
        TABS_CONFIG.some((t) => t.id === editProfileInitialTab)
          ? editProfileInitialTab
          : 'account';

      setActiveTab(validTab);
      setExpandedTabs((prev) => ({ ...prev, [validTab]: true }));
      const foundTab = TABS_CONFIG.find((t) => t.id === validTab);
      if (foundTab && foundTab.subsections.length > 0) {
        setActiveSection(foundTab.subsections[0].id);
      }
    }
  }, [isEditProfileOpen, editProfileInitialTab]);

  // Lock body scroll when EditProfileModal is open
  useEffect(() => {
    if (isEditProfileOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isEditProfileOpen]);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReputationPanelOpen, setIsReputationPanelOpen] = useState(false);
  const [isFamilyCenterPanelOpen, setIsFamilyCenterPanelOpen] = useState(false);
  const [isSlidePanelClosing, setIsSlidePanelClosing] = useState(false);
  const slidePanelCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingToRef = useRef(false);
  const scrollLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSlidePanelsClose = useCallback(() => {
    if (isFamilyCenterPanelOpen || isReputationPanelOpen) {
      setIsSlidePanelClosing(true);
      if (slidePanelCloseTimerRef.current) {
        clearTimeout(slidePanelCloseTimerRef.current);
      }
      slidePanelCloseTimerRef.current = setTimeout(() => {
        setIsFamilyCenterPanelOpen(false);
        setIsReputationPanelOpen(false);
        setIsSlidePanelClosing(false);
      }, 180);
    }
  }, [isFamilyCenterPanelOpen, isReputationPanelOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      if (scrollLockTimeoutRef.current) {
        clearTimeout(scrollLockTimeoutRef.current);
      }
      if (slidePanelCloseTimerRef.current) {
        clearTimeout(slidePanelCloseTimerRef.current);
      }
    };
  }, []);

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
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const subNavRef = useRef<HTMLDivElement>(null);
  const tabHeaderRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const accordionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number }>({
    top: 0,
    height: 0,
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
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

  useEffect(() => {
    if (currentUser) {
      reset({
        bio: currentUser.bio || '',
        displayName: currentUser.displayName || '',
        username: currentUser.username || '',
        onlineStatus: true,
        notifMain: true,
        notifSound: false,
      });
    }
  }, [currentUser, reset]);

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

  const bioRef = useRef<HTMLTextAreaElement | null>(null);
  const { ref: registerBioRef, ...bioRest } = register('bio');
  const [bioToolbarPos, setBioToolbarPos] = useState<{ top: number; left: number } | null>(null);

  const handleBioSelect = () => {
    const el = bioRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end && el.value.slice(start, end).trim().length > 0) {
      const rect = el.getBoundingClientRect();
      setBioToolbarPos({
        top: rect.top - 46,
        left: rect.left + rect.width / 2,
      });
    } else {
      setBioToolbarPos(null);
    }
  };

  const handleBioFormatting = (prefix: string, suffix: string, defaultPlaceholder = '') => {
    const el = bioRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const currentVal = getValues('bio') || '';
    const selected = currentVal.slice(start, end);
    const content = selected || defaultPlaceholder;
    const replacement = `${prefix}${content}${suffix}`;
    const nextVal = (currentVal.slice(0, start) + replacement + currentVal.slice(end)).slice(
      0,
      200,
    );
    setValue('bio', nextVal, { shouldValidate: true, shouldDirty: true });
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

  const handleBioFormat = (type: SelectionFormatType, linkUrl?: string) => {
    switch (type) {
      case 'bold':
        handleBioFormatting('**', '**', 'bold');
        break;
      case 'italic':
        handleBioFormatting('*', '*', 'italic');
        break;
      case 'underline':
        handleBioFormatting('__', '__', 'underline');
        break;
      case 'strike':
        handleBioFormatting('~~', '~~', 'strikethrough');
        break;
      case 'spoiler':
        handleBioFormatting('||', '||', 'spoiler');
        break;
      case 'quote':
        handleBioFormatting('> ', '', 'quote');
        break;
      case 'code':
        handleBioFormatting('`', '`', 'code');
        break;
      case 'link':
        if (linkUrl) {
          handleBioFormatting('[', `](${linkUrl})`, 'link');
        }
        break;
    }
    setBioToolbarPos(null);
  };

  const handleBioKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    if (isCmdOrCtrl) {
      const key = e.key.toLowerCase();
      if (key === 'b' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleBioFormatting('**', '**', 'bold');
        return;
      }
      if (key === 'i' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleBioFormatting('*', '*', 'italic');
        return;
      }
      if (key === 'u' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleBioFormatting('__', '__', 'underline');
        return;
      }
      if (e.shiftKey && key === 'x') {
        e.preventDefault();
        handleBioFormatting('~~', '~~', 'strikethrough');
        return;
      }
    }
  };

  const updateIndicatorPosition = useCallback(() => {
    const activeEl = itemRefs.current[activeSection];
    const containerEl = accordionRefs.current[activeTab];
    if (activeEl && containerEl) {
      const top = activeEl.offsetTop;
      const height = activeEl.offsetHeight;
      if (height > 0) {
        setIndicatorStyle({ top, height });
      }
    }
  }, [activeSection, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateIndicatorPosition();
    }, 30);
    return () => clearTimeout(timer);
  }, [
    activeSection,
    expandedTabs,
    searchQuery,
    activeTab,
    isEditProfileOpen,
    updateIndicatorPosition,
  ]);

  const handleScroll = useCallback(() => {
    if (isScrollingToRef.current) return;
    if (!rightPanelRef.current) return;
    const container = rightPanelRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    const containerBottom = containerRect.bottom;
    const containerHeight = containerRect.height;
    const sectionElements = Array.from(container.querySelectorAll<HTMLElement>('[id^="sec-"]'));
    if (sectionElements.length === 0) return;

    // 1. If near the bottom of scroll, highlight the last visible section in the container
    const remainingScroll = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (remainingScroll < 180) {
      const visibleSections = sectionElements.filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < containerBottom - 40;
      });
      if (visibleSections.length > 0) {
        const lastVisible = visibleSections[visibleSections.length - 1];
        if (lastVisible) {
          if (lastVisible.id !== activeSection) {
            setActiveSection(lastVisible.id);
          }
          return;
        }
      }
    }

    // 2. Normal scroll-spy:
    // A section is considered active if its top has crossed referenceLine
    // and its bottom is still below containerTop + 30.
    const referenceLine = containerTop + Math.min(180, containerHeight * 0.35);

    const activeCandidates = sectionElements.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top <= referenceLine && rect.bottom > containerTop + 30;
    });

    if (activeCandidates.length > 0) {
      const candidate = activeCandidates[activeCandidates.length - 1];
      if (candidate.id !== activeSection) {
        setActiveSection(candidate.id);
      }
      return;
    }

    // 3. Fallback: closest to containerTop
    let closestSection = sectionElements[0];
    let minDistance = Infinity;
    sectionElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(rect.top - containerTop);
      if (dist < minDistance) {
        minDistance = dist;
        closestSection = el;
      }
    });

    if (closestSection && closestSection.id !== activeSection) {
      setActiveSection(closestSection.id);
    }
  }, [activeSection]);

  const handleSectionClick = (tabId: string, sectionId: string) => {
    if (sectionId === 'sec-family') {
      if (isSlidePanelClosing) {
        setIsSlidePanelClosing(false);
      }
      setIsFamilyCenterPanelOpen(true);
      setIsReputationPanelOpen(false);
    } else if (sectionId === 'sec-reputation') {
      if (isSlidePanelClosing) {
        setIsSlidePanelClosing(false);
      }
      setIsReputationPanelOpen(true);
      setIsFamilyCenterPanelOpen(false);
    } else {
      triggerSlidePanelsClose();
    }

    if (activeTab !== tabId) {
      setActiveTab(tabId);
      setExpandedTabs((prev) => ({ ...prev, [tabId]: true }));
    }
    setActiveSection(sectionId);

    if (scrollLockTimeoutRef.current) {
      clearTimeout(scrollLockTimeoutRef.current);
    }
    isScrollingToRef.current = true;
    scrollLockTimeoutRef.current = setTimeout(() => {
      isScrollingToRef.current = false;
    }, 600);

    setTimeout(() => {
      const targetEl = document.getElementById(sectionId);
      if (targetEl && rightPanelRef.current) {
        const containerRect = rightPanelRef.current.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const scrollOffset =
          targetRect.top - containerRect.top + rightPanelRef.current.scrollTop - 20;
        rightPanelRef.current.scrollTo?.({ top: Math.max(0, scrollOffset), behavior: 'smooth' });
      }
      updateIndicatorPosition();
    }, 60);
  };

  const toggleTabExpanded = (tabId: string) => {
    const nextState = !expandedTabs[tabId];
    setExpandedTabs((prev) => ({ ...prev, [tabId]: nextState }));

    if (nextState) {
      triggerSlidePanelsClose();
      setActiveTab(tabId);
      const tabConfig = TABS_CONFIG.find((t) => t.id === tabId);
      if (tabConfig && tabConfig.subsections.length > 0) {
        const firstSubId = tabConfig.subsections[0].id;
        setActiveSection(firstSubId);
        if (scrollLockTimeoutRef.current) {
          clearTimeout(scrollLockTimeoutRef.current);
        }
        isScrollingToRef.current = true;
        scrollLockTimeoutRef.current = setTimeout(() => {
          isScrollingToRef.current = false;
        }, 600);
        setTimeout(() => {
          if (rightPanelRef.current) {
            rightPanelRef.current.scrollTo?.({ top: 0, behavior: 'smooth' });
          }
        }, 50);
      }
    }

    setTimeout(() => {
      updateIndicatorPosition();
    }, 100);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    clearAuth();
    closeEditProfile();
    navigate('/login', { replace: true });
  };

  const { data: userShowcase } = useShowcase(currentUser?.username);
  const [activePlatformModal, setActivePlatformModal] = useState<PlatformConfig | null>(null);
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<{ id: string; name: string } | null>(null);

  const handleOpenPlatformModal = (platform: PlatformConfig) => {
    setActivePlatformModal(platform);
    setIsPlatformModalOpen(true);
  };

  const handleUnlinkPlatform = async (platformId: string) => {
    try {
      if (platformId === 'github' && currentUser?.githubUsername) {
        await userApi.unlinkGithub();
      }
      await integrationsApi.unlink(platformId);
      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
      queryClient.invalidateQueries({ queryKey: ['showcase'] });
      addProfileToast('Integration Disconnected', `${platformId.toUpperCase()} has been unlinked.`);
    } catch (err: unknown) {
      console.error('Unlink platform error:', err);
    }
  };

  const handlePlatformSaveSuccess = (_platformId: string, _data: Record<string, any>) => {
    queryClient.invalidateQueries({ queryKey: [USER_KEY] });
    queryClient.invalidateQueries({ queryKey: ['showcase'] });
    addProfileToast('Integration Saved', 'Your profile integration has been synced.');
  };

  // Real-time OAuth popup completion listener
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (!isTrustedMessageOrigin(event.origin)) return;
      if (event.data?.type === 'INTEGRATION_AUTH_SUCCESS') {
        queryClient.invalidateQueries({ queryKey: [USER_KEY] });
        queryClient.invalidateQueries({ queryKey: ['showcase'] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [queryClient]);

  const handleClose = useCallback(() => {
    closeEditProfile();
    setAvatarFile(null);
    setBannerFile(null);
    setLocalAvatarPreview(null);
    setLocalBannerPreview(null);
    setLocalBannerPos(null);
    setIsClosing(false);
  }, [closeEditProfile]);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      handleClose();
    }, 180);
  }, [isClosing, handleClose]);

  useEffect(() => {
    if (!isEditProfileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return;
        if (
          document.querySelector('[data-submodal-open="true"]') !== null ||
          document.querySelector('[data-modal-open="true"]') !== null ||
          isLogoutModalOpen ||
          isReputationPanelOpen ||
          isFamilyCenterPanelOpen ||
          isDeactivateModalOpen ||
          isDeleteModalOpen ||
          isPlatformModalOpen ||
          unlinkTarget !== null ||
          isMoreMenuOpen
        ) {
          return;
        }
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isEditProfileOpen,
    requestClose,
    isLogoutModalOpen,
    isReputationPanelOpen,
    isFamilyCenterPanelOpen,
    isDeactivateModalOpen,
    isDeleteModalOpen,
    isPlatformModalOpen,
    unlinkTarget,
    isMoreMenuOpen,
  ]);

  if (!isEditProfileOpen) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const rawFile = e.target.files[0];
      const isGif =
        rawFile.type?.toLowerCase() === 'image/gif' || rawFile.name?.toLowerCase().endsWith('.gif');

      if (isGif) {
        setAvatarFile(rawFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLocalAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(rawFile);
        return;
      }

      try {
        const file = await compressImage(rawFile, 1024, 1024, 0.85);
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLocalAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } catch {
        setAvatarFile(rawFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLocalAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(rawFile);
      }
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const rawFile = e.target.files[0];
      const isGif =
        rawFile.type?.toLowerCase() === 'image/gif' || rawFile.name?.toLowerCase().endsWith('.gif');

      if (isGif) {
        setBannerFile(rawFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLocalBannerPreview(reader.result as string);
          setLocalBannerPos(50);
        };
        reader.readAsDataURL(rawFile);
        return;
      }

      try {
        const file = await compressImage(rawFile, 1920, 1080, 0.85);
        setBannerFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLocalBannerPreview(reader.result as string);
          setLocalBannerPos(50);
        };
        reader.readAsDataURL(file);
      } catch {
        setBannerFile(rawFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLocalBannerPreview(reader.result as string);
          setLocalBannerPos(50);
        };
        reader.readAsDataURL(rawFile);
      }
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
    if (isUsernameTaken || isSaving) return;
    try {
      if (!currentUser) return;
      setIsSaving(true);

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

      await apiClient.patch(`/users/${currentUser.id}`, {
        username: data.username,
        displayName: data.displayName,
        bio: data.bio,
        bannerPosition: bannerPos,
      });

      queryClient.invalidateQueries({ queryKey: [USER_KEY] });
      addProfileToast('Profile Updated', 'Your profile changes have been saved successfully.');
      if (data.username !== currentUser.username) {
        navigate(`/${data.username}`, { replace: true });
      }
      closeEditProfile();
      setAvatarFile(null);
      setBannerFile(null);
    } catch (error: unknown) {
      console.error('Saving error:', error);
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const serverMsg = err?.response?.data?.message;
      if (typeof serverMsg === 'string') {
        addProfileToast('Profile Update', serverMsg);
      } else if (Array.isArray(serverMsg)) {
        addProfileToast('Profile Update', serverMsg.join(', '));
      } else {
        addProfileToast('Profile Update Error', 'Failed to update profile.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const TAB_ICONS: Record<string, React.ElementType> = {
    account: UserIcon,
    appearance: Palette,
    'voice-video': Mic,
    security: Shield,
    privacy: Hand,
    notifications: Bell,
  };

  const filteredTabs = TABS_CONFIG.map((tab) => {
    const matchingSubsections = tab.subsections.filter(
      (sub) =>
        sub.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tab.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    return { ...tab, subsections: matchingSubsections };
  }).filter(
    (tab) =>
      tab.label.toLowerCase().includes(searchQuery.toLowerCase()) || tab.subsections.length > 0,
  );

  const modalContent = (
    <div
      onClick={requestClose}
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm overscroll-contain transition-all duration-200 ${
        isClosing
          ? 'bg-black/0 opacity-0 pointer-events-none'
          : 'bg-black/45 opacity-100 animate-fadeIn'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`glass-modal relative flex flex-col sm:flex-row w-full max-w-[920px] h-[92vh] max-h-[720px] rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden border border-black/10 dark:border-white/[0.08] overscroll-contain transition-all duration-200 ease-out ${
          isClosing
            ? 'opacity-0 scale-95 translate-y-2 pointer-events-none'
            : 'opacity-100 scale-100 translate-y-0 animate-modalPop'
        }`}
      >
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-30 p-2 text-gray-500 hover:text-gray-950 hover:bg-black/10 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 rounded-full transition-all duration-200 cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="w-full sm:w-[300px] border-b sm:border-b-0 sm:border-r border-black/10 dark:border-white/[0.06] p-4 flex flex-col gap-4 select-none shrink-0 overflow-x-hidden overflow-y-hidden bg-transparent transition-colors duration-200">
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/[0.06]">
            <Avatar src={avatarPreview} size="md" alt={currentUser?.displayName || 'User'} />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-gray-950 dark:text-white font-bold text-sm truncate">
                {currentUser?.displayName || currentUser?.username || 'User'}
              </span>
              <button
                type="button"
                onClick={() => handleSectionClick('account', 'sec-account-info')}
                className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white transition-colors truncate"
              >
                <span>Edit profile...</span>
                <Pencil size={11} className="shrink-0" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-xs text-gray-950 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:border-black/20 dark:focus:border-white/20 transition-all duration-200"
            />
          </div>

          <div
            ref={subNavRef}
            className="relative flex-1 overflow-y-auto overflow-x-hidden pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            <nav className="flex flex-col gap-2">
              {filteredTabs.map((tab) => {
                const Icon = TAB_ICONS[tab.id] || UserIcon;
                const isExpanded = expandedTabs[tab.id] || searchQuery.length > 0;
                const isTabActive = activeTab === tab.id;

                return (
                  <div key={tab.id} className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      ref={(el) => {
                        tabHeaderRefs.current[tab.id] = el;
                      }}
                      onClick={() => toggleTabExpanded(tab.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm ${
                        isTabActive
                          ? 'bg-black/10 text-gray-950 font-bold dark:bg-white/[0.08] dark:text-white'
                          : 'text-gray-700 hover:bg-black/5 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          size={18}
                          className={
                            isTabActive
                              ? 'text-gray-950 dark:text-white'
                              : 'text-gray-600 dark:text-gray-400'
                          }
                        />
                        <span>{tab.label}</span>
                      </div>
                      <ChevronDown
                        size={15}
                        className={`text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div
                        ref={(el) => {
                          accordionRefs.current[tab.id] = el;
                        }}
                        className="relative overflow-hidden flex flex-col gap-0.5 pl-6 py-1 animate-fadeIn"
                      >
                        <div className="absolute left-[9px] top-1 bottom-1 w-[2px] bg-black/10 dark:bg-white/[0.08] pointer-events-none rounded-full" />

                        {isTabActive && (
                          <div
                            className="absolute left-[8px] w-[3px] bg-gray-950 dark:bg-white rounded-r-full shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:shadow-[0_0_12px_rgba(255,255,255,0.9)] transition-all duration-300 ease-out z-20 pointer-events-none"
                            style={{
                              transform: `translateY(${indicatorStyle.top}px)`,
                              height: `${indicatorStyle.height}px`,
                              opacity: indicatorStyle.height > 0 ? 1 : 0,
                            }}
                          />
                        )}

                        {tab.subsections.map((sub) => {
                          const isSubActive = activeSection === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              ref={(el) => {
                                itemRefs.current[sub.id] = el;
                              }}
                              onClick={() => handleSectionClick(tab.id, sub.id)}
                              className={`text-left px-3 py-1.5 rounded-lg text-xs transition-all duration-200 truncate relative z-10 ${
                                isSubActive
                                  ? 'text-gray-950 font-bold bg-black/10 dark:text-white dark:bg-white/[0.08]'
                                  : 'text-gray-700 hover:text-gray-950 hover:bg-black/5 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/[0.02]'
                              }`}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="pt-3 mt-3 border-t border-black/10 dark:border-white/[0.08] flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-300 transition-all text-xs font-semibold"
              >
                <LogOut size={16} className="text-red-400" />
                <span>Log Out</span>
              </button>

              <div className="flex flex-col gap-1.5 px-3 pt-1 text-[11px] text-gray-500 leading-tight">
                <div className="flex items-center gap-1.5 font-medium text-gray-400">
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-purple-400 transition-colors"
                  >
                    Privacy Policy
                  </a>
                  <span>•</span>
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-purple-400 transition-colors"
                  >
                    Terms of Service
                  </a>
                </div>

                <div className="relative inline-block mt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                    className="text-gray-400 hover:text-blue-400 font-medium transition-colors underline focus:outline-none"
                  >
                    More
                  </button>

                  {isMoreMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-44 bg-[#161619] border border-white/[0.1] rounded-2xl p-1.5 shadow-2xl flex flex-col gap-0.5 z-50 backdrop-blur-xl animate-fadeIn">
                      <a
                        href="/blog"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsMoreMenuOpen(false)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-200 hover:text-white hover:bg-white/[0.08] transition-colors font-medium block"
                      >
                        What's New
                      </a>
                      <a
                        href="/acknowledgements"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsMoreMenuOpen(false)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-200 hover:text-white hover:bg-white/[0.08] transition-colors font-medium block"
                      >
                        Acknowledgements
                      </a>
                      <a
                        href="/safety"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsMoreMenuOpen(false)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-200 hover:text-white hover:bg-white/[0.08] transition-colors font-medium block"
                      >
                        Support
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-transparent">
          <SettingsPanelHost>
            <div
              ref={rightPanelRef}
              onScroll={handleScroll}
              onWheel={() => {
                isScrollingToRef.current = false;
              }}
              onTouchMove={() => {
                isScrollingToRef.current = false;
              }}
              className="absolute inset-0 overflow-y-auto p-6 sm:p-8 flex flex-col gap-10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20"
            >
              {activeTab === 'account' && (
                <div className="text-gray-950 dark:text-white flex flex-col gap-10 pb-36 animate-fadeIn">
                  <form
                    id="sec-account-info"
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col gap-6"
                  >
                    <h3 className="text-xl font-bold border-b border-black/10 dark:border-white/[0.06] pb-3 text-gray-950 dark:text-white">
                      Account Information
                    </h3>

                    <div className="flex items-center justify-between pb-6 border-b border-black/10 dark:border-white/[0.06]">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-200 text-sm">
                          Profile photo
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          Recommended size 80x80px
                        </p>
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
                          className="bg-black/[0.05] hover:bg-black/[0.10] active:scale-[0.98] border border-black/15 dark:bg-white/[0.06] dark:hover:bg-white/[0.14] dark:border-white/[0.08] text-gray-950 dark:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
                        >
                          <Upload size={14} /> Choose
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pb-6 border-b border-black/10 dark:border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-200 text-sm">
                            Profile banner
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            Upload and drag to position
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
                          className="bg-black/[0.05] hover:bg-black/[0.10] active:scale-[0.98] border border-black/15 dark:bg-white/[0.06] dark:hover:bg-white/[0.14] dark:border-white/[0.08] text-gray-950 dark:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
                        >
                          <Upload size={14} /> Choose
                        </button>
                      </div>

                      <div
                        className={`w-full h-32 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl overflow-hidden border border-black/12 dark:border-white/[0.08] relative group ${
                          bannerPreview
                            ? isDragging
                              ? 'cursor-grabbing'
                              : 'cursor-grab'
                            : 'cursor-default'
                        }`}
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
                              className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                                isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md">
                                <MoveVertical size={16} />{' '}
                                <span className="text-xs font-medium">Pull to position</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500 dark:text-gray-400">
                            <ImageIcon size={28} className="opacity-50" />{' '}
                            <span className="text-xs font-medium">Banner not installed</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 dark:text-gray-300 mb-1.5">
                          Name
                        </label>
                        <input
                          type="text"
                          maxLength={32}
                          {...register('displayName')}
                          placeholder={currentUser?.displayName || 'Your name'}
                          className="w-full bg-black/[0.02] dark:bg-white/[0.04] border border-black/15 dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-gray-950 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition"
                        />
                        {errors.displayName && (
                          <p className="text-xs text-red-500 font-medium mt-1">
                            {errors.displayName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-800 dark:text-gray-300 mb-1.5">
                          Username
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-gray-500 dark:text-gray-400 select-none text-sm font-medium pointer-events-none">
                            @
                          </span>
                          <input
                            {...register('username')}
                            type="text"
                            maxLength={32}
                            placeholder={currentUser?.username || 'username'}
                            className="w-full bg-black/[0.02] dark:bg-white/[0.04] border border-black/15 dark:border-white/[0.08] rounded-xl py-2.5 pl-8 pr-9 text-sm text-gray-950 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                          />
                          {isCheckingUsername && (
                            <Loader2
                              size={16}
                              className="absolute right-3 animate-spin text-gray-500 dark:text-gray-400"
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
                          <label className="block text-xs font-semibold text-gray-800 dark:text-gray-300">
                            About myself
                          </label>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                            {(bioValue || '').length}/200
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          maxLength={200}
                          {...bioRest}
                          ref={(e) => {
                            registerBioRef(e);
                            bioRef.current = e;
                          }}
                          onSelect={handleBioSelect}
                          onKeyUp={handleBioSelect}
                          onMouseUp={handleBioSelect}
                          onKeyDown={handleBioKeyDown}
                          placeholder={currentUser?.bio || 'Tell us about yourself...'}
                          className="w-full bg-black/[0.02] dark:bg-white/[0.04] border border-black/15 dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-gray-950 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition resize-none"
                        />
                        {bioToolbarPos && (
                          <FloatingSelectionToolbar
                            position={bioToolbarPos}
                            onFormat={handleBioFormat}
                            onClose={() => setBioToolbarPos(null)}
                          />
                        )}
                        {errors.bio && (
                          <p className="text-xs text-red-500 font-medium mt-1">
                            {errors.bio.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <button
                        type="submit"
                        disabled={isUsernameTaken || isCheckingUsername || isSaving}
                        className={`bg-gray-950 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                          isUsernameTaken || isCheckingUsername || isSaving
                            ? 'opacity-40 cursor-not-allowed pointer-events-none'
                            : 'hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Save changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  <div
                    id="sec-badges"
                    className="pt-6 border-t border-black/10 dark:border-white/[0.06]"
                  >
                    <BadgeSettingsSection
                      avatarPreview={avatarPreview}
                      bannerPreview={bannerPreview}
                      bannerPos={bannerPos}
                    />
                  </div>

                  <div
                    id="sec-showcase"
                    className="pt-6 border-t border-black/10 dark:border-white/[0.06]"
                  >
                    <ProfileShowcaseSettingsSection />
                  </div>

                  <div
                    id="sec-integrations"
                    className="pt-6 border-t border-black/10 dark:border-white/[0.06] flex flex-col gap-5"
                  >
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2 text-gray-950 dark:text-white">
                        <LinkIcon size={20} className="text-emerald-600 dark:text-emerald-400" />
                        Connected Accounts & Integrations
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        Connect and authenticate your gaming, media, and social platforms. Showcase
                        real-time game ranks, stats, pinned repositories, and playlists in your
                        profile.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {PLATFORMS_LIST.map((p) => {
                        const connectedAccountsMap =
                          (userShowcase?.connectedAccounts as Record<string, any> | undefined) ||
                          {};
                        const isConnected =
                          (p.id === 'github' && Boolean(currentUser?.githubUsername)) ||
                          Boolean(connectedAccountsMap[p.id]);
                        const connectedData =
                          p.id === 'github' && currentUser?.githubUsername
                            ? {
                                username: currentUser.githubUsername,
                                mergedPrsCount: currentUser.mergedPrsCount,
                                ...(connectedAccountsMap.github || {}),
                              }
                            : connectedAccountsMap[p.id];

                        return (
                          <div
                            key={p.id}
                            className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/12 dark:border-white/[0.08] hover:border-black/25 dark:hover:border-white/[0.16] shadow-xs hover:shadow-sm transition-all flex items-center justify-between gap-3 overflow-hidden group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-11 h-11 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                                {p.icon}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1 justify-center">
                                <span className="text-gray-950 dark:text-white font-bold text-sm truncate leading-tight">
                                  {p.name}
                                </span>
                                {isConnected ? (
                                  <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                                    <Check
                                      size={13}
                                      className="text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]"
                                    />
                                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold truncate">
                                      {connectedData?.username ||
                                        connectedData?.handle ||
                                        connectedData?.riotId ||
                                        connectedData?.channel ||
                                        connectedData?.battleTag ||
                                        'Connected'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                                    Not connected
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isConnected ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPlatformModal(p)}
                                    className="bg-black/[0.05] hover:bg-black/[0.10] active:scale-[0.98] text-gray-900 border border-black/15 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-white dark:border-white/[0.08] px-3 py-1.5 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    Configure
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setUnlinkTarget({ id: p.id, name: p.name })}
                                    className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/25 dark:border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer shadow-xs"
                                    title="Disconnect platform"
                                  >
                                    <Unlink size={12} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPlatformModal(p)}
                                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-[0_4px_16px_rgba(88,101,242,0.35)] flex items-center gap-1.5 bg-[#5865F2] hover:bg-[#4752C4] active:scale-95"
                                >
                                  Connect
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <ConfigureIntegrationModal
                    isOpen={isPlatformModalOpen}
                    onClose={() => setIsPlatformModalOpen(false)}
                    platform={activePlatformModal}
                    initialData={
                      activePlatformModal
                        ? activePlatformModal.id === 'github' && currentUser?.githubUsername
                          ? {
                              username: currentUser.githubUsername,
                              mergedPrsCount: currentUser.mergedPrsCount,
                              ...(((userShowcase?.connectedAccounts as Record<string, any>) || {})
                                .github || {}),
                            }
                          : ((userShowcase?.connectedAccounts as Record<string, any>) || {})[
                              activePlatformModal.id
                            ]
                        : null
                    }
                    onSaveSuccess={handlePlatformSaveSuccess}
                  />

                  <UnlinkConfirmationModal
                    isOpen={Boolean(unlinkTarget)}
                    platformName={unlinkTarget?.name || ''}
                    onConfirm={() => {
                      if (unlinkTarget) {
                        handleUnlinkPlatform(unlinkTarget.id);
                        setUnlinkTarget(null);
                      }
                    }}
                    onCancel={() => setUnlinkTarget(null)}
                  />

                  {/* Account Reputation Section */}
                  <div
                    id="sec-reputation"
                    className="pt-6 border-t border-black/10 dark:border-white/[0.06] flex flex-col gap-3"
                  >
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white">
                      Account Reputation
                    </h3>

                    <div
                      onClick={() => setIsReputationPanelOpen(true)}
                      className="flex items-center justify-between p-3.5 -mx-2 rounded-2xl cursor-pointer transition-all duration-150 group hover:bg-black/[0.04] dark:hover:bg-white/[0.04] active:scale-[0.99]"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Check size={20} className="stroke-[3]" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm text-gray-950 dark:text-white">
                            Account Reputation
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                            Thank you for following our{' '}
                            <Link
                              to="/terms"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-500 dark:text-[#00a8fc] hover:underline font-semibold"
                            >
                              Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link
                              to="/guidelines"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-500 dark:text-[#00a8fc] hover:underline font-semibold"
                            >
                              Community Guidelines
                            </Link>
                            . Any policy violations will be documented here.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs sm:text-sm font-semibold text-emerald-500 dark:text-[#23a55a]">
                          Good
                        </span>
                        <ChevronRight
                          size={18}
                          className="text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Family Center Section */}
                  <div
                    id="sec-family"
                    className="pt-6 border-t border-black/10 dark:border-white/[0.06] flex flex-col gap-3"
                  >
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white">
                      Family Center
                    </h3>

                    <div
                      onClick={() => setIsFamilyCenterPanelOpen(true)}
                      className="flex items-center justify-between p-3.5 -mx-2 rounded-2xl cursor-pointer transition-all duration-150 group hover:bg-black/[0.04] dark:hover:bg-white/[0.04] active:scale-[0.99]"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex flex-col min-w-0 flex-1 pr-3">
                        <span className="font-bold text-sm text-gray-950 dark:text-white">
                          Set up Family Center
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                          Stay informed about how your teen uses our platform. Review activity,
                          manage essential safety settings, and stay connected.
                        </span>
                      </div>

                      <div className="flex items-center shrink-0">
                        <ChevronRight
                          size={18}
                          className="text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Account Deactivation & Deletion Controls (Discord 1:1) */}
                  <div className="pt-6 border-t border-black/10 dark:border-white/[0.06] flex flex-col gap-6">
                    {/* Row 1: Deactivate Account */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-gray-950 dark:text-white">
                          Deactivate your account
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                          Temporarily disable your account.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDeactivateModalOpen(true)}
                        className="shrink-0 text-[#f23f43] bg-black/5 hover:bg-black/10 dark:bg-[#2b2d31] dark:hover:bg-[#35373c] border border-black/10 dark:border-white/5 px-4 py-2 text-xs font-semibold rounded-xl transition active:scale-95 shadow-xs cursor-pointer"
                      >
                        Deactivate Account
                      </button>
                    </div>

                    {/* Row 2: Delete Account */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-gray-950 dark:text-white">
                          Delete your account
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                          Permanently delete your account and all data.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="shrink-0 bg-[#da373c] hover:bg-[#c02e33] active:bg-[#a6262b] text-white px-4 py-2 text-xs font-semibold rounded-xl transition active:scale-95 shadow-xs cursor-pointer"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && <AppearanceTab />}

              {activeTab === 'voice-video' && (
                <VoiceVideoTab
                  onNavigateToNotifications={() => {
                    handleSectionClick('notifications', 'sec-notifs');
                  }}
                />
              )}

              {activeTab === 'security' && (
                <div className="text-gray-950 dark:text-white flex flex-col gap-10 animate-fadeIn">
                  <div id="sec-security" className="flex flex-col gap-6">
                    <h3 className="text-xl font-bold border-b border-black/10 dark:border-white/[0.06] pb-3 flex items-center gap-2">
                      <Lock size={20} className="text-gray-950 dark:text-white" />
                      Password & Security
                    </h3>
                    <SecurityTab />
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="text-gray-950 dark:text-white flex flex-col gap-10 animate-fadeIn">
                  <div id="sec-privacy-opts" className="flex flex-col gap-6">
                    <h3 className="text-xl font-bold border-b border-black/10 dark:border-white/[0.06] pb-3 flex items-center gap-2 text-gray-950 dark:text-white">
                      <Eye size={20} className="text-gray-950 dark:text-white" />
                      Profile Privacy
                    </h3>
                    <PrivacyTab />
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="text-gray-950 dark:text-white flex flex-col gap-10 animate-fadeIn">
                  <div id="sec-notifs" className="flex flex-col gap-6">
                    <h3 className="text-xl font-bold border-b border-black/10 dark:border-white/[0.06] pb-3 flex items-center gap-2 text-gray-950 dark:text-white">
                      <Volume2 size={20} className="text-gray-950 dark:text-white" />
                      Sound & Push Notifications
                    </h3>
                    <NotificationsTab />
                  </div>
                </div>
              )}
            </div>

            {isReputationPanelOpen && (
              <AccountReputationPanel
                isClosing={isSlidePanelClosing}
                onClose={() => {
                  setIsReputationPanelOpen(false);
                  setIsSlidePanelClosing(false);
                }}
              />
            )}
            {isFamilyCenterPanelOpen && (
              <FamilyCenterPanel
                isClosing={isSlidePanelClosing}
                onClose={() => {
                  setIsFamilyCenterPanelOpen(false);
                  setIsSlidePanelClosing(false);
                }}
              />
            )}
            {isDeactivateModalOpen && (
              <DeactivateAccountModal onClose={() => setIsDeactivateModalOpen(false)} />
            )}
            {isDeleteModalOpen && (
              <DeleteAccountModal onClose={() => setIsDeleteModalOpen(false)} />
            )}
          </SettingsPanelHost>
        </div>
      </div>

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-sm bg-[#121215] border border-white/[0.1] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-white">
            <button
              type="button"
              onClick={() => setIsLogoutModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col gap-1">
              <h4 className="text-lg font-bold">Log Out</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Are you sure you want to log out?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
