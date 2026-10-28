import * as React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import {
  AtSign,
  BellRing,
  Bell,
  BellOff,
  Heart,
  MessageCircle,
  MessagesSquare,
  Repeat2,
  Smile,
  Sparkles,
  UserPlus,
  Users,
  Volume2,
} from 'lucide-react-native';
import type { NotificationSettingsDto } from '@social-network/shared-contracts';
import { Button } from '@/shared/ui';
import { Avatar, common, ErrorNotice } from '../../feed/ui/primitives';
import {
  dndPreset,
  useNotificationSettings,
  useUnmuteAuthor,
  useUpdateNotifications,
} from '../model/settings';
import {
  ChoiceSheet,
  QueryState,
  SettingsGroup,
  SettingsPage,
  SettingsRow,
  ToggleRow,
  choiceLabel,
  type Choice,
} from './SettingsKit';
import { formatDate, type MessageKey, msg, tr } from '@/shared/lib/i18n';
import { disablePush, enablePush, pushStatus, type PushStatus } from '@/shared/lib/push';

const PUSH_DETAIL: Record<PushStatus, MessageKey> = {
  enabled: msg('New messages and activity arrive even when Eternal is closed.'),
  off: msg('Turn on to get messages and activity when Eternal is closed.'),
  blocked: msg('Notifications are blocked for Eternal. Allow them in your phone settings.'),
  unsupported: msg('Push notifications work in the Eternal app on a phone.'),
  unconfigured: msg('Push notifications aren’t set up for this build yet.'),
};

