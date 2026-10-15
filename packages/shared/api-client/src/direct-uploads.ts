import type { AxiosInstance } from 'axios';

export type DirectUploadPurpose =
  'post' | 'story' | 'story-overlay' | 'reel' | 'avatar' | 'banner' | 'comment' | 'chat';

export interface CompletedDirectUpload {
  uploadId: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  duration?: number;
  width?: number;
  height?: number;
}

export interface NativeUploadFile {
  uri: string;
  name: string;
  type: string;
}

export type UploadFormEntry = readonly [string, string | Blob | NativeUploadFile];

interface UploadOptions {
  signal?: AbortSignal | undefined;
  conversationId?: string | undefined;
  /** Native FormData has no iterator; its builder supplies the original entries. */
  entries?: readonly UploadFormEntry[] | undefined;
}

function hasFormIterator(form: FormData): form is FormData & {
  entries(): IterableIterator<[string, string | Blob]>;
} {
  return 'entries' in form && typeof form.entries === 'function';
}

type UploadClient = Pick<AxiosInstance, 'post' | 'delete'>;
type StartResponse =
  | { mode: 'proxy' }
  | { mode: 'direct'; uploadId: string; url: string; headers: Record<string, string> };

const MIB = 1024 * 1024;

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const error = new Error('Upload cancelled');
    error.name = 'AbortError';
    throw error;
  }
}

async function readFile(value: Blob | NativeUploadFile, signal?: AbortSignal) {
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    const name = 'name' in value && typeof value.name === 'string' ? value.name : 'attachment';
    return { blob: value, name };
  }
  if (!('uri' in value)) throw new Error('Cannot read attachment');
  const response = await fetch(value.uri, { ...(signal ? { signal } : {}) });
  if (!response.ok && response.status !== 0) throw new Error('Cannot read attachment');
  const source = await response.blob();
  const blob = source.type === value.type ? source : source.slice(0, source.size, value.type);
  return { blob, name: value.name };
}

/** Canvas encoding strips EXIF/GPS metadata and bounds image dimensions before upload. */
async function prepareImage(blob: Blob, signal?: AbortSignal): Promise<Blob> {
  if (
    !blob.type.startsWith('image/') ||
    blob.type === 'image/gif' ||
    typeof document === 'undefined' ||
    typeof createImageBitmap !== 'function'
  )
    return blob;
  throwIfAborted(signal);
  const image = await createImageBitmap(blob);
  try {
    const ratio = Math.min(1, 2048 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot prepare image');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const type = blob.type === 'image/png' ? 'image/png' : 'image/webp';
    const result = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Cannot prepare image'))),
        type,
        0.85,
      ),
    );
    throwIfAborted(signal);
    return result;
  } finally {
    image.close();
  }
}

function validateFile(blob: Blob, purpose: DirectUploadPurpose): void {
  const image = blob.type.startsWith('image/');
  const video = blob.type.startsWith('video/');
  const audio = blob.type.startsWith('audio/');
  const maximum = image ? 5 * MIB : audio ? 10 * MIB : 20 * MIB;
  if (blob.size < 1 || blob.size > maximum) {
    throw new Error(`Attachment must be between 1 byte and ${maximum / MIB} MiB`);
  }
  if (purpose !== 'chat' && !image && !video && !(purpose === 'story' && audio)) {
    throw new Error('Choose a supported image or video');
  }
  if (purpose === 'reel' && !video) throw new Error('Choose a video for your reel');
  if (['avatar', 'banner', 'story-overlay'].includes(purpose) && !image) {
    throw new Error('Choose an image');
  }
}

/**
 * Upload bytes to the signed storage origin, then send only server-verified references to APIs.
 * A failed start never falls back to a Render upload. Only explicit local-storage proxy mode can.
 */
