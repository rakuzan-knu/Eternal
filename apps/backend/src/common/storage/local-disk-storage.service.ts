import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { IStorageService, UploadFileOptions } from './storage.interface';

@Injectable()
export class LocalDiskStorageService implements IStorageService {
  private readonly logger = new Logger(LocalDiskStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const configuredDir = this.configService.get<string>('LOCAL_STORAGE_DIR');
    this.uploadDir = configuredDir
      ? path.resolve(process.cwd(), configuredDir)
      : path.resolve(process.cwd(), 'uploads');

    const port = this.configService.get<number | string>('PORT', 3000);
    const configuredUrl = this.configService.get<string>('LOCAL_STORAGE_PUBLIC_URL');
    this.baseUrl = (configuredUrl || `http://localhost:${port}`).replace(/\/+$/, '');

    void this.ensureBaseDirectory();
  }

  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Local disk storage initialized at: ${this.uploadDir}`);
    } catch (err) {
      this.logger.error(`Failed to create local uploads directory: ${String(err)}`);
    }
  }

  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    return `${this.baseUrl}/uploads/${cleanKey}`;
  }

  async upload(options: UploadFileOptions): Promise<string> {
    const cleanKey = options.key.replace(/^\/+/, '');
    const targetPath = path.resolve(this.uploadDir, cleanKey);

    // Prevent path traversal attack
    if (!targetPath.startsWith(this.uploadDir)) {
      throw new Error('Invalid storage key: directory traversal attempt');
    }

    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(targetPath, options.buffer);

    return this.getPublicUrl(cleanKey);
  }

  async delete(url: string): Promise<void> {
    if (!url) return;

    let relativeKey = '';
    const uploadsPrefix = '/uploads/';
    const idx = url.indexOf(uploadsPrefix);
    if (idx !== -1) {
      relativeKey = url.slice(idx + uploadsPrefix.length);
    } else if (url.startsWith('uploads/')) {
      relativeKey = url.slice('uploads/'.length);
    } else {
      return;
    }

    const targetPath = path.resolve(this.uploadDir, relativeKey);
    if (!targetPath.startsWith(this.uploadDir)) return;

    try {
      await fs.unlink(targetPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`Failed to delete local file ${targetPath}: ${String(err)}`);
      }
    }
  }
}
