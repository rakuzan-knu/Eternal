import { Platform, Share } from 'react-native';

export async function shareLink(title: string, url: string) {
  if (Platform.OS === 'web') {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return 'shared';
      } catch (error) {
        if (
          (error instanceof Error || error instanceof DOMException) &&
          error.name === 'AbortError'
        )
          return 'dismissed';
        throw error;
      }
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  }
  const result = await Share.share({ title, message: `${title}\n${url}` });
  return result.action === Share.sharedAction ? 'shared' : 'dismissed';
}