export async function prepareDirectUploadForm(
  api: UploadClient,
  original: FormData,
  purpose: DirectUploadPurpose,
  options: UploadOptions = {},
): Promise<FormData> {
  if (!options.entries && !hasFormIterator(original))
    throw new Error('Native upload form entries are required');
  const entries: readonly UploadFormEntry[] =
    options.entries ?? (hasFormIterator(original) ? Array.from(original.entries()) : []);
  if (!entries.some(([, value]) => typeof value !== 'string')) return original;
  if (purpose === 'chat' && !options.conversationId) throw new Error('Conversation is required');
  const output = new FormData();
  const overlays: Record<string, string> = {};
  const media: Array<{ type: 'IMAGE' | 'VIDEO'; url: string; order: number }> = [];
  const unfinished = new Set<string>();
  let completed = 0;
  try {
    for (const [field, value] of entries) {
      throwIfAborted(options.signal);
      if (typeof value === 'string') {
        if (purpose === 'post' && field === 'media') {
          const parsed: unknown = JSON.parse(value);
          if (!Array.isArray(parsed)) throw new Error('Invalid post media');
          for (const raw of parsed) {
            const item: unknown = raw;
            if (
              typeof item !== 'object' ||
              item === null ||
              !('type' in item) ||
              !('url' in item) ||
              (item.type !== 'IMAGE' && item.type !== 'VIDEO') ||
              typeof item.url !== 'string'
            ) {
              throw new Error('Invalid post media');
            }
            media.push({ type: item.type, url: item.url, order: media.length });
          }
        } else output.append(field, value);
        continue;
      }
      const filePurpose = field.startsWith('overlay:') ? 'story-overlay' : purpose;
      const source = await readFile(value, options.signal);
      let contentType =
        source.blob.type.split(';', 1)[0]?.trim().toLowerCase() || 'application/octet-stream';
      if (
        purpose === 'chat' &&
        !/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|webm|ogg|wav))$/.test(
          contentType,
        )
      )
        contentType = 'application/octet-stream';
      const normalized =
        source.blob.type === contentType
          ? source.blob
          : source.blob.slice(0, source.blob.size, contentType);
      const blob = await prepareImage(normalized, options.signal);
      validateFile(blob, filePurpose);
      const { data: start } = await api.post<StartResponse>(
        '/uploads/direct',
        {
          purpose: filePurpose,
          contentType: blob.type || 'application/octet-stream',
          sizeBytes: blob.size,
          filename: source.name,
          ...(options.conversationId ? { conversationId: options.conversationId } : {}),
        },
        { ...(options.signal ? { signal: options.signal } : {}) },
      );
      if (start.mode === 'proxy') {
        if (completed) throw new Error('Upload storage configuration changed; try again');
        return original;
      }
      if (start.mode === 'direct' && start.uploadId) unfinished.add(start.uploadId);
      if (start.mode !== 'direct' || !start.uploadId || new URL(start.url).protocol !== 'https:') {
        throw new Error('Invalid direct upload destination');
      }
      const headers: Record<string, string> = {};
      for (const [name, header] of Object.entries(start.headers)) {
        if (/^(authorization|cookie)$/i.test(name))
          throw new Error('Invalid storage upload headers');
        // Browsers set this forbidden header automatically from the Blob's exact byte length.
        if (name.toLowerCase() !== 'content-length') headers[name] = header;
      }
      const response = await fetch(start.url, {
        method: 'PUT',
        body: blob,
        headers,
        credentials: 'omit',
        redirect: 'error',
        ...(options.signal ? { signal: options.signal } : {}),
      });
      if (!response.ok) throw new Error(`Storage upload failed (${response.status})`);
      const { data: proof } = await api.post<CompletedDirectUpload>(
        `/uploads/direct/${encodeURIComponent(start.uploadId)}/complete`,
        {},
        { ...(options.signal ? { signal: options.signal } : {}) },
      );
      unfinished.delete(start.uploadId);
      completed++;
      if (field.startsWith('overlay:')) overlays[field.slice('overlay:'.length)] = proof.uploadId;
      else if (purpose === 'post') {
        if (proof.kind !== 'IMAGE' && proof.kind !== 'VIDEO')
          throw new Error('Invalid post attachment');
        media.push({ type: proof.kind, url: proof.url, order: media.length });
      } else output.append('uploadId', proof.uploadId);
    }
    if (media.length) output.append('media', JSON.stringify(media));
    if (Object.keys(overlays).length) output.append('overlayUploads', JSON.stringify(overlays));
    return output;
  } catch (error) {
    // The original signal may already be aborted. Cleanup gets its own short, bounded request.
    await Promise.allSettled(
      Array.from(unfinished, (id) =>
        api.delete(`/uploads/direct/${encodeURIComponent(id)}`, { timeout: 5_000 }),
      ),
    );
    throw error;
  }
}