function PushDeviceRow() {
  const [status, setStatus] = React.useState<PushStatus | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    void pushStatus()
      .then((value) => alive && setStatus(value))
      .catch(() => alive && setStatus('off'));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = async (next: boolean) => {
    setBusy(true);
    setFailed(false);
    try {
      if (next) setStatus(await enablePush(true));
      else {
        await disablePush(true);
        setStatus('off');
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;
  return (
    <>
      <SettingsGroup title={tr('This device')}>
        {status === 'blocked' ? (
          <SettingsRow
            Icon={BellRing}
            label={tr('Push notifications')}
            detail={tr(PUSH_DETAIL[status])}
            value={tr('Open settings')}
            onPress={() => void Linking.openSettings()}
          />
        ) : (
          <ToggleRow
            Icon={BellRing}
            label={tr('Push notifications')}
            detail={tr(PUSH_DETAIL[status])}
            value={status === 'enabled'}
            disabled={busy || status === 'unsupported' || status === 'unconfigured'}
            onChange={(next) => void toggle(next)}
          />
        )}
      </SettingsGroup>
      {failed && <ErrorNotice message={tr("Push notifications couldn't be changed. Try again.")} />}
    </>
  );
}

type CategoryKey =
  | 'privateChats'
  | 'groups'
  | 'mentions'
  | 'comments'
  | 'likes'
  | 'reactions'
  | 'reposts'
  | 'followers'
  | 'system';

const CATEGORIES: readonly { key: CategoryKey; label: MessageKey; Icon: typeof Bell }[] = [
  { key: 'privateChats', label: msg('Private chats'), Icon: MessageCircle },
  { key: 'groups', label: msg('Groups and channels'), Icon: Users },
  { key: 'mentions', label: msg('Mentions'), Icon: AtSign },
  { key: 'comments', label: msg('Comments'), Icon: MessagesSquare },
  { key: 'likes', label: msg('Likes'), Icon: Heart },
  { key: 'reactions', label: msg('Reactions'), Icon: Smile },
  { key: 'reposts', label: msg('Reposts'), Icon: Repeat2 },
  { key: 'followers', label: msg('New followers'), Icon: UserPlus },
  { key: 'system', label: msg('Account and safety updates'), Icon: Sparkles },
];

type DndChoice = 'off' | '1h' | '8h' | 'tomorrow';

const DND: readonly Choice<DndChoice>[] = [
  { value: 'off', label: msg('Off') },
  { value: '1h', label: msg('For 1 hour') },
  { value: '8h', label: msg('For 8 hours') },
  { value: 'tomorrow', label: msg('Until 8:00 tomorrow') },
];

const VOLUME: readonly Choice<'25' | '50' | '75' | '100'>[] = [
  { value: '25', label: msg('Quiet') },
  { value: '50', label: msg('Medium') },
  { value: '75', label: msg('Loud') },
  { value: '100', label: msg('Maximum') },
];

function dndLabel(until: string | null | undefined, now = Date.now()) {
  if (!until) return tr('Off');
  const date = new Date(until);
  if (Number.isNaN(date.getTime()) || date.getTime() <= now) return tr('Off');
  return tr('Until {time}', {
    time: formatDate(date, { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
  });
}

export function NotificationSettings({
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
  const settings = useNotificationSettings(userId);
  const update = useUpdateNotifications(userId);
  const unmute = useUnmuteAuthor(userId);
  const [sheet, setSheet] = React.useState<'dnd' | 'volume' | null>(null);
  const data = settings.data;
  const set = (patch: Partial<NotificationSettingsDto>) => update.mutate(patch);

  return (
    <SettingsPage
      title={tr('Notifications')}
      active={active}
      onBack={onBack}
      testID="mobile-settings-notifications"
    >
      {!data ? (
        <QueryState query={settings} />
      ) : (
        <>
          <PushDeviceRow />
          <SettingsGroup footer={tr("Applies to Eternal on every device you're signed in to.")}>
            <ToggleRow
              Icon={Bell}
              label={tr('Notifications')}
              value={data.enableNotifications}
              disabled={!isOnline}
              onChange={(enableNotifications) => set({ enableNotifications })}
            />
            <SettingsRow
              Icon={BellOff}
              label={tr('Pause notifications')}
              value={dndLabel(data.dndUntil)}
              disabled={!isOnline || !data.enableNotifications}
              onPress={() => setSheet('dnd')}
            />
          </SettingsGroup>
          {data.enableNotifications && (
            <>
              <SettingsGroup title={tr('Notify me about')}>
                {CATEGORIES.map(({ key, label, Icon }) => (
                  <ToggleRow
                    key={key}
                    Icon={Icon}
                    label={tr(label)}
                    value={data[key]}
                    disabled={!isOnline}
                    onChange={(value) => set({ [key]: value })}
                  />
                ))}
              </SettingsGroup>
              <SettingsGroup
                title={tr('Previews')}
                footer={tr('Turn these off to keep names and message text off your lock screen.')}
              >
                <ToggleRow
                  label={tr('Show sender name')}
                  value={data.showName}
                  disabled={!isOnline}
                  onChange={(showName) => set({ showName })}
                />
                <ToggleRow
                  label={tr('Show message text')}
                  value={data.showText}
                  disabled={!isOnline}
                  onChange={(showText) => set({ showText })}
                />
              </SettingsGroup>
              <SettingsGroup title={tr('Sound')}>
                <ToggleRow
                  Icon={Volume2}
                  label={tr('In-app sounds')}
                  value={data.allowSound}
                  disabled={!isOnline}
                  onChange={(allowSound) => set({ allowSound })}
                />
                {data.allowSound && (
                  <SettingsRow
                    label={tr('Volume')}
                    value={
                      choiceLabel(
                        VOLUME,
                        VOLUME.find((item) => Number(item.value) >= data.volume)?.value,
                      ) ?? tr('Maximum')
                    }
                    disabled={!isOnline}
                    onPress={() => setSheet('volume')}
                  />
                )}
              </SettingsGroup>
            </>
          )}
          <SettingsGroup
            title={tr('Muted accounts')}
            footer={tr(
              "You won't get notifications from these accounts. You still see their posts.",
            )}
          >
            {(data.mutedActors ?? []).length === 0 ? (
              <SettingsRow label={tr('No muted accounts')} />
            ) : (
              (data.mutedActors ?? []).map((actor) => {
                const name = actor.displayName || actor.username;
                return (
                  <View key={actor.id} style={s.actor}>
                    <Avatar name={name} uri={actor.avatar} size={36} />
                    <View style={common.flex}>
                      <Text style={common.text} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={common.muted}>@{actor.username}</Text>
                    </View>
                    <Button
                      title={tr('Unmute')}
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      loading={unmute.isPending && unmute.variables === actor.id}
                      disabled={!isOnline}
                      onPress={() => unmute.mutate(actor.id)}
                    />
                  </View>
                );
              })
            )}
          </SettingsGroup>
          {(update.isError || unmute.isError) && (
            <ErrorNotice message={tr("The setting wasn't saved. Try again.")} />
          )}
          <Text style={[common.muted, s.center]}>
            {tr('Pop-up position and stacking are set on the web.')}
          </Text>
        </>
      )}
      {sheet === 'dnd' && data && (
        <ChoiceSheet
          title={tr('Pause notifications')}
          description={tr(
            'Notifications stay silent until the pause ends. New activity still shows in the app.',
          )}
          value={dndLabel(data.dndUntil) === tr('Off') ? 'off' : ('' as DndChoice)}
          choices={DND}
          onPick={(value) => set({ dndUntil: dndPreset(value) })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'volume' && data && (
        <ChoiceSheet
          title={tr('Volume')}
          value={VOLUME.find((item) => Number(item.value) >= data.volume)?.value ?? '100'}
          choices={VOLUME}
          onPick={(value) => set({ volume: Number(value) })}
          onClose={() => setSheet(null)}
        />
      )}
    </SettingsPage>
  );
}

const s = StyleSheet.create({
  actor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 16,
  },
  center: { textAlign: 'center' },
});
