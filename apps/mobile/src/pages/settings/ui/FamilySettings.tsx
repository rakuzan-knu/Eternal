import * as React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  Clock,
  CreditCard,
  Gift,
  Lock,
  MessageCircle,
  MoonStar,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { Button, Input } from '@/shared/ui';
import { Avatar, colors, common, ErrorNotice, Sheet } from '../../feed/ui/primitives';
import type { FamilyMember } from '../api/settingsApi';
import {
  useFamily,
  useFamilyActions,
  useFamilyActivity,
  useFamilySafeguards,
  useFamilySettings,
} from '../model/settings';
import {
  ChoiceSheet,
  QueryState,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  settingsStyles,
  ToggleRow,
  choiceLabel,
  type Choice,
} from './SettingsKit';
import { getLocale, msg, tr } from '@/shared/lib/i18n';

const LIMITS: readonly Choice<string>[] = [
  { value: '0', label: msg('No limit') },
  { value: '30', label: msg('30 minutes a day') },
  { value: '60', label: msg('1 hour a day') },
  { value: '120', label: msg('2 hours a day') },
  { value: '180', label: msg('3 hours a day') },
];

const CURFEWS: readonly Choice<string>[] = [
  { value: 'off', label: msg('Off') },
  { value: '21:00-07:00', label: msg('21:00 – 07:00') },
  { value: '22:00-07:00', label: msg('22:00 – 07:00') },
  { value: '23:00-07:00', label: msg('23:00 – 07:00') },
];

export function FamilySettings({
  userId,
  isOnline,
  active,
  onBack,
}: {
  userId: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
}) {
  const { members, pending } = useFamily(userId);
  const data = members.data;
  const teen = data?.role === 'child';

  return (
    <SettingsPage
      title={tr('Family Center')}
      active={active}
      onBack={onBack}
      testID="mobile-settings-family"
    >
      {!data ? (
        <QueryState query={members} />
      ) : teen ? (
        <TeenView
          userId={userId}
          parents={data.connectedParents}
          pending={pending.data ?? null}
          isOnline={isOnline}
        />
      ) : (
        <ParentView
          userId={userId}
          teens={data.connectedChildren}
          max={data.maxChildren}
          pending={data.connectedChildren.length === 0 ? (pending.data ?? null) : null}
          isOnline={isOnline}
        />
      )}
    </SettingsPage>
  );
}

function PendingRequest({
  userId,
  pending,
  isOnline,
}: {
  userId: string;
  pending: {
    linkId: string;
    parentUsername: string;
    parentDisplayName: string;
    parentAvatar: string | null;
  };
  isOnline: boolean;
}) {
  const actions = useFamilyActions(userId);
  const name = pending.parentDisplayName || pending.parentUsername;
  return (
    <View style={settingsStyles.confirm} accessibilityRole="alert">
      <View style={common.row}>
        <Avatar name={name} uri={pending.parentAvatar} size={40} />
        <Text style={[common.text, common.flex]}>
          {tr('{name} ({username}) wants to link as your parent or guardian.', {
            name,
            username: `@${pending.parentUsername}`,
          })}
        </Text>
      </View>
      <Text style={settingsStyles.lead}>
        {tr(
          "They'll see a summary of your activity, like new friends, screen time and purchases, and can set limits. They never see your private messages or calls.",
        )}
      </Text>
      {actions.confirm.isError && (
        <ErrorNotice message={tr("Your answer wasn't sent. Try again.")} />
      )}
      <View style={settingsStyles.actions}>
        <Button
          title={tr('Accept')}
          variant="purple"
          size="sm"
          fullWidth={false}
          loading={actions.confirm.isPending && actions.confirm.variables?.approved}
          disabled={!isOnline || actions.confirm.isPending}
          onPress={() => actions.confirm.mutate({ linkId: pending.linkId, approved: true })}
        />
        <Button
          title={tr('Decline')}
          variant="secondary"
          size="sm"
          fullWidth={false}
          disabled={!isOnline || actions.confirm.isPending}
          onPress={() => actions.confirm.mutate({ linkId: pending.linkId, approved: false })}
        />
      </View>
    </View>
  );
}

