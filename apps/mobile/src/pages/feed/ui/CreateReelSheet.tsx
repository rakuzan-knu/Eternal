import * as React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Film, UploadCloud } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@social-network/shared-stores';
import type { ReelResponseDto } from '@social-network/shared-contracts';
import { assertSession, getMobileApi } from '@/shared/api/client';
import { Button } from '@/shared/ui';
import { reelForm } from '../api/postForm';
import { Video } from './MediaGallery';
import { colors, common, ErrorNotice, Sheet } from './primitives';

export function CreateReelSheet({
  userId,
  isOnline,
  onClose,
  onPublished,
  embedded = false,
  onBusyChange,
}: {
  userId: string;
  isOnline: boolean;
  onClose: () => void;
  onPublished: () => void;
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [asset, setAsset] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = React.useState('');
  const [audioTitle, setAudioTitle] = React.useState('');
  const [audioArtist, setAudioArtist] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: async () => {
      if (!asset) throw new Error('Choose a video');
      const refreshToken = useAuthStore.getState().refreshToken;
      const body = await reelForm(asset, { caption, audioTitle, audioArtist });
      assertSession(userId, refreshToken);
      return (await getMobileApi().post<ReelResponseDto>('/reels', body)).data;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['mobile', userId, 'reels'] });
      onPublished();
    },
    onError: () => setError('Your reel was not published. Your video and caption are still here.'),
  });
  React.useEffect(() => {
    onBusyChange?.(create.isPending);
  }, [create.isPending, onBusyChange]);

  async function pick() {
    if (!isOnline || picking || create.isPending) return;
    setPicking(true);
    setError(null);
    try {
      if (
        Platform.OS !== 'web' &&
        !(await ImagePicker.requestMediaLibraryPermissionsAsync()).granted
      ) {
        setError('Allow photo library access in Settings to choose a video.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
      const selected = !result.canceled ? result.assets[0] : undefined;
      if (selected) {
        if (selected.type !== 'video' && !selected.mimeType?.startsWith('video/')) {
          setError('Choose a video for your reel.');
          return;
        }
        // Match the actual multipart upload limit, which is lower than the web picker limit.
        if ((selected.fileSize ?? selected.file?.size ?? 0) > 100 * 1024 * 1024) {
          setError('Choose a video smaller than 100 MB.');
          return;
        }
        setAsset(selected);
      }
    } catch {
      setError('The video library could not be opened.');
    } finally {
      setPicking(false);
    }
  }

  const busy = picking || create.isPending;
  const content = (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {error && <ErrorNotice message={error} />}
      {asset ? (
        <>
          <View style={s.preview}>
            <Video key={asset.uri} uri={asset.uri} active={!create.isPending} />
          </View>
          <Button
            title="Change video"
            variant="secondary"
            disabled={!isOnline || busy}
            onPress={() => {
              void pick();
            }}
          />
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose reel video"
          disabled={!isOnline || busy}
          onPress={() => {
            void pick();
          }}
          style={[s.dropzone, (!isOnline || busy) && s.disabled]}
        >
          <View style={s.upload}>
            <UploadCloud size={28} color="#f472b6" />
          </View>
          <Text style={common.title}>
            {picking ? 'Opening video library…' : 'Select a vertical video'}
          </Text>
          <Text style={common.muted}>Up to 100 MB · 9:16 recommended</Text>
        </Pressable>
      )}
      <View style={s.field}>
        <Text style={common.title}>Caption</Text>
        <TextInput
          accessibilityLabel="Reel caption"
          value={caption}
          onChangeText={setCaption}
          editable={isOnline && !create.isPending}
          multiline
          maxLength={2000}
          placeholder="Describe your reel…"
          placeholderTextColor={colors.muted}
          style={[s.input, s.caption]}
        />
        <Text style={s.count}>{caption.length.toLocaleString()}/2,000</Text>
      </View>
      <Text style={common.title}>
        Audio details <Text style={common.muted}>(optional)</Text>
      </Text>
      <TextInput
        accessibilityLabel="Audio title"
        value={audioTitle}
        onChangeText={setAudioTitle}
        editable={isOnline && !create.isPending}
        maxLength={128}
        placeholder="Audio title"
        placeholderTextColor={colors.muted}
        style={s.input}
      />
      <TextInput
        accessibilityLabel="Audio artist"
        value={audioArtist}
        onChangeText={setAudioArtist}
        editable={isOnline && !create.isPending}
        maxLength={128}
        placeholder="Artist"
        placeholderTextColor={colors.muted}
        style={s.input}
      />
      <Button
        title="Publish reel"
        variant="purple"
        leftIcon={<Film size={18} color="white" />}
        disabled={!isOnline || !asset || picking}
        loading={create.isPending}
        onPress={() => {
          setError(null);
          create.mutate();
        }}
      />
    </ScrollView>
  );
  return embedded ? (
    content
  ) : (
    <Sheet title="Create New Reel" closeDisabled={create.isPending} onClose={onClose}>
      {content}
    </Sheet>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  dropzone: {
    minHeight: 200,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#71334e',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#f472b60a',
  },
  upload: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f472b61a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 350,
    backgroundColor: 'black',
    borderRadius: 20,
    overflow: 'hidden',
  },
  field: { gap: 8 },
  input: {
    minHeight: 48,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#ffffff05',
    color: colors.text,
    fontSize: 15,
  },
  caption: { minHeight: 100, textAlignVertical: 'top' },
  count: { color: colors.muted, fontSize: 12, textAlign: 'right' },
  disabled: { opacity: 0.4 },
});
