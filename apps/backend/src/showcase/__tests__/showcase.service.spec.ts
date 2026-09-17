import { Test, type TestingModule } from '@nestjs/testing';
import { ShowcaseService } from '../showcase.service';
import { RedisService } from '../../redis/redis.service';
import { FollowStatus } from '@prisma/client';
import { ShowcasePrivacy, ShowcaseMediaType } from '@common/contracts';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SHOWCASE_REPOSITORY } from '../interfaces/showcase-repository.interface';

describe('ShowcaseService', () => {
  let service: ShowcaseService;
  let showcaseRepo: {
    findUserWithShowcase: jest.Mock;
    findUserBasic: jest.Mock;
    getFollowStatus: jest.Mock;
    upsertDefaultShowcase: jest.Mock;
    updateShowcase: jest.Mock;
    findUsersByIds: jest.Mock;
    updateConnectedAccounts: jest.Mock;
  };
  let redis: {
    del: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
  };

  const mockUser = {
    id: 'user-1',
    username: 'ayate',
    displayName: 'Ayate',
    birthDate: new Date('2000-08-15T00:00:00.000Z'),
    gender: 'Male',
    githubUsername: 'ayatedev',
    showcase: {
      id: 'showcase-1',
      userId: 'user-1',
      privacyMeta: ShowcasePrivacy.PUBLIC,
      privacyActivity: ShowcasePrivacy.PUBLIC,
      privacyShowcase: ShowcasePrivacy.PUBLIC,
      privacyLinks: ShowcasePrivacy.PUBLIC,
      showAge: true,
      showBirthdate: true,
      showGender: true,
      showTimezone: true,
      showZodiac: true,
      pronouns: 'he/him',
      timezone: 'UTC',
      accentColor: '#6366f1',
      connectedAccounts: {
        github: 'ayatedev',
        steam: 'ayate_steam',
        spotify: 'ayate_spotify',
        discord: 'ayate#0001',
        twitch: 'ayate_live',
      },
      activityStatus: {
        type: 'spotify',
        title: 'Starboy',
        subtitle: 'The Weeknd',
        imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
      },
      spotlightMedia: {
        title: 'Dota 2',
        posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
        subtitle: 'Pos 1 Carry',
        tags: ['🎮 Looking for teammates', '🔥 Main'],
        rating: 9.5,
        type: ShowcaseMediaType.GAME,
      },
      mediaItems: [
        {
          id: 'm-1',
          type: ShowcaseMediaType.GAME,
          title: 'Minecraft',
          posterUrl: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025',
          rating: 9.5,
          position: 0,
          tags: ['💖 Favorite'],
        },
      ],
    },
  };

  beforeEach(async () => {
    showcaseRepo = {
      findUserWithShowcase: jest.fn().mockResolvedValue(mockUser),
      findUserBasic: jest.fn().mockResolvedValue({ id: 'user-1', username: 'ayate' }),
      getFollowStatus: jest.fn().mockResolvedValue(null),
      upsertDefaultShowcase: jest.fn().mockResolvedValue({ id: 'showcase-1', userId: 'user-1' }),
      updateShowcase: jest.fn().mockResolvedValue(undefined),
      findUsersByIds: jest.fn().mockResolvedValue([]),
      updateConnectedAccounts: jest.fn().mockResolvedValue(undefined),
    };

    redis = {
      del: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowcaseService,
        { provide: SHOWCASE_REPOSITORY, useValue: showcaseRepo },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<ShowcaseService>(ShowcaseService);
  });

  describe('getShowcase', () => {
    it('should return full showcase for profile owner (SELF)', async () => {
      const result = await service.getShowcase('ayate', 'user-1');

      expect(result.relationship).toBe('SELF');
      expect(result.hasVisibleWidgets).toBe(true);
      expect(result.gender).toBe('Male');
      expect(result.pronouns).toBe('he/him');
      expect(result.zodiacSign).toContain('Leo');
      expect(result.activityStatus?.title).toBe('Starboy');
      expect(result.spotlightMedia?.title).toBe('Dota 2');
      expect(result.mediaItems).toHaveLength(1);
    });

    it('should filter private sections for public viewer', async () => {
      const privateShowcaseUser = {
        ...mockUser,
        showcase: {
          ...mockUser.showcase,
          privacyMeta: ShowcasePrivacy.PRIVATE,
          privacyActivity: ShowcasePrivacy.PRIVATE,
          privacyShowcase: ShowcasePrivacy.PRIVATE,
          privacyLinks: ShowcasePrivacy.PRIVATE,
        },
      };
      showcaseRepo.findUserWithShowcase.mockResolvedValueOnce(privateShowcaseUser);

      const result = await service.getShowcase('ayate', 'viewer-guest');

      expect(result.relationship).toBe('PUBLIC');
      expect(result.birthDate).toBeNull();
      expect(result.gender).toBeNull();
      expect(result.activityStatus).toBeNull();
      expect(result.connectedAccounts).toBeNull();
      expect(result.spotlightMedia).toBeNull();
      expect(result.mediaItems).toEqual([]);
      expect(result.hasVisibleWidgets).toBe(false);
    });

    it('should allow FOLLOWER to view FOLLOWERS visibility modules', async () => {
      const followersShowcaseUser = {
        ...mockUser,
        showcase: {
          ...mockUser.showcase,
          privacyMeta: ShowcasePrivacy.FOLLOWERS,
          privacyActivity: ShowcasePrivacy.FOLLOWERS,
        },
      };
      showcaseRepo.findUserWithShowcase.mockResolvedValueOnce(followersShowcaseUser);
      showcaseRepo.getFollowStatus.mockResolvedValueOnce(FollowStatus.ACCEPTED);

      const result = await service.getShowcase('ayate', 'follower-user-2');

      expect(result.relationship).toBe('FOLLOWER');
      expect(result.gender).toBe('Male');
      expect(result.activityStatus?.title).toBe('Starboy');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      showcaseRepo.findUserWithShowcase.mockResolvedValueOnce(null);

      await expect(service.getShowcase('nonexistent', null)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateShowcase', () => {
    it('should reject more than 5 items in the same media category', async () => {
      const sixGames = Array.from({ length: 6 }).map((_, i) => ({
        type: ShowcaseMediaType.GAME,
        title: `Game ${i}`,
        posterUrl: 'https://example.com/poster.jpg',
        position: i,
        isWishlist: false,
        tags: [],
      }));

      await expect(
        service.updateShowcase('user-1', {
          mediaItems: sixGames,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update and invalidate cache', async () => {
      const result = await service.updateShowcase('user-1', {
        accentColor: '#10b981',
        pronouns: 'they/them',
        mediaItems: [
          {
            type: ShowcaseMediaType.GAME,
            title: 'Minecraft',
            posterUrl: 'https://example.com/mc.jpg',
            position: 0,
            isWishlist: false,
            tags: ['🎮 Looking for teammates', '🔥 Main'],
          },
        ],
      });

      expect(showcaseRepo.updateShowcase).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalledWith('showcase:user-1');
      expect(result).toBeDefined();
    });
  });
});
