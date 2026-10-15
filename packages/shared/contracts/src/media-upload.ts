export type UploadMediaKind = 'image' | 'video' | 'audio';
export type MediaUploadPurpose = 'avatar' | 'banner' | 'post' | 'story' | 'sticker';

const MIB = 1024 * 1024;
export const MAX_UPLOAD_IMAGE_PIXELS = 40_000_000;
export const MAX_UPLOAD_IMAGE_DIMENSION = 16_384;
export const MAX_UPLOAD_ANIMATION_FRAMES = 300;
export const MAX_UPLOAD_ANIMATION_PIXELS = 100_000_000;

export const MEDIA_UPLOAD_LIMITS: Record<
  MediaUploadPurpose,
  Partial<Record<UploadMediaKind, number>>
> = {
  avatar: { image: 10 * MIB },
  banner: { image: 20 * MIB },
  post: { image: 10 * MIB, video: 100 * MIB },
  story: { image: 10 * MIB, video: 100 * MIB, audio: 25 * MIB },
  sticker: { image: 10 * MIB },
};

export const IMAGE_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
export const POST_UPLOAD_ACCEPT = IMAGE_UPLOAD_ACCEPT + ',video/mp4,video/webm,video/quicktime';
export const STORY_UPLOAD_ACCEPT =
  POST_UPLOAD_ACCEPT + ',audio/mpeg,audio/mp4,audio/webm,audio/ogg,audio/wav';

/** Identifies raster formats from bytes, never from a user-supplied filename/MIME. */
export function sniffUploadImageMime(bytes: Uint8Array): string | null {
  const startsWith = (signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes.length >= 3 && startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (bytes.length >= 8 && startsWith([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])) return 'image/png';
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(ascii(0, 6))) return 'image/gif';
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}
