import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { createReelSchema, type CreateReelDto } from '@social-network/shared-contracts';

// React Native 0.76's FormData accepts file descriptors, unlike the DOM overload.
declare global {
  interface FormData {
    append(name: string, value: { uri: string; name: string; type: string }): void;
  }
}

async function appendAsset(body: FormData, field: string, asset: ImagePickerAsset) {
  const name = asset.fileName || `attachment.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
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
      type: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
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

export async function storyForm(asset: ImagePickerAsset, caption: string): Promise<FormData> {
  const body = new FormData();
  body.append('caption', caption.trim());
  body.append('mediaType', asset.type === 'video' ? 'VIDEO' : 'IMAGE');
  body.append('privacy', 'ALL_FOLLOWERS');
  await appendAsset(body, 'file', asset);
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
