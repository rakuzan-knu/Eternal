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
  X,
} from 'lucide-react';
import { useClickOutside } from '@/shared/lib/useClickOutside';
import { useUIStore } from '@/shared/model/useUIStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { authApi } from '@/features/auth/api/authApi';
import Modal from '@/shared/ui/Modal';
import { MenuItem } from './MenuItem';
import { ThemeMenuItem } from './ThemeSubmenu';
import { AccountSwitcherMenuItem } from './AccountSwitcherSubmenu';
import { ManageAccountsModal } from './ManageAccountsModal';
import { AddAccountModal } from './AddAccountModal';
import { ReportProblemModal } from './ReportProblemModal';
import { ReportDetailsModal } from './ReportDetailsModal';

type ActiveModal =
  'manageAccounts' | 'addAccount' | 'reportStep1' | 'reportStep2' | 'logoutConfirm' | null;

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

    upsertAccount({
      id: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatar: currentUser.avatar ?? null,
      accessToken,
      refreshToken,
    });
  }, [
    currentUser?.id,
    currentUser?.avatar,
    currentUser?.username,
    currentUser?.displayName,
    upsertAccount,
  ]);

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
    closeAll();
    navigate('/feed');
  };

  const handleConfirmLogout = async () => {
    const activeId = useAccountsStore.getState().activeAccountId || currentUser?.id;
    try {
      await authApi.logout();
    } catch {
      // Best-effort — still forget it locally even if the server call fails.
    }
    if (activeId) useAccountsStore.getState().removeAccount(activeId);

    const remainingAccounts = useAccountsStore.getState().accounts.filter((a) => a.id !== activeId);
    if (remainingAccounts.length > 0) {
      handleSwitchAccount(remainingAccounts[0].id);
    } else {
      useAuthStore.getState().clearAuth();
      closeAll();
      navigate('/login');
    }
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
          <MenuItem
            icon={Bookmark}
            label="Saved"
            onClick={() => {
              setIsOpen(false);
              if (currentUser?.username) {
                navigate(`/${currentUser.username}?tab=saved`);
              } else {
                navigate('/');
              }
            }}
          />
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

          <MenuItem
            icon={LogOut}
            label="Log out"
            danger
            onClick={() => openModal('logoutConfirm')}
          />
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
      {activeModal === 'logoutConfirm' && (
        <Modal onClose={closeAll} className="w-full max-w-sm">
          {(close) => (
            <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <LogOut size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Log out</h3>
                    <p className="text-xs text-gray-400">@{currentUser?.username || 'account'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed">
                Are you sure you want to log out? You can sign back in or switch to another account
                at any time.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-bold transition-all shadow-lg shadow-red-600/20 cursor-pointer"
                >
                  Log out
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
