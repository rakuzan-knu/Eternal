import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { decode } from 'jpeg-js';
import { base64Bytes, storyPalette } from '../model/storyPalette';

export async function extractStoryPalette(uri: string) {
  let preview: string | undefined;
  try {
    const image = await manipulateAsync(uri, [{ resize: { width: 16, height: 16 } }], {
      format: SaveFormat.JPEG,
      compress: 1,
      base64: true,
    });
    preview = image.uri;
    if (!image.base64) return null;
    const decoded = decode(base64Bytes(image.base64), {
      useTArray: true,
      maxResolutionInMP: 1,
      maxMemoryUsageInMB: 4,
    });
    return storyPalette(decoded.data, decoded.width, decoded.height);
  } catch {
    return null;
  } finally {
    if (preview && FileSystem.cacheDirectory && preview.startsWith(FileSystem.cacheDirectory))
      await FileSystem.deleteAsync(preview, { idempotent: true }).catch(() => undefined);
  }
}
