export const VIDEO_EXTENSIONS_REGEX =
  /\.(mp4|m4v|webm|ogv|mov|mkv|avi|wmv|flv|3gp|3g2|ts|mpeg|mpg)(\?.*)?$/i;

export const IMAGE_EXTENSIONS_REGEX = /\.(png|jpe?g|webp|svg|bmp|heic|avif|ico)(\?.*)?$/i;

export interface MediaCheckTarget {
  type?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  url?: string | null;
  name?: string | null;
}

export function isVideoAttachment(target?: MediaCheckTarget | null): boolean {
  if (!target) return false;
  if (target.type === 'VIDEO') return true;
  if (target.mimeType && target.mimeType.toLowerCase().startsWith('video/')) return true;

  const fileName = target.fileName || target.name || '';
  if (fileName && VIDEO_EXTENSIONS_REGEX.test(fileName)) return true;

  const url = target.url || '';
  if (url && VIDEO_EXTENSIONS_REGEX.test(url)) return true;

  return false;
}

export function isImageAttachment(target?: MediaCheckTarget | null): boolean {
  if (!target) return false;
  if (target.type === 'IMAGE' || target.type === 'GIF') return true;
  if (target.mimeType && target.mimeType.toLowerCase().startsWith('image/')) return true;

  const fileName = target.fileName || target.name || '';
  if (fileName && IMAGE_EXTENSIONS_REGEX.test(fileName)) return true;

  const url = target.url || '';
  if (url && IMAGE_EXTENSIONS_REGEX.test(url)) return true;

  return false;
}

export function formatVideoTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}
