import * as React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, LogOut, Pencil, UserMinus, UserPlus } from 'lucide-react-native';
import type { ParticipantView } from '@social-network/shared-contracts';
import { Button, Input } from '@/shared/ui';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from '../../feed/ui/primitives';
import { useConversation, useGroupActions } from '../model/queries';
import { PeoplePicker, type PickedPerson } from './PeoplePicker';
import { plural, tr } from '@/shared/lib/i18n';

const roleLabel = (role: string) =>
  role === 'OWNER' ? tr('Owner') : role === 'ADMIN' ? tr('Admin') : null;

export function GroupInfoScreen({
  userId,
  conversationId,
  isOnline,
  active,
  onBack,
  onLeft,
  onOpenProfile,
}: {
  userId: string;
  conversationId: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onLeft: () => void;
  onOpenProfile: (username: string) => void;
}) {
  const conversation = useConversation(userId, conversationId);
  const actions = useGroupActions(userId, conversationId);
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const [picked, setPicked] = React.useState<PickedPerson[]>([]);
  const [confirm, setConfirm] = React.useState<
    { kind: 'remove'; member: ParticipantView } | { kind: 'leave' } | null
  >(null);
  const data = conversation.data;
  const me = data?.participants.find((participant) => participant.userId === userId);
  const manager = me?.role === 'OWNER' || me?.role === 'ADMIN';

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${data?.name ?? 'Group'} • Eternal`;
  }, [active, data?.name]);

  if (!data)
    return (
      <View style={s.screen}>
        <View style={s.topBar}>
          <IconButton label={tr('Back')} onPress={onBack}>
            <ArrowLeft size={22} color={colors.text} />
          </IconButton>
        </View>
        {conversation.isError ? (
          <View style={s.padded}>
            <ErrorNotice
              message={tr("Group info couldn't be loaded.")}
              onRetry={() => {
                void conversation.refetch();
              }}
            />
          </View>
        ) : (
          <ActivityIndicator
            color={colors.purple}
            style={s.loader}
            accessibilityLabel={tr('Loading group')}
          />
        )}
      </View>
    );

  const members = [...data.participants].sort(
    (a, b) =>
      ['OWNER', 'ADMIN', 'MEMBER'].indexOf(a.role) - ['OWNER', 'ADMIN', 'MEMBER'].indexOf(b.role) ||
      (a.user.displayName || a.user.username).localeCompare(b.user.displayName || b.user.username),
  );

  return (
    <View style={s.screen} testID="mobile-group-info">
      <View style={s.topBar}>
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text accessibilityRole="header" style={s.topTitle}>
          {tr('Group info')}
        </Text>
        {manager && !editing ? (
          <IconButton
            label={tr('Edit group name and description')}
            onPress={() => {
              setName(data.name ?? '');
              setDescription(data.description ?? '');
              setEditing(true);
            }}
          >
            <Pencil size={20} color={colors.text} />
          </IconButton>
        ) : (
          <View style={s.spacer} />
        )}
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <Avatar name={data.name ?? 'Group'} uri={data.avatar} size={84} />
          {editing ? (
            <View style={s.form}>
              <Input
                label={tr('Group name')}
                value={name}
                maxLength={128}
                onChangeText={setName}
                accessibilityLabel={tr('Group name')}
              />
              <Input
                label={tr('Description')}
                value={description}
                maxLength={512}
                multiline
                onChangeText={setDescription}
                accessibilityLabel={tr('Group description')}
              />
              {actions.rename.isError && (
                <ErrorNotice message={tr("Changes weren't saved. Try again.")} />
              )}
              <View style={s.row}>
                <Button
                  title={tr('Cancel')}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  style={common.flex}
                  onPress={() => setEditing(false)}
                />
                <Button
                  title={tr('Save')}
                  variant="purple"
                  size="sm"
                  fullWidth={false}
                  style={common.flex}
                  loading={actions.rename.isPending}
                  disabled={!isOnline || !name.trim()}
                  onPress={() =>
                    actions.rename.mutate(
                      { name: name.trim(), description: description.trim() },
                      { onSuccess: () => setEditing(false) },
                    )
                  }
                />
              </View>
            </View>
          ) : (
            <>
              <Text style={s.name}>{data.name ?? tr('Unnamed group')}</Text>
              <Text style={common.muted}>
                {plural(data.participants.length, {
                  one: '{count} member',
                  other: '{count} members',
                })}
              </Text>
              {!!data.description && <Text style={s.description}>{data.description}</Text>}
            </>
          )}
        </View>

        <View style={s.block}>
          <View style={s.sectionRow}>
            <Text accessibilityRole="header" style={s.section}>
              {tr('Members')}
            </Text>
            {manager && (
              <Button
                title={tr('Add')}
                variant="ghost"
                size="sm"
                fullWidth={false}
                disabled={!isOnline}
                leftIcon={<UserPlus size={16} color={colors.purple} />}
                onPress={() => {
                  setPicked([]);
                  setAdding(true);
                }}
              />
            )}
          </View>
          <View style={s.surface}>
            {members.map((member, index) => {
              const display = member.user.displayName || member.user.username;
              const isMe = member.userId === userId;
              const removable = manager && !isMe && member.role !== 'OWNER';
              const confirming =
                confirm?.kind === 'remove' && confirm.member.userId === member.userId;
              return (
                <View key={member.userId}>
                  {index > 0 && <View style={s.divider} />}
                  <View style={s.memberRow}>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={tr('{name}. Open profile', {
                        name: [
                          isMe ? tr('{name}, you', { name: display }) : display,
                          roleLabel(member.role),
                        ]
                          .filter(Boolean)
                          .join(', '),
                      })}
                      onPress={() => onOpenProfile(member.user.username)}
                      style={({ pressed }) => [s.identity, pressed && common.pressed]}
                    >
                      <Avatar name={display} uri={member.user.avatar} size={40} />
                      <View style={common.flex}>
                        <Text style={s.memberName} numberOfLines={1}>
                          {display}
                          {isMe ? ' (you)' : ''}
                        </Text>
                        <Text style={common.muted} numberOfLines={1}>
                          @{member.user.username}
                        </Text>
                      </View>
                      {roleLabel(member.role) && (
                        <View style={s.role}>
                          <Text style={s.roleText}>{roleLabel(member.role)}</Text>
                        </View>
                      )}
                    </Pressable>
                    {removable && (
                      <IconButton
                        label={
                          confirming
                            ? tr('Confirm removing {name}', { name: display })
                            : tr('Remove {name}', { name: display })
                        }
                        disabled={!isOnline || actions.remove.isPending}
                        onPress={() =>
                          confirming
                            ? actions.remove.mutate(member.userId, {
                                onSettled: () => setConfirm(null),
                              })
                            : setConfirm({ kind: 'remove', member })
                        }
                        style={confirming ? s.dangerIcon : undefined}
                      >
                        <UserMinus size={18} color={confirming ? '#fff' : colors.muted} />
                      </IconButton>
                    )}
                  </View>
                  {confirming && (
                    <Text style={s.confirmText} accessibilityRole="alert">
                      Tap again to remove {display} from the group.
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
          {actions.remove.isError && (
            <ErrorNotice message={tr("The member wasn't removed. Try again.")} />
          )}
        </View>

        <View style={s.block}>
          {confirm?.kind === 'leave' ? (
            <View style={s.confirm} accessibilityRole="alert">
              <Text style={common.title}>
                {tr('Leave {name}?', { name: data.name ?? tr('this group') })}
              </Text>
              <Text style={common.muted}>
                {tr(
                  "You'll stop receiving messages. Someone will need to add you again to rejoin.",
                )}
                {me?.role === 'OWNER'
                  ? ` ${tr('As the owner, transfer ownership on the web first if leaving fails.')}`
                  : ''}
              </Text>
              {actions.leave.isError && (
                <ErrorNotice message={tr("You couldn't leave the group. Try again.")} />
              )}
              <View style={s.row}>
                <Button
                  title={tr('Leave group')}
                  variant="danger"
                  size="sm"
                  fullWidth={false}
                  style={common.flex}
                  loading={actions.leave.isPending}
                  disabled={!isOnline}
                  onPress={() => actions.leave.mutate(undefined, { onSuccess: onLeft })}
                />
                <Button
                  title={tr('Stay')}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  style={common.flex}
                  onPress={() => setConfirm(null)}
                />
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityHint={tr('Asks you to confirm')}
              onPress={() => setConfirm({ kind: 'leave' })}
              style={({ pressed }) => [s.leave, pressed && common.pressed]}
            >
              <LogOut size={20} color={colors.danger} />
              <Text style={s.leaveText}>{tr('Leave group')}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      {adding && (
        <Sheet
          title={tr('Add members')}
          onClose={() => setAdding(false)}
          closeDisabled={actions.add.isPending}
        >
          <PeoplePicker
            userId={userId}
            multi
            selected={picked}
            excludeIds={data.participants.map((participant) => participant.userId)}
            maxSelected={Math.max(0, 100 - data.participants.length)}
            onPick={(person) =>
              setPicked((current) =>
                current.some((item) => item.id === person.id)
                  ? current.filter((item) => item.id !== person.id)
                  : [...current, person],
              )
            }
          />
          <View style={s.sheetFooter}>
            {actions.add.isError && (
              <ErrorNotice message={tr("Members weren't added. Try again.")} />
            )}
            <Button
              title={
                picked.length
                  ? plural(picked.length, {
                      one: 'Add {count} person',
                      other: 'Add {count} people',
                    })
                  : tr('Add people')
              }
              variant="purple"
              loading={actions.add.isPending}
              disabled={!picked.length || !isOnline}
              onPress={() =>
                actions.add.mutate(
                  picked.map((person) => person.id),
                  { onSuccess: () => setAdding(false) },
                )
              }
            />
          </View>
        </Sheet>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  spacer: { width: 44 },
  topTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '700' },
  padded: { padding: 16 },
  loader: { padding: 40 },
  content: { padding: 16, paddingBottom: 40, gap: 24 },
  hero: { alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.88,
    marginTop: 6,
  },
  form: { alignSelf: 'stretch', gap: 12, marginTop: 12 },
  row: { flexDirection: 'row', gap: 8 },
  block: { gap: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { color: colors.text, fontSize: 16, fontWeight: '700' },
  surface: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderRadius: 12,
  },
  memberName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  role: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: '#a855f71a' },
  roleText: { color: '#d8b4fe', fontSize: 12, fontWeight: '600' },
  dangerIcon: { backgroundColor: '#dc2626' },
  confirmText: { color: colors.danger, fontSize: 12, paddingHorizontal: 64, paddingBottom: 8 },
  confirm: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  leave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff05',
  },
  leaveText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  sheetFooter: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
});
