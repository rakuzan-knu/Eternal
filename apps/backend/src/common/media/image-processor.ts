import sharp from 'sharp';
import os from 'os';
import { type S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { isCloudflareStorageDomain } from '../storage/storage-url.util';

// Configure libvips threadpool and SIMD hardware acceleration for peak throughput
try {
  const cpuCount = typeof os.cpus === 'function' ? os.cpus().length || 4 : 4;
  sharp.concurrency(Math.max(1, cpuCount - 1));
  sharp.cache({ memory: 128, files: 50, items: 200 });
  sharp.simd(true);
} catch {
  // Graceful fallback for restricted environments
}

export interface ProcessedImageResult {
  buffer: Buffer;
  contentType: string;
  ext: string;
}

/**
 * Optimizes an avatar image: 512x512 cover, WebP/GIF, stripped EXIF metadata
 */
export async function optimizeAvatar(buffer: Buffer): Promise<ProcessedImageResult> {
  const isGif = buffer.length >= 6 && buffer.toString('ascii', 0, 3) === 'GIF';
  try {
    if (isGif) {
      const optimized = await sharp(buffer, { animated: true })
        .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
        .gif()
        .toBuffer();
      return {
        buffer: optimized,
        contentType: 'image/gif',
        ext: 'gif',
      };
    }
    const optimized = await sharp(buffer)
      .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
    return {
      buffer: optimized,
      contentType: 'image/webp',
      ext: 'webp',
    };
  } catch {
    return {
      buffer,
      contentType: isGif ? 'image/gif' : 'image/jpeg',
      ext: isGif ? 'gif' : 'jpg',
    };
  }
}

/**
 * Optimizes a profile banner: max 1920x1080 inside, WebP/GIF, stripped metadata
 */
export async function optimizeBanner(buffer: Buffer): Promise<ProcessedImageResult> {
  const isGif = buffer.length >= 6 && buffer.toString('ascii', 0, 3) === 'GIF';
  try {
    if (isGif) {
      const optimized = await sharp(buffer, { animated: true })
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .gif()
        .toBuffer();
      return {
        buffer: optimized,
        contentType: 'image/gif',
        ext: 'gif',
      };
    }
    const optimized = await sharp(buffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
    return {
      buffer: optimized,
      contentType: 'image/webp',
      ext: 'webp',
    };
  } catch {
    return {
      buffer,
      contentType: isGif ? 'image/gif' : 'image/jpeg',
      ext: isGif ? 'gif' : 'jpg',
    };
  }
}

/**
 * Optimizes a post image: max 2560x2560 inside, WebP/GIF, stripped GPS/EXIF for privacy
 */
export async function optimizePostImage(buffer: Buffer): Promise<ProcessedImageResult> {
  const isGif = buffer.length >= 6 && buffer.toString('ascii', 0, 3) === 'GIF';
  try {
    if (isGif) {
      const optimized = await sharp(buffer, { animated: true }).gif().toBuffer();
      return {
        buffer: optimized,
        contentType: 'image/gif',
        ext: 'gif',
      };
    }
    const optimized = await sharp(buffer)
      .resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
    return {
      buffer: optimized,
      contentType: 'image/webp',
      ext: 'webp',
    };
  } catch {
    return {
      buffer,
      contentType: isGif ? 'image/gif' : 'image/webp',
      ext: isGif ? 'gif' : 'webp',
    };
  }
}

/**
 * Optimizes a group conversation avatar: 512x512 cover, WebP/GIF
 */
export async function optimizeGroupAvatar(buffer: Buffer): Promise<ProcessedImageResult> {
  const isGif = buffer.length >= 6 && buffer.toString('ascii', 0, 3) === 'GIF';
  try {
    if (isGif) {
      const optimized = await sharp(buffer, { animated: true })
        .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
        .gif()
        .toBuffer();
      return {
        buffer: optimized,
        contentType: 'image/gif',
        ext: 'gif',
      };
    }
    const optimized = await sharp(buffer)
      .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();
    return {
      buffer: optimized,
      contentType: 'image/webp',
      ext: 'webp',
    };
  } catch {
    return {
      buffer,
      contentType: isGif ? 'image/gif' : 'image/webp',
      ext: isGif ? 'gif' : 'webp',
    };
  }
}

export async function uploadToStorageWithFallback(
  s3: S3Client,
  params: {
    bucket: string;
    key: string;
    buffer: Buffer;
    contentType: string;
    publicUrl: string;
    cacheControl?: string;
  },
): Promise<string> {
  const { bucket, key, buffer, contentType, publicUrl, cacheControl } = params;
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);
  const isProduction = process.env.NODE_ENV === 'production';
  const rawDriver = process.env.STORAGE_DRIVER;
  const cleanKey = key.replace(/^\/+/, '');

  // Cloudflare R2 / S3 / MinIO Storage (Render, Production, and local dev)
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
        CacheControl: cacheControl ?? 'public, max-age=31536000, immutable',
      }),
    );

    const cleanPublicUrl = (process.env.R2_PUBLIC_URL || publicUrl).replace(/\/+$/, '');

    const isDirectBucketDomain =
      isCloudflareStorageDomain(cleanPublicUrl) ||
      cleanPublicUrl.endsWith(`/${bucket}`) ||
      process.env.S3_FORCE_PATH_STYLE === 'false';

    if (isDirectBucketDomain) {
      return `${cleanPublicUrl}/${cleanKey}`;
    }

    return `${cleanPublicUrl}/${bucket}/${cleanKey}`;
  } catch (err) {
    // CRITICAL: On Render or in production, fail loudly rather than writing to disk
    if (isRender || isProduction || rawDriver === 'r2') {
      throw new Error(
        `Cloudflare R2 upload failed for ${cleanKey} in bucket ${bucket}: ${(err as Error).message}`,
      );
    }
    // Resilient memory data URI fallback for offline unit/local tests only
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }
}

/**
 * Deletes an object by public URL from Cloudflare R2 or S3 storage
 */
export async function deleteFromStorage(
  s3: S3Client,
  params: {
    url: string;
    bucket: string;
    publicUrl: string;
  },
): Promise<void> {
  const { url, bucket, publicUrl } = params;
  if (!url || url.startsWith('data:')) return;

  // Cloudflare R2 / S3 deletion
  const cleanPublicUrl = (process.env.R2_PUBLIC_URL || publicUrl).replace(/\/+$/, '');
  if (cleanPublicUrl && !url.startsWith(cleanPublicUrl)) return;

  let key = '';
  if (url.startsWith(cleanPublicUrl)) {
    const remaining = url.slice(cleanPublicUrl.length).replace(/^\/+/, '');
    if (remaining.startsWith(`${bucket}/`)) {
      key = remaining.slice(`${bucket}/`.length);
    } else {
      key = remaining;
    }
  } else {
    const parts = url.split('/');
    const bucketIdx = parts.indexOf(bucket);
    if (bucketIdx !== -1 && bucketIdx < parts.length - 1) {
      key = parts.slice(bucketIdx + 1).join('/');
    } else {
      key = parts[parts.length - 1] || '';
    }
  }

  if (!key) return;

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // Graceful no-op on non-existent storage objects
  }
}

/**
 * Generates an Enterprise BlurHash for immediate zero-CLS layout rendering
 */
export async function generateBlurHash(buffer: Buffer): Promise<{ blurhash: string }> {
  try {
    const { encode } = await import('blurhash');
    const { data, info } = await sharp(buffer)
      .resize(32, 32, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const blurhash = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
    return { blurhash };
  } catch {
    return { blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' };
  }
}
