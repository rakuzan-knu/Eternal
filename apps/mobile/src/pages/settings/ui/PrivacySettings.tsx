import * as React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Lock, MapPin, UserMinus, UserPlus, Users } from 'lucide-react-native';
import type {
  ExceptionMode,
  PrivacyDimension,
  PrivacyExceptionUserDto,
  Visibility,
} from '@social-network/shared-contracts';
import { Button } from '@/shared/ui';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from '../../feed/ui/primitives';
import { PeoplePicker } from '../../chat/ui/PeoplePicker';
import { useFollowRequestCount } from '../../profile/model/connections';
import {
  PRIVACY_DIMENSIONS,
  useExceptionActions,
  useExceptions,
  usePrivacy,
  useUpdatePrivacy,
  VISIBILITY_LABEL,
} from '../model/settings';
import { QueryState, SettingsGroup, SettingsPage, SettingsRow, ToggleRow } from './SettingsKit';
import { type MessageKey, msg, tr } from '@/shared/lib/i18n';

const DIMENSION_COPY: Record<PrivacyDimension, { label: MessageKey; question: MessageKey }> = {
  LAST_SEEN: {
    label: msg('Last seen & online'),
    question: msg('Who can see when you were last online?'),
  },
  AVATAR: { label: msg('Profile photo'), question: msg('Who can see your profile photo?') },
  BANNER: { label: msg('Banner'), question: msg('Who can see your profile banner?') },
  BIO: { label: msg('Bio'), question: msg('Who can see your bio?') },
  BIRTHDAY: { label: msg('Birthday'), question: msg('Who can see your birthday?') },
  MESSAGES: { label: msg('Messages'), question: msg('Who can send you messages?') },
  CALLS: { label: msg('Calls'), question: msg('Who can call you?') },
  VOICE_MESSAGES: {
    label: msg('Voice messages'),
    question: msg('Who can send you voice messages?'),
  },
  FORWARD_LINK: {
    label: msg('Forwarded messages'),
    question: msg('Who can link to your account when forwarding your messages?'),
  },
  GROUP_INVITES: { label: msg('Group invites'), question: msg('Who can add you to groups?') },
  THEME_PROPOSALS: {
    label: msg('Chat theme proposals'),
    question: msg('Who can propose chat themes to you?'),
  },
};

const VISIBILITIES: readonly Visibility[] = ['EVERYBODY', 'CONTACTS', 'NOBODY'];

const dimensionKey = (dimension: PrivacyDimension) =>
  PRIVACY_DIMENSIONS.find(([id]) => id === dimension)?.[1] ?? 'lastSeen';

export function PrivacySettings({
  userId,
  username,
  isOnline,
  active,
  onBack,
  onOpenRequests,
}: {
  userId: string;
  username: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onOpenRequests: () => void;
}) {
  const privacy = usePrivacy(userId);
  const update = useUpdatePrivacy(userId);
  const requests = useFollowRequestCount(userId, !!privacy.data?.isPrivate);
  const [dimension, setDimension] = React.useState<PrivacyDimension | null>(null);
  const data = privacy.data;

  return (
    <SettingsPage
      title={tr('Privacy')}
      active={active}
      onBack={onBack}
      testID="mobile-settings-privacy"
    >
      {!data ? (
        <QueryState query={privacy} />
      ) : (
        <>
          <SettingsGroup
            title={tr('Account')}
            footer={
              data.isPrivate
                ? tr('Only people you approve can see your posts, reels, followers and following.')
                : tr('Anyone can see your posts and reels and follow you.')
            }
          >
            <ToggleRow
              Icon={Lock}
              label={tr('Private account')}
              value={data.isPrivate}
              disabled={!isOnline}
              onChange={(isPrivate) => update.mutate({ isPrivate })}
            />
            {data.isPrivate && (
              <SettingsRow
                Icon={UserPlus}
                label={tr('Follow requests')}
                value={requests.data ? String(requests.data) : null}
                onPress={onOpenRequests}
              />
            )}
            <ToggleRow
              Icon={MapPin}
              label={tr('Show me in nearby recommendations')}
              detail={tr(
                'People in your city can find you in Suggested for you. Your exact location is never shared.',
              )}
              value={data.allowNearbyRecommendations ?? true}
              disabled={!isOnline}
              onChange={(allowNearbyRecommendations) =>
                update.mutate({ allowNearbyRecommendations })
              }
            />
          </SettingsGroup>
          <SettingsGroup
            title={tr('Who can see and reach you')}
            footer={tr(
              '“My followers” means people whose follow you’ve accepted. Add exceptions for specific people inside each setting.',
            )}
          >
            {PRIVACY_DIMENSIONS.map(([id, key]) => (
              <SettingsRow
                key={id}
                label={tr(DIMENSION_COPY[id].label)}
                value={tr(VISIBILITY_LABEL[data[key] ?? 'EVERYBODY'])}
                disabled={!isOnline}
                onPress={() => setDimension(id)}
              />
            ))}
          </SettingsGroup>
          {update.isError && <ErrorNotice message={tr("The setting wasn't saved. Try again.")} />}
          <Text style={[common.muted, s.footnote]}>
            {tr('Signed in as @{username}', { username })}
          </Text>
        </>
      )}
      {dimension && data && (
        <DimensionSheet
          userId={userId}
          dimension={dimension}
          value={data[dimensionKey(dimension)] ?? 'EVERYBODY'}
          isOnline={isOnline}
          onChange={(value) => update.mutate({ [dimensionKey(dimension)]: value })}
          onClose={() => setDimension(null)}
        />
      )}
    </SettingsPage>
  );
}

