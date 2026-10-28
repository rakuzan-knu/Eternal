import * as React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowRight,
  AtSign,
  BarChart2,
  ChevronDown,
  Image as ImageIcon,
  Layers,
  Music,
  Palette,
  Pencil,
  Smile,
  Sparkles,
  Star,
  Trash2,
  Type,
  X,
} from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@social-network/shared-stores';
import type {
  StoryOverlay,
  StoryPrivacy,
  StoryViewResponse,
  UserStoriesGroup,
} from '@social-network/shared-contracts';
import { Button } from '@/shared/ui';
import { assertSession, getMobileApi } from '@/shared/api/client';
import { storyForm } from '../api/postForm';
import { prepareMobileUploadForm } from '../api/directUploadForm';
import { extractStoryPalette } from '../api/storyPalette';
import { feedKeys } from '../model/queries';
import { addPublishedStory, storyMediaType, validateStoryAsset } from '../model/story';
import {
  backgroundPreset,
  makeOverlay,
  STORY_BACKGROUNDS,
  STORY_COLORS,
  STORY_FILTERS,
  updateLayer,
} from '../model/storyEditor';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from './primitives';
import { StoryVideo } from './StoryVideo';
import { useStoryFonts } from './StoryFonts';
import { StoryBackground, StoryImage, StoryLayer, StoryText, MusicSticker } from './StoryCanvas';
import { StoryDrawing } from './StoryDrawing';
import { StoryDrawingEditor } from './StoryDrawingEditor';
import { StoryEmojiEditor, StoryStickerEditor, StoryTextEditor } from './StoryTools';
import { StoryMusicEditor, StoryMusicPlayer } from './StoryMusicEditor';
import { StoryToolPanel, StoryColorPicker, StoryRange } from './StoryToolPanel';
import { StoryAudio } from './StoryAudio';
import { type MessageKey, msg, tr } from '@/shared/lib/i18n';

type Tool =
  | 'text'
  | 'stickers'
  | 'music'
  | 'filters'
  | 'media'
  | 'background'
  | 'drawing'
  | 'poll'
  | 'link'
  | 'mention'
  | 'layer'
  | 'discard'
  | null;
const presetName = (name: string) => (name === 'Normal' ? tr('Normal') : name);

