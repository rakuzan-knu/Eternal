import { ForbiddenException } from '@nestjs/common';
import { AvatarsController } from '../avatars.controller';
import type { AvatarsService } from '../avatars.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('AvatarsController', () => {
  let controller: AvatarsController;
  let mockAvatarsService: {
    uploadAvatar: jest.Mock;
    deleteAvatar: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-1',
    email: 'user@test.com',
    username: 'user_1',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockAvatarsService = {
      uploadAvatar: jest.fn(),
      deleteAvatar: jest.fn(),
    };

    controller = new AvatarsController(mockAvatarsService as unknown as AvatarsService);
  });

  it('upload throws ForbiddenException when updating another user avatar', () => {
    const mockFile = {} as Express.Multer.File;

    expect(() => controller.upload('usr-other', mockUser, mockFile)).toThrow(ForbiddenException);
  });

  it('upload delegates to AvatarsService for own avatar', async () => {
    const mockFile = {} as Express.Multer.File;
    mockAvatarsService.uploadAvatar.mockResolvedValueOnce({
      id: 'usr-1',
      avatar: 'https://cdn.com/a.jpg',
    });

    const result = await controller.upload('usr-1', mockUser, mockFile);

    expect(mockAvatarsService.uploadAvatar).toHaveBeenCalledWith('usr-1', mockFile);
    expect(result.avatar).toBe('https://cdn.com/a.jpg');
  });

  it('delete throws ForbiddenException when deleting another user avatar', () => {
    expect(() => controller.delete('usr-other', mockUser)).toThrow(ForbiddenException);
  });

  it('delete delegates to AvatarsService for own avatar', async () => {
    mockAvatarsService.deleteAvatar.mockResolvedValueOnce({ id: 'usr-1', avatar: null });

    const result = await controller.delete('usr-1', mockUser);

    expect(mockAvatarsService.deleteAvatar).toHaveBeenCalledWith('usr-1');
    expect(result.avatar).toBeNull();
  });
});
