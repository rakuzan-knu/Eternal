import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from '../storage/storage.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { PendingMediaRepository } from './pending-media.repository';
import { PendingMediaCleanupService } from './pending-media-cleanup.service';

describe('pending media cleanup', () => {
  let cleanup: PendingMediaCleanupService;
  let config: ConfigService;
  const pending = {
    candidates: vi.fn(),
    claimDeletion: vi.fn(),
    deleted: vi.fn(),
    pruneDeleted: vi.fn(),
  };
  const send = vi.fn();

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.stubEnv('SERVICE_ROLE', 'core');
    vi.stubEnv('BACKGROUND_ENABLED', 'true');
    config = new ConfigService({
      MEDIA_PENDING_TRACKING_ENABLED: 'true',
      MEDIA_ORPHAN_CLEANUP_ENABLED: 'true',
    });
    pending.candidates.mockResolvedValue([{ key: 'media/post/abandoned.webp' }]);
    pending.claimDeletion.mockResolvedValue(true);
    const module = await Test.createTestingModule({
      providers: [
        PendingMediaCleanupService,
        { provide: PendingMediaRepository, useValue: pending },
        { provide: ConfigService, useValue: config },
        {
          provide: StorageService,
          useValue: { isLocal: () => false, getS3Client: () => ({ send }) },
        },
        { provide: R2StorageService, useValue: { getDefaultBucket: () => 'media' } },
      ],
    }).compile();
    cleanup = module.get(PendingMediaCleanupService);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('is disabled unless explicitly enabled after the coordinated consumer rollout', async () => {
    config.set('MEDIA_ORPHAN_CLEANUP_ENABLED', 'false');
    await cleanup.cleanup();
    expect(pending.candidates).not.toHaveBeenCalled();
    expect(pending.pruneDeleted).not.toHaveBeenCalled();
  });
  it('never runs on another service owner', async () => {
    vi.stubEnv('SERVICE_ROLE', 'reels');
    await cleanup.cleanup();
    expect(pending.candidates).not.toHaveBeenCalled();
  });
  it('cannot delete mixed-rollout uploads when pending tracking is disabled', async () => {
    config.set('MEDIA_PENDING_TRACKING_ENABLED', 'false');
    await cleanup.cleanup();
    expect(pending.candidates).not.toHaveBeenCalled();
    expect(pending.pruneDeleted).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it('does not delete when a concurrent consumer has retained the candidate', async () => {
    pending.claimDeletion.mockResolvedValue(false);
    await cleanup.cleanup();
    expect(send).not.toHaveBeenCalled();
    expect(pending.deleted).not.toHaveBeenCalled();
  });
  it('keeps deletion retryable on storage failure and completes a later retry', async () => {
    send.mockRejectedValueOnce(new Error('storage unavailable')).mockResolvedValueOnce({});
    await cleanup.cleanup();
    expect(pending.deleted).not.toHaveBeenCalled();
    await cleanup.cleanup();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(DeleteObjectCommand);
    expect(pending.deleted).toHaveBeenCalledWith('media/post/abandoned.webp');
    const cutoff: unknown = pending.candidates.mock.calls[0]?.[0];
    expect(cutoff).toBeInstanceOf(Date);
    if (!(cutoff instanceof Date)) throw new Error('Expected grace cutoff');
    expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(2 * 86400_000);
    expect(pending.pruneDeleted).toHaveBeenCalledWith(expect.any(Date));
  });
});
