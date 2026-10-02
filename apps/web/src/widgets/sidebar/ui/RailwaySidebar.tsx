import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  Film,
  Music2,
  MessageSquare,
  Bell,
  PlusSquare,
  Store,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Zap,
} from 'lucide-react';
import { useUIStore } from '../../../shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useStoryEditorStore } from '@/features/stories/model/useStoryEditorStore';
import { ProfileMenu } from './SidebarMenu';
import Avatar from '../../../shared/ui/Avatar';
import Tooltip from '../../../shared/ui/Tooltip';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import SidebarScrollbar from './SidebarScrollbar';
import { useQueryOnlineStatus } from '@/features/chat/model/usePresence';
import { useUnreadMessagesCount } from '@/features/chat/model/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '../model/useUnreadNotificationsCount';

const menuItems = [
  { to: '/', icon: <Home size={22} />, label: 'Home' },
  { to: '/search', icon: <Search size={22} />, label: 'Search' },
  { to: '/reels', icon: <Film size={22} />, label: 'Reels' },
  { to: '/music', icon: <Music2 size={22} />, label: 'Music Hub' },
  { to: '/messages', icon: <MessageSquare size={22} />, label: 'Message' },
  { to: '/notifications', icon: <Bell size={22} />, label: 'Notifications' },
  { to: '/create', icon: <PlusSquare size={22} />, label: 'Create', isAction: true },
  { to: '/shop', icon: <Store size={22} />, label: 'Shop' },
];

