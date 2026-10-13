import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import type { PrismaService } from '../../../common/prisma';
import { VideoJobType } from '../../queue.constants';
import { VideoTranscodeProcessor } from '../video-transcode.processor';

describe('VideoTranscodeProcessor media availability', () => {
  it('does not advertise an HLS manifest or thumbnail that was never produced', async () => {
    const prisma = { reel: { update: jest.fn() }, postMedia: { update: jest.fn() } };
    const processor = new VideoTranscodeProcessor(
      new ConfigService(),
      prisma as unknown as PrismaService,
    );
    const runtime = processor as unknown as { checkFfmpegAvailable(): Promise<boolean> };
    jest.spyOn(runtime, 'checkFfmpegAvailable').mockResolvedValue(false);
    const data = { reelId: 'reel-1', videoUrl: 'https://media.example/video.mp4' };

    const result = await processor.transcodeToAdaptiveHls(data);
    expect(result.masterPlaylistUrl).toBeNull();
    expect(result.thumbnailUrl).toBeUndefined();

    await processor.processJob({ name: VideoJobType.HLS_TRANSCODE, data } as Job);
    expect(prisma.reel.update).not.toHaveBeenCalled();
    expect(prisma.postMedia.update).not.toHaveBeenCalled();
  });
});
