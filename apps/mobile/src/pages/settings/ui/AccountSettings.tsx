import * as React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus } from 'lucide-react-native';
import type { UserProfileDto } from '@social-network/shared-contracts';
import { Button, Input } from '@/shared/ui';
import { Avatar, colors, ErrorNotice } from '../../feed/ui/primitives';
import {
  profileUpdate,
  useMe,
  useProfileImage,
  useUpdateProfile,
  usernameProblem,
  useUsernameAvailability,
} from '../model/settings';
import { QueryState, SettingsPage, settingsStyles } from './SettingsKit';
import { tr } from '@/shared/lib/i18n';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function AccountSettings({
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
  const me = useMe(userId);
  return (
    <SettingsPage
      title={tr('Edit profile')}
      active={active}
      onBack={onBack}
      testID="mobile-settings-account"
    >
      {me.data ? (
        <AccountForm key={me.data.id} userId={userId} profile={me.data} isOnline={isOnline} />
      ) : (
        <QueryState query={me} />
      )}
    </SettingsPage>
  );
}

function AccountForm({
  userId,
  profile,
  isOnline,
}: {
  userId: string;
  profile: UserProfileDto;
  isOnline: boolean;
}) {
  const [displayName, setDisplayName] = React.useState(profile.displayName ?? '');
  const [username, setUsername] = React.useState(profile.username);
  const [bio, setBio] = React.useState(profile.bio ?? '');
  const [usernameTouched, setUsernameTouched] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const update = useUpdateProfile(userId);
  const avatar = useProfileImage(userId, 'avatar');
  const banner = useProfileImage(userId, 'banner');
  const availability = useUsernameAvailability(userId, username, profile.username);
  const problem = usernameProblem(username);
  const changes = profileUpdate(profile, { displayName, username, bio });
  const dirty = Object.keys(changes).length > 0;
  const bioLines = bio.split('\n').length;
  const invalid =
    (changes.username !== undefined && (!!problem || availability === 'taken')) ||
    bio.length > 1000 ||
    bioLines > 50 ||
    displayName.trim().length > 32;

  const usernameError =
    usernameTouched && problem
      ? problem
      : availability === 'taken'
        ? tr('{name} is taken. Try another.', { name: `@${username.trim().toLowerCase()}` })
        : null;
  const usernameHint =
    availability === 'checking'
      ? tr('Checking availability…')
      : availability === 'available'
        ? tr('Available')
        : tr('2–32 characters: letters, numbers, dots and underscores.');

  async function pick(kind: 'avatar' | 'banner') {
    setNotice(null);
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice(tr('Allow photo library access in Settings to choose a photo.'));
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: kind === 'avatar' ? [1, 1] : [3, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    if ((result.assets[0].fileSize ?? 0) > MAX_IMAGE_BYTES) {
      setNotice(tr('Choose a photo smaller than 10 MB.'));
      return;
    }
    (kind === 'avatar' ? avatar : banner).mutate(result.assets[0]);
  }

  return (
    <View style={settingsStyles.form}>
      <View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('Change banner')}
          disabled={!isOnline || banner.isPending}
          onPress={() => void pick('banner')}
          style={({ pressed }) => [s.banner, pressed && s.pressed]}
        >
          {profile.banner ? (
            <Image
              source={{ uri: profile.banner }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}
          <View style={s.bannerBadge}>
            <ImagePlus size={16} color={colors.text} />
            <Text style={s.badgeText}>
              {banner.isPending ? tr('Uploading…') : tr('Change banner')}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('Change profile photo')}
          disabled={!isOnline || avatar.isPending}
          onPress={() => void pick('avatar')}
          style={({ pressed }) => [s.avatar, pressed && s.pressed]}
        >
          <Avatar name={profile.displayName || profile.username} uri={profile.avatar} size={88} />
          <View style={s.camera}>
            <Camera size={16} color="#fff" />
          </View>
        </Pressable>
      </View>
      {!!profile.avatar && (
        <Button
          title={tr('Remove profile photo')}
          variant="ghost"
          size="sm"
          fullWidth={false}
          style={s.remove}
          loading={avatar.isPending && avatar.variables === null}
          disabled={!isOnline || avatar.isPending}
          onPress={() => avatar.mutate(null)}
        />
      )}
      {(avatar.isError || banner.isError) && (
        <ErrorNotice
          message={tr("The photo wasn't uploaded. Use a JPG, PNG, GIF or WebP under 10 MB.")}
        />
      )}
      {notice && <ErrorNotice message={notice} />}

      <Input
        label={tr('Display name')}
        value={displayName}
        maxLength={32}
        onChangeText={(value) => {
          setDisplayName(value);
          setSaved(false);
        }}
        hint={`${displayName.length}/32`}
        accessibilityLabel={tr('Display name')}
      />
      <Input
        label={tr('Username')}
        value={username}
        maxLength={33}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(value) => {
          setUsername(value.replace(/\s/g, ''));
          setUsernameTouched(false);
          setSaved(false);
        }}
        onBlur={() => setUsernameTouched(true)}
        error={usernameError}
        hint={usernameError ? undefined : usernameHint}
        accessibilityLabel={tr('Username')}
      />
      <Input
        label={tr('Bio')}
        value={bio}
        multiline
        maxLength={1000}
        onChangeText={(value) => {
          setBio(value);
          setSaved(false);
        }}
        error={bioLines > 50 ? tr('Use 50 lines or fewer.') : null}
        hint={`${bio.length}/1000`}
        accessibilityLabel={tr('Bio')}
      />
      {update.isError && (
        <ErrorNotice
          message={
            (update.error as { response?: { status?: number } })?.response?.status === 409
              ? tr('That username was just taken. Try another.')
              : tr("Your changes weren't saved. Try again.")
          }
        />
      )}
      {saved && !dirty && (
        <Text style={settingsStyles.success} accessibilityRole="alert">
          {tr('Profile updated.')}
        </Text>
      )}
      <Button
        title={tr('Save changes')}
        variant="purple"
        loading={update.isPending}
        disabled={!dirty || invalid || !isOnline || availability === 'checking'}
        onPress={() => update.mutate(changes, { onSuccess: () => setSaved(true) })}
      />
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    height: 120,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1d1430',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 10,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#000000a6',
  },
  badgeText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  avatar: {
    marginTop: -44,
    marginLeft: 16,
    alignSelf: 'flex-start',
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.background,
  },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
    borderWidth: 2,
    borderColor: colors.background,
  },
  remove: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.75 },
});
