export interface CompressImageWorkerRequest {
  id: string;
  fileOrBlob: Blob;
  fileName: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface CompressImageWorkerSuccessResponse {
  id: string;
  success: true;
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

export interface CompressImageWorkerErrorResponse {
  id: string;
  success: false;
  error: string;
}

export type CompressImageWorkerResponse =
  CompressImageWorkerSuccessResponse | CompressImageWorkerErrorResponse;

self.onmessage = async (event: MessageEvent<CompressImageWorkerRequest>) => {
  if (event.origin !== self.location.origin && event.origin !== '' && event.origin !== 'null') {
    return;
  }
  const { id, fileOrBlob, maxWidth = 1920, maxHeight = 1920, quality = 0.8 } = event.data;

  try {
    if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      throw new Error('OffscreenCanvas or createImageBitmap not supported in Worker');
    }

    const bitmap = await createImageBitmap(fileOrBlob);
    let { width, height } = bitmap;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      throw new Error('Unable to get OffscreenCanvas 2D context');
    }

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const compressedBlob = await canvas.convertToBlob({
      type: 'image/webp',
      quality,
    });

    const response: CompressImageWorkerSuccessResponse = {
      id,
      success: true,
      blob: compressedBlob,
      width,
      height,
      originalSize: fileOrBlob.size,
      compressedSize: compressedBlob.size,
    };

    self.postMessage(response);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const response: CompressImageWorkerErrorResponse = {
      id,
      success: false,
      error: errorMsg,
    };
    self.postMessage(response);
  }
};
