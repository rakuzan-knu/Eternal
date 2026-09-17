export type StorageDriver = 'r2' | 's3' | 'minio' | 'local' | 'auto';

export interface UploadFileOptions {
  bucket?: string;
  key: string;
  buffer: Buffer;
  contentType: string;
  cacheControl?: string;
}

export interface IStorageService {
  upload(options: UploadFileOptions): Promise<string>;
  delete(url: string, bucket?: string): Promise<void>;
  getPublicUrl(key: string, bucket?: string): string;
}