function DimensionSheet({
  userId,
  dimension,
  value,
  isOnline,
  onChange,
  onClose,
}: {
  userId: string;
  dimension: PrivacyDimension;
  value: Visibility;
  isOnline: boolean;
  onChange: (value: Visibility) => void;
  onClose: () => void;
}) {
  const exceptions = useExceptions(userId, dimension);
  const actions = useExceptionActions(userId, dimension);
  const [adding, setAdding] = React.useState<ExceptionMode | null>(null);
  const copy = DIMENSION_COPY[dimension];
  const existing = [...(exceptions.data?.allow ?? []), ...(exceptions.data?.deny ?? [])].map(
    (user) => user.id,
  );

  if (adding)
    return (
      <Sheet
        title={adding === 'ALLOW' ? tr('Always allow') : tr('Never allow')}
        onClose={() => setAdding(null)}
      >
        <PeoplePicker
          userId={userId}
          multi={false}
          selected={[]}
          excludeIds={existing}
          onPick={(person) =>
            actions.add.mutate(
              { targetId: person.id, mode: adding },
              { onSuccess: () => setAdding(null) },
            )
          }
          header={
            actions.add.isError ? (
              <View style={s.padded}>
                <ErrorNotice message={tr("The exception wasn't added. Try again.")} />
              </View>
            ) : null
          }
        />
      </Sheet>
    );

  return (
    <Sheet title={tr(copy.label)} onClose={onClose}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.question}>{tr(copy.question)}</Text>
        <View style={s.surface} accessibilityRole="radiogroup">
          {VISIBILITIES.map((option, index) => {
            const selected = option === value;
            return (
              <React.Fragment key={option}>
                {index > 0 && <View style={s.divider} />}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: !isOnline }}
                  aria-checked={selected}
                  disabled={!isOnline}
                  onPress={() => onChange(option)}
                  style={({ pressed }) => [s.option, pressed && s.pressed]}
                >
                  <Text style={[s.optionText, common.flex]}>{tr(VISIBILITY_LABEL[option])}</Text>
                  {selected && <Check size={20} color={colors.purple} />}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>
        {!exceptions.data ? (
          <QueryState query={exceptions} />
        ) : (
          <>
            {value !== 'EVERYBODY' && (
              <ExceptionList
                title={tr('Always allow')}
                hint={tr('These people can, even if your setting says otherwise.')}
                users={exceptions.data.allow}
                isOnline={isOnline}
                removing={actions.remove.isPending ? actions.remove.variables : undefined}
                onAdd={() => setAdding('ALLOW')}
                onRemove={(id) => actions.remove.mutate(id)}
              />
            )}
            {value !== 'NOBODY' && (
              <ExceptionList
                title={tr('Never allow')}
                hint={tr("These people can't, even if your setting allows it.")}
                users={exceptions.data.deny}
                isOnline={isOnline}
                removing={actions.remove.isPending ? actions.remove.variables : undefined}
                onAdd={() => setAdding('DENY')}
                onRemove={(id) => actions.remove.mutate(id)}
              />
            )}
          </>
        )}
        {actions.remove.isError && (
          <ErrorNotice message={tr("The exception wasn't removed. Try again.")} />
        )}
      </ScrollView>
    </Sheet>
  );
}

function ExceptionList({
  title,
  hint,
  users,
  isOnline,
  removing,
  onAdd,
  onRemove,
}: {
  title: string;
  hint: string;
  users: PrivacyExceptionUserDto[];
  isOnline: boolean;
  removing?: string;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={s.block}>
      <View style={s.blockHeader}>
        <View style={common.flex}>
          <Text accessibilityRole="header" style={s.blockTitle}>
            {title}
          </Text>
          <Text style={common.muted}>{hint}</Text>
        </View>
        <Button
          title={tr('Add')}
          variant="ghost"
          size="sm"
          fullWidth={false}
          disabled={!isOnline}
          leftIcon={<UserPlus size={16} color={colors.purple} />}
          onPress={onAdd}
        />
      </View>
      <View style={s.surface}>
        {users.length === 0 ? (
          <View style={s.empty}>
            <Users size={18} color={colors.muted} />
            <Text style={common.muted}>{tr('No one added')}</Text>
          </View>
        ) : (
          users.map((user, index) => {
            const name = user.displayName || user.username;
            return (
              <React.Fragment key={user.id}>
                {index > 0 && <View style={s.divider} />}
                <View style={s.option}>
                  <Avatar name={name} uri={user.avatar} size={36} />
                  <View style={common.flex}>
                    <Text style={s.optionText} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={common.muted}>@{user.username}</Text>
                  </View>
                  <IconButton
                    label={tr('Remove {name} from {list}', { name, list: title })}
                    disabled={!isOnline || removing === user.id}
                    onPress={() => onRemove(user.id)}
                  >
                    <UserMinus size={18} color={colors.muted} />
                  </IconButton>
                </View>
              </React.Fragment>
            );
          })
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  question: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  surface: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  pressed: { backgroundColor: '#ffffff08' },
  block: { gap: 8 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  blockTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  padded: { paddingHorizontal: 16, paddingTop: 8 },
  footnote: { textAlign: 'center' },
});
