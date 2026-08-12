import { useState } from 'react';
import { KeyRound, ShieldBan, MonitorSmartphone, Trash2 } from 'lucide-react';
import SettingsRow from '@/shared/ui/SettingsRow';
import RestrictedAccountsPanel from '@/features/chat/ui/RestrictedAccountsPanel';
import ChangePasswordModal from './ChangePasswordModal';
import AutoDeleteTimerRow from './AutoDeleteTimerRow';
import LocalDevicePasswordGate from './LocalDevicePasswordGate';
import SessionsPanel from './SessionsPanel';
import DeleteAccountModal from './DeleteAccountModal';
import { useSessions } from '../../model/useSessions';

export default function SecurityTab() {
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const { data: sessions } = useSessions();
  const blockedCount: number | undefined = undefined;

  return (
    <div className="animate-fadeIn">
      <SettingsRow
        icon={<KeyRound size={17} />}
        title="Change password"
        subtitle="Update your password for account login."
        onClick={() => setChangePwOpen(true)}
      />

      <AutoDeleteTimerRow />

      <LocalDevicePasswordGate />

      <SettingsRow
        icon={<ShieldBan size={17} />}
        title="Blocked users"
        subtitle="People who cannot message you or see your activity."
        value={blockedCount}
        onClick={() => setBlockedOpen(true)}
      />

      <SettingsRow
        icon={<MonitorSmartphone size={17} />}
        title="Active sessions"
        subtitle="Devices where you are logged in."
        value={sessions?.length}
        onClick={() => setSessionsOpen(true)}
        last
      />

      <div className="mt-8 pt-6 border-t border-white/[0.08]">
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/15">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-red-400 text-sm">Account Deletion</h4>
            <p className="text-xs text-gray-400 mt-0.5">Permanently close your account.</p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteAccountOpen(true)}
            className="flex-shrink-0 bg-[#da373c] hover:bg-[#c02e33] active:bg-[#a6262b] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {changePwOpen && <ChangePasswordModal onClose={() => setChangePwOpen(false)} />}
      {sessionsOpen && <SessionsPanel onClose={() => setSessionsOpen(false)} />}
      {blockedOpen && <RestrictedAccountsPanel onClose={() => setBlockedOpen(false)} />}
      {deleteAccountOpen && <DeleteAccountModal onClose={() => setDeleteAccountOpen(false)} />}
    </div>
  );
}
