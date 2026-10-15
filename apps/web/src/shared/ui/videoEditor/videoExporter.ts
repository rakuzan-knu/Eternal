import { emojiToUnified, APPLE_PNG_CDN } from '@/features/chat/ui/Call/TelegramAppleEmoji';

export interface VideoExportOptions {
  videoElement: HTMLVideoElement | null;
  originalFile: File;
  trimStart: number;
  trimEnd: number;
  isMuted: boolean;
  filterString: string;
  rotation: number;
  rotationAngle: number;
  isFlipped: boolean;
  cropRect?: { x: number; y: number; width: number; height: number };
  drawCanvas: HTMLCanvasElement | null;
  texts: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    fontSize: number;
    fontFamily: string;
    align: 'left' | 'center' | 'right';
  }>;
  stickers: Array<{
    id: string;
    emoji: string;
    x: number;
    y: number;
    size: number;
    imageUrl?: string;
  }>;
  quality: '1080p' | '720p' | '480p' | '360p';
  onProgress?: (percent: number) => void;
}

/**
 * Computes a standardized single-line CSS filter string from the tune sliders.
 * Works seamlessly in both video CSS style and HTML5 Canvas ctx.filter.
 */
export function getComputedVideoFilter(tune: Record<string, number>): string {
  const enhance = tune.enhance || 0;
  const brightness =
    (tune.brightness || 0) +
    enhance * 0.1 +
    (tune.shadows || 0) * 0.15 -
    (tune.highlights || 0) * 0.1;
  const contrast = (tune.contrast || 0) + enhance * 0.2 - (tune.fade || 0) * 0.25;
  const saturation = (tune.saturation || 0) + enhance * 0.25;
  const warmth = tune.warmth || 0;
  const fade = tune.fade || 0;

  const parts: string[] = [];
  parts.push(`brightness(${Math.max(0.1, 1 + brightness / 100).toFixed(3)})`);
  parts.push(`contrast(${Math.max(0.1, 1 + contrast / 100).toFixed(3)})`);
  parts.push(`saturate(${Math.max(0, 1 + saturation / 100).toFixed(3)})`);

  if (warmth > 0) {
    parts.push(`sepia(${(warmth / 120).toFixed(3)})`);
  } else if (warmth < 0) {
    parts.push(`hue-rotate(${(warmth * 0.4).toFixed(1)}deg)`);
  }

  if (fade > 0) {
    parts.push(`opacity(${Math.max(0.3, 1 - (fade / 100) * 0.25).toFixed(3)})`);
  }

  return parts.join(' ');
}

/**
 * Renders and exports the edited video as a new File.
 * If MediaRecorder is supported, it renders frames through a canvas,
 * applying the real CSS filters, transformations, crop region, drawing layer,
 * text overlays with custom fonts, and static Apple emoji stickers.
 */
