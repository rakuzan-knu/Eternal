import * as React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { createCommunitySchema, type CommunitySummary } from '@social-network/shared-contracts';
import { Button, Input } from '@/shared/ui';
import { colors, common, ErrorNotice, Sheet } from '../../feed/ui/primitives';
import { inviteTokenFromInput } from '../model/communities';
import { useCreateCommunity } from '../model/queries';
import { tr } from '@/shared/lib/i18n';

export function CreateCommunitySheet({
  userId,
  isOnline,
  onClose,
  onCreated,
}: {
  userId: string;
  isOnline: boolean;
  onClose: () => void;
  onCreated: (community: CommunitySummary) => void;
}) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [nameError, setNameError] = React.useState<string | null>(null);
  const create = useCreateCommunity(userId);

  const validateName = (value: string) => {
    const result = createCommunitySchema.shape.name.safeParse(value);
    return result.success ? null : tr('Use 2 to 80 characters.');
  };

  const submit = () => {
    const error = validateName(name);
    setNameError(error);
    if (error) return;
    create.mutate(
      { name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}) },
      { onSuccess: onCreated },
    );
  };

  return (
    <Sheet title={tr('Create a community')} onClose={onClose} closeDisabled={create.isPending}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={common.muted}>
          {tr(
            "You'll be the owner. A general channel is created so people can start talking right away.",
          )}
        </Text>
        <Input
          label={tr('Name')}
          value={name}
          maxLength={80}
          autoFocus
          error={nameError}
          editable={!create.isPending}
          onChangeText={(value) => {
            setName(value);
            if (nameError) setNameError(null);
          }}
          onBlur={() => name && setNameError(validateName(name))}
          returnKeyType="next"
          accessibilityLabel={tr('Community name')}
        />
        <Input
          label={tr('Description (optional)')}
          value={description}
          maxLength={1000}
          multiline
          editable={!create.isPending}
          onChangeText={setDescription}
          hint={`${description.length}/1000`}
          inputStyle={s.multiline}
          accessibilityLabel={tr('Community description')}
        />
        {create.isError && (
          <ErrorNotice
            message={tr("The community wasn't created. Check your connection and try again.")}
          />
        )}
        <Button
          title={tr('Create community')}
          variant="purple"
          loading={create.isPending}
          disabled={!isOnline || !name.trim()}
          onPress={submit}
        />
        {!isOnline && (
          <Text style={s.offline}>{tr('Connect to the internet to create a community.')}</Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

export function JoinWithLinkSheet({
  onClose,
  onOpenInvite,
}: {
  onClose: () => void;
  onOpenInvite: (token: string) => void;
}) {
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const submit = () => {
    const token = inviteTokenFromInput(value);
    if (!token) {
      setError(tr("That isn't an invitation link. Paste the full link that contains /invite/."));
      return;
    }
    onOpenInvite(token);
  };

  return (
    <Sheet title={tr('Join with a link')} onClose={onClose}>
      <View style={s.body}>
        <Text style={common.muted}>
          {tr(
            'Communities are invitation-only. Paste the link someone shared with you to preview the community before joining.',
          )}
        </Text>
        <Input
          label={tr('Invitation link')}
          value={value}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          error={error}
          showClearButton
          onClear={() => setValue('')}
          onChangeText={(next) => {
            setValue(next);
            if (error) setError(null);
          }}
          onSubmitEditing={submit}
          returnKeyType="go"
          accessibilityLabel={tr('Invitation link')}
        />
        <Button
          title={tr('Preview invitation')}
          variant="purple"
          disabled={!value.trim()}
          onPress={submit}
        />
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { padding: 20, gap: 18 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  offline: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
