import * as React from 'react';
import { Text, View } from 'react-native';
import { KeyRound, Laptop, MoonStar, Smartphone, Timer, Trash2 } from 'lucide-react-native';
import type { AutoDeletePeriod } from '@social-network/shared-contracts';
import { Button, Input, PasswordInput } from '@/shared/ui';
import { ErrorNotice } from '../../feed/ui/primitives';
import type { SessionView } from '../api/settingsApi';
import {
  useChangePassword,
  useDeactivateAccount,
  useDeleteAccount,
  usePrivacy,
  useSessionActions,
  useSessions,
  useUpdatePrivacy,
} from '../model/settings';
import {
  ChoiceSheet,
  QueryState,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  choiceLabel,
  settingsStyles,
  type Choice,
} from './SettingsKit';
import { formatDate, msg, plural, tr } from '@/shared/lib/i18n';

const AUTO_DELETE: readonly Choice<AutoDeletePeriod>[] = [
  { value: 'OFF', label: msg('Off'), detail: msg('Messages are kept until you delete them.') },
  { value: 'DAY', label: msg('After 1 day') },
  { value: 'WEEK', label: msg('After 1 week') },
  { value: 'MONTH', label: msg('After 1 month') },
  { value: 'QUARTER', label: msg('After 3 months') },
];

type Panel = 'password' | 'deactivate' | 'delete' | null;

const status = (error: unknown) => (error as { response?: { status?: number } })?.response?.status;

export function SecuritySettings({
  userId,
  username,
  isOnline,
  active,
  onBack,
  onSignOut,
}: {
  userId: string;
  username: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onSignOut: () => void;
}) {
  const [panel, setPanel] = React.useState<Panel>(null);
  const [autoDelete, setAutoDelete] = React.useState(false);
  const [pendingPeriod, setPendingPeriod] = React.useState<AutoDeletePeriod | null>(null);
  const [passwordChanged, setPasswordChanged] = React.useState(false);
  const privacy = usePrivacy(userId);
  const updatePrivacy = useUpdatePrivacy(userId);
  const period = privacy.data?.autoDeletePeriod ?? 'OFF';
  const toggle = (next: Panel) => setPanel((current) => (current === next ? null : next));

  return (
    <SettingsPage
      title={tr('Security')}
      active={active}
      onBack={onBack}
      testID="mobile-settings-security"
    >
      <SettingsGroup title={tr('Sign-in')}>
        <SettingsRow
          Icon={KeyRound}
          label={tr('Change password')}
          detail={passwordChanged ? tr('Password updated.') : tr('Other devices stay signed in.')}
          disabled={!isOnline}
          onPress={() => toggle('password')}
        />
      </SettingsGroup>
      {panel === 'password' && (
        <ChangePassword
          onDone={() => {
            setPanel(null);
            setPasswordChanged(true);
          }}
          onCancel={() => setPanel(null)}
          isOnline={isOnline}
        />
      )}

      <Sessions userId={userId} isOnline={isOnline} />

      <SettingsGroup
        title={tr('Messages')}
        footer={tr(
          'Applies to new messages in your chats. Messages already sent keep their timer.',
        )}
      >
        <SettingsRow
          Icon={Timer}
          label={tr('Auto-delete messages')}
          value={choiceLabel(AUTO_DELETE, period) ?? tr('Off')}
          disabled={!privacy.data || !isOnline}
          onPress={() => setAutoDelete(true)}
        />
      </SettingsGroup>
      {pendingPeriod && (
        <View style={settingsStyles.confirm} accessibilityRole="alert">
          <Text style={settingsStyles.lead}>
            {tr(
              'Turn on auto-delete {period}? New messages you send will disappear for everyone after that time.',
              { period: (choiceLabel(AUTO_DELETE, pendingPeriod) ?? '').toLowerCase() },
            )}
          </Text>
          <View style={settingsStyles.actions}>
            <Button
              title={tr('Turn on')}
              variant="purple"
              size="sm"
              fullWidth={false}
              onPress={() => {
                updatePrivacy.mutate({ autoDeletePeriod: pendingPeriod });
                setPendingPeriod(null);
              }}
            />
            <Button
              title={tr('Cancel')}
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => setPendingPeriod(null)}
            />
          </View>
        </View>
      )}
      {updatePrivacy.isError && (
        <ErrorNotice message={tr("The setting wasn't saved. Try again.")} />
      )}
      {privacy.isError && <QueryState query={privacy} />}

      <SettingsGroup title={tr('Account')}>
        <SettingsRow
          Icon={MoonStar}
          label={tr('Deactivate account')}
          detail={tr('Make your account private and hide your showcase.')}
          disabled={!isOnline}
          onPress={() => toggle('deactivate')}
        />
        <SettingsRow
          Icon={Trash2}
          label={tr('Delete account')}
          detail={tr('Permanently remove your account and content.')}
          danger
          disabled={!isOnline}
          onPress={() => toggle('delete')}
        />
      </SettingsGroup>
      {panel === 'deactivate' && (
        <Deactivate
          userId={userId}
          isOnline={isOnline}
          onDone={() => setPanel(null)}
          onCancel={() => setPanel(null)}
        />
      )}
      {panel === 'delete' && (
        <DeleteAccount
          userId={userId}
          username={username}
          isOnline={isOnline}
          onDeleted={onSignOut}
          onCancel={() => setPanel(null)}
        />
      )}

      {autoDelete && (
        <ChoiceSheet
          title={tr('Auto-delete messages')}
          description={tr('Choose when new messages you send are deleted for everyone.')}
          value={period}
          choices={AUTO_DELETE}
          onClose={() => setAutoDelete(false)}
          onPick={(value) => {
            if (value === period) return;
            if (value === 'OFF') updatePrivacy.mutate({ autoDeletePeriod: value });
            else setPendingPeriod(value);
          }}
        />
      )}
    </SettingsPage>
  );
}