export async function exportEditedVideo(options: VideoExportOptions): Promise<File> {
  const {
    videoElement,
    originalFile,
    trimStart,
    trimEnd,
    isMuted,
    filterString,
    rotation,
    rotationAngle,
    isFlipped,
    cropRect,
    drawCanvas,
    texts,
    stickers,
    quality,
    onProgress,
  } = options;

  // Fallback for Node / test environment or unsupported browsers
  if (
    typeof window === 'undefined' ||
    typeof MediaRecorder === 'undefined' ||
    !videoElement ||
    typeof HTMLCanvasElement === 'undefined' ||
    typeof (HTMLCanvasElement.prototype as any).captureStream !== 'function'
  ) {
    onProgress?.(100);
    return originalFile;
  }

  return new Promise<File>((resolve) => {
    try {
      const qualityMap = {
        '1080p': 1080,
        '720p': 720,
        '480p': 480,
        '360p': 360,
      };

      const cRect =
        cropRect && cropRect.width > 0 && cropRect.height > 0
          ? cropRect
          : { x: 0, y: 0, width: 100, height: 100 };
      const isCropped = cRect.width < 99.5 || cRect.height < 99.5;

      const naturalWidth = videoElement.videoWidth || 1280;
      const naturalHeight = videoElement.videoHeight || 720;

      const sx = Math.round((cRect.x / 100) * naturalWidth);
      const sy = Math.round((cRect.y / 100) * naturalHeight);
      const sw = Math.round((cRect.width / 100) * naturalWidth);
      const sh = Math.round((cRect.height / 100) * naturalHeight);

      const targetHeight = qualityMap[quality] || 720;
      const cropAspect = sw / sh;
      let exportHeight = Math.min(sh, targetHeight);
      let exportWidth = Math.round(exportHeight * cropAspect);
      // Ensure dimensions are even for video codec compatibility
      exportWidth = Math.max(2, Math.round(exportWidth / 2) * 2);
      exportHeight = Math.max(2, Math.round(exportHeight / 2) * 2);

      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        onProgress?.(100);
        resolve(originalFile);
        return;
      }

      // Preload static Apple emoji sticker images
      const stickerImages: Record<string, HTMLImageElement> = {};
      const loadStickerPromises = stickers.map((s) => {
        const unified = emojiToUnified(s.emoji);
        const imgUrl = s.imageUrl || (unified ? `${APPLE_PNG_CDN}/${unified}.png` : '');
        if (!imgUrl) return Promise.resolve();

        return new Promise<void>((r) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = imgUrl;
          img.onload = () => {
            stickerImages[s.id] = img;
            r();
          };
          img.onerror = () => r();
        });
      });

      Promise.all(loadStickerPromises).then(async () => {
        await startRecording();
      });

      async function startRecording() {
        if (!ctx) return;
        const canvasStream = (canvas as any).captureStream(30);

        // Capture audio track if not muted
        if (!isMuted) {
          try {
            const stream = (videoElement as any).captureStream
              ? (videoElement as any).captureStream()
              : (videoElement as any).mozCaptureStream
                ? (videoElement as any).mozCaptureStream()
                : null;
            if (stream) {
              const audioTracks = stream.getAudioTracks();
              if (audioTracks && audioTracks.length > 0) {
                canvasStream.addTrack(audioTracks[0]);
              }
            }
          } catch {}
        }

        const mimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4',
        ];
        let chosenMime = 'video/webm';
        for (const mime of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mime)) {
            chosenMime = mime;
            break;
          }
        }

        const recorder = new MediaRecorder(canvasStream, {
          mimeType: chosenMime,
          videoBitsPerSecond: quality === '1080p' ? 5_000_000 : 2_500_000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        const totalTrimDuration = Math.max(0.5, trimEnd - trimStart);

        recorder.onstop = () => {
          videoElement!.pause();
          const blob = new Blob(chunks, { type: chosenMime });
          const ext = chosenMime.includes('mp4') ? '.mp4' : '.webm';
          const newName = originalFile.name.replace(/\.[^.]+$/, '') + '_edited' + ext;
          const newFile = new File([blob], newName, { type: chosenMime, lastModified: Date.now() });
          onProgress?.(100);
          resolve(newFile);
        };

        // Seek video to trimStart before recording begins
        videoElement!.pause();
        videoElement!.currentTime = trimStart;
        videoElement!.muted = isMuted;

        await new Promise<void>((r) => {
          let timer: any;
          const onSeek = () => {
            clearTimeout(timer);
            videoElement!.removeEventListener('seeked', onSeek);
            r();
          };
          timer = setTimeout(() => {
            videoElement!.removeEventListener('seeked', onSeek);
            r();
          }, 350);
          videoElement!.addEventListener('seeked', onSeek);
        });

        recorder.start(100);

        // Safety timeout to prevent infinite hang
        const safetyTimer = setTimeout(
          () => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          },
          (totalTrimDuration + 4) * 1000,
        );

        const renderFrame = () => {
          if (!ctx || recorder.state !== 'recording') return;

          const currentT = videoElement!.currentTime;
          const elapsed = currentT - trimStart;
          const pct = Math.min(99, Math.max(0, Math.round((elapsed / totalTrimDuration) * 100)));
          onProgress?.(pct);

          if (currentT >= trimEnd || videoElement!.ended) {
            clearTimeout(safetyTimer);
            recorder.stop();
            return;
          }

          // Clear frame
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Save state for transform (rotation / flip)
          ctx.save();
          const totalAngle = ((rotation + rotationAngle) * Math.PI) / 180;
          ctx.translate(canvas.width / 2, canvas.height / 2);
          if (totalAngle !== 0) ctx.rotate(totalAngle);
          if (isFlipped) ctx.scale(-1, 1);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);

          // Apply real CSS filters to canvas context
          ctx.filter = filterString;
          if (isCropped) {
            ctx.drawImage(videoElement!, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          } else {
            ctx.drawImage(videoElement!, 0, 0, canvas.width, canvas.height);
          }
          ctx.filter = 'none';

          ctx.restore();

          // Overlay 1: Draw canvas layer (mapped to cropped canvas)
          if (drawCanvas) {
            if (isCropped) {
              const dcX = (cRect.x / 100) * drawCanvas.width;
              const dcY = (cRect.y / 100) * drawCanvas.height;
              const dcW = (cRect.width / 100) * drawCanvas.width;
              const dcH = (cRect.height / 100) * drawCanvas.height;
              ctx.drawImage(drawCanvas, dcX, dcY, dcW, dcH, 0, 0, canvas.width, canvas.height);
            } else {
              ctx.drawImage(drawCanvas, 0, 0, canvas.width, canvas.height);
            }
          }

          // Overlay 2: Text items with custom fonts (mapped to cropped canvas)
          for (const t of texts) {
            ctx.save();
            const scale = canvas.height / 360;
            ctx.font = `bold ${Math.round(t.fontSize * scale)}px ${t.fontFamily}`;
            ctx.fillStyle = t.color;
            ctx.textAlign = t.align;
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 4;
            const tx = isCropped
              ? ((t.x - cRect.x) / cRect.width) * canvas.width
              : (t.x / 100) * canvas.width;
            const ty = isCropped
              ? ((t.y - cRect.y) / cRect.height) * canvas.height
              : (t.y / 100) * canvas.height;
            ctx.fillText(t.text, tx, ty);
            ctx.restore();
          }

          // Overlay 3: Static Apple Emoji Stickers (mapped to cropped canvas)
          for (const s of stickers) {
            const sxPos = isCropped
              ? ((s.x - cRect.x) / cRect.width) * canvas.width
              : (s.x / 100) * canvas.width;
            const syPos = isCropped
              ? ((s.y - cRect.y) / cRect.height) * canvas.height
              : (s.y / 100) * canvas.height;
            const sSize = Math.round(s.size * (canvas.height / 360));

            const img = stickerImages[s.id];
            if (img && img.complete && img.naturalWidth > 0) {
              ctx.drawImage(img, sxPos - sSize / 2, syPos - sSize / 2, sSize, sSize);
            } else {
              // Fallback to unicode font glyph
              ctx.save();
              ctx.font = `${sSize}px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(s.emoji, sxPos, syPos);
              ctx.restore();
            }
          }

          requestAnimationFrame(renderFrame);
        };

        const p = videoElement!.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
        requestAnimationFrame(renderFrame);
      }
    } catch (err) {
      console.warn('Video export error, falling back to original file:', err);
      onProgress?.(100);
      resolve(originalFile);
    }
  });
}
