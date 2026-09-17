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

  it('calls ogService.extractMetadata with valid url', async () => {
    const res = await controller.getPreview({ url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(ogService.extractMetadata).toHaveBeenCalledWith(
      'https://youtube.com/watch?v=dQw4w9WgXcQ',
    );
    expect(res?.title).toBe('Video Title');
  });
});
