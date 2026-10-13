import * as React from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BarChart3, Paperclip, Plus, X, Edit3, Eye } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, type UserSessionProfile } from '@social-network/shared-stores';
import { assertSession } from '@/shared/api/client';
import { createPostSchema } from '@social-network/shared-contracts';
import { Button } from '@/shared/ui';
import { feedApi } from '../api/feedApi';
import { postForm } from '../api/postForm';
import { feedKeys } from '../model/queries';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from './primitives';

export interface PostDraft {
  text: string;
  assets: ImagePicker.ImagePickerAsset[];
  poll: string[];
}
export const emptyPostDraft = (): PostDraft => ({ text: '', assets: [], poll: [] });
interface EditorProps {
  user: UserSessionProfile;
  onClose: () => void;
  inline?: boolean;
  isOnline?: boolean;
  onBusyChange?: (busy: boolean) => void;
  draftState?: [PostDraft, React.Dispatch<React.SetStateAction<PostDraft>>];
}

export function CreatePostSheet(props: EditorProps) {
  const [busy, setBusy] = React.useState(false);
  const onBusyChange = React.useCallback(
    (pending: boolean) => {
      setBusy(pending);
      props.onBusyChange?.(pending);
    },
    [props.onBusyChange],
  );
  return (
    <Sheet
      title="Create a post"
      closeDisabled={busy}
      onClose={() => {
        if (!busy) props.onClose();
      }}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <CreatePostEditor {...props} onBusyChange={onBusyChange} />
      </ScrollView>
    </Sheet>
  );
}

