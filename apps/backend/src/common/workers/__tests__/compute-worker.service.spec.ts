import { ComputeWorkerService } from '../compute-worker.service';
import {
  executeComputeTask,
  taskComputeStats,
  taskEncryptMedia,
  taskDecryptMedia,
  taskGeneratePdf,
} from '../compute-worker.tasks';
import type { WorkerTaskType } from '../compute-worker.types';
import * as crypto from 'node:crypto';

describe('ComputeWorkerService & Worker Tasks', () => {
  let service: ComputeWorkerService;

  beforeEach(() => {
    service = new ComputeWorkerService();
    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('Direct Task Handlers', () => {
    it('computes accurate descriptive statistics and quantiles', () => {
      const numbers = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const stats = taskComputeStats({ numbers });

      expect(stats.count).toBe(10);
      expect(stats.sum).toBe(550);
      expect(stats.mean).toBe(55);
      expect(stats.median).toBe(55);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(100);
      expect(stats.p95).toBe(100);
      expect(stats.p99).toBe(100);
      expect(stats.variance).toBeGreaterThan(0);
      expect(stats.stdDev).toBeGreaterThan(0);
    });

    it('handles empty numbers array gracefully in stats calculation', () => {
      const stats = taskComputeStats({ numbers: [] });
      expect(stats.count).toBe(0);
      expect(stats.mean).toBe(0);
    });

    it('encrypts and decrypts media buffer accurately with AES-256-GCM', () => {
      const keyHex = crypto.randomBytes(32).toString('hex');
      const originalBuffer = Buffer.from('Sensitive Media Payload 1234567890', 'utf8');

      const encrypted = taskEncryptMedia({
        bufferBase64: originalBuffer.toString('base64'),
        keyHex,
      });

      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.encryptedBase64).toBeDefined();
      expect(encrypted.ivHex).toBeDefined();
      expect(encrypted.authTagHex).toBeDefined();

      const decrypted = taskDecryptMedia({
        encryptedBase64: encrypted.encryptedBase64,
        ivHex: encrypted.ivHex,
        authTagHex: encrypted.authTagHex,
        keyHex,
      });

      const decryptedBuffer = Buffer.from(decrypted.decryptedBase64, 'base64');
      expect(decryptedBuffer.toString('utf8')).toBe(originalBuffer.toString('utf8'));
    });

    it('throws error when decrypting with incorrect key or tampered auth tag', () => {
      const keyHex = crypto.randomBytes(32).toString('hex');
      const wrongKeyHex = crypto.randomBytes(32).toString('hex');
      const originalBuffer = Buffer.from('Sensitive Media', 'utf8');

      const encrypted = taskEncryptMedia({
        bufferBase64: originalBuffer.toString('base64'),
        keyHex,
      });

      expect(() => {
        taskDecryptMedia({
          encryptedBase64: encrypted.encryptedBase64,
          ivHex: encrypted.ivHex,
          authTagHex: encrypted.authTagHex,
          keyHex: wrongKeyHex,
        });
      }).toThrow();
    });

    it('generates standard PDF document binary accurately via direct handler', () => {
      const pdf = taskGeneratePdf({
        title: 'User Summary Report',
        author: 'Social Network System',
        metadata: { 'Account Type': 'Verified', 'Risk Level': 'Low' },
        sections: [
          {
            title: 'Overview',
            content: 'Account active and in good standing with zero violations reported.',
          },
        ],
      });

      expect(pdf.pageCount).toBeGreaterThanOrEqual(1);
      expect(pdf.byteLength).toBeGreaterThan(100);
      const decoded = Buffer.from(pdf.pdfBase64, 'base64').toString('utf8');
      expect(decoded.startsWith('%PDF-1.4')).toBe(true);
      expect(decoded.includes('User Summary Report')).toBe(true);
      expect(decoded.includes('%%EOF')).toBe(true);
    });
  });

  describe('Worker Thread Pool Execution via Service', () => {
    it('executes parseJsonAsync through worker thread', async () => {
      const payload = { userId: 'u-1', tags: ['news', 'tech'], active: true };
      const jsonStr = JSON.stringify(payload);

      const parsed = await service.parseJsonAsync<typeof payload>(jsonStr);
      expect(parsed).toEqual(payload);
    });

    it('executes stringifyJsonAsync through worker thread', async () => {
      const payload = { test: 'worker-json-string' };
      const str = await service.stringifyJsonAsync(payload);
      expect(JSON.parse(str)).toEqual(payload);
    });

    it('executes computeStatsAsync through worker thread', async () => {
      const dataset = Array.from({ length: 1000 }, (_, i) => i + 1);
      const stats = await service.computeStatsAsync(dataset);

      expect(stats.count).toBe(1000);
      expect(stats.sum).toBe(500500);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(1000);
      expect(stats.mean).toBe(500.5);
    });

    it('executes media encryption and decryption roundtrip through worker threads', async () => {
      const keyHex = crypto.randomBytes(32).toString('hex');
      const sampleMedia = Buffer.from('High resolution image binary header mock 12345');

      const encrypted = await service.encryptMediaAsync(sampleMedia, keyHex);
      expect(encrypted.algorithm).toBe('aes-256-gcm');

      const decrypted = await service.decryptMediaAsync(
        Buffer.from(encrypted.encryptedBase64, 'base64'),
        encrypted.ivHex,
        encrypted.authTagHex,
        keyHex,
      );

      expect(decrypted.toString('utf8')).toBe(sampleMedia.toString('utf8'));
    });

    it('executes generateDataExportAsync compiling full GDPR archive payload', async () => {
      const exportData = {
        user: {
          id: 'user-gdpr-1',
          email: 'user@example.com',
          username: 'johndoe',
          displayName: 'John Doe',
          createdAt: new Date().toISOString(),
        },
        posts: [
          {
            id: 'post-1',
            caption: 'First post',
            createdAt: new Date().toISOString(),
            likesCount: 10,
            commentsCount: 2,
          },
        ],
        comments: [
          {
            id: 'comm-1',
            text: 'Great post',
            createdAt: new Date().toISOString(),
          },
        ],
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const result = await service.generateDataExportAsync(exportData);

      expect(result.stats.totalPosts).toBe(1);
      expect(result.stats.totalComments).toBe(1);
      expect(result.stats.totalConversations).toBe(1);
      expect(result.stats.byteSize).toBeGreaterThan(50);
      expect(typeof result.jsonString).toBe('string');
      expect(JSON.parse(result.jsonString)).toHaveProperty('user.username', 'johndoe');
    });

    it('executes generatePdfAsync asynchronously through worker thread', async () => {
      const pdf = await service.generatePdfAsync({
        title: 'Monthly Activity Report',
        author: 'Social Network Analytics',
        metadata: { Month: 'August 2026', Posts: '42' },
        sections: [
          {
            title: 'Metrics Summary',
            content: 'Total impressions grew by 18% over the previous period.',
          },
        ],
      });

      expect(pdf.pageCount).toBeGreaterThanOrEqual(1);
      expect(pdf.byteLength).toBeGreaterThan(100);
      const decoded = Buffer.from(pdf.pdfBase64, 'base64').toString('utf8');
      expect(decoded.startsWith('%PDF-1.4')).toBe(true);
      expect(decoded.includes('Monthly Activity Report')).toBe(true);
      expect(decoded.includes('%%EOF')).toBe(true);
    });

    it('handles dispatching unknown task types with appropriate error rejection', () => {
      expect(() => {
        executeComputeTask('UNKNOWN_TYPE' as unknown as WorkerTaskType, {});
      }).toThrow(/Unknown worker task type/);
    });
  });
});
