import { ExceptionMode, PrivacyDimension, Visibility, AutoDeletePeriod } from '@prisma/client';
import { PrivacyController } from '../privacy.controller';
import type { PrivacyService } from '../privacy.service';
import type { RequestUser } from '../../../auth/interfaces/jwt-payload.interface';

describe('PrivacyController', () => {
  let controller: PrivacyController;
  let mockPrivacyService: {
    getMyPrivacy: jest.Mock;
    updateMyPrivacy: jest.Mock;
    listExceptions: jest.Mock;
    addException: jest.Mock;
    removeException: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-123',
    email: 'test@example.com',
    username: 'test_user',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockPrivacyService = {
      getMyPrivacy: jest.fn(),
      updateMyPrivacy: jest.fn(),
      listExceptions: jest.fn(),
      addException: jest.fn(),
      removeException: jest.fn(),
    };

    controller = new PrivacyController(mockPrivacyService as unknown as PrivacyService);
  });

  it('getMyPrivacy delegates to PrivacyService', async () => {
    const mockSettings = {
      lastSeen: Visibility.EVERYBODY,
      avatar: Visibility.EVERYBODY,
      banner: Visibility.EVERYBODY,
      forwardLink: Visibility.EVERYBODY,
      calls: Visibility.EVERYBODY,
      voiceMessages: Visibility.EVERYBODY,
      messages: Visibility.EVERYBODY,
      birthday: Visibility.NOBODY,
      bio: Visibility.EVERYBODY,
      groupInvites: Visibility.EVERYBODY,
      isPrivate: false,
      autoDeletePeriod: AutoDeletePeriod.OFF,
      allowNearbyRecommendations: true,
    };
    mockPrivacyService.getMyPrivacy.mockResolvedValueOnce(mockSettings);

    const result = await controller.getMyPrivacy(mockUser);

    expect(mockPrivacyService.getMyPrivacy).toHaveBeenCalledWith('usr-123');
    expect(result).toEqual(mockSettings);
  });

  it('updateMyPrivacy delegates to PrivacyService with user and DTO', async () => {
    const updateDto = { avatar: Visibility.CONTACTS };
    mockPrivacyService.updateMyPrivacy.mockResolvedValueOnce({ avatar: Visibility.CONTACTS });

    const result = await controller.updateMyPrivacy(mockUser, updateDto);

    expect(mockPrivacyService.updateMyPrivacy).toHaveBeenCalledWith('usr-123', updateDto);
    expect(result.avatar).toBe(Visibility.CONTACTS);
  });

  it('listExceptions delegates dimension query to PrivacyService', async () => {
    mockPrivacyService.listExceptions.mockResolvedValueOnce({ allow: [], deny: [] });

    const result = await controller.listExceptions(mockUser, PrivacyDimension.CALLS);

    expect(mockPrivacyService.listExceptions).toHaveBeenCalledWith(
      'usr-123',
      PrivacyDimension.CALLS,
    );
    expect(result).toEqual({ allow: [], deny: [] });
  });

  it('addException delegates adding exception to PrivacyService', async () => {
    mockPrivacyService.addException.mockResolvedValueOnce(undefined);

    await controller.addException(mockUser, {
      dimension: PrivacyDimension.AVATAR,
      targetId: 'usr-target',
      mode: ExceptionMode.DENY,
    });

    expect(mockPrivacyService.addException).toHaveBeenCalledWith(
      'usr-123',
      PrivacyDimension.AVATAR,
      'usr-target',
      ExceptionMode.DENY,
    );
  });

  it('removeException delegates removing exception to PrivacyService', async () => {
    mockPrivacyService.removeException.mockResolvedValueOnce(undefined);

    await controller.removeException(mockUser, PrivacyDimension.AVATAR, 'usr-target');

    expect(mockPrivacyService.removeException).toHaveBeenCalledWith(
      'usr-123',
      PrivacyDimension.AVATAR,
      'usr-target',
    );
  });
});