function TeenView({
  userId,
  parents,
  pending,
  isOnline,
}: {
  userId: string;
  parents: FamilyMember[];
  pending: {
    linkId: string;
    parentUsername: string;
    parentDisplayName: string;
    parentAvatar: string | null;
  } | null;
  isOnline: boolean;
}) {
  const actions = useFamilyActions(userId);
  const activity = useFamilyActivity(userId, null);
  const code = actions.createCode.data;
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!code) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [code]);
  const left = code
    ? Math.max(0, Math.round((new Date(code.expiresAt).getTime() - now) / 1000))
    : 0;

  return (
    <>
      {pending && <PendingRequest userId={userId} pending={pending} isOnline={isOnline} />}
      <SettingsGroup
        title={tr('Your parents and guardians')}
        footer={tr(
          'Linked adults see an activity summary and can set limits. They never see your private messages or calls.',
        )}
      >
        {parents.length === 0 ? (
          <SettingsRow Icon={Users} label={tr('No one is linked yet')} />
        ) : (
          parents.map((parent) => (
            <MemberRow key={parent.linkId} member={parent} detail={tr('Parent or guardian')} />
          ))
        )}
      </SettingsGroup>
      <View style={s.codeCard}>
        <Text style={common.title}>{tr('Link with a parent')}</Text>
        <Text style={settingsStyles.lead}>
          {tr(
            'Show this code to your parent. They enter it in Family Center on their account, then you accept here.',
          )}
        </Text>
        {code && left > 0 ? (
          <>
            <Text
              style={s.code}
              selectable
              accessibilityLabel={tr('Pairing code {code}', {
                code: code.code.split('').join(' '),
              })}
            >
              {code.code}
            </Text>
            <Text style={common.muted}>
              {tr('Expires in {time}', {
                time: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`,
              })}
            </Text>
          </>
        ) : null}
        {actions.createCode.isError && (
          <ErrorNotice message={tr("A code couldn't be created. Try again.")} />
        )}
        <Button
          title={code && left > 0 ? tr('Get a new code') : tr('Show pairing code')}
          variant={code && left > 0 ? 'secondary' : 'purple'}
          loading={actions.createCode.isPending}
          disabled={!isOnline}
          onPress={() => actions.createCode.mutate()}
        />
      </View>
      {parents.length > 0 && (
        <ActivitySummary query={activity} title={tr('What your parents see')} />
      )}
    </>
  );
}

function ParentView({
  userId,
  teens,
  max,
  pending,
  isOnline,
}: {
  userId: string;
  teens: FamilyMember[];
  max: number;
  pending: {
    linkId: string;
    parentUsername: string;
    parentDisplayName: string;
    parentAvatar: string | null;
  } | null;
  isOnline: boolean;
}) {
  const actions = useFamilyActions(userId);
  const settings = useFamilySettings(userId, true);
  const [code, setCode] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [open, setOpen] = React.useState<FamilyMember | null>(null);
  const [confirm, setConfirm] = React.useState<string | null>(null);

  return (
    <>
      {pending && <PendingRequest userId={userId} pending={pending} isOnline={isOnline} />}
      <SettingsGroup
        title={tr('Your teens')}
        footer={tr('You can link up to {count} teens.', { count: max })}
      >
        {teens.length === 0 ? (
          <SettingsRow Icon={Users} label={tr('No teens linked yet')} />
        ) : (
          teens.map((teen) => (
            <MemberRow
              key={teen.linkId}
              member={teen}
              detail={tr('{age} years old', { age: teen.age })}
              onPress={() => setOpen(teen)}
              action={
                <Button
                  title={confirm === teen.linkId ? tr('Unlink?') : tr('Unlink')}
                  variant={confirm === teen.linkId ? 'danger' : 'secondary'}
                  size="sm"
                  fullWidth={false}
                  loading={actions.revoke.isPending && actions.revoke.variables === teen.linkId}
                  disabled={!isOnline}
                  accessibilityHint={
                    confirm === teen.linkId
                      ? tr('Unlinks {name}', { name: teen.displayName })
                      : tr('Tap again to confirm')
                  }
                  onPress={() => {
                    if (confirm !== teen.linkId) return setConfirm(teen.linkId);
                    setConfirm(null);
                    actions.revoke.mutate(teen.linkId);
                  }}
                />
              }
            />
          ))
        )}
      </SettingsGroup>
      {actions.revoke.isError && (
        <ErrorNotice message={tr("The teen wasn't unlinked. Try again.")} />
      )}
      {teens.length < max && (
        <View style={s.codeCard}>
          <Text style={common.title}>{tr('Connect a teen')}</Text>
          <Text style={settingsStyles.lead}>
            {tr('Ask your teen to open Settings, then Family Center, and show their pairing code.')}
          </Text>
          <Input
            label={tr('Pairing code')}
            value={code}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
            onChangeText={(value) => {
              setCode(value);
              setSent(false);
            }}
            accessibilityLabel={tr('Pairing code')}
          />
          {actions.pair.isError && (
            <ErrorNotice message={tr('That code is invalid or has expired. Ask for a new one.')} />
          )}
          {sent && (
            <Text style={settingsStyles.success} accessibilityRole="alert">
              {tr('Request sent. Your teen needs to accept it on their account.')}
            </Text>
          )}
          <Button
            title={tr('Send link request')}
            variant="purple"
            loading={actions.pair.isPending}
            disabled={!code.trim() || !isOnline}
            onPress={() =>
              actions.pair.mutate(code.trim(), {
                onSuccess: () => {
                  setSent(true);
                  setCode('');
                },
              })
            }
          />
        </View>
      )}
      {settings.data ? (
        <SettingsGroup title={tr('Alert me about')}>
          <ToggleRow
            Icon={Bell}
            label={tr('Weekly summary')}
            value={settings.data.weeklyDigest}
            disabled={!isOnline}
            onChange={(weeklyDigest) => actions.updateSettings.mutate({ weeklyDigest })}
          />
          <ToggleRow
            Icon={UserPlus}
            label={tr('New friends')}
            value={settings.data.newFriendAlerts}
            disabled={!isOnline}
            onChange={(newFriendAlerts) => actions.updateSettings.mutate({ newFriendAlerts })}
          />
          <ToggleRow
            Icon={ShieldAlert}
            label={tr('Reports they share with you')}
            value={settings.data.reportAlerts}
            disabled={!isOnline}
            onChange={(reportAlerts) => actions.updateSettings.mutate({ reportAlerts })}
          />
          <ToggleRow
            Icon={Users}
            label={tr('Link requests')}
            value={settings.data.notifyLinkRequests}
            disabled={!isOnline}
            onChange={(notifyLinkRequests) => actions.updateSettings.mutate({ notifyLinkRequests })}
          />
        </SettingsGroup>
      ) : (
        settings.isError && <QueryState query={settings} />
      )}
      {actions.updateSettings.isError && (
        <ErrorNotice message={tr("The setting wasn't saved. Try again.")} />
      )}
      {open && (
        <TeenSheet userId={userId} teen={open} isOnline={isOnline} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function MemberRow({
  member,
  detail,
  onPress,
  action,
}: {
  member: FamilyMember;
  detail: string;
  onPress?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <SettingsRow
      label={member.displayName || member.username}
      detail={`@${member.username} · ${detail}`}
      {...(onPress ? { onPress } : {})}
      accessory={
        <View style={common.row}>
          <Avatar name={member.displayName || member.username} uri={member.avatar} size={32} />
          {action}
        </View>
      }
    />
  );
}

function ActivitySummary({
  query,
  title,
}: {
  query: ReturnType<typeof useFamilyActivity>;
  title: string;
}) {
  if (!query.data) return <QueryState query={query} />;
  const a = query.data;
  return (
    <SettingsGroup title={tr('{title} · last {count} days', { title, count: a.periodDays })}>
      <SettingsRow Icon={UserPlus} label={tr('New friends')} value={String(a.newFriendsCount)} />
      <SettingsRow
        Icon={MessageCircle}
        label={tr('People messaged')}
        value={String(a.messagingUsersCount)}
      />
      <SettingsRow
        Icon={Clock}
        label={tr('Voice and video')}
        value={tr('{count} min', { count: a.voiceVideoMinutes })}
      />
      <SettingsRow
        Icon={CreditCard}
        label={tr('Purchases')}
        value={new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'USD' }).format(
          a.purchaseAmount,
        )}
      />
      <SettingsRow Icon={Gift} label={tr('Gifts received')} value={String(a.giftsReceivedCount)} />
      <SettingsRow
        Icon={ShieldAlert}
        label={tr('Reports shared')}
        value={String(a.reportsSharedCount)}
      />
    </SettingsGroup>
  );
}

function TeenSheet({
  userId,
  teen,
  isOnline,
  onClose,
}: {
  userId: string;
  teen: FamilyMember;
  isOnline: boolean;
  onClose: () => void;
}) {
  const activity = useFamilyActivity(userId, teen.id);
  const safeguards = useFamilySafeguards(userId, teen.id);
  const actions = useFamilyActions(userId);
  const [choice, setChoice] = React.useState<'limit' | 'curfew' | null>(null);
  const data = safeguards.data;
  const update = (patch: Parameters<typeof actions.updateSafeguards.mutate>[0]['patch']) =>
    actions.updateSafeguards.mutate({ childId: teen.id, patch });
  const curfew =
    data?.curfewStart && data.curfewEnd ? `${data.curfewStart}-${data.curfewEnd}` : 'off';

  return (
    <Sheet title={teen.displayName || teen.username} onClose={onClose}>
      <ScrollView contentContainerStyle={s.sheet}>
        <ActivitySummary query={activity} title={tr('Activity')} />
        {!data ? (
          <QueryState query={safeguards} />
        ) : (
          <SettingsGroup title={tr('Safeguards')}>
            <SettingsRow
              Icon={Clock}
              label={tr('Daily time limit')}
              value={
                choiceLabel(LIMITS, String(data.dailyLimitMinutes)) ??
                tr('{count} min', { count: data.dailyLimitMinutes })
              }
              disabled={!isOnline}
              onPress={() => setChoice('limit')}
            />
            <SettingsRow
              Icon={MoonStar}
              label={tr('Quiet hours')}
              value={choiceLabel(CURFEWS, curfew) ?? curfew.replace('-', ' – ')}
              disabled={!isOnline}
              onPress={() => setChoice('curfew')}
            />
            <ToggleRow
              Icon={MessageCircle}
              label={tr('Messages only from mutual friends')}
              value={data.restrictedDirectMessages}
              disabled={!isOnline}
              onChange={(restrictedDirectMessages) => update({ restrictedDirectMessages })}
            />
            <ToggleRow
              Icon={CreditCard}
              label={tr('Ask before purchases')}
              value={data.requirePurchaseApproval}
              disabled={!isOnline}
              onChange={(requirePurchaseApproval) => update({ requirePurchaseApproval })}
            />
            <ToggleRow
              Icon={Lock}
              label={tr('Lock privacy settings')}
              detail={tr("Your teen can't change their privacy settings.")}
              value={data.profileLockedByParent ?? data.profileSettingsLocked}
              disabled={!isOnline}
              onChange={(profileLockedByParent) => update({ profileLockedByParent })}
            />
          </SettingsGroup>
        )}
        {actions.updateSafeguards.isError && (
          <ErrorNotice message={tr("The safeguard wasn't saved. Try again.")} />
        )}
      </ScrollView>
      {choice === 'limit' && data && (
        <ChoiceSheet
          title={tr('Daily time limit')}
          value={String(data.dailyLimitMinutes)}
          choices={LIMITS}
          onPick={(value) => update({ dailyLimitMinutes: Number(value) })}
          onClose={() => setChoice(null)}
        />
      )}
      {choice === 'curfew' && data && (
        <ChoiceSheet
          title={tr('Quiet hours')}
          description={tr('Eternal is unavailable to your teen during these hours.')}
          value={curfew}
          choices={CURFEWS}
          onPick={(value) => {
            const [start, end] = value === 'off' ? [null, null] : value.split('-');
            update({ curfewStart: start ?? null, curfewEnd: end ?? null });
          }}
          onClose={() => setChoice(null)}
        />
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  codeCard: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  code: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    paddingVertical: 8,
  },
  sheet: { padding: 16, paddingBottom: 40, gap: 24 },
});
