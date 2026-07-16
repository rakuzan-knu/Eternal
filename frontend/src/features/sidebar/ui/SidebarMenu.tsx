import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Bookmark,
  AlertTriangle,
  HelpCircle,
  FileText,
  ShieldCheck,
  LogOut,
  Menu,
} from 'lucide-react';
import { useClickOutside } from '@/shared/lib/useClickOutside';
import { useUIStore } from '@/shared/model/useUIStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { authApi } from '@/features/auth/api/authApi';
import { MenuItem } from './MenuItem';
import { ThemeMenuItem } from './ThemeSubmenu';
import { AccountSwitcherMenuItem } from './AccountSwitcherSubmenu';
import { ManageAccountsModal } from './ManageAccountsModal';
import { AddAccountModal } from './AddAccountModal';
import { ReportProblemModal } from './ReportProblemModal';
import { ReportDetailsModal } from './ReportDetailsModal';

type ActiveModal = 'manageAccounts' | 'addAccount' | 'reportStep1' | 'reportStep2' | null;

interface ProfileMenuProps {
  isSidebarExpanded: boolean;
}

export function ProfileMenu({ isSidebarExpanded }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setIsOpen(false));

  const navigate = useNavigate();
  const openEditProfile = useUIStore((s) => s.openEditProfile);

  const { data: currentUser } = useCurrentUser();
  const accounts = useAccountsStore((s) => s.accounts);
  const upsertAccount = useAccountsStore((s) => s.upsertAccount);
  const switchAccountInStore = useAccountsStore((s) => s.switchAccount);

  useEffect(() => {
    if (!currentUser) return;
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (!accessToken || !refreshToken) return;
    if (accounts.some((a) => a.id === currentUser.id)) return;

    upsertAccount({
      id: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatar: currentUser.avatar ?? null,
      accessToken,
      refreshToken,
    });
  }, [currentUser, accounts, upsertAccount]);

  const openModal = (modal: ActiveModal) => {
    setIsOpen(false);
    setActiveModal(modal);
  };

  const closeAll = () => {
    setIsOpen(false);
    setActiveModal(null);
  };

  const handleSwitchAccount = (id: string) => {
    const account = switchAccountInStore(id);
    if (!account) return;
    window.location.href = '/feed';
  };

  const handleLogout = async () => {
    const activeId = useAccountsStore.getState().activeAccountId;
    try {
      await authApi.logout();
    } catch {
      // Best-effort — still forget it locally even if the server call fails.
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    if (activeId) useAccountsStore.getState().removeAccount(activeId);
    window.location.href = '/login';
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`flex items-center rounded-2xl transition-all duration-200 group relative h-12 ${
          isOpen
            ? 'bg-white/10 text-white font-semibold shadow-md'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
        } ${isSidebarExpanded ? 'w-full px-4 gap-4 justify-start' : 'w-12 justify-center mx-auto'}`}
      >
        <div className="flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
          <Menu size={24} />
        </div>
        <span
          className={`text-[15px] font-medium transition-all duration-200 whitespace-nowrap ${
            isSidebarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 absolute'
          }`}
        >
          More
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute bottom-full left-0 mb-2 w-72 bg-[#16161a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] animate-menuIn origin-bottom-left"
        >
          <MenuItem
            icon={Settings}
            label="Settings"
            onClick={() => {
              openEditProfile();
              setIsOpen(false);
            }}
          />
          <MenuItem icon={Bookmark} label="Saved" onClick={() => setIsOpen(false)} />
          <ThemeMenuItem />
          <MenuItem
            icon={AlertTriangle}
            label="Problem report"
            onClick={() => openModal('reportStep1')}
          />

          <div className="h-px bg-white/10 my-2" />

          <MenuItem
            icon={HelpCircle}
            label="FAQ"
            onClick={() => {
              navigate('/faq');
              setIsOpen(false);
            }}
          />
          <MenuItem
            icon={FileText}
            label="Terms of use"
            onClick={() => {
              navigate('/terms');
              setIsOpen(false);
            }}
          />
          <MenuItem
            icon={ShieldCheck}
            label="Privacy Policy"
            onClick={() => {
              navigate('/privacy');
              setIsOpen(false);
            }}
          />

          <div className="h-px bg-white/10 my-2" />

          <AccountSwitcherMenuItem
            onSwitchAccount={handleSwitchAccount}
            onOpenManageAccounts={() => openModal('manageAccounts')}
          />

          <div className="h-px bg-white/10 my-2" />

          <MenuItem icon={LogOut} label="Log out" danger onClick={handleLogout} />
        </div>
      )}

      {activeModal === 'manageAccounts' && (
        <ManageAccountsModal
          onClose={closeAll}
          onAddAccount={() => setActiveModal('addAccount')}
          onSwitchAccount={handleSwitchAccount}
        />
      )}
      {activeModal === 'addAccount' && (
        <AddAccountModal onClose={closeAll} onBack={() => setActiveModal('manageAccounts')} />
      )}
      {activeModal === 'reportStep1' && (
        <ReportProblemModal onClose={closeAll} onContinue={() => setActiveModal('reportStep2')} />
      )}
      {activeModal === 'reportStep2' && (
        <ReportDetailsModal onClose={closeAll} onBack={() => setActiveModal('reportStep1')} />
      )}
    </div>
  );
}
