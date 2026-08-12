import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Compass, MessageSquare, Bell, PlusSquare, ChevronRight } from 'lucide-react';
import { useUIStore } from '../../../shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { ProfileMenu } from '@/features/sidebar/ui/SidebarMenu';
import Avatar from '../../../shared/ui/Avatar';
import OnlineStatusIndicator from '../../../shared/ui/OnlineStatusIndicator';
import { useQueryOnlineStatus } from '@/features/chat/model/usePresence';
import { useUnreadMessagesCount } from '@/features/chat/model/useUnreadMessagesCount';

const menuItems = [
  { to: '/', icon: <Home size={24} />, label: 'Home' },
  { to: '/search', icon: <Search size={24} />, label: 'Search' },
  { to: '/reels', icon: <Compass size={24} />, label: 'Reels' },
  { to: '/messages', icon: <MessageSquare size={24} />, label: 'Message' },
  { to: '/notifications', icon: <Bell size={24} />, label: 'Notifications' },
  { to: '/create', icon: <PlusSquare size={24} />, label: 'Create' },
];

export default function Sidebar() {
  const { isSidebarExpanded, setSidebarExpanded } = useUIStore();
  const { data: currentUser } = useCurrentUser();
  const location = useLocation();
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
  useQueryOnlineStatus(currentUser?.id ? [currentUser.id] : []);

  return (
    <aside
      onMouseEnter={() => setSidebarExpanded(true)}
      onMouseLeave={() => setSidebarExpanded(false)}
      className={`fixed top-4 left-4 h-[calc(100vh-2rem)] bg-[#16161a]/60 backdrop-blur-2xl border border-white/5 flex flex-col justify-between py-6 z-50 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] ease-in-out transition-all duration-300 ${
        isSidebarExpanded ? 'w-[256px] px-4 rounded-[2rem]' : 'w-20 px-0 rounded-[2.5rem]'
      }`}
    >
      <div className="flex flex-col w-full h-full">
        <div
          className={`flex items-center h-12 mb-6 overflow-hidden w-full transition-all duration-300 ${
            isSidebarExpanded ? 'px-4' : 'justify-center'
          }`}
        >
          <span
            className={`font-sans font-bold text-2xl text-white tracking-wider transition-all duration-300 ${
              isSidebarExpanded ? 'opacity-100' : 'opacity-0 scale-50 absolute'
            }`}
          >
            Eternal
          </span>
          {!isSidebarExpanded && (
            <span className="font-sans font-bold text-xl text-white opacity-80">E</span>
          )}
        </div>

        <nav className="flex flex-col gap-2 w-full px-2 flex-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center rounded-2xl transition-all duration-200 group relative h-12 ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold shadow-md'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                } ${
                  isSidebarExpanded
                    ? 'w-full px-4 gap-4 justify-start'
                    : 'w-12 justify-center mx-auto'
                }`
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
            </NavLink>
          ))}
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
