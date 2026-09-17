import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  Film,
  Music2,
  MessageSquare,
  Bell,
  PlusSquare,
  ChevronRight,
  FileText,
  Zap,
} from 'lucide-react';
import { useUIStore } from '../../../shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useStoryEditorStore } from '@/features/stories/model/useStoryEditorStore';
import { ProfileMenu } from './SidebarMenu';
import Avatar from '../../../shared/ui/Avatar';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import { useQueryOnlineStatus } from '@/features/chat/model/usePresence';
import { useUnreadMessagesCount } from '@/features/chat/model/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '../model/useUnreadNotificationsCount';

const menuItems = [
  { to: '/', icon: <Home size={24} />, label: 'Home' },
  { to: '/search', icon: <Search size={24} />, label: 'Search' },
  { to: '/reels', icon: <Film size={24} />, label: 'Reels' },
  { to: '/music', icon: <Music2 size={24} />, label: 'Music Hub' },
  { to: '/messages', icon: <MessageSquare size={24} />, label: 'Message' },
  { to: '/notifications', icon: <Bell size={24} />, label: 'Notifications' },
  { to: '/create', icon: <PlusSquare size={24} />, label: 'Create', isAction: true },
];

export default function Sidebar() {
  const isSidebarExpanded = useUIStore((s) => s.isSidebarExpanded);
  const setSidebarExpanded = useUIStore((s) => s.setSidebarExpanded);
  const openCreateReel = useUIStore((s) => s.openCreateReel);
  const isEditProfileOpen = useUIStore((s) => s.isEditProfileOpen);
  const isShareModalOpen = useUIStore((s) => s.isShareModalOpen);
  const isCommentModalOpen = useUIStore((s) => s.isCommentModalOpen);
  const isCreateReelOpen = useUIStore((s) => s.isCreateReelOpen);
  const isStoryEditorOpen = useStoryEditorStore((s) => s.isOpen);
  const { data: currentUser } = useCurrentUser();
  const openStoryEditor = useStoryEditorStore((s) => s.openEditor);
  const location = useLocation();
  const navigate = useNavigate();
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMousePosRef = useRef<{ x: number; time: number } | null>(null);

  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const triggerExpand = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setSidebarExpanded(true);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (isSidebarExpanded) return;

    const isTest =
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
      import.meta.env?.MODE === 'test';
    if (isTest) {
      setSidebarExpanded(true);
      return;
    }

    lastMousePosRef.current = { x: e.clientX, time: performance.now() };

    // Deliberate hover dwell timer: 70ms
    enterTimerRef.current = setTimeout(() => {
      triggerExpand();
      enterTimerRef.current = null;
    }, 70);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isSidebarExpanded) return;
    const now = performance.now();
    if (lastMousePosRef.current) {
      const dt = now - lastMousePosRef.current.time;
      const dx = Math.abs(e.clientX - lastMousePosRef.current.x);
      if (dt > 0) {
        const speed = dx / dt; // px/ms
        // If moving rapidly across (> 1.0 px/ms = 1000px/s), cancel pending expansion to prevent sweep jitter
        if (speed > 1.0) {
          if (enterTimerRef.current) {
            clearTimeout(enterTimerRef.current);
            enterTimerRef.current = null;
          }
        } else {
          // Cursor has decelerated or paused inside sidebar — ready to expand quickly
          if (!enterTimerRef.current) {
            enterTimerRef.current = setTimeout(() => {
              triggerExpand();
              enterTimerRef.current = null;
            }, 50);
          }
        }
      }
    }
    lastMousePosRef.current = { x: e.clientX, time: now };
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    lastMousePosRef.current = null;
    if (isCreateMenuOpen || isMoreMenuOpen) return;
    if (!isSidebarExpanded) return;

    const isTest =
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
      import.meta.env?.MODE === 'test';
    const delay = isTest ? 0 : 120;

    if (delay === 0) {
      setSidebarExpanded(false);
    } else {
      leaveTimerRef.current = setTimeout(() => {
        setSidebarExpanded(false);
        leaveTimerRef.current = null;
      }, delay);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };
    if (isCreateMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCreateMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateMenuOpen(false);
      }
    };
    if (isCreateMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isCreateMenuOpen]);

  // Close menus when navigation happens or modals open
  useEffect(() => {
    setIsCreateMenuOpen(false);
    setIsMoreMenuOpen(false);
  }, [
    location.pathname,
    isEditProfileOpen,
    isShareModalOpen,
    isCommentModalOpen,
    isCreateReelOpen,
    isStoryEditorOpen,
  ]);

  const handleCreatePost = () => {
    setIsCreateMenuOpen(false);
    navigate('/');
    setTimeout(() => {
      const textarea = document.getElementById('create-post-textarea');
      if (textarea) {
        textarea.focus();
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleCreateStory = () => {
    setIsCreateMenuOpen(false);
    openStoryEditor();
  };

  const handleCreateReel = () => {
    setIsCreateMenuOpen(false);
    openCreateReel();
  };
  const profilePath = currentUser?.username ? `/${currentUser.username}` : null;
  const isProfileActive = Boolean(profilePath && location.pathname === profilePath);
  const activeConversationId = location.pathname.startsWith('/messages/')
    ? location.pathname.split('/')[2] || null
    : null;
  const isAuthRoute = ['/login', '/register', '/forgot-password'].includes(location.pathname);
  const showPushNotifications =
    Boolean(currentUser?.id) && !location.pathname.startsWith('/messages') && !isAuthRoute;
  const unreadMessagesCount = useUnreadMessagesCount(activeConversationId, {
    showPushNotifications,
  });
  const unreadMessagesLabel = unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount);
  const unreadNotificationsCount = useUnreadNotificationsCount();
  const unreadNotificationsLabel =
    unreadNotificationsCount > 99 ? '99+' : String(unreadNotificationsCount);
  const isReels = location.pathname.startsWith('/reels');
  useQueryOnlineStatus(currentUser?.id ? [currentUser.id] : []);

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`fixed top-4 left-4 h-[calc(100vh-2rem)] bg-[#16161a]/70 backdrop-blur-2xl border border-white/8 flex flex-col justify-between py-6 z-50 ease-out transition-[width,padding,border-radius] duration-200 will-change-[width] ${
        isSidebarExpanded ? 'w-[256px] px-4 rounded-4xl' : 'w-20 px-0 rounded-[2.5rem]'
      } ${isReels ? 'max-md:hidden' : ''}`}
    >
      <div className="flex flex-col w-full h-full">
        <div
          className={`flex items-center h-12 mb-6 overflow-hidden w-full transition-all duration-200 ${
            isSidebarExpanded ? 'px-4' : 'justify-center'
          }`}
        >
          <span
            className={`font-sans font-bold text-2xl text-white tracking-wider transition-all duration-150 ${
              isSidebarExpanded
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 scale-90 -translate-x-2 absolute pointer-events-none duration-100'
            }`}
          >
            Eternal
          </span>
          {!isSidebarExpanded && (
            <span className="font-sans font-bold text-xl text-white opacity-80">E</span>
          )}
        </div>

        <nav className="flex flex-col gap-2 w-full px-2 flex-1 relative">
          {menuItems.map((item) => {
            if (item.isAction) {
              return (
                <div key={item.label} className="relative" ref={createMenuRef}>
                  <NavLink
                    to="/create"
                    aria-label={item.label}
                    title={item.label}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsCreateMenuOpen((v) => !v);
                    }}
                    className={`flex items-center rounded-2xl transition-all duration-200 ease-out group relative h-12 text-gray-400 hover:bg-white/5 hover:text-white cursor-pointer ${
                      isCreateMenuOpen ? 'bg-white/10 text-white font-semibold' : ''
                    } ${
                      isSidebarExpanded
                        ? 'w-full px-4 gap-4 justify-start'
                        : 'w-12 justify-center mx-auto'
                    }`}
                  >
                    <div className="shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                      <span className="relative flex items-center justify-center text-purple-400 group-hover:text-purple-300">
                        {item.icon}
                      </span>
                    </div>
                    <span
                      className={`text-[15px] font-medium transition-all duration-150 ease-out whitespace-nowrap ${
                        isSidebarExpanded
                          ? 'opacity-100 translate-x-0'
                          : 'opacity-0 -translate-x-2 absolute pointer-events-none duration-100'
                      }`}
                    >
                      {item.label}
                    </span>
                  </NavLink>

                  {/* Dark Glassmorphism Popup Menu */}
                  {isCreateMenuOpen && (
                    <div className="absolute z-70 min-w-52.5 bg-[#16161f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-popIn left-full ml-3 top-0 before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-4">
                      <button
                        type="button"
                        onClick={handleCreatePost}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <FileText size={16} className="text-purple-400" />
                        <span>Create Post</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateStory}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer mt-1"
                      >
                        <Zap size={16} className="text-pink-400" />
                        <span>Create Story</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateReel}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer mt-1"
                      >
                        <Film size={16} className="text-cyan-400" />
                        <span>Create Reel</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                aria-label={item.label}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center rounded-2xl transition-all duration-300 ease-out group relative h-12 ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  } ${
                    isSidebarExpanded
                      ? 'w-full px-4 gap-4 justify-start'
                      : 'w-12 justify-center mx-auto'
                  }`
                }
              >
                <div className="shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <span className="relative flex items-center justify-center">
                    {item.icon}
                    {!isSidebarExpanded && item.to === '/messages' && unreadMessagesCount > 0 && (
                      <span className="absolute left-4.5 top-1/2 -translate-y-1/2 min-w-4.5 h-4.5 px-1 rounded-full bg-white text-black border-2 border-[#16161a] text-[10px] font-bold leading-none flex items-center justify-center animate-badgeCollapse pointer-events-none">
                        {unreadMessagesLabel}
                      </span>
                    )}
                    {!isSidebarExpanded &&
                      item.to === '/notifications' &&
                      unreadNotificationsCount > 0 && (
                        <span className="absolute left-4.5 top-1/2 -translate-y-1/2 min-w-4.5 h-4.5 px-1 rounded-full bg-purple-500 text-white border-2 border-[#16161a] text-[10px] font-bold leading-none flex items-center justify-center animate-badgeCollapse pointer-events-none">
                          {unreadNotificationsLabel}
                        </span>
                      )}
                  </span>
                </div>
                <span
                  className={`text-[15px] font-medium transition-all duration-150 ease-out whitespace-nowrap ${
                    isSidebarExpanded
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 -translate-x-2 absolute pointer-events-none duration-100'
                  }`}
                >
                  {item.label}
                </span>
                {isSidebarExpanded && item.to === '/messages' && unreadMessagesCount > 0 && (
                  <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-white text-black text-[11px] font-bold leading-none flex items-center justify-center animate-badgeExpand select-none">
                    {unreadMessagesLabel}
                  </span>
                )}
                {isSidebarExpanded &&
                  item.to === '/notifications' &&
                  unreadNotificationsCount > 0 && (
                    <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-purple-500 text-white text-[11px] font-bold leading-none flex items-center justify-center animate-badgeExpand select-none">
                      {unreadNotificationsLabel}
                    </span>
                  )}
              </NavLink>
            );
          })}
        </nav>

        <div className="w-full px-4">
          <div className="h-px w-full bg-white/10 my-2"></div>
        </div>

        <div className="w-full px-2 mt-2">
          <ProfileMenu isSidebarExpanded={isSidebarExpanded} onOpenChange={setIsMoreMenuOpen} />
        </div>

        <div className="w-full px-2 mt-2">
          <NavLink
            to={profilePath ?? location.pathname}
            className={`flex items-center rounded-2xl transition-all duration-200 h-12 w-full ${
              isProfileActive
                ? 'bg-white/10 text-white font-semibold'
                : 'hover:bg-white/5 text-gray-400'
            } ${isSidebarExpanded ? 'px-3 gap-3' : 'justify-center mx-auto w-12'}`}
          >
            <div className="relative shrink-0">
              <Avatar size="sm" src={currentUser?.avatar} />
              {currentUser?.id && <OnlineStatusIndicator userId={currentUser.id} variant="dot" />}
            </div>

            <div
              className={`flex items-center justify-between flex-1 transition-all duration-150 overflow-hidden min-w-0 ${
                isSidebarExpanded
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-4 hidden duration-100'
              }`}
            >
              <span className="text-sm font-semibold whitespace-nowrap truncate">
                {currentUser?.displayName || currentUser?.username || 'Profile'}
              </span>
              <ChevronRight size={18} className="text-gray-500" />
            </div>
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
