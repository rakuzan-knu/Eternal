import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalDiskStorageService } from './local-disk-storage.service';
import { R2StorageService } from './r2-storage.service';

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
export const S3_CLIENT = 'S3_CLIENT';
export const BANNER_S3_CLIENT = 'BANNER_S3_CLIENT';
export const POSTS_S3_CLIENT = 'POSTS_S3_CLIENT';
export const REELS_S3_CLIENT = 'REELS_S3_CLIENT';
export const AUTO_DELETE_S3_CLIENT = 'AUTO_DELETE_S3_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    LocalDiskStorageService,
    R2StorageService,
    StorageService,
    {
      provide: STORAGE_SERVICE,
      useExisting: StorageService,
    },
    {
      provide: S3_CLIENT,
      useFactory: (storageService: StorageService) => storageService.getS3Client(),
      inject: [StorageService],
    },
    {
      provide: BANNER_S3_CLIENT,
      useFactory: (storageService: StorageService) => storageService.getS3Client(),
      inject: [StorageService],
    },
    {
      provide: POSTS_S3_CLIENT,
      useFactory: (storageService: StorageService) => storageService.getS3Client(),
      inject: [StorageService],
    },
    {
      provide: REELS_S3_CLIENT,
      useFactory: (storageService: StorageService) => storageService.getS3Client(),
      inject: [StorageService],
    },
    {
      provide: AUTO_DELETE_S3_CLIENT,
      useFactory: (storageService: StorageService) => storageService.getS3Client(),
      inject: [StorageService],
    },
  ],
  exports: [
    StorageService,
    LocalDiskStorageService,
    R2StorageService,
    STORAGE_SERVICE,
    S3_CLIENT,
    BANNER_S3_CLIENT,
    POSTS_S3_CLIENT,
    REELS_S3_CLIENT,
    AUTO_DELETE_S3_CLIENT,
  ],
})
export class StorageModule {}
