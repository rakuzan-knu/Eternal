import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
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
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('starts a best-effort Core pass without blocking module initialization', async () => {
    let finish: (() => void) | undefined;
    const work = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const run = vi.spyOn(cleanup, 'cleanup').mockReturnValue(work);
    expect(cleanup.onModuleInit()).toBeUndefined();
    expect(run).toHaveBeenCalledTimes(1);
    finish?.();
    await work;
  });

  it.each([
    ['messenger', 'true'],
    ['reels', 'true'],
    ['music', 'true'],
    ['core', 'false'],
  ])('does not invoke startup cleanup on %s with background=%s', (role, background) => {
    vi.stubEnv('SERVICE_ROLE', role);
    vi.stubEnv('BACKGROUND_ENABLED', background);
    const run = vi.spyOn(cleanup, 'cleanup');
    cleanup.onModuleInit();
    expect(run).not.toHaveBeenCalled();
    expect(pending.pruneDeleted).not.toHaveBeenCalled();
  });

  it.each(['MEDIA_PENDING_TRACKING_ENABLED', 'MEDIA_ORPHAN_CLEANUP_ENABLED'])(
    'keeps startup passive while %s is disabled',
    (flag) => {
      config.set(flag, 'false');
      cleanup.onModuleInit();
      expect(pending.pruneDeleted).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('reuses the running guard and logs a completed startup pass without object data', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    cleanup.onModuleInit();
    await cleanup.cleanup();
    await vi.waitFor(() =>
      expect(log).toHaveBeenCalledWith('Pending media cleanup pass completed'),
    );
    expect(pending.candidates).toHaveBeenCalledTimes(1);
    expect(pending.deleted).toHaveBeenCalledWith('media/post/abandoned.webp');
  });

  it('handles an unexpected startup rejection without logging its contents', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(cleanup, 'cleanup').mockRejectedValue(new Error('sensitive internal details'));
    cleanup.onModuleInit();
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith('Pending media startup cleanup unavailable'),
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

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
  it('deletes private abandoned objects from their recorded bucket', async () => {
    pending.candidates.mockResolvedValue([
      { key: 'private-chat/orphan.bin', bucket: 'closed-media' },
    ]);
    await cleanup.cleanup();
    const command: unknown = send.mock.calls[0]?.[0];
    if (!(command instanceof DeleteObjectCommand)) throw new Error('Expected storage deletion');
    expect(command.input).toEqual({ Bucket: 'closed-media', Key: 'private-chat/orphan.bin' });
  });
  it('keeps retained-private reclamation disabled until its separate coordinated rollout', async () => {
    await cleanup.cleanup();
    expect(pending.candidates).toHaveBeenLastCalledWith(expect.any(Date), false);
    expect(pending.claimDeletion).toHaveBeenLastCalledWith(
      'media/post/abandoned.webp',
      expect.any(Date),
      false,
    );
    config.set('MEDIA_PRIVATE_ORPHAN_CLEANUP_ENABLED', 'true');
    await cleanup.cleanup();
    expect(pending.candidates).toHaveBeenLastCalledWith(expect.any(Date), true);
    expect(pending.claimDeletion).toHaveBeenLastCalledWith(
      'media/post/abandoned.webp',
      expect.any(Date),
      true,
    );
  });
});
