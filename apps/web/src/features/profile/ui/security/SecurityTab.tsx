import { useState } from 'react';
import { KeyRound, ShieldBan, MonitorSmartphone } from 'lucide-react';
import SettingsRow from '@/shared/ui/SettingsRow';
import ChangePasswordModal from './ChangePasswordModal';
import AutoDeleteTimerRow from './AutoDeleteTimerRow';
import LocalDevicePasswordGate from './LocalDevicePasswordGate';
import SessionsPanel from './SessionsPanel';
import RestrictedAccountsPanel from '@/features/chat/ui/RestrictedAccountsPanel';
import { useSessions } from '../../model/useSessions';
import { useBlockedUsers } from '@/features/chat/model/useBlockedUsers';

interface SecurityTabProps {
  renderBlockedAccountsPanel?: (props: { onClose: () => void }) => React.ReactNode;
}

export default function SecurityTab({ renderBlockedAccountsPanel }: SecurityTabProps = {}) {
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);

  const { data: sessions } = useSessions();
  const { data: blockedUsers } = useBlockedUsers();
  const blockedCount: number | undefined = blockedUsers?.length;

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

      {changePwOpen && <ChangePasswordModal onClose={() => setChangePwOpen(false)} />}
      {sessionsOpen && <SessionsPanel onClose={() => setSessionsOpen(false)} />}
      {blockedOpen &&
        (renderBlockedAccountsPanel ? (
          renderBlockedAccountsPanel({ onClose: () => setBlockedOpen(false) })
        ) : (
          <RestrictedAccountsPanel onClose={() => setBlockedOpen(false)} />
        ))}
    </div>
  );
}
