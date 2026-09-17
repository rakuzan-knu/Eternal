import { ShowcaseController } from '../showcase.controller';
import type { ShowcaseService } from '../showcase.service';
import type { MediaProxyService } from '../media-proxy.service';
import { ShowcaseMediaType } from '@common/contracts';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('ShowcaseController', () => {
  let controller: ShowcaseController;
  let showcaseService: jest.Mocked<ShowcaseService>;
  let mediaProxyService: jest.Mocked<MediaProxyService>;

  const mockUser: RequestUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeEach(() => {
    showcaseService = {
      getShowcase: jest.fn().mockResolvedValue({ id: 'sc-1', userId: 'user-1' }),
      updateShowcase: jest.fn().mockResolvedValue({ id: 'sc-1', userId: 'user-1' }),
    } as unknown as jest.Mocked<ShowcaseService>;

    mediaProxyService = {
      searchMedia: jest.fn().mockResolvedValue([{ id: 'm-1', title: 'Media Title' }]),
      searchTracks: jest.fn().mockResolvedValue([{ title: 'Track 1', artist: 'Artist 1' }]),
    } as unknown as jest.Mocked<MediaProxyService>;

    controller = new ShowcaseController(showcaseService, mediaProxyService);
  });

  describe('searchMedia', () => {
    it('searches media with valid type', async () => {
      const res = await controller.searchMedia({ q: 'cyberpunk', type: 'GAME' });
      expect(res).toHaveLength(1);
      expect(mediaProxyService.searchMedia).toHaveBeenCalledWith(
        'cyberpunk',
        ShowcaseMediaType.GAME,
      );
    });

    it('falls back to GAME for unknown type and handles empty query', async () => {
      await controller.searchMedia({ q: '', type: 'INVALID_TYPE' as unknown as ShowcaseMediaType });
      expect(mediaProxyService.searchMedia).toHaveBeenCalledWith('', ShowcaseMediaType.GAME);
    });
  });

  describe('searchTracks', () => {
    it('searches tracks with query or empty default', async () => {
      const res = await controller.searchTracks({ q: 'Starboy' });
      expect(res).toHaveLength(1);
      expect(mediaProxyService.searchTracks).toHaveBeenCalledWith('Starboy');

      await controller.searchTracks({ q: '' });
      expect(mediaProxyService.searchTracks).toHaveBeenCalledWith('');
    });
  });

  describe('getShowcase', () => {
    it('gets showcase with viewer', async () => {
      const res = await controller.getShowcase('testuser', mockUser);
      expect(res.id).toBe('sc-1');
      expect(showcaseService.getShowcase).toHaveBeenCalledWith('testuser', 'user-1');
    });

    it('gets showcase anonymously', async () => {
      await controller.getShowcase('testuser', undefined);
      expect(showcaseService.getShowcase).toHaveBeenCalledWith('testuser', null);
    });
  });

  describe('updateShowcase', () => {
    it('updates own showcase', async () => {
      const dto = { accentColor: '#6366f1' };
      const res = await controller.updateShowcase(mockUser, dto);
      expect(res.id).toBe('sc-1');
      expect(showcaseService.updateShowcase).toHaveBeenCalledWith('user-1', dto);
    });
  });
});