const MAIN_TOOLS: { id: Exclude<Tool, null>; label: MessageKey; Icon: typeof Type }[] = [
  { id: 'text', label: msg('Add text'), Icon: Type },
  { id: 'stickers', label: msg('Choose emoji'), Icon: Smile },
  { id: 'music', label: msg('Add music'), Icon: Music },
  { id: 'filters', label: msg('Effects and filters'), Icon: Sparkles },
  { id: 'media', label: msg('Choose photo or video'), Icon: ImageIcon },
];
const MORE_TOOLS: { id: Exclude<Tool, null>; label: MessageKey; Icon: typeof Type }[] = [
  { id: 'mention', label: msg('Mention'), Icon: AtSign },
  { id: 'drawing', label: msg('Drawing'), Icon: Pencil },
  { id: 'poll', label: msg('Poll'), Icon: BarChart2 },
  { id: 'background', label: msg('Background'), Icon: Palette },
  { id: 'layer', label: msg('Layers'), Icon: Layers },
];
export function CreateStory({
  userId,
  isOnline = true,
  embedded = false,
  onBusyChange,
  onCloseRequestChange,
  onClose,
}: {
  userId: string;
  isOnline?: boolean;
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onCloseRequestChange?: (handler: (() => void) | null) => void;
  onClose: () => void;
}) {
  const [asset, setAsset] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [attachments, setAttachments] = React.useState<
    Record<string, ImagePicker.ImagePickerAsset>
  >({});
  const [caption, setCaption] = React.useState('');
  const [privacy, setPrivacy] = React.useState<StoryPrivacy>('ALL_FOLLOWERS');
  const [background, setBackground] = React.useState(backgroundPreset(0));
  const [filter, setFilter] = React.useState('none');
  const [layers, setLayers] = React.useState<StoryOverlay[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [tool, setTool] = React.useState<Tool>(null);
  const [more, setMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);
  const [canvas, setCanvas] = React.useState({ width: 350, height: 550 });
  const [, fontError] = useStoryFonts();
  const client = useQueryClient();
  const submitting = React.useRef(false);
  const currentUser = useAuthStore.getState().user;
  const selected = layers.find((layer) => layer.id === selectedId);
  const music = layers.find((layer) => layer.type === 'audio');
  const mediaType = asset ? storyMediaType(asset) : 'IMAGE';
  const dirty =
    !!asset ||
    !!caption.trim() ||
    layers.length > 0 ||
    background !== backgroundPreset(0) ||
    filter !== 'none';
  const create = useMutation({
    onMutate: () => client.cancelQueries({ queryKey: feedKeys.stories(userId), exact: true }),
    mutationFn: async (audience: StoryPrivacy) => {
      const refreshToken = useAuthStore.getState().refreshToken;
      const usedAttachments = Object.fromEntries(
        Object.entries(attachments).filter(([id]) => layers.some((layer) => layer.id === id)),
      );
      const body = await storyForm(
        asset,
        caption,
        audience,
        {
          overlays: layers,
          backgroundColor: background,
          filter: filter === 'none' ? undefined : filter,
        },
        usedAttachments,
      );
      assertSession(userId, refreshToken);
      const prepared = await prepareMobileUploadForm(getMobileApi(), body, 'story');
      assertSession(userId, refreshToken);
      return (await getMobileApi().post<StoryViewResponse>('/stories', prepared)).data;
    },
    onSuccess: (story) => {
      client.setQueryData<UserStoriesGroup[]>(feedKeys.stories(userId), (groups) =>
        addPublishedStory(groups, story),
      );
      void client.invalidateQueries({ queryKey: feedKeys.stories(userId) });
      onClose();
    },
    onError: (failure) =>
      setError(
        failure instanceof Error && !('response' in failure)
          ? tr(
              'Your story was not published. Your draft is still here. {reason}. Please try again.',
              { reason: failure.message },
            )
          : tr('Your story was not published. Your draft is still here. Please try again.'),
      ),
    onSettled: () => {
      submitting.current = false;
    },
  });
  const busy = create.isPending || picking;
  const requestClose = React.useCallback(() => {
    if (busy || submitting.current) return;
    if (tool && tool !== 'discard') {
      setTool(null);
      return;
    }
    if (dirty) setTool('discard');
    else onClose();
  }, [busy, tool, dirty, onClose]);
  React.useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  React.useEffect(() => {
    onCloseRequestChange?.(requestClose);
    return () => onCloseRequestChange?.(null);
  }, [requestClose, onCloseRequestChange]);
  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => listener.remove();
  }, [requestClose]);
  function saveLayer(layer: StoryOverlay) {
    if (layers.length >= 30 && !layers.some((item) => item.id === layer.id)) {
      setError(tr('Use up to 30 layers per story.'));
      return;
    }
    setLayers((previous) =>
      previous.some((item) => item.id === layer.id)
        ? updateLayer(previous, layer)
        : [
            ...previous,
            { ...layer, zIndex: Math.max(0, ...previous.map((item) => item.zIndex)) + 1 },
          ],
    );
    setSelectedId(layer.id);
    setTool(null);
    setError(null);
  }
  function selectLayer(layer: StoryOverlay) {
    if (busy || tool) return;
    setSelectedId(layer.id);
    setLayers((previous) =>
      updateLayer(previous, {
        ...layer,
        zIndex: Math.max(0, ...previous.map((item) => item.zIndex)) + 1,
      }),
    );
  }
  function openTool(next: Tool) {
    if (busy) return;
    if (next === 'poll') {
      const poll = layers.find((layer) => layer.type === 'poll');
      setSelectedId(poll?.id || null);
    } else if (next === 'music') {
      setSelectedId(music?.id || null);
    } else if (next === 'drawing') {
      const drawing = layers.find((layer) => layer.type === 'drawing');
      setSelectedId(drawing?.id || null);
    } else if (next === 'text' || next === 'link' || next === 'mention') setSelectedId(null);
    setTool(next);
    setError(null);
  }
  async function pick(sticker = false) {
    if (busy || submitting.current) return;
    if (sticker && Object.keys(attachments).length >= 9) {
      setError(tr('Use up to 9 photo stickers.'));
      return;
    }
    setPicking(true);
    setError(null);
    try {
      if (
        Platform.OS !== 'web' &&
        !(await ImagePicker.requestMediaLibraryPermissionsAsync()).granted
      ) {
        setError(tr('Allow photo library access in Settings to add media.'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: sticker ? ['images'] : ['images', 'videos'],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      const next = result.assets[0];
      const issue = validateStoryAsset(next);
      if (issue) throw new Error(issue);
      if (sticker) {
        const layer = makeOverlay({
          type: 'image',
          url: next.uri,
          isMainMedia: false,
          aspectRatio: next.width / next.height || 1,
          borderRadius: 20,
          scale: 0.85,
        });
        setAttachments((previous) => ({ ...previous, [layer.id]: next }));
        saveLayer(layer);
      } else {
        setAsset(next);
        if (storyMediaType(next) === 'IMAGE') {
          const palette = await extractStoryPalette(next.uri);
          if (palette) setBackground(palette);
        }
        setTool(null);
        setLayers((previous) => {
          const other = previous.filter((layer) => layer.type !== 'image' || !layer.isMainMedia);
          if (storyMediaType(next) !== 'IMAGE') {
            setSelectedId(null);
            return other;
          }
          const layer = makeOverlay({
            id: 'main-media',
            type: 'image',
            url: next.uri,
            isMainMedia: true,
            aspectRatio: next.width / next.height || 1,
            borderRadius: 24,
          });
          setSelectedId(layer.id);
          return [{ ...layer, zIndex: 1 }, ...other];
        });
      }
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : tr('The photo library could not be opened.'),
      );
    } finally {
      setPicking(false);
    }
  }
  async function pickAudio() {
    if (busy) return;
    setPicking(true);
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      const next: ImagePicker.ImagePickerAsset = {
        uri: file.uri,
        width: 0,
        height: 0,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.mimeType || 'audio/mpeg',
        file: file.file,
      };
      const issue = validateStoryAsset(next);
      if (issue) throw new Error(issue);
      setAsset(next);
      setLayers((previous) =>
        previous.filter((layer) => layer.type !== 'image' || !layer.isMainMedia),
      );
      setTool(null);
      setSelectedId(null);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : tr('The audio file could not be opened.'),
      );
    } finally {
      setPicking(false);
    }
  }
  function publish(audience = privacy) {
    if (!isOnline || busy || submitting.current) return;
    if (!dirty) {
      setError(tr('Add a photo, video, text or sticker before sharing.'));
      return;
    }
    if (new Blob([JSON.stringify(layers)]).size > 240 * 1024) {
      setError(
        'This story has too much drawing detail. Remove a few strokes or layers before sharing.',
      );
      return;
    }
    setPrivacy(audience);
    setError(null);
    submitting.current = true;
    create.mutate(audience);
  }
  function removeSelected() {
    if (!selected) return;
    if (selected.type === 'image' && selected.isMainMedia) setAsset(null);
    setLayers(layers.filter((layer) => layer.id !== selected.id));
    setAttachments((previous) => {
      const next = { ...previous };
      delete next[selected.id];
      return next;
    });
    setSelectedId(null);
    setTool(null);
  }
  function editSelected() {
    if (!selected) return;
    setTool(
      selected.type === 'caption'
        ? 'text'
        : selected.type === 'image'
          ? 'layer'
          : selected.type === 'audio'
            ? 'music'
            : selected.type,
    );
  }
  function renderLayer(layer: StoryOverlay) {
    switch (layer.type) {
      case 'text':
        return <StoryText overlay={layer} width={canvas.width} />;
      case 'caption':
        return <Text style={common.text}>{layer.text}</Text>;
      case 'image': {
        const width = canvas.width * 0.75;
        return (
          <View
            style={{
              borderRadius: layer.borderRadius || 0,
              overflow: 'hidden',
              backgroundColor: layer.backgroundColor,
            }}
          >
            <StoryImage
              uri={layer.url || asset?.uri || ''}
              width={width}
              height={Math.min(canvas.height * 0.8, width / (layer.aspectRatio || 1))}
              filter={filter}
              label={layer.isMainMedia ? tr('Story photo preview') : tr('Photo sticker')}
              onError={() => setError(tr('A photo could not be loaded. Choose it again.'))}
            />
          </View>
        );
      }
      case 'poll':
        return (
          <View style={s.poll}>
            <Text style={[common.title, { color: '#18181b' }]}>{layer.question}</Text>
            {layer.options.map((option, i) => (
              <View key={i} style={s.pollOption}>
                <Text style={{ color: '#18181b' }}>{option.text}</Text>
              </View>
            ))}
          </View>
        );
      case 'link':
        return (
          <View style={s.sticker}>
            <Text style={s.stickerText}>🔗 {layer.title}</Text>
          </View>
        );
      case 'mention':
        return (
          <View style={s.sticker}>
            <Text style={s.stickerText}>@{layer.username}</Text>
          </View>
        );
      case 'audio':
        return <MusicSticker overlay={layer} />;
      case 'drawing':
        return null;
    }
  }
  const content = (
    <View style={s.editor}>
      <View
        style={s.frame}
        onLayout={(event) =>
          setCanvas({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }
        testID="story-editor-canvas"
      >
        <StoryBackground value={background} />
        {asset && mediaType === 'VIDEO' && (
          <StoryVideo
            uri={asset.uri}
            active={!busy && !tool}
            filter={filter}
            volume={music?.type === 'audio' ? music.videoVolume : 1}
            label={tr('Story video preview')}
          />
        )}
        {layers
          .filter((layer) => layer.type !== 'drawing')
          .map((layer) => (
            <StoryLayer
              key={layer.id}
              overlay={layer}
              width={canvas.width}
              height={canvas.height}
              selected={!tool && selectedId === layer.id}
              disabled={busy || !!tool}
              onSelect={() => selectLayer(layer)}
              onChange={(next) =>
                setLayers((previous) =>
                  updateLayer(previous, {
                    ...next,
                    zIndex: previous.find((layer) => layer.id === next.id)?.zIndex || next.zIndex,
                  }),
                )
              }
            >
              {renderLayer(layer)}
            </StoryLayer>
          ))}
        {layers.map((layer) =>
          layer.type === 'drawing' ? (
            <View
              key={layer.id}
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { zIndex: layer.zIndex }]}
            >
              <StoryDrawing overlay={layer} width={canvas.width} height={canvas.height} />
            </View>
          ) : null,
        )}
        {!tool && (
          <>
            <View style={s.close}>
              <IconButton
                label={tr('Close Create a story')}
                disabled={busy}
                onPress={requestClose}
                style={s.circle}
              >
                <X size={20} color="white" />
              </IconButton>
            </View>
            <ScrollView
              style={s.tools}
              contentContainerStyle={{ gap: 5, alignItems: 'flex-end', paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {[...MAIN_TOOLS, ...(more ? MORE_TOOLS : [])].map(({ id, label, Icon }) => (
                <View key={id} style={s.toolRow}>
                  {more && <Text style={s.toolLabel}>{tr(label)}</Text>}
                  <IconButton
                    label={tr(label)}
                    disabled={busy}
                    onPress={() => openTool(id)}
                    style={s.circle}
                  >
                    <Icon
                      size={20}
                      color={id === 'filters' && filter !== 'none' ? colors.purple : 'white'}
                    />
                  </IconButton>
                </View>
              ))}
              <IconButton
                label={more ? tr('Collapse extra tools') : tr('Expand extra tools')}
                disabled={busy}
                selected={more}
                onPress={() => setMore(!more)}
                style={s.circle}
              >
                <ChevronDown
                  size={20}
                  color="white"
                  style={{ transform: [{ rotate: more ? '180deg' : '0deg' }] }}
                />
              </IconButton>
            </ScrollView>
            {selected && (
              <View style={s.selection}>
                <Pressable
                  accessibilityRole="button"
                  onPress={editSelected}
                  style={s.selectionButton}
                >
                  <Text style={s.selectionText}>Edit {selected.type}</Text>
                </Pressable>
                <IconButton label={tr('Layer controls')} onPress={() => setTool('layer')}>
                  <Layers color="white" size={19} />
                </IconButton>
                <IconButton label={tr('Remove selected layer')} onPress={removeSelected}>
                  <Trash2 color="white" size={19} />
                </IconButton>
                <IconButton label={tr('Deselect layer')} onPress={() => setSelectedId(null)}>
                  <X color="white" size={18} />
                </IconButton>
              </View>
            )}
            {picking && <ActivityIndicator color={colors.purple} style={s.spinner} />}
          </>
        )}
        {tool === 'drawing' && (
          <StoryDrawingEditor
            initial={selected?.type === 'drawing' ? selected : undefined}
            width={canvas.width}
            height={canvas.height}
            onSave={saveLayer}
            onClose={() => setTool(null)}
          />
        )}
      </View>
      {error && <ErrorNotice message={error} />}
      {!isOnline && (
        <Text accessibilityRole="alert" style={common.muted}>
          {tr("You're offline. You can edit your draft and share when connected.")}
        </Text>
      )}
      {fontError && (
        <Text style={common.muted}>
          {tr("Custom fonts couldn't be loaded. Reopen the editor to retry.")}
        </Text>
      )}
      {mediaType === 'VOICE' && asset && (
        <StoryAudio
          uri={asset.uri}
          active={!busy && !tool}
          volume={music?.type === 'audio' ? music.videoVolume : 1}
          clipDurationSeconds={60}
          label={tr('Voice story')}
        />
      )}
      {music?.type === 'audio' && (
        <StoryMusicPlayer overlay={music} userId={userId} active={!busy && !tool} />
      )}
      <TextInput
        value={caption}
        onChangeText={setCaption}
        maxLength={1000}
        editable={!busy && !tool}
        placeholder={tr('Add a caption...')}
        placeholderTextColor="#909095"
        accessibilityLabel={tr('Story caption')}
        style={s.caption}
      />
      <View style={s.publish}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('Share to your story')}
          accessibilityHint={tr('Publishes to your followers')}
          disabled={!isOnline || busy || !!tool || !dirty}
          accessibilityState={{ disabled: !isOnline || busy || !!tool || !dirty }}
          onPress={() => publish('ALL_FOLLOWERS')}
          style={[s.audience, (!isOnline || busy) && s.disabled]}
        >
          {create.isPending ? (
            <ActivityIndicator color="#a855f7" />
          ) : (
            <Avatar
              size={23}
              name={currentUser?.displayName || 'You'}
              uri={currentUser?.avatarUrl}
            />
          )}
          <Text numberOfLines={1} style={s.audienceText}>
            {tr('Your story')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('Share to close friends')}
          accessibilityHint={tr('Publishes only to your close friends')}
          disabled={!isOnline || busy || !!tool || !dirty}
          accessibilityState={{ disabled: !isOnline || busy || !!tool || !dirty }}
          onPress={() => publish('CLOSE_FRIENDS')}
          style={[s.audience, s.friends, (!isOnline || busy) && s.disabled]}
        >
          <View style={s.star}>
            <Star size={12} fill="#002c20" color="#002c20" />
          </View>
          <Text numberOfLines={1} style={[s.audienceText, { color: '#5ee6b6' }]}>
            {tr('Close Friends')}
          </Text>
        </Pressable>
        <IconButton
          label={tr('Share story')}
          disabled={!isOnline || busy || !!tool || !dirty}
          onPress={() => publish()}
          style={s.share}
        >
          {create.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <ArrowRight size={23} color="white" />
          )}
        </IconButton>
      </View>
      {tool === 'text' && (
        <StoryTextEditor
          initial={selected?.type === 'text' ? selected : undefined}
          width={canvas.width}
          onSave={saveLayer}
          onClose={() => setTool(null)}
        />
      )}
      {tool === 'stickers' && (
        <StoryEmojiEditor
          onSave={(text) =>
            saveLayer(
              makeOverlay({
                type: 'text',
                text,
                fontFamily: 'modern',
                fontSizeCqw: 12,
                fontSize: 48,
                scale: 1.5,
              }),
            )
          }
          onClose={() => setTool(null)}
          onPhoto={() => {
            void pick(true);
          }}
          onLink={() => openTool('link')}
          onPoll={() => openTool('poll')}
          onMention={() => openTool('mention')}
        />
      )}
      {(tool === 'poll' || tool === 'link' || tool === 'mention') && (
        <StoryStickerEditor
          key={`${tool}-${selected?.id || 'new'}`}
          tool={tool}
          initial={selected?.type === tool ? selected : undefined}
          onSave={saveLayer}
          onClose={() => setTool(null)}
        />
      )}
      {tool === 'music' && (
        <StoryMusicEditor
          userId={userId}
          isOnline={isOnline}
          initial={selected?.type === 'audio' ? selected : undefined}
          onSave={saveLayer}
          onClose={() => setTool(null)}
        />
      )}
      {tool === 'filters' && (
        <StoryToolPanel
          title={tr('Effects and filters')}
          onClose={() => setTool(null)}
          onSave={() => setTool(null)}
        >
          <Text style={common.muted}>{tr('Preview an effect before sharing.')}</Text>
          <ScrollView horizontal contentContainerStyle={{ gap: 10 }}>
            {STORY_FILTERS.map((preset) => (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                accessibilityLabel={tr('Filter {name}', { name: presetName(preset.name) })}
                accessibilityState={{ selected: filter === preset.id }}
                aria-pressed={filter === preset.id}
                onPress={() => setFilter(preset.id)}
                style={[s.filter, filter === preset.id && { borderColor: colors.purple }]}
              >
                {asset && mediaType === 'IMAGE' ? (
                  <StoryImage
                    uri={asset.uri}
                    width={76}
                    height={90}
                    filter={preset.id}
                    label={presetName(preset.name)}
                  />
                ) : (
                  <Sparkles color={colors.purple} size={26} />
                )}
                <Text style={common.muted}>{presetName(preset.name)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </StoryToolPanel>
      )}
      {tool === 'media' && (
        <StoryToolPanel title={tr('Media')} onClose={() => setTool(null)}>
          <Button
            title={asset ? tr('Change photo or video') : tr('Choose photo or video')}
            variant="secondary"
            disabled={busy}
            onPress={() => {
              void pick();
            }}
          />
          <Button
            title={tr('Add photo sticker')}
            variant="secondary"
            disabled={busy}
            onPress={() => {
              void pick(true);
            }}
          />
          <Button
            title={tr('Choose audio file')}
            variant="secondary"
            disabled={busy}
            onPress={() => {
              void pickAudio();
            }}
          />
          <Text style={common.muted}>
            {tr('Photos up to 10 MB · Videos up to 100 MB · Audio up to 25 MB')}
          </Text>
        </StoryToolPanel>
      )}
      {tool === 'background' && (
        <StoryToolPanel
          title={tr('Background')}
          onClose={() => setTool(null)}
          onSave={() => setTool(null)}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STORY_BACKGROUNDS.map((_, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={tr('Background gradient {index}', { index: index + 1 })}
                onPress={() => setBackground(backgroundPreset(index))}
                style={{
                  width: 64,
                  height: 80,
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: background === backgroundPreset(index) ? 3 : 1,
                  borderColor: background === backgroundPreset(index) ? colors.purple : '#ffffff20',
                }}
              >
                <StoryBackground value={backgroundPreset(index)} />
              </Pressable>
            ))}
          </View>
          <StoryColorPicker
            label={tr('Canvas color')}
            value={/^#[\da-f]{6}$/i.test(background) ? background : '#181824'}
            colors={STORY_COLORS}
            onChange={setBackground}
          />
        </StoryToolPanel>
      )}
      {tool === 'layer' && (
        <StoryToolPanel
          title={tr('Layers')}
          onClose={() => setTool(null)}
          onSave={() => setTool(null)}
        >
          {layers.length ? (
            layers
              .slice()
              .sort((a, b) => b.zIndex - a.zIndex)
              .map((layer) => (
                <Pressable
                  key={layer.id}
                  accessibilityRole="button"
                  accessibilityLabel={tr('Select layer {index}', { index: layer.id })}
                  onPress={() => setSelectedId(layer.id)}
                  style={[s.layerRow, selectedId === layer.id && { borderColor: colors.purple }]}
                >
                  <Text style={common.text}>
                    {layer.type === 'text'
                      ? layer.text.slice(0, 40)
                      : layer.type === 'image' && layer.isMainMedia
                        ? tr('Main photo')
                        : layer.type}
                  </Text>
                </Pressable>
              ))
          ) : (
            <Text style={common.muted}>{tr('Add text, a sticker or media to start.')}</Text>
          )}
          {selected && (
            <>
              <StoryRange
                label={tr('Horizontal position (%)')}
                value={selected.xPercent}
                max={100}
                onChange={(xPercent) =>
                  setLayers((previous) => updateLayer(previous, { ...selected, xPercent }))
                }
              />
              <StoryRange
                label={tr('Vertical position (%)')}
                value={selected.yPercent}
                max={100}
                onChange={(yPercent) =>
                  setLayers((previous) => updateLayer(previous, { ...selected, yPercent }))
                }
              />
              <StoryRange
                label={tr('Layer scale')}
                value={selected.scale}
                min={0.3}
                max={3.5}
                step={0.1}
                onChange={(scale) =>
                  setLayers((previous) => updateLayer(previous, { ...selected, scale }))
                }
              />
              <StoryRange
                label={tr('Layer rotation')}
                value={selected.rotation}
                min={-180}
                max={180}
                onChange={(rotation) =>
                  setLayers((previous) => updateLayer(previous, { ...selected, rotation }))
                }
              />
              {selected.type === 'image' && (
                <StoryRange
                  label={tr('Photo corner radius')}
                  value={selected.borderRadius || 0}
                  max={64}
                  onChange={(borderRadius) =>
                    setLayers((previous) => updateLayer(previous, { ...selected, borderRadius }))
                  }
                />
              )}
              <Button
                title={tr('Edit selected layer')}
                variant="secondary"
                onPress={editSelected}
              />
              <Button
                title={tr('Bring selected layer to front')}
                variant="secondary"
                onPress={() =>
                  setLayers((previous) =>
                    updateLayer(previous, {
                      ...selected,
                      zIndex: Math.max(...previous.map((layer) => layer.zIndex)) + 1,
                    }),
                  )
                }
              />
              <Button
                title={tr('Remove selected layer')}
                variant="danger"
                onPress={removeSelected}
              />
            </>
          )}
        </StoryToolPanel>
      )}
      {tool === 'discard' && (
        <StoryToolPanel title={tr('Discard story?')} onClose={() => setTool(null)}>
          <Text style={common.text}>{tr('Your unpublished edits will be lost.')}</Text>
          <Button title={tr('Keep editing')} onPress={() => setTool(null)} />
          <Button title={tr('Discard story')} variant="danger" onPress={onClose} />
        </StoryToolPanel>
      )}
    </View>
  );
  return embedded ? (
    content
  ) : (
    <Sheet title={tr('Create a story')} hideHeader closeDisabled={busy} onClose={requestClose}>
      {content}
    </Sheet>
  );
}
const s = StyleSheet.create({
  editor: { flex: 1, padding: 12, gap: 8, alignSelf: 'center', width: '100%', maxWidth: 444 },
  frame: {
    flex: 1,
    minHeight: 240,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffffff26',
    backgroundColor: '#181824',
  },
  close: { position: 'absolute', top: 14, left: 14, zIndex: 40 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#ffffff26',
    backgroundColor: '#090910b8',
  },
  tools: { position: 'absolute', top: 14, right: 12, bottom: 66, zIndex: 40, maxWidth: 196 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolLabel: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#090910e0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  caption: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ffffff26',
    borderRadius: 24,
    backgroundColor: '#ffffff12',
    color: 'white',
    fontSize: 12,
  },
  publish: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  audience: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#ffffff26',
    backgroundColor: '#ffffff12',
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  audienceText: { color: 'white', fontWeight: '700', fontSize: 11 },
  friends: { backgroundColor: '#002c2080', borderColor: '#00bb7855' },
  star: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: '#00c88c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: { width: 48, height: 48, minWidth: 48, borderRadius: 24, backgroundColor: '#7830f8' },
  disabled: { opacity: 0.5 },
  selection: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    zIndex: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: '#090910db',
  },
  selectionButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  selectionText: { color: 'white', fontSize: 12, fontWeight: '600' },
  spinner: { position: 'absolute', top: '50%', left: '50%' },
  poll: { backgroundColor: 'white', borderRadius: 18, padding: 12, gap: 8 },
  pollOption: { backgroundColor: '#f4f4f5', padding: 12, borderRadius: 12 },
  sticker: { backgroundColor: 'white', borderRadius: 12, padding: 12, alignSelf: 'center' },
  stickerText: { color: '#18181b', fontSize: 18, fontWeight: '700' },
  filter: {
    width: 92,
    minHeight: 136,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ffffff26',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  layerRow: {
    minHeight: 48,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
});
