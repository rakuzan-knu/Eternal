import { BadRequestException } from '@nestjs/common';
import { OpenGraphController } from '../opengraph.controller';
import type { OpenGraphService, OpenGraphMetadata } from '../opengraph.service';

describe('OpenGraphController', () => {
  let controller: OpenGraphController;
  let mockOgService: {
    extractMetadata: jest.Mock;
    sanitizeUrl: jest.Mock;
  };

  const sampleMeta: OpenGraphMetadata = {
    title: 'Test Title',
    description: 'Test Description',
    image: 'https://cdn.com/test.png',
    url: 'https://example.com',
    type: 'generic',
    siteName: 'Example Site',
    favicon: 'https://example.com/favicon.ico',
  };

  beforeEach(() => {
    mockOgService = {
      extractMetadata: jest.fn(),
      sanitizeUrl: jest.fn((url: string) => url),
    };

    controller = new OpenGraphController(mockOgService as unknown as OpenGraphService);
  });

  it('getPreview rejects invalid URL formats and disallowed IPs', async () => {
    await expect(controller.getPreview({ url: 'ftp://invalid-url' })).rejects.toThrow(
      new BadRequestException('Invalid URL format'),
    );

    mockOgService.sanitizeUrl.mockReturnValueOnce(null);
    await expect(controller.getPreview({ url: 'http://localhost:3000' })).rejects.toThrow(
      new BadRequestException('Invalid or forbidden URL'),
    );
  });

  it('getPreview delegates to OpenGraphService when url is provided', async () => {
    mockOgService.extractMetadata.mockResolvedValueOnce(sampleMeta);

    const result = await controller.getPreview({ url: 'https://example.com' });

    expect(mockOgService.extractMetadata).toHaveBeenCalledWith('https://example.com');
    expect(result).toEqual(sampleMeta);
  });
});