function ChangePassword({
  isOnline,
  onDone,
  onCancel,
}: {
  isOnline: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const change = useChangePassword();
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [touched, setTouched] = React.useState({ next: false, confirm: false });
  const nextError =
    touched.next && next.length > 0 && next.length < 8 ? tr('Use at least 8 characters.') : null;
  const confirmError =
    touched.confirm && confirm && confirm !== next ? tr("Passwords don't match.") : null;
  const sameError =
    next && next === current ? tr('Use a different password from your current one.') : null;
  const ready = current.length >= 8 && next.length >= 8 && next === confirm && !sameError;

  return (
    <View style={settingsStyles.form}>
      <PasswordInput
        label={tr('Current password')}
        value={current}
        autoComplete="current-password"
        textContentType="password"
        onChangeText={setCurrent}
      />
      <PasswordInput
        label={tr('New password')}
        value={next}
        autoComplete="new-password"
        textContentType="newPassword"
        onChangeText={(value) => {
          setNext(value);
          setTouched((state) => ({ ...state, next: false }));
        }}
        onBlur={() => setTouched((state) => ({ ...state, next: true }))}
        error={nextError ?? sameError}
        showRequirementsChecklist
        passwordValue={next}
      />
      <PasswordInput
        label={tr('Confirm new password')}
        value={confirm}
        autoComplete="new-password"
        textContentType="newPassword"
        onChangeText={(value) => {
          setConfirm(value);
          setTouched((state) => ({ ...state, confirm: false }));
        }}
        onBlur={() => setTouched((state) => ({ ...state, confirm: true }))}
        error={confirmError}
      />
      {change.isError && (
        <ErrorNotice
          message={
            status(change.error) === 401 || status(change.error) === 400
              ? tr('Your current password is incorrect.')
              : tr("Your password wasn't changed. Try again.")
          }
        />
      )}
      <View style={settingsStyles.actions}>
        <Button
          title={tr('Change password')}
          variant="purple"
          size="sm"
          fullWidth={false}
          loading={change.isPending}
          disabled={!ready || !isOnline}
          onPress={() =>
            change.mutate({ currentPassword: current, newPassword: next }, { onSuccess: onDone })
          }
        />
        <Button
          title={tr('Cancel')}
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={onCancel}
        />
      </View>
    </View>
  );
}

function sessionPlace(session: SessionView) {
  const place = [session.city, session.country].filter(Boolean).join(', ');
  const seen = new Date(session.lastActiveAt);
  const when = Number.isNaN(seen.getTime())
    ? ''
    : formatDate(seen, { dateStyle: 'medium', timeStyle: 'short' });
  return [place, session.isCurrent ? tr('This device') : when ? tr('Active {when}', { when }) : '']
    .filter(Boolean)
    .join(' · ');
}

function Sessions({ userId, isOnline }: { userId: string; isOnline: boolean }) {
  const sessions = useSessions(userId);
  const actions = useSessionActions(userId);
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const others = sessions.data?.filter((session) => !session.isCurrent) ?? [];

  if (!sessions.data) return <QueryState query={sessions} />;
  return (
    <>
      <SettingsGroup
        title={tr("Where you're signed in")}
        footer={tr("Sign out of devices you don't recognize, then change your password.")}
      >
        {sessions.data.map((session) => {
          const confirming = confirm === session.id;
          const mobile = /iphone|android|ios|mobile/i.test(session.deviceName ?? '');
          return (
            <SettingsRow
              key={session.id}
              Icon={mobile ? Smartphone : Laptop}
              label={session.deviceName || tr('Unknown device')}
              detail={sessionPlace(session)}
              accessory={
                session.isCurrent ? undefined : (
                  <Button
                    title={confirming ? tr('Sign out?') : tr('Sign out')}
                    variant={confirming ? 'danger' : 'secondary'}
                    size="sm"
                    fullWidth={false}
                    loading={actions.revoke.isPending && actions.revoke.variables === session.id}
                    disabled={!isOnline}
                    accessibilityHint={
                      confirming ? tr('Signs this device out') : tr('Tap again to confirm')
                    }
                    onPress={() => {
                      if (!confirming) return setConfirm(session.id);
                      setConfirm(null);
                      actions.revoke.mutate(session.id);
                    }}
                  />
                )
              }
            />
          );
        })}
      </SettingsGroup>
      {others.length > 1 && (
        <Button
          title={
            confirm === 'all'
              ? plural(others.length, {
                  one: 'Sign out {count} device?',
                  other: 'Sign out {count} devices?',
                })
              : tr('Sign out all other devices')
          }
          variant={confirm === 'all' ? 'danger' : 'secondary'}
          loading={actions.revokeOthers.isPending}
          disabled={!isOnline}
          onPress={() => {
            if (confirm !== 'all') return setConfirm('all');
            setConfirm(null);
            actions.revokeOthers.mutate();
          }}
        />
      )}
      {(actions.revoke.isError || actions.revokeOthers.isError) && (
        <ErrorNotice message={tr("The device wasn't signed out. Try again.")} />
      )}
    </>
  );
}

function Deactivate({
  userId,
  isOnline,
  onDone,
  onCancel,
}: {
  userId: string;
  isOnline: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const deactivate = useDeactivateAccount(userId);
  const [password, setPassword] = React.useState('');
  const [done, setDone] = React.useState(false);
  if (done)
    return (
      <View style={settingsStyles.confirm}>
        <Text style={settingsStyles.success} accessibilityRole="alert">
          {tr(
            'Your account is private and your showcase is hidden. Make your account public in Privacy to come back.',
          )}
        </Text>
        <Button
          title={tr('Done')}
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={onDone}
        />
      </View>
    );
  return (
    <View style={settingsStyles.confirm}>
      <Text style={settingsStyles.lead}>
        {tr(
          'Deactivating makes your account private and hides your showcase, activity and links. Your posts and chats stay. Enter your password to continue.',
        )}
      </Text>
      <PasswordInput
        label={tr('Password')}
        value={password}
        autoComplete="current-password"
        textContentType="password"
        onChangeText={setPassword}
      />
      {deactivate.isError && (
        <ErrorNotice
          message={
            status(deactivate.error) === 401 || status(deactivate.error) === 400
              ? tr('That password is incorrect.')
              : tr("Your account wasn't deactivated. Try again.")
          }
        />
      )}
      <View style={settingsStyles.actions}>
        <Button
          title={tr('Deactivate account')}
          variant="danger"
          size="sm"
          fullWidth={false}
          loading={deactivate.isPending}
          disabled={!password || !isOnline}
          onPress={() => deactivate.mutate(password, { onSuccess: () => setDone(true) })}
        />
        <Button
          title={tr('Cancel')}
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={onCancel}
        />
      </View>
    </View>
  );
}

function DeleteAccount({
  userId,
  username,
  isOnline,
  onDeleted,
  onCancel,
}: {
  userId: string;
  username: string;
  isOnline: boolean;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const remove = useDeleteAccount(userId);
  const [password, setPassword] = React.useState('');
  const [typed, setTyped] = React.useState('');
  const matches = typed.trim().replace(/^@/, '').toLowerCase() === username.toLowerCase();
  return (
    <View style={settingsStyles.confirm}>
      <Text style={settingsStyles.lead}>
        {tr(
          "Deleting {name} permanently removes your profile, posts, reels, messages and followers. This can't be undone.",
          { name: `@${username}` },
        )}
      </Text>
      <Input
        label={tr('Type {name} to confirm', { name: username })}
        value={typed}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setTyped}
        accessibilityLabel={tr('Type {name} to confirm', { name: username })}
      />
      <PasswordInput
        label={tr('Password')}
        value={password}
        autoComplete="current-password"
        textContentType="password"
        onChangeText={setPassword}
      />
      {remove.isError && (
        <ErrorNotice
          message={
            status(remove.error) === 401 ||
            status(remove.error) === 400 ||
            status(remove.error) === 403
              ? tr('That password is incorrect.')
              : tr("Your account wasn't deleted. Try again.")
          }
        />
      )}
      <View style={settingsStyles.actions}>
        <Button
          title={tr('Delete account')}
          variant="danger"
          size="sm"
          fullWidth={false}
          loading={remove.isPending}
          disabled={!password || !matches || !isOnline}
          onPress={() => remove.mutate(password, { onSuccess: onDeleted })}
        />
        <Button
          title={tr('Keep account')}
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={onCancel}
        />
      </View>
    </View>
  );
}
