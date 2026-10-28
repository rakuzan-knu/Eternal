import * as React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Copy, Share2 } from 'lucide-react-native';
import { Button, Input, Select } from '@/shared/ui';
import { webOrigin } from '@/shared/api/client';
import { copyText } from '@/shared/lib/clipboard';
import { colors, common, ErrorNotice, Sheet } from '../../feed/ui/primitives';
import { shareLink } from '../../feed/ui/shareLink';
import {
  INVITE_EXPIRY_OPTIONS,
  expiryDays,
  expiryLabel,
  parseMaxUses,
  type InviteExpiryOption,
} from '../model/communities';
import { useCreateInvite } from '../model/queries';
import { tr } from '@/shared/lib/i18n';

export function CommunityInviteSheet({
  communityId,
  communityName,
  isOnline,
  onClose,
}: {
  communityId: string;
  communityName: string;
  isOnline: boolean;
  onClose: () => void;
}) {
  const [expiry, setExpiry] = React.useState<InviteExpiryOption>('7 days');
  const [maxUses, setMaxUses] = React.useState('');
  const [maxUsesError, setMaxUsesError] = React.useState<string | undefined>();
  const [notice, setNotice] = React.useState<string | null>(null);
  const create = useCreateInvite(communityId);
  const link = create.data ? `${webOrigin}/invite/${create.data.token}` : null;

  const submit = () => {
    const parsed = parseMaxUses(maxUses);
    setMaxUsesError(parsed.error);
    if (parsed.error) return;
    setNotice(null);
    create.mutate({
      expiresInDays: expiryDays(expiry),
      ...(parsed.value ? { maxUses: parsed.value } : {}),
    });
  };

  return (
    <Sheet title={tr('Invite people')} onClose={onClose} closeDisabled={create.isPending}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {link && create.data ? (
          <>
            <View style={s.success}>
              <Check size={18} color={colors.green} />
              <Text style={[common.text, common.flex]}>{tr('Invitation link created')}</Text>
            </View>
            <View style={s.linkBox}>
              <Text style={s.link} selectable numberOfLines={3}>
                {link}
              </Text>
            </View>
            <Text style={common.muted}>
              {expiryLabel(create.data.expiresAt)}
              {create.data.maxUses
                ? ` · ${tr('Up to {count} joins', { count: create.data.maxUses })}`
                : ''}
              . {tr('This link is shown only once — copy or share it now.')}
            </Text>
            <View style={s.row}>
              <Button
                title={tr('Copy link')}
                variant="secondary"
                size="sm"
                fullWidth={false}
                style={s.flex}
                leftIcon={<Copy size={16} color={colors.text} />}
                onPress={() => {
                  copyText(link)
                    .then(() => setNotice(tr('Link copied')))
                    .catch(() =>
                      setNotice(tr("The link couldn't be copied. Select it and copy manually.")),
                    );
                }}
              />
              <Button
                title={tr('Share')}
                variant="purple"
                size="sm"
                fullWidth={false}
                style={s.flex}
                leftIcon={<Share2 size={16} color="#fff" />}
                onPress={() => {
                  shareLink(tr('Join {name} on Eternal', { name: communityName }), link)
                    .then((result) => result === 'copied' && setNotice(tr('Link copied')))
                    .catch(() => setNotice(tr("The link couldn't be shared. Copy it instead.")));
                }}
              />
            </View>
            {notice && (
              <Text style={s.notice} accessibilityLiveRegion="polite" aria-live="polite">
                {notice}
              </Text>
            )}
            <Button title={tr('Done')} variant="ghost" onPress={onClose} />
          </>
        ) : (
          <>
            <Text style={common.muted}>
              Anyone with the link can preview {communityName} and join it until the link expires or
              reaches its limit.
            </Text>
            <Select
              label={tr('Expires after')}
              value={tr(expiry)}

              options={INVITE_EXPIRY_OPTIONS.map((option) => tr(option))}
              onChange={(value) =>
                setExpiry(INVITE_EXPIRY_OPTIONS.find((option) => tr(option) === value) ?? expiry)
              }
              disabled={create.isPending}
            />
            <Input
              label={tr('Maximum joins (optional)')}
              value={maxUses}
              keyboardType="number-pad"
              maxLength={5}
              placeholder={tr('No limit')}
              error={maxUsesError}
              editable={!create.isPending}
              onChangeText={(value) => {
                setMaxUses(value);
                if (maxUsesError) setMaxUsesError(undefined);
              }}
              onBlur={() => setMaxUsesError(parseMaxUses(maxUses).error)}
              accessibilityLabel={tr('Maximum joins')}
            />
            {create.isError && (
              <ErrorNotice
                message={tr(
                  "The invitation wasn't created. Only owners and admins can invite. Try again.",
                )}
              />
            )}
            <Button
              title={tr('Create invitation link')}
              variant="purple"
              loading={create.isPending}
              disabled={!isOnline}
              onPress={submit}
            />
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { padding: 20, gap: 18 },
  success: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkBox: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  link: { color: colors.text, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  notice: { color: '#d8b4fe', fontSize: 13 },
});
