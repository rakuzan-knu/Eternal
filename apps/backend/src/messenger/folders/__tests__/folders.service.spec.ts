import { NotFoundException } from '@nestjs/common';
import { FoldersService } from '../folders.service';
import type { IFoldersRepository, ChatFolder } from '../../interfaces/folders-repository.interface';

describe('FoldersService', () => {
  let service: FoldersService;
  let mockFoldersRepo: jest.Mocked<IFoldersRepository>;

  const mockFolder: ChatFolder = {
    id: 'f-1',
    userId: 'u-1',
    name: 'Personal',
    icon: 'User',
    emoji: null,
    color: '#3b82f6',
    order: 0,
    filterType: 'PERSONAL',
    includeIds: ['c-1'],
    excludeIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockFoldersRepo = {
      findAllByUserId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn(),
      countForUser: jest.fn(),
    };
    service = new FoldersService(mockFoldersRepo);
  });

  it('returns existing folders and cleans up any Work folders', async () => {
    const workFolder: ChatFolder = {
      ...mockFolder,
      id: 'f-work',
      name: 'Work',
      filterType: 'WORK',
    };
    mockFoldersRepo.findAllByUserId.mockResolvedValue([mockFolder, workFolder]);
    mockFoldersRepo.delete.mockResolvedValue(undefined);

    const res = await service.getFolders('u-1');
    expect(mockFoldersRepo.delete).toHaveBeenCalledWith('f-work', 'u-1');
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('Personal');
  });

  it('seeds default folders if user has 0 folders', async () => {
    mockFoldersRepo.findAllByUserId.mockResolvedValue([]);
    mockFoldersRepo.create.mockImplementation((userId, dto, order) =>
      Promise.resolve({
        ...mockFolder,
        id: `f-${order}`,
        name: dto.name,
        filterType: dto.filterType,
        order,
      }),
    );

    const res = await service.getFolders('u-1');
    expect(mockFoldersRepo.create).toHaveBeenCalledTimes(4);
    expect(res).toHaveLength(4);
    expect(res[0].name).toBe('All Chats');
  });

  it('creates new folder with next order index', async () => {
    mockFoldersRepo.countForUser.mockResolvedValue(3);
    mockFoldersRepo.create.mockResolvedValue(mockFolder);

    const res = await service.createFolder('u-1', {
      name: 'Custom',
      color: '#8b5cf6',
      filterType: 'CUSTOM',
      includeIds: [],
      excludeIds: [],
    });

    expect(mockFoldersRepo.create).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ name: 'Custom' }),
      3,
    );
    expect(res.name).toBe('Personal');
  });

  it('throws NotFoundException when updating non-existent folder', async () => {
    mockFoldersRepo.findById.mockResolvedValue(null);
    await expect(service.updateFolder('missing', 'u-1', { name: 'Updated' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates folder when found', async () => {
    mockFoldersRepo.findById.mockResolvedValue(mockFolder);
    mockFoldersRepo.update.mockResolvedValue({ ...mockFolder, name: 'Renamed' });

    const res = await service.updateFolder('f-1', 'u-1', { name: 'Renamed' });
    expect(res.name).toBe('Renamed');
  });

  it('throws NotFoundException when deleting non-existent folder', async () => {
    mockFoldersRepo.findById.mockResolvedValue(null);
    await expect(service.deleteFolder('missing', 'u-1')).rejects.toThrow(NotFoundException);
  });

  it('deletes folder when found', async () => {
    mockFoldersRepo.findById.mockResolvedValue(mockFolder);
    mockFoldersRepo.delete.mockResolvedValue(undefined);

    await service.deleteFolder('f-1', 'u-1');
    expect(mockFoldersRepo.delete).toHaveBeenCalledWith('f-1', 'u-1');
  });

  it('reorders folders and returns refreshed list', async () => {
    mockFoldersRepo.reorder.mockResolvedValue(undefined);
    mockFoldersRepo.findAllByUserId.mockResolvedValue([mockFolder]);

    const res = await service.reorderFolders('u-1', { folderIds: ['f-1'] });
    expect(mockFoldersRepo.reorder).toHaveBeenCalledWith('u-1', ['f-1']);
    expect(res).toHaveLength(1);
  });
});
