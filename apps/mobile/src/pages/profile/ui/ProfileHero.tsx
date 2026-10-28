import * as React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BadgeCheck,
  CalendarDays,
  Lock,
  MessageSquare,
  Share2,
  UserPlus,
  UserRoundPen,
} from 'lucide-react-native';
import type { UserProfileDto } from '@social-network/shared-contracts';
import { Button } from '@/shared/ui';
import { Avatar, colors, common, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import { compactCount, followState, joinedLabel } from '../model/profile';
import { tr } from '@/shared/lib/i18n';

const AVATAR = 88;

export function ProfileHero({
  profile,
  isOwn,
  isOnline,
  following,
  followError,
  shareMessage,
  onFollow,
  onShare,
  onMessage,
  messaging = false,
  messageError = false,
  onEdit,
  onOpenConnections,
  followRequests = 0,
}: {
  profile: UserProfileDto;
  isOwn: boolean;
  isOnline: boolean;
  following: boolean;
  followError: boolean;
  shareMessage: string | null;
  onFollow: () => void;
  onShare: () => void;
  onMessage?: () => void;
  messaging?: boolean;
  messageError?: boolean;
  onEdit: () => void;
  onOpenConnections?: (tab: 'followers' | 'following' | 'requests') => void;
  followRequests?: number;
}) {
  const name = profile.displayName || profile.username;
  const state = followState(profile);
  const joined = joinedLabel(profile.createdAt);
  const theme = profile.profileTheme;
  const [bannerFailed, setBannerFailed] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  React.useEffect(() => setConfirming(false), [state]);
  const stats = [
    { label: tr('Posts'), value: profile.postsCount, tab: null },
    { label: tr('Followers'), value: profile.followersCount, tab: 'followers' as const },
    { label: tr('Following'), value: profile.followingCount, tab: 'following' as const },
  ];

  return (
    <View>
      <View style={s.banner}>
        {profile.banner && !bannerFailed ? (
          <Image
            source={{ uri: profile.banner }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            onError={() => setBannerFailed(true)}
          />
        ) : (
          <LinearGradient
            colors={
              theme?.primary && theme.accent
                ? [theme.primary, theme.accent]
                : ['#2e1065', '#140a24', colors.background]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['transparent', colors.background]}
          style={s.bannerFade}
          pointerEvents="none"
        />
      </View>
      <View style={s.body}>
        <View style={s.avatarRing}>
          <Avatar name={name} uri={profile.avatar} size={AVATAR} />
        </View>
        <View style={s.identity}>
          <View style={s.nameRow}>
            <Text accessibilityRole="header" style={s.name} numberOfLines={2}>
              {name}
            </Text>
            {profile.isVerified && (
              <BadgeCheck
                size={20}
                color={colors.purple}
                accessibilityLabel={tr('Verified account')}
                accessibilityRole="image"
              />
            )}
          </View>
          <View style={s.handleRow}>
            <Text style={s.handle} numberOfLines={1}>
              @{profile.username}
            </Text>
            {profile.followsYou && !isOwn && (
              <View style={s.chip}>
                <Text style={s.chipText}>{tr('Follows you')}</Text>
              </View>
            )}
            {profile.isPrivate && (
              <View style={s.chip} accessibilityLabel={tr('Private account')}>
                <Lock size={11} color={colors.muted} />
                <Text style={s.chipText}>{tr('Private')}</Text>
              </View>
            )}
          </View>
        </View>
        {!!profile.bio && <Text style={s.bio}>{profile.bio}</Text>}
        {joined && (
          <View style={common.row}>
            <CalendarDays size={14} color={colors.muted} />
            <Text style={common.muted}>{joined}</Text>
          </View>
        )}
        <View style={s.stats} accessibilityRole="summary">
          {stats.map(({ label, value, tab }) =>
            tab && onOpenConnections ? (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`${value ?? 0} ${label.toLowerCase()}. Show list`}
                onPress={() => onOpenConnections(tab)}
                style={({ pressed }) => [s.stat, pressed && common.pressed]}
              >
                <Text style={s.statValue}>{compactCount(value)}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </Pressable>
            ) : (
              <View
                key={label}
                style={s.stat}
                accessible
                accessibilityLabel={`${value ?? 0} ${label.toLowerCase()}`}
              >
                <Text style={s.statValue}>{compactCount(value)}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ),
          )}
        </View>
        {isOwn && followRequests > 0 && onOpenConnections && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${followRequests} follow ${followRequests === 1 ? 'request' : 'requests'}. Review`}
            onPress={() => onOpenConnections('requests')}
            style={({ pressed }) => [s.requests, pressed && common.pressed]}
          >
            <UserPlus size={18} color={colors.purple} />
            <Text style={[common.text, common.flex]}>{tr('Follow requests')}</Text>
            <View style={s.requestBadge}>
              <Text style={s.requestBadgeText}>{followRequests > 99 ? '99+' : followRequests}</Text>
            </View>
          </Pressable>
        )}
        <View style={s.actions}>
          {isOwn ? (
            <Button
              title={tr('Edit profile|button')}
              accessibilityLabel={tr('Edit profile')}
              variant="secondary"
              size="sm"
              fullWidth={false}
              style={s.action}
              leftIcon={<UserRoundPen size={16} color={colors.text} />}
              onPress={onEdit}
            />
          ) : (
            <Button
              title={
                state === 'following'
                  ? tr('Following|button')
                  : state === 'pending'
                    ? tr('Requested')
                    : tr('Follow')
              }
              variant={state === 'none' ? 'purple' : 'secondary'}
              size="sm"
              fullWidth={false}
              style={s.action}
              loading={following}
              disabled={!isOnline}
              accessibilityHint={state === 'none' ? undefined : tr('Asks you to confirm')}
              onPress={() => (state === 'none' ? onFollow() : setConfirming(true))}
            />
          )}
          {!isOwn && onMessage && (
            <Button
              title={tr('Message|action')}
              variant="secondary"
              size="sm"
              fullWidth={false}
              style={s.action}
              loading={messaging}
              disabled={!isOnline}
              leftIcon={<MessageSquare size={16} color={colors.text} />}
              onPress={onMessage}
            />
          )}
          {isOwn || !onMessage ? (
            <Button
              title={tr('Share')}
              variant="secondary"
              size="sm"
              fullWidth={false}
              style={s.action}
              leftIcon={<Share2 size={16} color={colors.text} />}
              accessibilityLabel={tr('Share profile')}
              onPress={onShare}
            />
          ) : (
            <IconButton label={tr('Share profile')} onPress={onShare} style={s.shareIcon}>
              <Share2 size={18} color={colors.text} />
            </IconButton>
          )}
        </View>
        {messageError && (
          <ErrorNotice
            message={tr("The chat couldn't be opened. Check your connection and try again.")}
          />
        )}
        {confirming && (
          <View style={s.confirm} accessibilityRole="alert">
            <Text style={common.text}>
              {state === 'pending'
                ? tr('Cancel your follow request to {name}?', { name: `@${profile.username}` })
                : tr('Unfollow {name}?', { name: `@${profile.username}` })}
            </Text>
            {state === 'following' && profile.isPrivate && (
              <Text style={common.muted}>
                {tr("You'll need to request again to see their posts.")}
              </Text>
            )}
            <View style={s.actions}>
              <Button
                title={state === 'pending' ? tr('Cancel request') : tr('Unfollow')}
                variant="danger"
                size="sm"
                fullWidth={false}
                style={s.action}
                disabled={!isOnline || following}
                onPress={() => {
                  setConfirming(false);
                  onFollow();
                }}
              />
              <Button
                title={state === 'pending' ? tr('Keep request') : tr('Keep following')}
                variant="secondary"
                size="sm"
                fullWidth={false}
                style={s.action}
                onPress={() => setConfirming(false)}
              />
            </View>
          </View>
        )}
        {followError && (
          <ErrorNotice
            message={tr("Your follow change wasn't saved. Check your connection and try again.")}
          />
        )}
        {shareMessage && (
          <Text accessibilityLiveRegion="polite" aria-live="polite" style={s.notice}>
            {shareMessage}
          </Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { height: 128, overflow: 'hidden', backgroundColor: '#140a24' },
  bannerFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56 },
  body: { paddingHorizontal: 16, gap: 12 },
  avatarRing: {
    marginTop: -AVATAR / 2,
    alignSelf: 'flex-start',
    padding: 4,
    borderRadius: AVATAR,
    backgroundColor: colors.background,
  },
  identity: { gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700', flexShrink: 1 },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  handle: { color: colors.muted, fontSize: 15, flexShrink: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#ffffff0f',
  },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  bio: { color: colors.text, fontSize: 15, lineHeight: 22, maxWidth: 560 },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  stat: { flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' },
  requests: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#a855f714',
  },
  requestBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  requestBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.muted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  notice: { color: '#d8b4fe', fontSize: 13 },
  shareIcon: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  confirm: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
});
