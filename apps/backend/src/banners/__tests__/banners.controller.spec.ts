import { ForbiddenException } from '@nestjs/common';
import { BannersController } from '../banners.controller';
import type { BannersService } from '../banners.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('BannersController', () => {
  let controller: BannersController;
  let mockBannersService: {
    uploadBanner: jest.Mock;
    deleteBanner: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-1',
    email: 'user@test.com',
    username: 'user_1',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockBannersService = {
      uploadBanner: jest.fn(),
      deleteBanner: jest.fn(),
    };

    controller = new BannersController(mockBannersService as unknown as BannersService);
  });

  it('upload throws ForbiddenException when updating another user banner', () => {
    const mockFile = {} as Express.Multer.File;

    expect(() => controller.upload('usr-other', mockUser, mockFile, '50')).toThrow(
      ForbiddenException,
    );
  });

  it('upload delegates to BannersService with parsed position', async () => {
    const mockFile = {} as Express.Multer.File;
    mockBannersService.uploadBanner.mockResolvedValueOnce({
      id: 'usr-1',
      banner: 'https://cdn.com/b.jpg',
      bannerPosition: 50,
    });

    const result = await controller.upload('usr-1', mockUser, mockFile, '50');

    expect(mockBannersService.uploadBanner).toHaveBeenCalledWith('usr-1', mockFile, 50);
    expect(result.bannerPosition).toBe(50);
  });

  it('delete throws ForbiddenException when deleting another user banner', () => {
    expect(() => controller.delete('usr-other', mockUser)).toThrow(ForbiddenException);
  });

  it('delete delegates to BannersService for own banner', async () => {
    mockBannersService.deleteBanner.mockResolvedValueOnce({ id: 'usr-1', banner: null });

    const result = await controller.delete('usr-1', mockUser);

    expect(mockBannersService.deleteBanner).toHaveBeenCalledWith('usr-1');
    expect(result.banner).toBeNull();
  });
});
