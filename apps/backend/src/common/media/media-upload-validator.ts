import { BadRequestException, HttpException } from '@nestjs/common';
import { validateMediaDecoding } from './media-decode-validator';
import {
  MAX_UPLOAD_IMAGE_DIMENSION,
  MAX_UPLOAD_IMAGE_PIXELS,
  MEDIA_UPLOAD_LIMITS,
  sniffUploadImageMime,
  type MediaUploadPurpose,
  type UploadMediaKind,
} from '../contracts/media-upload';
import {
  BufferSource,
  EncodedPacketSink,
  Input,
  MP4,
  MP3,
  FLAC,
  OGG,
  QTFF,
  WAVE,
  WEBM,
} from 'mediabunny';

export interface ValidatedUploadMedia {
  kind: UploadMediaKind;
  mime: string;
  ext: string;
}

export function enforceUploadSize(
  buffer: Buffer,
  purpose: MediaUploadPurpose,
  kind: UploadMediaKind,
): void {
  const limit = MEDIA_UPLOAD_LIMITS[purpose][kind];
  if (!Buffer.isBuffer(buffer) || !buffer.length || !limit) {
    throw new BadRequestException('Unsupported or invalid file format');
  }
  if (buffer.length > limit) {
    throw new BadRequestException(
      kind[0].toUpperCase() + kind.slice(1) + ' size exceeds ' + limit / 1024 / 1024 + 'MB limit',
    );
  }
}

/** Validate container, tracks and every encoded packet; never trust the supplied MIME. */
export async function validateUploadedMedia(
  buffer: Buffer,
  purpose: 'post' | 'story',
): Promise<ValidatedUploadMedia> {
  if (!Buffer.isBuffer(buffer) || !buffer.length)
    throw new BadRequestException('Invalid media file');
  const imageMime = sniffUploadImageMime(buffer);
  if (imageMime) {
    enforceUploadSize(buffer, purpose, 'image');
    return {
      kind: 'image',
      mime: imageMime,
      ext: imageMime === 'image/jpeg' ? 'jpg' : imageMime.slice(6),
    };
  }
  const maxSize = Math.max(...Object.values(MEDIA_UPLOAD_LIMITS[purpose]));
  if (buffer.length > maxSize) throw new BadRequestException('Media file is too large');
  const input = new Input({
    source: new BufferSource(buffer),
    formats: [MP4, QTFF, WEBM, MP3, OGG, WAVE, FLAC],
  });
  const deadline = Date.now() + 10_000;
  const timeout = setTimeout(() => input.dispose(), 10_000);
  try {
    const video = await input.getPrimaryVideoTrack();
    const audio = await input.getPrimaryAudioTrack();
    const kind = video ? 'video' : 'audio';
    if (!video && !audio) throw new Error('No media tracks');
    enforceUploadSize(buffer, purpose, kind);
    const tracks = await input.getTracks();
    if (tracks.length > 8) throw new Error('Too many tracks');
    let packetCount = 0;
    for (const track of tracks) {
      if (track.type !== 'video' && track.type !== 'audio') continue;
      if (track.isVideoTrack()) {
        const width = await track.getDisplayWidth();
        const height = await track.getDisplayHeight();
        if (
          width <= 0 ||
          height <= 0 ||
          width > MAX_UPLOAD_IMAGE_DIMENSION ||
          height > MAX_UPLOAD_IMAGE_DIMENSION ||
          width * height > MAX_UPLOAD_IMAGE_PIXELS
        ) {
          throw new Error('Invalid video dimensions');
        }
      }
      if (!(await track.getCodec())) throw new Error('Unsupported codec');
      let hasPackets = false;
      const sink = new EncodedPacketSink(track);
      for await (const packet of sink.packets(undefined, undefined, { skipLiveWait: true })) {
        if (++packetCount > 1_000_000 || Date.now() > deadline)
          throw new Error('Media validation limit exceeded');
        if (
          !packet.data.length ||
          !Number.isFinite(packet.timestamp) ||
          !Number.isFinite(packet.duration) ||
          packet.duration < 0
        ) {
          throw new Error('Invalid media packet');
        }
        hasPackets = true;
      }
      if (!hasPackets) throw new Error('Empty media track');
    }
    const fullMime = await input.getMimeType();
    const mime = fullMime.split(';')[0];
    const extensions: Record<string, string> = {
      'video/mp4': 'mp4',
      'audio/mp4': 'm4a',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/flac': 'flac',
    };
    const ext = extensions[mime];
    if (!ext) throw new Error('Unsupported media container');
    clearTimeout(timeout);
    await validateMediaDecoding(buffer);
    return { kind, mime, ext };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new BadRequestException('Unsupported, damaged or empty media file');
  } finally {
    clearTimeout(timeout);
    input.dispose();
  }
}
