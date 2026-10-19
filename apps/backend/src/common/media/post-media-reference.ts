import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { isCloudflareStorageDomain } from '../storage/storage-url.util';

export type PostMediaReference = { url: string; kind: 'uploaded' | 'gif' };

/** Provider GIFs remain direct client references; never download or rehost them. */
export function validateProviderGifUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException('Choose a GIF from the picker');
  }
  const approvedHost =
    /^(?:media\d*|i)\.giphy\.com$/.test(url.hostname) ||
    ['media.tenor.com', 'c.tenor.com'].includes(url.hostname);
  if (
    !approvedHost ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    url.port
  ) {
    throw new BadRequestException('Choose a GIF from the picker');
  }
  return value;
}

async function readBoundedStream(
  stream: AsyncIterable<Uint8Array>,
  maxSize: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > maxSize) throw new BadRequestException('Media file is too large');
    chunks.push(Buffer.from(chunk));
  }
  if (!size) throw new BadRequestException('Empty media reference');
  return Buffer.concat(chunks, size);
}

export async function readPostMediaReference(
  reference: PostMediaReference,
  storage: { s3: S3Client; bucket: string; publicUrl: string },
): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(reference.url);
  } catch {
    throw new BadRequestException('Invalid media reference');
  }
  if (url.username || url.password || url.hash || !['https:', 'http:'].includes(url.protocol)) {
    throw new BadRequestException('Use a verified upload or a GIF from the picker');
  }
  if (reference.kind === 'gif') {
    throw new BadRequestException('Provider GIFs must be used as direct media references');
  }

  const publicUrl = (process.env.R2_PUBLIC_URL || storage.publicUrl).replace(/\/+$/, '');
  const direct =
    isCloudflareStorageDomain(publicUrl) ||
    publicUrl.endsWith('/' + storage.bucket) ||
    process.env.S3_FORCE_PATH_STYLE === 'false';
  const prefix = publicUrl + (direct ? '/' : '/' + storage.bucket + '/');
  let key = reference.url.startsWith(prefix) ? reference.url.slice(prefix.length) : '';
  let local = false;
  if (
    !key &&
    process.env.NODE_ENV !== 'production' &&
    !process.env.RENDER &&
    !process.env.RENDER_SERVICE_ID &&
    process.env.STORAGE_DRIVER !== 'r2'
  ) {
    const localBase =
      (
        process.env.LOCAL_STORAGE_PUBLIC_URL || 'http://localhost:' + (process.env.PORT || 3000)
      ).replace(/\/+$/, '') + '/uploads/';
    if (reference.url.startsWith(localBase)) {
      key = reference.url.slice(localBase.length);
      local = true;
    }
  }
  if (!/^posts\/[a-zA-Z0-9_-]{16}\.(?:jpg|png|gif|webp|mp4|mov|webm)$/.test(key)) {
    throw new BadRequestException('Use media returned by the upload endpoint');
  }
  if (local) {
    const directory = process.env.LOCAL_STORAGE_DIR
      ? resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR)
      : resolve(process.cwd(), 'uploads');
    try {
      return await readBoundedStream(createReadStream(resolve(directory, key)), 100 * 1024 * 1024);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Uploaded media is no longer available');
    }
  }
  try {
    const object = await storage.s3.send(
      new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
    );
    if (!(object.Body instanceof Readable)) throw new Error('Invalid storage response');
    if ((object.ContentLength ?? 0) > 100 * 1024 * 1024) {
      object.Body.destroy();
      throw new BadRequestException('Invalid media reference or file size');
    }
    return await readBoundedStream(object.Body as AsyncIterable<Uint8Array>, 100 * 1024 * 1024);
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    if ((error as { name?: string }).name === 'NoSuchKey')
      throw new BadRequestException('Uploaded media is no longer available');
    throw new ServiceUnavailableException('Uploaded media could not be read. Please try again.');
  }
}
