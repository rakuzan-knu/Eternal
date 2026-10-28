import * as React from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import axios from 'axios';
import { ArrowLeft, Link2Off, WifiOff } from 'lucide-react-native';
import { Button } from '@/shared/ui';
import { colors, common, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import { expiryLabel, memberCountLabel } from '../model/communities';
import { useInvitePreview, useJoinCommunity } from '../model/queries';
import { CommunityAvatar, Placeholder } from './parts';
import { screenStyles } from './CommunitiesScreen';
import { tr } from '@/shared/lib/i18n';

export function CommunityInviteScreen({
  userId,
  token,
  isOnline,
  active,
  onBack,
  onJoined,
}: {
  userId: string;
  token: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onJoined: (communityId: string) => void;
}) {
  const instance = React.useId();
  const preview = useInvitePreview(token, instance);
  const join = useJoinCommunity(userId, token);

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${tr('Community invitation')} • Eternal`;
  }, [active]);

  let body: React.ReactNode;
  if (preview.isPending)
    body =
      preview.fetchStatus === 'paused' ? (
        <Placeholder
          Icon={WifiOff}
          title={tr("You're offline")}
          text={tr('Connect to the internet to check this invitation.')}
        />
      ) : (
        <View style={s.status} accessibilityLabel={tr('Checking invitation')} aria-busy>
          <ActivityIndicator color={colors.purple} />
          <Text style={common.muted}>{tr('Checking invitation…')}</Text>
        </View>
      );
  else if (preview.isError)
    body = (
      <Placeholder
        Icon={Link2Off}
        title={tr('This invitation is unavailable')}
        text={
          axios.isAxiosError(preview.error) && preview.error.response?.status === 404
            ? tr(
                'It may have expired, reached its join limit or been revoked. Ask an admin for a new link.',
              )
            : tr("The invitation couldn't be checked. Check your connection and try again.")
        }
        action={
          <Button
            title={tr('Try again')}
            variant="secondary"
            fullWidth={false}
            onPress={() => {
              void preview.refetch();
            }}
          />
        }
      />
    );
  else {
    const { community, expiresAt } = preview.data;
    body = (
      <View style={s.card}>
        <Text style={common.muted}>{tr("You've been invited to join")}</Text>
        <CommunityAvatar name={community.name} uri={community.avatar} size={72} />
        <Text style={s.title} accessibilityRole="header">
          {community.name}
        </Text>
        {!!community.description && <Text style={s.description}>{community.description}</Text>}
        <Text style={common.muted}>
          {memberCountLabel(community.memberCount)} · {expiryLabel(expiresAt)}
        </Text>
        {join.isError && (
          <ErrorNotice
            message={tr(
              "You couldn't join. The invitation may no longer be valid, or your account may not have access. Try again or ask an admin.",
            )}
          />
        )}
        <Button
          title={tr('Accept invitation')}
          variant="purple"
          loading={join.isPending}
          disabled={!isOnline}
          onPress={() =>
            join.mutate(undefined, { onSuccess: (result) => onJoined(result.communityId) })
          }
        />
        <Text style={s.footnote}>
          Members of {community.name} will see your profile after you join.
        </Text>
      </View>
    );
  }

  return (
    <View style={screenStyles.screen} testID="mobile-community-invite">
      <View style={screenStyles.topBar}>
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text accessibilityRole="header" style={screenStyles.topTitle}>
          Invitation
        </Text>
        <View style={screenStyles.topSpacer} />
      </View>
      <ScrollView contentContainerStyle={s.content}>{body}</ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  status: { alignItems: 'center', gap: 12, padding: 40 },
  card: {
    alignItems: 'center',
    gap: 14,
    padding: 24,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.85,
  },
  footnote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
