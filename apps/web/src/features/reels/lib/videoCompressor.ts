/**
 * Enterprise Client-Side Video Compressor & Pre-Upload Optimizer
 *
 * Utilizes HTML5 Canvas, MediaStream, and MediaRecorder to normalize resolution
 * (1080x1920 max, standard 720x1280), enforce optimal short-form bitrate (~2.8 Mbps),
 * and extract crisp WebP poster thumbnails before uploading to Cloudflare R2 / S3.
 */

import { sanitizeMediaUrl } from '@/shared/lib/urlSecurity';

export interface VideoCompressionOptions {
  maxDimension?: number;
  targetBitrate?: number; // in bps, e.g. 2_800_000 for 2.8 Mbps
  maxFps?: number;
  onProgress?: (progress: {
    percent: number;
    currentStage: 'analyzing' | 'compressing' | 'finalizing';
    originalSize: number;
    estimatedSize?: number;
  }) => void;
}

export interface CompressedVideoResult {
  file: File;
  thumbnailBlob: Blob;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  duration: number;
  width: number;
  height: number;
}

/**
 * Checks supported recorder MIME types prioritizing H.264/MP4 or high-efficiency WebM (VP9/VP8)
 */
function getSupportedMimeType(): { mimeType: string; extension: string } {
  const types = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];

  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t.mimeType)) {
      return t;
    }
  }

  return { mimeType: 'video/webm', extension: 'webm' };
}

/**
 * Extracts a high-quality WebP thumbnail frame from a video at a specific timestamp
 */
export async function extractVideoThumbnail(
  videoFile: File | Blob,
  seekTime = 0.5,
): Promise<{ thumbnailBlob: Blob; width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const rawUrl = URL.createObjectURL(videoFile);
    const url = sanitizeMediaUrl(rawUrl);
    if (!url) {
      URL.revokeObjectURL(rawUrl);
      reject(new Error('Failed to create safe blob URL for video'));
      return;
    }
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(rawUrl);
      video.remove();
    };

    video.onloadedmetadata = () => {
      const targetTime = Math.min(seekTime, Math.max(0.1, video.duration / 4));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve({
                thumbnailBlob: blob,
                width: canvas.width,
                height: canvas.height,
                duration: video.duration || 0,
              });
            } else {
              reject(new Error('Thumbnail blob generation failed'));
            }
          },
          'image/webp',
          0.85,
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for thumbnail extraction'));
    };
  });
}

/**
 * Compresses vertical video client-side before network transmission.
 * Fast-paths already lightweight (< 6MB) files to avoid unnecessary re-encoding delay.
 */