export function CreatePostEditor({
  user,
  onClose,
  inline = false,
  isOnline = true,
  onBusyChange,
  draftState,
}: EditorProps) {
  const localDraft = React.useState<PostDraft>(emptyPostDraft);
  const [draft, setDraft] = draftState ?? localDraft;
  const { text, assets, poll } = draft;
  const setText = (value: string) => setDraft((current) => ({ ...current, text: value }));
  const setAssets = (value: React.SetStateAction<ImagePicker.ImagePickerAsset[]>) =>
    setDraft((current) => ({
      ...current,
      assets: typeof value === 'function' ? value(current.assets) : value,
    }));
  const setPoll = (value: React.SetStateAction<string[]>) =>
    setDraft((current) => ({
      ...current,
      poll: typeof value === 'function' ? value(current.poll) : value,
    }));
  const [preview, setPreview] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      const parsed = createPostSchema.parse({ content: text, ...(poll.length ? { poll } : {}) });
      const body = await postForm(parsed.content || '', assets, parsed.poll || []);
      assertSession(user.id, refreshToken);
      return feedApi.create(body);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: feedKeys.posts(user.id) });
      setDraft(emptyPostDraft());
      setPreview(false);
      onClose();
    },
    onError: () =>
      setError('Your post was not published. Your draft is still here; please try again.'),
  });
  React.useEffect(() => {
    onBusyChange?.(create.isPending);
  }, [create.isPending, onBusyChange]);
  const validPoll =
    !poll.length ||
    (poll.every((option) => option.trim().length > 0) &&
      new Set(poll.map((option) => option.trim().toLowerCase())).size === poll.length);
  const canPublish =
    (text.trim().length > 0 || assets.length > 0 || poll.length > 0) &&
    validPoll &&
    !picking &&
    isOnline;

  async function pickMedia() {
    setPicking(true);
    setError(null);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Allow photo library access in Settings to attach photos or videos.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        selectionLimit: 5 - assets.length,
        quality: 0.85,
      });
      if (!result.canceled) {
        const selected = result.assets.slice(0, 5 - assets.length);
        if (selected.some((asset) => (asset.fileSize ?? 0) > 20 * 1024 * 1024)) {
          setError('Choose attachments smaller than 20 MB.');
          return;
        }
        setAssets((current) => [...current, ...selected]);
      }
    } catch {
      setError('The photo library could not be opened. Please try again.');
    } finally {
      setPicking(false);
    }
  }

  return (
    <View style={inline ? [common.card, s.inlineCard] : s.editor}>
      <View style={s.tabs} accessibilityRole="tablist" accessibilityLabel="Post editor">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: !preview }}
          aria-selected={!preview}
          onPress={() => setPreview(false)}
          style={[s.tab, !preview && s.activeTab]}
        >
          <Edit3 size={14} color={!preview ? colors.text : colors.muted} />
          <Text style={[common.muted, !preview && s.activeTabText]}>Write</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: preview }}
          aria-selected={preview}
          onPress={() => setPreview(true)}
          style={[s.tab, preview && s.activeTab]}
        >
          <Eye size={14} color={preview ? colors.text : colors.muted} />
          <Text style={[common.muted, preview && s.activeTabText]}>Preview</Text>
        </Pressable>
      </View>
      <View style={s.body}>
        {error && <ErrorNotice message={error} />}
        <View style={s.composeRow}>
          <Avatar name={user.displayName || user.username} uri={user.avatarUrl} size={40} />
          {preview ? (
            <View style={[s.previewText, common.flex]}>
              <Text style={common.text}>{text.trim() || 'Nothing to preview yet.'}</Text>
            </View>
          ) : (
            <TextInput
              autoFocus={!inline}
              multiline
              maxLength={10000}
              editable={!create.isPending && isOnline}
              value={text}
              onChangeText={(value) => {
                setText(value);
                setError(null);
              }}
              placeholder="What's new?"
              placeholderTextColor="#71717a"
              accessibilityLabel="Post text"
              textAlignVertical="top"
              style={[s.input, common.flex, inline && s.inlineInput]}
            />
          )}
        </View>
        {!!assets.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.attachments}
          >
            {assets.map((asset, index) => (
              <View key={`${asset.uri}-${index}`} style={s.attachment}>
                {asset.type === 'video' ? (
                  <View style={s.videoLabel}>
                    <Text style={common.text}>Video</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: asset.uri }}
                    style={s.preview}
                    accessibilityLabel={`Attachment ${index + 1}`}
                  />
                )}
                <IconButton
                  style={s.remove}
                  label={`Remove attachment ${index + 1}`}
                  disabled={create.isPending}
                  onPress={() => setAssets((current) => current.filter((_, i) => i !== index))}
                >
                  <X size={16} color="white" />
                </IconButton>
              </View>
            ))}
          </ScrollView>
        )}
        {!!poll.length && (
          <View style={[common.card, s.poll]}>
            <View style={common.row}>
              <Text style={[common.title, common.flex]}>Ask your community</Text>
              <IconButton
                label="Remove poll"
                disabled={create.isPending}
                onPress={() => setPoll([])}
              >
                <X size={18} color={colors.muted} />
              </IconButton>
            </View>
            {poll.map((option, index) => (
              <TextInput
                key={index}
                value={option}
                editable={!create.isPending && isOnline}
                maxLength={255}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor={colors.muted}
                accessibilityLabel={`Poll option ${index + 1}`}
                onChangeText={(value) =>
                  setPoll((current) => current.map((item, i) => (i === index ? value : item)))
                }
                style={s.pollInput}
              />
            ))}
            {poll.length < 4 && (
              <Button
                title="Add option"
                variant="ghost"
                disabled={create.isPending}
                leftIcon={<Plus size={16} color={colors.purple} />}
                onPress={() => setPoll((current) => [...current, ''])}
              />
            )}
            {!validPoll && (
              <Text style={common.muted}>Add at least two different, non-empty options.</Text>
            )}
          </View>
        )}
      </View>
      <View style={s.toolbar}>
        <View style={common.row}>
          <IconButton
            label="Attach photos or videos"
            disabled={!isOnline || create.isPending || picking || assets.length >= 5}
            onPress={() => {
              void pickMedia();
            }}
          >
            <Paperclip size={18} color={colors.muted} />
          </IconButton>
          <IconButton
            label="Add poll"
            disabled={!isOnline || create.isPending || poll.length > 0}
            onPress={() => setPoll(['', ''])}
          >
            <BarChart3 size={18} color={colors.muted} />
          </IconButton>
          {!inline && <Text style={common.muted}>{text.length.toLocaleString()}/10,000</Text>}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Publish post"
          aria-busy={create.isPending}
          accessibilityState={{ disabled: !canPublish || create.isPending, busy: create.isPending }}
          disabled={!canPublish || create.isPending}
          style={[s.publish, (!canPublish || create.isPending) && s.disabled]}
          onPress={() => {
            setError(null);
            create.mutate();
          }}
        >
          <Text style={s.publishText}>{create.isPending ? 'Publishing...' : 'Publish'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  editor: { padding: 16, gap: 12 },
  inlineCard: { backgroundColor: '#111111', gap: 12 },
  body: { gap: 12 },
  composeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  inlineInput: { minHeight: 65, fontSize: 15, lineHeight: 24, paddingTop: 8 },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff0d',
    padding: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderRadius: 9,
  },
  activeTab: { backgroundColor: '#9333eab3' },
  activeTabText: { color: colors.text, fontWeight: '600' },
  previewText: { minHeight: 65, paddingTop: 8 },
  publish: {
    minHeight: 44,
    paddingHorizontal: 18,
    backgroundColor: 'white',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  publishText: { color: '#111111', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  audience: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  input: { color: colors.text, fontSize: 18, lineHeight: 28, minHeight: 180, padding: 0 },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  attachments: { gap: 10 },
  attachment: {
    width: 110,
    height: 130,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#252529',
  },
  preview: { width: '100%', height: '100%' },
  videoLabel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  remove: { position: 'absolute', right: 0, top: 0, backgroundColor: '#00000099' },
  poll: { gap: 10 },
  pollInput: {
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 48,
    padding: 12,
  },
});
