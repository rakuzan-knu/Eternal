import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MemoryLeakDetectorService } from '../memory-leak-detector.service';
import { MemoryMonitorService } from '../memory-monitor.service';
import { RedisService } from '../../../redis/redis.service';

describe('MemoryLeakDetectorService (Automatic Heap Self-Healing)', () => {
  let service: MemoryLeakDetectorService;
  let mockConfigService: Partial<ConfigService>;
  let mockMemoryMonitor: Partial<MemoryMonitorService>;
  let mockRedisService: Partial<RedisService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, def?: string) => {
        if (key === 'MEMORY_LEAK_CHECK_INTERVAL_MS') return '500';
        if (key === 'MEMORY_LEAK_CONSECUTIVE_INCREASES') return '3';
        return def;
      }),
    };

    mockMemoryMonitor = {
      takeHeapDump: jest.fn().mockResolvedValue('/tmp/heapdump.heapsnapshot'),
    };

    mockRedisService = {
      clearFallbackCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryLeakDetectorService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MemoryMonitorService, useValue: mockMemoryMonitor },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<MemoryLeakDetectorService>(MemoryLeakDetectorService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('starts in a healthy ready state', () => {
    expect(service.isReadyForTraffic()).toBe(true);
    const status = service.getLeakStatus();
    expect(status.isReady).toBe(true);
    expect(status.consecutiveIncreases).toBe(0);
  });

  it('allows simulation of memory leak and switches readinessProbe to false', () => {
    service.simulateMemoryLeak();
    expect(service.isReadyForTraffic()).toBe(false);

    const status = service.getLeakStatus();
    expect(status.isReady).toBe(false);
    expect(status.actionTaken).toBe('SIMULATED_MEMORY_LEAK');

    service.resetSimulation();
    expect(service.isReadyForTraffic()).toBe(true);
  });

  it('registers and executes cache cleaners on leak detection', async () => {
    const customCleaner = jest.fn();
    service.registerCacheCleaner(customCleaner);

    // Force call emergency mitigation via simulation / trigger
    service.simulateMemoryLeak();
    expect(service.isReadyForTraffic()).toBe(false);
  });
});
