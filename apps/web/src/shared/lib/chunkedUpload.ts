import { apiClient } from '@/shared/api/httpClient';

export interface ChunkedUploadOptions {
  file: File | Blob;
  fileName?: string;
  chunkSize?: number; // default 5MB (5 * 1024 * 1024)
  uploadId?: string;
  onProgress?: (progress: {
    uploadedBytes: number;
    totalBytes: number;
    percent: number;
    currentChunk: number;
    totalChunks: number;
  }) => void;
  signal?: AbortSignal;
}

export interface ChunkedUploadResult {
  complete: boolean;
  media?: {
    type: 'image' | 'video' | 'IMAGE' | 'VIDEO';
    url: string;
    poster?: string;
    order: number;
  };
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks (Telegram model)

/**
 * Resumable chunked file upload using Blob.slice() with exponential backoff on retry.
 * Handles unstable network drops and resumes from the last completed offset.
 */
export async function uploadFileInChunks(
  options: ChunkedUploadOptions,
): Promise<ChunkedUploadResult> {
  const {
    file,
    fileName = file instanceof File ? file.name : 'blob_upload',
    chunkSize = DEFAULT_CHUNK_SIZE,
    uploadId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    onProgress,
    signal,
  } = options;

  const totalBytes = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalBytes / chunkSize));

  // Check if session has previous uploaded chunks to resume from
  let uploadedChunks: Set<number> = new Set();
  try {
    const statusRes = await apiClient.get(`/posts/upload/chunk/${uploadId}/status`, { signal });
    if (statusRes.data?.uploadedChunks) {
      uploadedChunks = new Set(statusRes.data.uploadedChunks);
    }
  } catch {
    // If status check fails, start from chunk 0
  }

  let finalResult: ChunkedUploadResult = { complete: false };

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    if (signal?.aborted) {
      throw new Error('Upload aborted');
    }

    if (uploadedChunks.has(chunkIndex)) {
      continue;
    }

    const start = chunkIndex * chunkSize;
    const end = Math.min(totalBytes, start + chunkSize);
    const chunkBlob = file.slice(start, end);

    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('chunk', chunkBlob, fileName);

    let attempts = 0;
    const maxAttempts = 3;
    let success = false;

    while (!success && attempts < maxAttempts) {
      if (signal?.aborted) throw new Error('Upload aborted');
      try {
        attempts++;
        const res = await apiClient.post('/posts/upload/chunk', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          signal,
        });

        uploadedChunks.add(chunkIndex);
        success = true;

        if (res.data?.complete) {
          finalResult = res.data;
        }

        const uploadedBytes = Math.min(totalBytes, (chunkIndex + 1) * chunkSize);
        const percent = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
        onProgress?.({
          uploadedBytes,
          totalBytes,
          percent,
          currentChunk: chunkIndex + 1,
          totalChunks,
        });
      } catch (err) {
        if (signal?.aborted || attempts >= maxAttempts) throw err;
        // Exponential backoff before retrying this specific chunk
        await new Promise((r) => setTimeout(r, Math.pow(2, attempts) * 300 + Math.random() * 100));
      }
    }
  }

  return finalResult;
}