export default function MessengerSidebar() {
  const isSidebarExpanded = useUIStore((s) => s.isSidebarExpanded);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
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
  const [createMenuPos, setCreateMenuPos] = useState<{ top: number; left: number } | null>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const createMenuPopupRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(target) &&
        createMenuPopupRef.current &&
        !createMenuPopupRef.current.contains(target)
      ) {
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

  // Close create menu when navigating or modals open
  useEffect(() => {
    setIsCreateMenuOpen(false);
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
  const showPushNotifications = Boolean(currentUser?.id) && !isAuthRoute;
  const unreadMessagesCount = useUnreadMessagesCount(activeConversationId, {
    showPushNotifications,
  });
  const unreadMessagesLabel = unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount);
  const unreadNotificationsCount = useUnreadNotificationsCount();
  const unreadNotificationsLabel =
    unreadNotificationsCount > 99 ? '99+' : String(unreadNotificationsCount);
  useQueryOnlineStatus(currentUser?.id ? [currentUser.id] : []);

  return (
    <aside
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
      className={`group/sidebar fixed top-0 left-0 bottom-0 flex flex-col justify-between py-6 glass-sidebar border-r border-black/10 dark:border-white/10 z-50 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? 'w-[200px] px-4' : 'w-16 px-0'
      }`}
    >
      <div className="flex flex-col w-full h-full min-h-0">
        <div
          className={`relative flex items-center h-12 mb-6 w-full shrink-0 transition-all duration-300 ${
            isSidebarExpanded ? 'px-2 justify-between' : 'justify-center'
          }`}
        >
          <span
            className={`font-sans font-bold text-2xl text-gray-900 dark:text-white tracking-wider whitespace-nowrap transition-all duration-300 ${
              isSidebarExpanded
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-2 absolute pointer-events-none'
            }`}
          >
            Eternal
          </span>

          <Tooltip
            label={isSidebarExpanded ? 'Close sidebar' : 'Open sidebar'}
            position={isSidebarExpanded ? 'bottom' : 'right'}
          >
            <button
              onClick={toggleSidebar}
              aria-label={isSidebarExpanded ? 'Close sidebar' : 'Open sidebar'}
              className={`group/logo relative flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
                isSidebarExpanded
                  ? 'w-8 h-8 bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
                  : 'w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              {isSidebarExpanded ? (
                <PanelLeftClose
                  size={18}
                  className="text-gray-700 dark:text-gray-400 group-hover/logo:text-gray-950 dark:group-hover/logo:text-white transition-colors duration-150"
                />
              ) : (
                <>
                  <span className="font-sans font-black text-xl text-gray-900 dark:text-white opacity-90 group-hover/logo:opacity-0 transition-opacity duration-150">
                    E
                  </span>
                  <PanelLeftOpen
                    size={18}
                    className="absolute text-gray-900 dark:text-white opacity-0 group-hover/logo:opacity-100 transition-opacity duration-150"
                  />
                </>
              )}
            </button>
          </Tooltip>
        </div>

        <div className="relative flex-1 min-h-0 w-full flex flex-col">
          <nav
            ref={navRef}
            className="flex flex-col gap-2 w-full px-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden sidebar-scrollbar relative py-1"
          >
            {menuItems.map((item) => {
              if (item.isAction) {
                return (
                  <div key={item.label} className="relative shrink-0" ref={createMenuRef}>
                    <NavLink
                      to="/create"
                      aria-label={item.label}
                      title={item.label}
                      onClick={(e) => {
                        e.preventDefault();
                        if (isCreateMenuOpen) {
                          setIsCreateMenuOpen(false);
                        } else {
                          const rect = createMenuRef.current?.getBoundingClientRect();
                          if (rect) {
                            setCreateMenuPos({
                              top: Math.max(16, rect.top),
                              left: rect.right + 12,
                            });
                          } else {
                            setCreateMenuPos({ top: 200, left: 100 });
                          }
                          setIsCreateMenuOpen(true);
                        }
                      }}
                      className={`flex items-center rounded-2xl transition-all duration-200 group relative h-12 text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white cursor-pointer ${
                        isCreateMenuOpen
                          ? 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-white font-semibold'
                          : ''
                      } ${isSidebarExpanded ? 'w-full px-4 gap-4 justify-start' : 'w-12 justify-center mx-auto'}`}
                    >
                      <div className="flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                        <span className="relative flex items-center justify-center text-purple-500 dark:text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300">
                          {item.icon}
                        </span>
                      </div>
                      <span
                        className={`text-[15px] font-medium transition-all duration-200 whitespace-nowrap ${
                          isSidebarExpanded
                            ? 'opacity-100 translate-x-0'
                            : 'opacity-0 -translate-x-2 absolute'
                        }`}
                      >
                        {item.label}
                      </span>
                    </NavLink>
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
                    `flex items-center rounded-2xl transition-all duration-200 group relative h-12 shrink-0 ${
                      isActive
                        ? 'bg-black/8 dark:bg-white/10 text-gray-950 dark:text-white font-bold shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-950 dark:hover:text-white'
                    } ${isSidebarExpanded ? 'w-full px-4 gap-4 justify-start' : 'w-12 justify-center mx-auto'}`
                  }
                >
                  <div className="flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                    <span className="relative flex items-center justify-center">
                      {item.icon}
                      {!isSidebarExpanded && item.to === '/messages' && unreadMessagesCount > 0 && (
                        <span className="absolute left-[18px] top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1 rounded-full bg-gray-900 text-white dark:bg-white dark:text-black border-2 border-white dark:border-[#16161a] text-[10px] font-bold leading-none flex items-center justify-center">
                          {unreadMessagesLabel}
                        </span>
                      )}
                      {!isSidebarExpanded &&
                        item.to === '/notifications' &&
                        unreadNotificationsCount > 0 && (
                          <span className="absolute left-[18px] top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1 rounded-full bg-purple-500 text-white border-2 border-white dark:border-[#16161a] text-[10px] font-bold leading-none flex items-center justify-center">
                            {unreadNotificationsLabel}
                          </span>
                        )}
                    </span>
                  </div>
                  <span
                    className={`text-[15px] font-medium transition-all duration-200 whitespace-nowrap ${
                      isSidebarExpanded
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-2 absolute'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isSidebarExpanded && item.to === '/messages' && unreadMessagesCount > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-gray-900 text-white dark:bg-white dark:text-black text-[11px] font-bold leading-none flex items-center justify-center">
                      {unreadMessagesLabel}
                    </span>
                  )}
                  {isSidebarExpanded &&
                    item.to === '/notifications' &&
                    unreadNotificationsCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-purple-500 text-white text-[11px] font-bold leading-none flex items-center justify-center">
                        {unreadNotificationsLabel}
                      </span>
                    )}
                </NavLink>
              );
            })}
          </nav>
          <SidebarScrollbar scrollRef={navRef} isSidebarHovered={isSidebarHovered} />
        </div>

        <div className="w-full shrink-0 mt-auto pt-2 flex flex-col">
          <div className="w-full px-4">
            <div className="h-px w-full bg-black/10 dark:bg-white/10 my-2"></div>
          </div>

          <div className="w-full px-2 mt-2">
            <ProfileMenu isSidebarExpanded={isSidebarExpanded} />
          </div>

          <div className="w-full px-2 mt-2">
            <NavLink
              to={profilePath ?? location.pathname}
              className={`flex items-center rounded-2xl transition-all duration-200 h-12 w-full ${
                isProfileActive
                  ? 'bg-black/8 dark:bg-white/10 text-gray-950 dark:text-white font-bold'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
              } ${isSidebarExpanded ? 'px-3 gap-3' : 'justify-center mx-auto w-12'}`}
            >
              <div className="relative flex-shrink-0">
                <Avatar size="sm" src={currentUser?.avatar} />
                {currentUser?.id && <OnlineStatusIndicator userId={currentUser.id} variant="dot" />}
              </div>

              <div
                className={`flex items-center justify-between flex-1 transition-all duration-300 overflow-hidden min-w-0 ${
                  isSidebarExpanded
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-4 hidden'
                }`}
              >
                <span className="text-sm font-semibold whitespace-nowrap truncate text-gray-900 dark:text-white">
                  {currentUser?.displayName || currentUser?.username || 'Profile'}
                </span>
                <ChevronRight size={18} className="text-gray-500" />
              </div>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Glassmorphism Popup Menu rendered via Portal */}
      {isCreateMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={createMenuPopupRef}
            style={{
              top: createMenuPos ? `${createMenuPos.top}px` : '200px',
              left: createMenuPos ? `${createMenuPos.left}px` : '100px',
            }}
            className="fixed z-[100] min-w-[210px] glass-menu border border-black/10 dark:border-white/10 rounded-2xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-popIn before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-4"
          >
            <button
              type="button"
              onClick={handleCreatePost}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <FileText size={16} className="text-purple-500 dark:text-purple-400" />
              <span>Create Post</span>
            </button>
            <button
              type="button"
              onClick={handleCreateStory}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left cursor-pointer mt-1"
            >
              <Zap size={16} className="text-pink-500 dark:text-pink-400" />
              <span>Create Story</span>
            </button>
            <button
              type="button"
              onClick={handleCreateReel}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left cursor-pointer mt-1"
            >
              <Film size={16} className="text-cyan-500 dark:text-cyan-400" />
              <span>Create Reel</span>
            </button>
          </div>,
          document.body,
        )}
    </aside>
  );
}
