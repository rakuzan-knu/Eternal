import { BadRequestException } from '@nestjs/common';
import { MessengerLinkPreviewController } from '../link-preview.controller';
import { type OpenGraphService } from '../../opengraph/opengraph.service';

describe('MessengerLinkPreviewController', () => {
  let controller: MessengerLinkPreviewController;
  let ogService: OpenGraphService;

  beforeEach(() => {
    ogService = {
      extractMetadata: jest.fn().mockResolvedValue({
        url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        type: 'youtube',
        title: 'Video Title',
        siteName: 'YouTube',
      }),
    } as unknown as OpenGraphService;

    controller = new MessengerLinkPreviewController(ogService);
  });

  it('throws BadRequestException if url query is missing', async () => {
    await expect(controller.getPreview(undefined)).rejects.toThrow(BadRequestException);
    await expect(controller.getPreview('')).rejects.toThrow(BadRequestException);
  });

  it('calls ogService.extractMetadata with valid url', async () => {
    const res = await controller.getPreview('https://youtube.com/watch?v=dQw4w9WgXcQ');
    expect(ogService.extractMetadata).toHaveBeenCalledWith(
      'https://youtube.com/watch?v=dQw4w9WgXcQ',
    );
    expect(res?.title).toBe('Video Title');
  });
});
