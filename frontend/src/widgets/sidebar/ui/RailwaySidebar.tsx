import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Search,
  Compass,
  MessageSquare,
  Bell,
  PlusSquare,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Zap,
} from 'lucide-react';
import { useUIStore } from '../../../shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useStoryEditorStore } from '@/features/stories/model/useStoryEditorStore';
import { ProfileMenu } from '@/features/sidebar/ui/SidebarMenu';
import Avatar from '../../../shared/ui/Avatar';
import Tooltip from '../../../shared/ui/Tooltip';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import { useQueryOnlineStatus } from '@/features/chat/model/usePresence';
import { useUnreadMessagesCount } from '@/features/chat/model/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/entities/notification';

const menuItems = [
  { to: '/', icon: <Home size={22} />, label: 'Home' },
  { to: '/search', icon: <Search size={22} />, label: 'Search' },
  { to: '/reels', icon: <Compass size={22} />, label: 'Reels' },
  { to: '/messages', icon: <MessageSquare size={22} />, label: 'Message' },
  { to: '/notifications', icon: <Bell size={22} />, label: 'Notifications' },
  { to: '/create', icon: <PlusSquare size={22} />, label: 'Create', isAction: true },
];

export default function MessengerSidebar() {
  const { isSidebarExpanded, toggleSidebar } = useUIStore();
  const { data: currentUser } = useCurrentUser();
  const openStoryEditor = useStoryEditorStore((s) => s.openEditor);
  const location = useLocation();
  const navigate = useNavigate();
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

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
  const profilePath = currentUser?.username ? `/${currentUser.username}` : null;
  const isProfileActive = Boolean(profilePath && location.pathname === profilePath);
  const activeConversationId = location.pathname.startsWith('/messages/')
    ? location.pathname.split('/')[2] || null
    : null;
  const unreadMessagesCount = useUnreadMessagesCount(activeConversationId, {
    showPushNotifications: false,
  });
  const unreadMessagesLabel = unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount);
  const unreadNotificationsCount = useUnreadNotificationsCount();
  const unreadNotificationsLabel =
    unreadNotificationsCount > 99 ? '99+' : String(unreadNotificationsCount);
  useQueryOnlineStatus(currentUser?.id ? [currentUser.id] : []);

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 flex flex-col justify-between py-6 bg-[#16161a] border-r border-white/5 z-50 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? 'w-[200px] px-4' : 'w-16 px-0'
      }`}
    >
      <div className="flex flex-col w-full h-full">
        <div
          className={`relative flex items-center h-12 mb-6 w-full transition-all duration-300 ${
            isSidebarExpanded ? 'px-2 justify-between' : 'justify-center'
          }`}
        >
          <span
            className={`font-sans font-bold text-2xl text-white tracking-wider whitespace-nowrap transition-all duration-300 ${
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
              className={`group/logo relative flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300 ${
                isSidebarExpanded
                  ? 'w-8 h-8 bg-transparent hover:bg-white/5'
                  : 'w-10 h-10 bg-white/5 hover:bg-white/10'
              }`}
            >
              {isSidebarExpanded ? (
                <PanelLeftClose
                  size={18}
                  className="text-gray-400 group-hover/logo:text-white transition-colors duration-150"
                />
              ) : (
                <>
                  <span className="font-sans font-bold text-xl text-white opacity-80 group-hover/logo:opacity-0 transition-opacity duration-150">
                    E
                  </span>
                  <PanelLeftOpen
                    size={18}
                    className="absolute text-white opacity-0 group-hover/logo:opacity-100 transition-opacity duration-150"
                  />
                </>
              )}
            </button>
          </Tooltip>
        </div>

        <nav className="flex flex-col gap-2 w-full px-2 flex-1 relative">
          {menuItems.map((item) => {
            if (item.isAction) {
              return (
                <div key={item.label} className="relative" ref={createMenuRef}>
                  <NavLink
                    to="/create"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsCreateMenuOpen((v) => !v);
                    }}
                    className={`flex items-center rounded-2xl transition-all duration-200 group relative h-12 text-gray-400 hover:bg-white/5 hover:text-white cursor-pointer ${
                      isCreateMenuOpen ? 'bg-white/10 text-white font-semibold' : ''
                    } ${isSidebarExpanded ? 'w-full px-4 gap-4 justify-start' : 'w-12 justify-center mx-auto'}`}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                      <span className="relative flex items-center justify-center text-purple-400 group-hover:text-purple-300">
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

                  {/* Dark Glassmorphism Popup Menu */}
                  {isCreateMenuOpen && (
                    <div
                      className={`absolute z-50 min-w-[200px] bg-[#16161f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-[0_15px_35px_rgba(0,0,0,0.6)] animate-popIn ${
                        isSidebarExpanded ? 'left-full ml-3 top-0' : 'left-full ml-3 top-0'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={handleCreatePost}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                      >
                        <FileText size={16} className="text-purple-400" />
                        <span>Создать пост</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateStory}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer mt-1"
                      >
                        <Zap size={16} className="text-pink-400" />
                        <span>Опубликовать историю</span>
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
                className={({ isActive }) =>
                  `flex items-center rounded-2xl transition-all duration-200 group relative h-12 ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold shadow-md'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  } ${isSidebarExpanded ? 'w-full px-4 gap-4 justify-start' : 'w-12 justify-center mx-auto'}`
                }
              >
                <div className="flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <span className="relative flex items-center justify-center">
                    {item.icon}
                    {!isSidebarExpanded && item.to === '/messages' && unreadMessagesCount > 0 && (
                      <span className="absolute left-[18px] top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black border-2 border-[#16161a] text-[10px] font-bold leading-none flex items-center justify-center">
                        {unreadMessagesLabel}
                      </span>
                    )}
                    {!isSidebarExpanded &&
                      item.to === '/notifications' &&
                      unreadNotificationsCount > 0 && (
                        <span className="absolute left-[18px] top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1 rounded-full bg-purple-500 text-white border-2 border-[#16161a] text-[10px] font-bold leading-none flex items-center justify-center">
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
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-white text-black text-[11px] font-bold leading-none flex items-center justify-center">
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

        <div className="w-full px-4">
          <div className="h-px w-full bg-white/10 my-2"></div>
        </div>

        <div className="w-full px-2 mt-2">
          <ProfileMenu isSidebarExpanded={isSidebarExpanded} />
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
            <div className="relative flex-shrink-0">
              <Avatar size="sm" src={currentUser?.avatar} />
              {currentUser?.id && <OnlineStatusIndicator userId={currentUser.id} variant="dot" />}
            </div>

            <div
              className={`flex items-center justify-between flex-1 transition-all duration-300 overflow-hidden min-w-0 ${
                isSidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 hidden'
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
