import type { ConfigService } from '@nestjs/config';
import { MemoryMonitorService } from '../memory-monitor.service';
import * as v8 from 'node:v8';
import * as fs from 'node:fs/promises';

jest.mock('node:v8');
jest.mock('node:fs/promises');

describe('MemoryMonitorService', () => {
  let service: MemoryMonitorService;
  let configService: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();

    configService = {
      get: jest.fn((key: string, defaultVal: string) => {
        if (key === 'HEAP_DUMP_THRESHOLD') return '0.85';
        if (key === 'HEAP_DUMP_COOLDOWN_MS') return '60000';
        if (key === 'MAX_HEAP_DUMP_FILES') return '3';
        if (key === 'HEAP_DUMP_DIR') return 'heapdumps';
        return defaultVal;
      }),
    } as unknown as ConfigService;

    (v8.getHeapStatistics as jest.Mock).mockReturnValue({
      total_heap_size: 100 * 1024 * 1024,
      used_heap_size: 50 * 1024 * 1024,
      heap_size_limit: 100 * 1024 * 1024,
    });

    (v8.getHeapSpaceStatistics as jest.Mock).mockReturnValue([
      {
        space_name: 'old_space',
        space_size: 50 * 1024 * 1024,
        space_used_size: 40 * 1024 * 1024,
        space_available_size: 10 * 1024 * 1024,
      },
    ]);

    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    (v8.writeHeapSnapshot as jest.Mock).mockReturnValue('/path/to/heapdump.heapsnapshot');

    service = new MemoryMonitorService(configService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('calculates memory and heap status accurately', () => {
    const status = service.getMemoryStatus();
    expect(status.heapUsedBytes).toBe(50 * 1024 * 1024);
    expect(status.heapLimitBytes).toBe(100 * 1024 * 1024);
    expect(status.heapUsedRatio).toBe(0.5);
    expect(status.heapSpaces.length).toBe(1);
    expect(status.heapSpaces[0].spaceName).toBe('old_space');
  });

  it('does not trigger heap dump when usage is below threshold', async () => {
    const takeDumpSpy = jest.spyOn(service, 'takeHeapDump');
    await service.checkMemoryUsage();
    expect(takeDumpSpy).not.toHaveBeenCalled();
  });

  it('triggers heap dump when usage exceeds 85% threshold', async () => {
    (v8.getHeapStatistics as jest.Mock).mockReturnValue({
      total_heap_size: 90 * 1024 * 1024,
      used_heap_size: 88 * 1024 * 1024, // 88%
      heap_size_limit: 100 * 1024 * 1024,
    });

    const takeDumpSpy = jest.spyOn(service, 'takeHeapDump');
    await service.checkMemoryUsage();
    expect(takeDumpSpy).toHaveBeenCalled();
    expect(v8.writeHeapSnapshot).toHaveBeenCalled();
    expect(service.getDumpCount()).toBe(1);
  });

  it('respects cooldown period between automated heap dumps', async () => {
    (v8.getHeapStatistics as jest.Mock).mockReturnValue({
      total_heap_size: 90 * 1024 * 1024,
      used_heap_size: 90 * 1024 * 1024, // 90%
      heap_size_limit: 100 * 1024 * 1024,
    });

    await service.checkMemoryUsage();
    expect(service.getDumpCount()).toBe(1);

    // Second immediate check should not trigger another dump
    await service.checkMemoryUsage();
    expect(service.getDumpCount()).toBe(1);
  });

  it('prunes old heap snapshots when exceeding max files', async () => {
    (fs.readdir as jest.Mock).mockResolvedValue([
      'heapdump-100-1.heapsnapshot',
      'heapdump-200-1.heapsnapshot',
      'heapdump-300-1.heapsnapshot',
      'heapdump-400-1.heapsnapshot',
    ]);

    (fs.stat as jest.Mock).mockImplementation((filePath: string) => {
      const match = filePath.match(/heapdump-(\d+)/);
      const mtime = match ? parseInt(match[1], 10) : 0;
      return Promise.resolve({ mtimeMs: mtime });
    });

    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    await service.takeHeapDump('Test pruning');

    expect(fs.unlink).toHaveBeenCalled();
  });
});