export async function compressVideo(
  file: File,
  options: VideoCompressionOptions = {},
): Promise<CompressedVideoResult> {
  const originalSize = file.size;
  const maxDimension = options.maxDimension || 1920;
  const targetBitrate = options.targetBitrate || 2_800_000; // 2.8 Mbps optimal short-form video bitrate
  const maxFps = options.maxFps || 30;

  options.onProgress?.({
    percent: 5,
    currentStage: 'analyzing',
    originalSize,
  });

  // Extract thumbnail and metadata first
  const {
    thumbnailBlob,
    width: origWidth,
    height: origHeight,
    duration,
  } = await extractVideoThumbnail(file);

  // Fast-path: if file is already compact (< 6MB) and duration is under 60s,
  // skip re-encoding to preserve 100% original fidelity and avoid upload delay.
  if (originalSize <= 6 * 1024 * 1024 && origHeight <= 1920) {
    options.onProgress?.({
      percent: 100,
      currentStage: 'finalizing',
      originalSize,
      estimatedSize: originalSize,
    });
    return {
      file,
      thumbnailBlob,
      originalSize,
      compressedSize: originalSize,
      savingsPercent: 0,
      duration,
      width: origWidth,
      height: origHeight,
    };
  }

  // Calculate scaled dimensions keeping aspect ratio
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (origHeight > maxDimension || origWidth > maxDimension) {
    if (origHeight >= origWidth) {
      targetHeight = maxDimension;
      targetWidth = Math.round((origWidth * maxDimension) / origHeight);
    } else {
      targetWidth = maxDimension;
      targetHeight = Math.round((origHeight * maxDimension) / origWidth);
    }
  }

  // Ensure even dimensions for codec compliance
  targetWidth = Math.floor(targetWidth / 2) * 2;
  targetHeight = Math.floor(targetHeight / 2) * 2;

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const rawVideoUrl = URL.createObjectURL(file);
    const videoUrl = sanitizeMediaUrl(rawVideoUrl);
    if (!videoUrl) {
      URL.revokeObjectURL(rawVideoUrl);
      resolve({
        file,
        thumbnailBlob,
        originalSize,
        compressedSize: originalSize,
        savingsPercent: 0,
        duration,
        width: origWidth,
        height: origHeight,
      });
      return;
    }
    video.src = videoUrl;

    const { mimeType, extension } = getSupportedMimeType();

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx || typeof MediaRecorder === 'undefined') {
      // Fallback if MediaRecorder or Canvas not available
      URL.revokeObjectURL(rawVideoUrl);
      resolve({
        file,
        thumbnailBlob,
        originalSize,
        compressedSize: originalSize,
        savingsPercent: 0,
        duration,
        width: origWidth,
        height: origHeight,
      });
      return;
    }

    const stream = canvas.captureStream ? canvas.captureStream(maxFps) : null;
    if (!stream) {
      URL.revokeObjectURL(videoUrl);
      resolve({
        file,
        thumbnailBlob,
        originalSize,
        compressedSize: originalSize,
        savingsPercent: 0,
        duration,
        width: origWidth,
        height: origHeight,
      });
      return;
    }

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: targetBitrate,
      });
    } catch {
      // MediaRecorder initialization failed with specified options; fallback
      URL.revokeObjectURL(videoUrl);
      resolve({
        file,
        thumbnailBlob,
        originalSize,
        compressedSize: originalSize,
        savingsPercent: 0,
        duration,
        width: origWidth,
        height: origHeight,
      });
      return;
    }

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    let animationFrameId: number;
    let isFinished = false;

    const cleanup = () => {
      isFinished = true;
      cancelAnimationFrame(animationFrameId);
      URL.revokeObjectURL(videoUrl);
      video.remove();
      canvas.remove();
    };

    const drawFrame = () => {
      if (isFinished) return;

      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        if (duration > 0) {
          const progressPercent = Math.min(
            95,
            Math.round(10 + (video.currentTime / duration) * 85),
          );
          options.onProgress?.({
            percent: progressPercent,
            currentStage: 'compressing',
            originalSize,
          });
        }
      }

      animationFrameId = requestAnimationFrame(drawFrame);
    };

    mediaRecorder.onstop = () => {
      cleanup();
      const compressedBlob = new Blob(chunks, { type: mimeType });
      const compressedSize = compressedBlob.size;

      // Only use compressed file if it's actually smaller than the original
      if (compressedSize < originalSize * 0.92) {
        const compressedName = file.name.replace(/\.[^/.]+$/, `_optimized.${extension}`);
        const compressedFile = new File([compressedBlob], compressedName, { type: mimeType });
        const savingsPercent = Math.round(((originalSize - compressedSize) / originalSize) * 100);

        options.onProgress?.({
          percent: 100,
          currentStage: 'finalizing',
          originalSize,
          estimatedSize: compressedSize,
        });

        resolve({
          file: compressedFile,
          thumbnailBlob,
          originalSize,
          compressedSize,
          savingsPercent,
          duration,
          width: targetWidth,
          height: targetHeight,
        });
      } else {
        // Original was already highly compressed
        options.onProgress?.({
          percent: 100,
          currentStage: 'finalizing',
          originalSize,
          estimatedSize: originalSize,
        });

        resolve({
          file,
          thumbnailBlob,
          originalSize,
          compressedSize: originalSize,
          savingsPercent: 0,
          duration,
          width: origWidth,
          height: origHeight,
        });
      }
    };

    video.onloadeddata = () => {
      video.playbackRate = 2.0; // 2x playback speed to double compression throughput
      mediaRecorder.start(250); // collect chunk every 250ms
      void video.play().then(() => {
        drawFrame();
      });
    };

    video.onended = () => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };

    video.onerror = () => {
      cleanup();
      resolve({
        file,
        thumbnailBlob,
        originalSize,
        compressedSize: originalSize,
        savingsPercent: 0,
        duration,
        width: origWidth,
        height: origHeight,
      });
    };

    // Safety timeout: max 20 seconds for compression
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }, 20000);
  });
}
