import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import {
  CreateStoryDtoSchema,
  createReelSchema,
  type CreateReelDto,
  type StoryPrivacy,
  type CreateStoryDto,
} from '@social-network/shared-contracts';
import { storyMediaType, validateStoryAsset } from '../model/story';

// React Native 0.76's FormData accepts file descriptors, unlike the DOM overload.
declare global {
  interface FormData {
    append(name: string, value: { uri: string; name: string; type: string }): void;
  }
}

async function appendAsset(body: FormData, field: string, asset: ImagePickerAsset) {
  const video = asset.type === 'video' || asset.mimeType?.toLowerCase().startsWith('video/');
  const audio = asset.mimeType?.toLowerCase().startsWith('audio/');
  const name = asset.fileName || `attachment.${audio ? 'mp3' : video ? 'mp4' : 'jpg'}`;
  if (Platform.OS === 'web') {
    if (asset.file) body.append(field, asset.file, name);
    else {
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Cannot read attachment');
      body.append(field, await response.blob(), name);
    }
  } else {
    body.append(field, {
      uri: asset.uri,
      name,
      type: asset.mimeType || (video ? 'video/mp4' : 'image/jpeg'),
    });
  }
}

export async function postForm(
  content: string,
  assets: ImagePickerAsset[],
  poll: string[],
): Promise<FormData> {
  const body = new FormData();
  body.append('content', content.trim());
  if (poll.length) body.append('poll', JSON.stringify(poll.map((option) => option.trim())));
  for (const asset of assets) await appendAsset(body, 'media', asset);
  return body;
}

export async function storyForm(
  asset: ImagePickerAsset | null,
  caption: string,
  privacy: StoryPrivacy = 'ALL_FOLLOWERS',
  appearance: Pick<CreateStoryDto, 'overlays' | 'backgroundColor' | 'filter'> = {},
  attachments: Record<string, ImagePickerAsset> = {},
): Promise<FormData> {
  const error = asset ? validateStoryAsset(asset) : null;
  if (error) throw new Error(error);
  if (!asset && !appearance.backgroundColor) throw new Error('Add media or a background.');
  if (Object.keys(attachments).length > 9) throw new Error('Use up to 9 photo stickers.');
  for (const attachment of Object.values(attachments)) {
    const issue = validateStoryAsset(attachment);
    if (issue || storyMediaType(attachment) !== 'IMAGE')
      throw new Error(issue || 'Photo stickers must be images.');
  }
  const totalSize = [asset, ...Object.values(attachments)].reduce(
    (size, item) => size + Math.max(item?.fileSize || 0, item?.file?.size || 0),
    0,
  );
  if (totalSize > 100 * 1024 * 1024) throw new Error('Keep total story media under 100 MB.');
  const fields = CreateStoryDtoSchema.parse({
    ...appearance,
    overlays: appearance.overlays?.map((layer) =>
      layer.type === 'image' && (layer.isMainMedia || attachments[layer.id])
        ? { ...layer, url: undefined }
        : layer,
    ),
    caption: caption.trim(),
    mediaType: asset ? storyMediaType(asset) : 'IMAGE',
    privacy,
  });
  const overlayJson = JSON.stringify(fields.overlays || []);
  if (new Blob([overlayJson]).size > 256 * 1024)
    throw new Error('Story layers exceed the upload limit.');
  const body = new FormData();
  body.append('caption', fields.caption || '');
  body.append('mediaType', fields.mediaType);
  body.append('privacy', fields.privacy);
  if (fields.overlays) body.append('overlays', overlayJson);
  if (fields.backgroundColor) body.append('backgroundColor', fields.backgroundColor);
  if (fields.filter) body.append('filter', fields.filter);
  if (asset) await appendAsset(body, 'file', asset);
  for (const [id, attachment] of Object.entries(attachments))
    await appendAsset(body, `overlay:${id}`, attachment);
  return body;
}

export async function reelForm(asset: ImagePickerAsset, input: CreateReelDto): Promise<FormData> {
  if (asset.type !== 'video' && !asset.mimeType?.startsWith('video/'))
    throw new Error('Choose a video for your reel');
  const fields = createReelSchema.parse({
    ...input,
    caption: input.caption?.trim(),
    audioTitle: input.audioTitle?.trim() || undefined,
    audioArtist: input.audioArtist?.trim() || undefined,
    duration: asset.duration && asset.duration > 0 ? asset.duration / 1000 : undefined,
    width: asset.width > 0 ? asset.width : undefined,
    height: asset.height > 0 ? asset.height : undefined,
  });
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) body.append(key, String(value));
  }
  await appendAsset(body, 'video', asset);
  return body;
}
