/**
 * Client-side image compressor utility for high-performance mobile/web uploads.
 * Scales large photos to maximum ~1920x1920 while preserving aspect ratio
 * and compressing to WebP (quality ~0.85) to reduce 10-15MB phone photos to ~200-400KB.
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85,
): Promise<File> {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const isGif = mime === 'image/gif' || name.endsWith('.gif');

  // If not an image or is an animated GIF, do not compress
  if (isGif || !mime.startsWith('image/')) {
    return file;
  }

  // If already under 250KB, no compression needed
  if (file.size <= 250 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          const newName = file.name.replace(/\.[^.]+$/, '.webp');
          const compressedFile = new File([blob], newName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/webp',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export async function compressMediaFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file)));
}
