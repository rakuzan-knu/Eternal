import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as v8 from 'node:v8';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface MemoryStatus {
  heapUsedBytes: number;
  heapTotalBytes: number;
  heapLimitBytes: number;
  heapUsedRatio: number;
  rssBytes: number;
  externalBytes: number;
  heapSpaces: Array<{
    spaceName: string;
    spaceSize: number;
    spaceUsedSize: number;
    spaceAvailableSize: number;
  }>;
}

@Injectable()
export class MemoryMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryMonitorService.name);
  private checkInterval?: NodeJS.Timeout | undefined;

  private readonly dumpThresholdRatio: number;
  private readonly dumpCooldownMs: number;
  private readonly maxDumpFiles: number;
  private readonly dumpDirectory: string;

  private lastDumpTimestamp = 0;
  private dumpCount = 0;

  constructor(private readonly configService: ConfigService) {
    const rawThreshold = this.configService.get<string>('HEAP_DUMP_THRESHOLD', '0.85');
    this.dumpThresholdRatio = parseFloat(rawThreshold) || 0.85;

    const rawCooldown = this.configService.get<string>('HEAP_DUMP_COOLDOWN_MS', '900000'); // 15 mins
    this.dumpCooldownMs = parseInt(rawCooldown, 10) || 900_000;

    const rawMaxFiles = this.configService.get<string>('MAX_HEAP_DUMP_FILES', '5');
    this.maxDumpFiles = parseInt(rawMaxFiles, 10) || 5;

    this.dumpDirectory = path.resolve(
      process.cwd(),
      this.configService.get<string>('HEAP_DUMP_DIR', 'heapdumps'),
    );
  }

  onModuleInit(): void {
    // Monitor memory every 10 seconds
    this.checkInterval = setInterval(() => {
      void this.checkMemoryUsage();
    }, 10_000);

    if (this.checkInterval && typeof this.checkInterval.unref === 'function') {
      this.checkInterval.unref();
    }

    this.logger.log(
      `Memory monitor initialized (Threshold: ${(this.dumpThresholdRatio * 100).toFixed(0)}%, Cooldown: ${Math.round(this.dumpCooldownMs / 1000)}s, Dir: ${this.dumpDirectory})`,
    );
  }

  getMemoryStatus(): MemoryStatus {
    const heapStats = v8.getHeapStatistics();
    const memUsage = process.memoryUsage();
    const heapSpaces = v8.getHeapSpaceStatistics().map((s) => ({
      spaceName: s.space_name,
      spaceSize: s.space_size,
      spaceUsedSize: s.space_used_size,
      spaceAvailableSize: s.space_available_size,
    }));

    const heapUsedRatio =
      heapStats.heap_size_limit > 0 ? heapStats.used_heap_size / heapStats.heap_size_limit : 0;

    return {
      heapUsedBytes: heapStats.used_heap_size,
      heapTotalBytes: heapStats.total_heap_size,
      heapLimitBytes: heapStats.heap_size_limit,
      heapUsedRatio,
      rssBytes: memUsage.rss,
      externalBytes: memUsage.external,
      heapSpaces,
    };
  }

  getDumpCount(): number {
    return this.dumpCount;
  }

  async checkMemoryUsage(): Promise<void> {
    const status = this.getMemoryStatus();

    if (status.heapUsedRatio >= this.dumpThresholdRatio) {
      const now = Date.now();
      const timeSinceLast = now - this.lastDumpTimestamp;

      if (timeSinceLast >= this.dumpCooldownMs) {
        this.logger.warn(
          `High memory usage detected! Heap Used: ${(status.heapUsedBytes / (1024 * 1024)).toFixed(1)}MB / Limit: ${(status.heapLimitBytes / (1024 * 1024)).toFixed(1)}MB (${(status.heapUsedRatio * 100).toFixed(1)}%). Triggering automated heap snapshot...`,
        );
        await this.takeHeapDump('High memory usage threshold exceeded');
      } else {
        this.logger.warn(
          `High memory usage detected (${(status.heapUsedRatio * 100).toFixed(1)}%), but heap dump is currently in cooldown (${Math.round((this.dumpCooldownMs - timeSinceLast) / 1000)}s remaining).`,
        );
      }
    }
  }

  async takeHeapDump(reason = 'Manual trigger'): Promise<string | null> {
    try {
      await fs.mkdir(this.dumpDirectory, { recursive: true });

      const timestamp = Date.now();
      const filename = `heapdump-${timestamp}-${process.pid}.heapsnapshot`;
      const filePath = path.join(this.dumpDirectory, filename);

      this.logger.log(`Generating V8 heap snapshot to ${filePath} (Reason: ${reason})...`);
      const writtenPath = v8.writeHeapSnapshot(filePath);

      this.lastDumpTimestamp = timestamp;
      this.dumpCount++;

      this.logger.log(`Heap snapshot successfully created: ${writtenPath ?? filePath}`);
      await this.cleanupOldSnapshots();

      return writtenPath ?? filePath;
    } catch (err) {
      this.logger.error(
        `Failed to capture heap snapshot: ${(err as Error).message}`,
        (err as Error).stack,
      );
      return null;
    }
  }

  private async cleanupOldSnapshots(): Promise<void> {
    try {
      const dirEntries = await fs.readdir(this.dumpDirectory).catch(() => []);
      const snapshotNames = dirEntries.filter(
        (f) => f.startsWith('heapdump-') && f.endsWith('.heapsnapshot'),
      );

      const files = await Promise.all(
        snapshotNames.map(async (name) => {
          const fullPath = path.join(this.dumpDirectory, name);
          const stats = await fs.stat(fullPath);
          return { name, path: fullPath, mtime: stats.mtimeMs };
        }),
      );

      files.sort((a, b) => b.mtime - a.mtime);

      if (files.length > this.maxDumpFiles) {
        const toDelete = files.slice(this.maxDumpFiles);
        for (const file of toDelete) {
          await fs.unlink(file.path).catch(() => {});
          this.logger.log(`Pruned old heap snapshot: ${file.name}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to prune old heap dumps: ${(err as Error).message}`);
    }
  }

  onModuleDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }
}
