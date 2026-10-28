import * as React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ChevronRight, Users } from 'lucide-react-native';
import { Button, Input } from '@/shared/ui';
import { Avatar, colors, common, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import { useCreateGroup, useOpenDirect } from '../model/queries';
import { PeoplePicker, type PickedPerson } from './PeoplePicker';
import { tr } from '@/shared/lib/i18n';

const MAX_MEMBERS = 100;

export function NewChatScreen({
  userId,
  isOnline,
  active,
  onBack,
  onOpenConversation,
}: {
  userId: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onOpenConversation: (id: string) => void;
}) {
  const [step, setStep] = React.useState<'people' | 'group' | 'details'>('people');
  const [selected, setSelected] = React.useState<PickedPerson[]>([]);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [nameError, setNameError] = React.useState<string | null>(null);
  const openDirect = useOpenDirect();
  const createGroup = useCreateGroup(userId);

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${step === 'people' ? tr('New chat') : tr('New group')} • Eternal`;
  }, [active, step]);

  const toggle = (person: PickedPerson) =>
    setSelected((current) =>
      current.some((item) => item.id === person.id)
        ? current.filter((item) => item.id !== person.id)
        : [...current, person],
    );

  const back = () => {
    if (step === 'details') setStep('group');
    else if (step === 'group') {
      setStep('people');
      setSelected([]);
    } else onBack();
  };

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(tr('Give the group a name.'));
      return;
    }
    createGroup.mutate(
      {
        name: trimmed,
        memberIds: selected.map((person) => person.id),
        ...(description.trim() ? { description: description.trim() } : {}),
      },
      { onSuccess: (conversation) => onOpenConversation(conversation.id) },
    );
  };

  const title =
    step === 'people' ? tr('New chat') : step === 'group' ? tr('Add members') : tr('New group');

  return (
    <View style={s.screen} testID="mobile-new-chat">
      <View style={s.topBar}>
        <IconButton label={tr('Back')} onPress={back}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <View style={common.flex}>
          <Text accessibilityRole="header" style={s.topTitle}>
            {title}
          </Text>
          {step === 'group' && (
            <Text style={[common.muted, s.center]}>
              {tr('{count}/{max} selected', { count: selected.length, max: MAX_MEMBERS })}
            </Text>
          )}
        </View>
        {step === 'group' ? (
          <Button
            title={tr('Next')}
            variant="ghost"
            size="sm"
            fullWidth={false}
            disabled={selected.length === 0}
            onPress={() => setStep('details')}
          />
        ) : (
          <View style={s.spacer} />
        )}
      </View>
      {step === 'details' ? (
        <ScrollView contentContainerStyle={s.details} keyboardShouldPersistTaps="handled">
          <Input
            label={tr('Group name')}
            value={name}
            maxLength={128}
            autoFocus
            error={nameError}
            onChangeText={(value) => {
              setName(value);
              if (nameError) setNameError(null);
            }}
            onBlur={() => setNameError(name.trim() ? null : tr('Give the group a name.'))}
            accessibilityLabel={tr('Group name')}
          />
          <Input
            label={tr('Description (optional)')}
            value={description}
            maxLength={512}
            multiline
            onChangeText={setDescription}
            hint={`${description.length}/512`}
            accessibilityLabel={tr('Group description')}
          />
          <Text style={s.section}>
            {tr('{count} members plus you', { count: selected.length })}
          </Text>
          <View style={s.members}>
            {selected.map((person) => (
              <View key={person.id} style={s.member}>
                <Avatar
                  name={person.displayName || person.username}
                  uri={person.avatar}
                  size={44}
                />
                <Text style={s.memberName} numberOfLines={1}>
                  {person.displayName || person.username}
                </Text>
              </View>
            ))}
          </View>
          <Text style={common.muted}>{tr('Group messages are not end-to-end encrypted.')}</Text>
          {createGroup.isError && (
            <ErrorNotice message={tr("The group wasn't created. Try again.")} />
          )}
          <Button
            title={tr('Create group')}
            variant="purple"
            loading={createGroup.isPending}
            disabled={!isOnline}
            onPress={create}
          />
        </ScrollView>
      ) : (
        <PeoplePicker
          userId={userId}
          multi={step === 'group'}
          selected={selected}
          maxSelected={MAX_MEMBERS}
          onPick={(person) => {
            if (step === 'group') toggle(person);
            else if (!openDirect.isPending)
              openDirect.mutate(person.id, {
                onSuccess: (conversation) => onOpenConversation(conversation.id),
              });
          }}
          header={
            step === 'people' ? (
              <View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setStep('group')}
                  style={({ pressed }) => [s.groupRow, pressed && common.pressed]}
                >
                  <View style={s.groupIcon}>
                    <Users size={20} color={colors.text} />
                  </View>
                  <Text style={[s.groupText, common.flex]}>{tr('New group')}</Text>
                  <ChevronRight size={18} color={colors.muted} />
                </Pressable>
                {openDirect.isError && (
                  <View style={s.padded}>
                    <ErrorNotice message={tr("The chat couldn't be opened. Try again.")} />
                  </View>
                )}
                {!isOnline && (
                  <Text style={[common.muted, s.padded]}>
                    {tr('Connect to the internet to start a chat.')}
                  </Text>
                )}
              </View>
            ) : null
          }
        />
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
  },
  spacer: { width: 64 },
  topTitle: { textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '700' },
  center: { textAlign: 'center' },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  groupText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  padded: { paddingHorizontal: 16, paddingTop: 8 },
  details: { padding: 16, gap: 16 },
  section: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  member: { width: 64, alignItems: 'center', gap: 4 },
  memberName: { color: colors.text, fontSize: 12, textAlign: 'center', maxWidth: 64 },
});
