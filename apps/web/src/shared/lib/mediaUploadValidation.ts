import {
  MEDIA_UPLOAD_LIMITS,
  MAX_UPLOAD_IMAGE_DIMENSION,
  MAX_UPLOAD_IMAGE_PIXELS,
  sniffUploadImageMime,
  type MediaUploadPurpose,
  type UploadMediaKind,
} from '@social-network/shared-contracts';

const EXTENSIONS: Record<UploadMediaKind, string[]> = {
  image: ['jpg', 'jpeg', 'jfif', 'png', 'gif', 'webp'],
  video: ['mp4', 'm4v', 'mov', 'webm'],
  audio: ['mp3', 'm4a', 'mp4', 'webm', 'ogg', 'oga', 'wav'],
};
const MEDIA_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
]);

export class MediaUploadError extends Error {}

export function readUploadDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.error || typeof reader.result !== 'string') {
        reject(new MediaUploadError('Could not read this file. Please choose it again.'));
      } else {
        resolve(reader.result);
      }
    };
    reader.onerror = reader.onabort = () =>
      reject(new MediaUploadError('Could not read this file. Please choose it again.'));
    reader.readAsDataURL(file);
  });
}

function readHeader(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reader.onabort = () =>
      reject(new MediaUploadError('Could not read this file.'));
    reader.readAsArrayBuffer(file.slice(0, 64));
  });
}

async function checkDecodable(file: File, kind: UploadMediaKind): Promise<UploadMediaKind> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<UploadMediaKind>((resolve, reject) => {
      const node =
        kind === 'image'
          ? new Image()
          : document.createElement(kind === 'video' ? 'video' : 'audio');
      const cleanup = () => {
        clearTimeout(timeout);
        node.onload = node.onerror = null;
        if (node instanceof HTMLMediaElement) {
          node.onloadeddata = null;
          node.removeAttribute('src');
          node.load();
        }
      };
      const fail = () => {
        cleanup();
        reject(
          new MediaUploadError('This file is damaged or cannot be displayed. Choose another file.'),
        );
      };
      const succeed = () => {
        // Browsers commonly label audio-only WebM/MP4 files as video containers.
        const decodedKind =
          node instanceof HTMLVideoElement && node.videoWidth === 0 && node.videoHeight === 0
            ? 'audio'
            : kind;
        // Recorded WebM may omit duration metadata; loadeddata still proves a decoded sample.
        const playableDuration =
          node instanceof HTMLMediaElement && !Number.isNaN(node.duration) && node.duration > 0;
        const valid =
          node instanceof HTMLImageElement
            ? node.naturalWidth > 0 &&
              node.naturalHeight > 0 &&
              node.naturalWidth <= MAX_UPLOAD_IMAGE_DIMENSION &&
              node.naturalHeight <= MAX_UPLOAD_IMAGE_DIMENSION &&
              node.naturalWidth * node.naturalHeight <= MAX_UPLOAD_IMAGE_PIXELS
            : node instanceof HTMLVideoElement
              ? playableDuration &&
                (decodedKind === 'audio' ||
                  (node.videoWidth > 0 &&
                    node.videoHeight > 0 &&
                    node.videoWidth <= MAX_UPLOAD_IMAGE_DIMENSION &&
                    node.videoHeight <= MAX_UPLOAD_IMAGE_DIMENSION &&
                    node.videoWidth * node.videoHeight <= MAX_UPLOAD_IMAGE_PIXELS))
              : playableDuration;
        if (!valid) return fail();
        cleanup();
        resolve(decodedKind);
      };
      const timeout = setTimeout(fail, 15_000);
      node.onerror = fail;
      if (node instanceof HTMLImageElement) node.onload = succeed;
      else {
        node.preload = 'auto';
        node.onloadeddata = succeed;
      }
      node.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** No state/preview changes are allowed until both byte checks and decoding succeed. */
export async function validateMediaUpload(
  file: File,
  purpose: MediaUploadPurpose,
): Promise<UploadMediaKind> {
  if (!file.size) throw new MediaUploadError('This file is empty. Choose another file.');
  const declaredMime = file.type.toLowerCase().split(';')[0]!.trim();
  const extension = file.name.toLowerCase().split('.').pop() ?? '';
  const maxSize = Math.max(...Object.values(MEDIA_UPLOAD_LIMITS[purpose]));
  if (file.size > maxSize) throw new MediaUploadError('File is too large for this upload.');
  const bytes = await readHeader(file);
  const imageMime = sniffUploadImageMime(bytes);
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  let kind: UploadMediaKind;
  if (imageMime) {
    kind = 'image';
    if (
      declaredMime &&
      declaredMime !== 'application/octet-stream' &&
      declaredMime !== imageMime &&
      declaredMime !== 'image/jpg'
    ) {
      throw new MediaUploadError('The file contents do not match its image type.');
    }
  } else {
    const unspecifiedMime = !declaredMime || declaredMime === 'application/octet-stream';
    if (!MEDIA_MIMES.has(declaredMime) && !unspecifiedMime)
      throw new MediaUploadError('Choose a supported image, video or audio file.');
    kind = unspecifiedMime
      ? EXTENSIONS.video.includes(extension)
        ? 'video'
        : 'audio'
      : declaredMime.startsWith('video/')
        ? 'video'
        : 'audio';
    const isIsoMedia = bytes.length >= 16 && ascii(4, 8) === 'ftyp';
    const isWebm =
      bytes.length >= 4 &&
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3;
    const isOgg = ascii(0, 4) === 'OggS';
    const isMp3 = ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0);
    const isWav = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE';
    if (!(isIsoMedia || isWebm || (kind === 'audio' && (isOgg || isMp3 || isWav)))) {
      throw new MediaUploadError('The file contents do not match a supported media format.');
    }
  }
  const limit = MEDIA_UPLOAD_LIMITS[purpose][kind];
  if (!limit || !EXTENSIONS[kind].includes(extension)) {
    throw new MediaUploadError(
      purpose === 'avatar' || purpose === 'banner' || purpose === 'sticker'
        ? 'Choose a JPG, PNG, GIF or WebP image.'
        : 'Choose a supported image, video or audio file.',
    );
  }
  if (file.size > limit)
    throw new MediaUploadError('This ' + kind + ' must not exceed ' + limit / 1024 / 1024 + ' MB.');
  const decodedKind = await checkDecodable(file, kind);
  const decodedLimit = MEDIA_UPLOAD_LIMITS[purpose][decodedKind];
  if (!decodedLimit) throw new MediaUploadError('Choose a supported image or video file.');
  if (file.size > decodedLimit)
    throw new MediaUploadError(
      'This ' + decodedKind + ' must not exceed ' + decodedLimit / 1024 / 1024 + ' MB.',
    );
  return decodedKind;
}
