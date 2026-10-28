import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Award,
  Bell,
  HeartHandshake,
  Languages,
  LayoutGrid,
  Link2,
  Lock,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import type { UserSessionProfile } from '@social-network/shared-stores';
import { Avatar, colors, common } from '../../feed/ui/primitives';
import { AccountSettings } from './AccountSettings';
import { FamilySettings } from './FamilySettings';
import { IntegrationsSettings } from './IntegrationsSettings';
import { ProfileStyleSettings } from './ProfileStyleSettings';
import { ShowcaseSettings } from './ShowcaseSettings';
import { NotificationSettings } from './NotificationSettings';
import { PrivacySettings } from './PrivacySettings';
import { SecuritySettings } from './SecuritySettings';
import { ChoiceSheet, SettingsGroup, SettingsPage, SettingsRow, type Choice } from './SettingsKit';
import {
  type LanguagePreference,
  msg,
  systemLanguage,
  tr,
  useLanguageStore,
} from '@/shared/lib/i18n';

const LANGUAGES: readonly Choice<LanguagePreference>[] = [
  { value: 'system', label: msg('Same as device') },
  { value: 'en', label: msg('English') },
  { value: 'uk', label: msg('Українська') },
];

function LanguageRow() {
  const preference = useLanguageStore((state) => state.preference);
  const setPreference = useLanguageStore((state) => state.setPreference);
  const [open, setOpen] = React.useState(false);
  const current = LANGUAGES.find((item) => item.value === preference) ?? LANGUAGES[0];
  return (
    <>
      <SettingsRow
        Icon={Languages}
        label={tr('Language')}
        value={
          preference === 'system'
            ? tr(systemLanguage() === 'uk' ? 'Українська' : 'English')
            : current
              ? tr(current.label)
              : null
        }
        onPress={() => setOpen(true)}
      />
      {open && (
        <ChoiceSheet
          title={tr('Language')}
          description={tr(
            'Menus, buttons and help pages use this language. Posts and messages stay as written.',
          )}
          value={preference}
          choices={LANGUAGES}
          onPick={setPreference}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export type SettingsSection =
  | 'home'
  | 'account'
  | 'style'
  | 'showcase'
  | 'integrations'
  | 'family'
  | 'security'
  | 'privacy'
  | 'notifications';

export function SettingsScreen({
  user,
  section,
  isOnline,
  active,
  onBack,
  onOpenSection,
  onOpenRequests,
  onOpenWeb,
  onSignOut,
}: {
  user: UserSessionProfile;
  section: SettingsSection;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onOpenSection: (section: SettingsSection) => void;
  onOpenRequests: () => void;
  onOpenWeb: () => void;
  onSignOut: () => void;
}) {
  const shared = { userId: user.id, isOnline, active, onBack };
  switch (section) {
    case 'account':
      return <AccountSettings {...shared} />;
    case 'security':
      return <SecuritySettings {...shared} username={user.username} onSignOut={onSignOut} />;
    case 'privacy':
      return (
        <PrivacySettings {...shared} username={user.username} onOpenRequests={onOpenRequests} />
      );
    case 'notifications':
      return <NotificationSettings {...shared} />;
    case 'style':
      return <ProfileStyleSettings {...shared} />;
    case 'showcase':
      return <ShowcaseSettings {...shared} username={user.username} />;
    case 'integrations':
      return <IntegrationsSettings {...shared} username={user.username} onOpenWeb={onOpenWeb} />;
    case 'family':
      return <FamilySettings {...shared} />;
    default:
      return (
        <SettingsPage
          title={tr('Settings')}
          active={active}
          onBack={onBack}
          testID="mobile-settings"
        >
          <View style={s.identity}>
            <Avatar name={user.displayName || user.username} uri={user.avatarUrl} size={56} />
            <View style={common.flex}>
              <Text style={s.name} numberOfLines={1}>
                {user.displayName || user.username}
              </Text>
              <Text style={common.muted} numberOfLines={1}>
                @{user.username}
                {user.email ? ` · ${user.email}` : ''}
              </Text>
            </View>
          </View>
          <SettingsGroup title={tr('Account')}>
            <SettingsRow
              Icon={UserRound}
              label={tr('Edit profile')}
              detail={tr('Photo, banner, name, username and bio')}
              onPress={() => onOpenSection('account')}
            />
            <SettingsRow
              Icon={Award}
              label={tr('Badges & colors')}
              detail={tr('Badge next to your name and profile colors')}
              onPress={() => onOpenSection('style')}
            />
            <SettingsRow
              Icon={LayoutGrid}
              label={tr('Profile showcase')}
              detail={tr('About me details and who sees each section')}
              onPress={() => onOpenSection('showcase')}
            />
            <SettingsRow
              Icon={Link2}
              label={tr('Integrations')}
              detail={tr('Steam, GitHub, Spotify and more')}
              onPress={() => onOpenSection('integrations')}
            />
            <SettingsRow
              Icon={HeartHandshake}
              label={tr('Family Center')}
              detail={tr('Link with a parent or teen and set safeguards')}
              onPress={() => onOpenSection('family')}
            />
            <SettingsRow
              Icon={ShieldCheck}
              label={tr('Security')}
              detail={tr('Password, devices, auto-delete and account removal')}
              onPress={() => onOpenSection('security')}
            />
          </SettingsGroup>
          <SettingsGroup title={tr('Preferences')}>
            <SettingsRow
              Icon={Lock}
              label={tr('Privacy')}
              detail={tr('Private account and who can see or reach you')}
              onPress={() => onOpenSection('privacy')}
            />
            <SettingsRow
              Icon={Bell}
              label={tr('Notifications')}
              detail={tr('What you hear about, previews and pauses')}
              onPress={() => onOpenSection('notifications')}
            />
            <LanguageRow />
          </SettingsGroup>
        </SettingsPage>
      );
  }
}

const s = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4 },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
});
