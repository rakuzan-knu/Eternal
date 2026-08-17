import { BadRequestException } from '@nestjs/common';
import { OpenGraphController } from '../opengraph.controller';
import type { OpenGraphService, OpenGraphMetadata } from '../opengraph.service';

describe('OpenGraphController', () => {
  let controller: OpenGraphController;
  let mockOgService: {
    extractMetadata: jest.Mock;
  };

  const sampleMeta: OpenGraphMetadata = {
    title: 'Test Title',
    description: 'Test Description',
    image: 'https://cdn.com/test.png',
    url: 'https://example.com',
    siteName: 'Example Site',
    favicon: 'https://example.com/favicon.ico',
  };

  beforeEach(() => {
    mockOgService = {
      extractMetadata: jest.fn(),
    };

    controller = new OpenGraphController(mockOgService as unknown as OpenGraphService);
  });

  it('getPreview throws BadRequestException if url query parameter is missing', async () => {
    await expect(controller.getPreview(undefined)).rejects.toThrow(
      new BadRequestException('Query param "url" is required'),
    );
  });

  it('getPreview delegates to OpenGraphService when url is provided', async () => {
    mockOgService.extractMetadata.mockResolvedValueOnce(sampleMeta);

    const result = await controller.getPreview('https://example.com');

    expect(mockOgService.extractMetadata).toHaveBeenCalledWith('https://example.com');
    expect(result).toEqual(sampleMeta);
  });
});
