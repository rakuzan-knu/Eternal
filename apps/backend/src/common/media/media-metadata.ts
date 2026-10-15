import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

type Metadata = {
  width?: number | undefined;
  height?: number | undefined;
  duration?: number | undefined;
};
const invalid = (): never => {
  throw new BadRequestException('Unsupported or invalid media metadata');
};

/** Only bounded metadata ranges are read; mdat/Cluster payloads are never downloaded. */
export async function inspectMedia(
  contentType: string,
  size: number,
  read: (start: number, end: number) => Promise<Buffer>,
  maxDurationSeconds = 60,
): Promise<Metadata> {
  if (contentType.startsWith('image/')) {
    const prefix = await read(0, Math.min(size - 1, 256 * 1024 - 1));
    const meta = await sharp(prefix, { limitInputPixels: 16_777_216, animated: false })
      .metadata()
      .catch(invalid);
    const formats: Record<string, string> = {
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    if (
      !meta.format ||
      formats[meta.format] !== contentType ||
      !meta.width ||
      !meta.height ||
      meta.width > 4096 ||
      meta.height > 4096
    )
      invalid();
    return { width: meta.width, height: meta.height };
  }
  if (contentType === 'video/mp4' || contentType === 'video/quicktime') {
    let offset = 0;
    for (let count = 0; count < 32 && offset + 8 <= size; count++) {
      const header = await read(offset, Math.min(size - 1, offset + 15));
      const type = header.toString('ascii', 4, 8);
      let length = header.readUInt32BE(0);
      const headerSize = length === 1 ? 16 : 8;
      if (length === 1) {
        if (header.length < 16) invalid();
        const long = header.readBigUInt64BE(8);
        if (long > BigInt(Number.MAX_SAFE_INTEGER)) invalid();
        length = Number(long);
      }
      if (length === 0) length = size - offset;
      if (length < headerSize || offset + length > size) invalid();
      if (count === 0 && type !== 'ftyp') invalid();
      if (type === 'moov') {
        if (length > 256 * 1024) invalid();
        const box = await read(offset + headerSize, offset + length - 1);
        const meta: Metadata = {};
        function walk(data: Buffer, depth: number): void {
          if (depth > 4) invalid();
          for (let pos = 0; pos + 8 <= data.length;) {
            const n = data.readUInt32BE(pos);
            if (n < 8 || pos + n > data.length) invalid();
            const name = data.toString('ascii', pos + 4, pos + 8);
            const body = data.subarray(pos + 8, pos + n);
            if (name === 'mvhd') {
              const version = body[0];
              const scaleOffset = version === 1 ? 20 : 12;
              if (
                (version !== 0 && version !== 1) ||
                body.length < scaleOffset + (version === 1 ? 12 : 8)
              )
                invalid();
              const scale = body.readUInt32BE(scaleOffset);
              const ticks =
                version === 1
                  ? Number(body.readBigUInt64BE(scaleOffset + 4))
                  : body.readUInt32BE(scaleOffset + 4);
              if (!scale) invalid();
              meta.duration = ticks / scale;
            }
            if (name === 'tkhd' && body.length >= 8) {
              const width = body.readUInt32BE(body.length - 8) / 65536;
              const height = body.readUInt32BE(body.length - 4) / 65536;
              if (width && height) {
                meta.width = Math.max(meta.width || 0, width);
                meta.height = Math.max(meta.height || 0, height);
              }
            }
            if (name === 'trak') walk(body, depth + 1);
            pos += n;
          }
        }
        walk(box, 0);
        return validateVideo(meta, maxDurationSeconds);
      }
      offset += length;
    }
    return invalid();
  }
  if (contentType === 'video/webm') {
    const data = await read(0, Math.min(size - 1, 256 * 1024 - 1));
    if (data.length < 4 || data.readUInt32BE(0) !== 0x1a45dfa3) invalid();
    let scale = 1_000_000;
    let duration: number | undefined;
    const meta: Metadata = {};
    function vint(pos: number, id: boolean): { value: number; length: number; unknown: boolean } {
      const first = data[pos];
      if (!first) return invalid();
      let length = 1;
      while (length <= 8 && !(first & (1 << (8 - length)))) length++;
      if (length > (id ? 4 : 8) || pos + length > data.length) return invalid();
      let value = id ? first : first & ((1 << (8 - length)) - 1);
      let unknown = !id && value === (1 << (8 - length)) - 1;
      for (let i = 1; i < length; i++) {
        value = value * 256 + data[pos + i];
        unknown = unknown && data[pos + i] === 255;
      }
      if (!unknown && !Number.isSafeInteger(value)) invalid();
      return { value, length, unknown };
    }
    function walk(start: number, end: number, depth: number): void {
      if (depth > 6) invalid();
      for (let pos = start; pos < end;) {
        const id = vint(pos, true);
        pos += id.length;
        const length = vint(pos, false);
        pos += length.length;
        if (id.value === 0x1f43b675) return; // Cluster: no payload inspection.
        const next = length.unknown ? end : pos + length.value;
        const container = [0x18538067, 0x1549a966, 0x1654ae6b, 0xae, 0xe0].includes(id.value);
        if (container) walk(pos, Math.min(next, end), depth + 1);
        else {
          if (next > end) return;
          const value = data.subarray(pos, next);
          if (id.value === 0x2ad7b1 && value.length > 0 && value.length <= 6)
            scale = value.readUIntBE(0, value.length);
          if (id.value === 0x4489)
            duration =
              value.length === 4
                ? value.readFloatBE()
                : value.length === 8
                  ? value.readDoubleBE()
                  : undefined;
          if (id.value === 0xb0 && value.length > 0 && value.length <= 4)
            meta.width = value.readUIntBE(0, value.length);
          if (id.value === 0xba && value.length > 0 && value.length <= 4)
            meta.height = value.readUIntBE(0, value.length);
        }
        if (next <= pos) invalid();
        pos = next;
      }
    }
    walk(0, data.length, 0);
    meta.duration = duration === undefined ? undefined : (duration * scale) / 1e9;
    return validateVideo(meta, maxDurationSeconds);
  }
  if (contentType.startsWith('audio/')) {
    const prefix = await read(0, Math.min(size - 1, 63));
    const valid =
      contentType === 'audio/mpeg'
        ? prefix.toString('ascii', 0, 3) === 'ID3' ||
          (prefix[0] === 255 && (prefix[1] & 224) === 224)
        : contentType === 'audio/wav'
          ? prefix.toString('ascii', 0, 4) === 'RIFF' && prefix.toString('ascii', 8, 12) === 'WAVE'
          : contentType === 'audio/ogg'
            ? prefix.toString('ascii', 0, 4) === 'OggS'
            : contentType === 'audio/mp4'
              ? prefix.toString('ascii', 4, 8) === 'ftyp'
              : contentType === 'audio/webm'
                ? prefix.length >= 4 && prefix.readUInt32BE(0) === 0x1a45dfa3
                : false;
    if (!valid) invalid();
  }
  return {};
}

function validateVideo(meta: Metadata, maxDurationSeconds: number): Metadata {
  if (
    !meta.duration ||
    !Number.isFinite(meta.duration) ||
    meta.duration <= 0 ||
    meta.duration > maxDurationSeconds ||
    !meta.width ||
    !meta.height ||
    meta.width < 1 ||
    meta.height < 1 ||
    meta.width > 1920 ||
    meta.height > 1920
  )
    invalid();
  return meta;
}
