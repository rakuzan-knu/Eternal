import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Worker } from 'node:worker_threads';
import * as os from 'node:os';
import { uid } from 'uid';
import type {
  ComputeStatsResult,
  EncryptedMediaResult,
  ExportArchiveResult,
  GeneratePdfPayload,
  GeneratePdfResult,
  UserDataExportPayload,
  WorkerTaskRequest,
  WorkerTaskResponse,
  WorkerTaskType,
} from './compute-worker.types';
import { executeComputeTask } from './compute-worker.tasks';

// Self-contained worker execution code evaluated inside Worker Threads
const WORKER_SCRIPT = `
const { parentPort } = require('node:worker_threads');
const crypto = require('node:crypto');

function sanitizeProtoPollution(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = sanitizeProtoPollution(value[i]);
    return value;
  }
  const record = value;
  const keys = Object.keys(record);
  for (const key of keys) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      delete record[key];
    } else {
      sanitizeProtoPollution(record[key]);
    }
  }
  return record;
}

function handleTask(type, payload) {
  switch (type) {
    case 'PARSE_JSON': {
      const { jsonStr, maxSizeBytes = 10 * 1024 * 1024 } = payload;
      if (typeof jsonStr !== 'string') throw new TypeError('JSON payload must be a string');
      if (Buffer.byteLength(jsonStr, 'utf8') > maxSizeBytes) {
        throw new Error('JSON payload exceeds maximum allowed size of ' + maxSizeBytes + ' bytes');
      }
      return sanitizeProtoPollution(
        JSON.parse(jsonStr, (key, value) => {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            return undefined;
          }
          return value;
        }),
      );
    }
    case 'STRINGIFY_JSON': {
      return JSON.stringify(payload.data, null, payload.space);
    }
    case 'COMPUTE_STATS': {
      const { numbers } = payload;
      if (!Array.isArray(numbers) || numbers.length === 0) {
        return { count: 0, sum: 0, mean: 0, median: 0, variance: 0, stdDev: 0, min: 0, max: 0, p95: 0, p99: 0 };
      }
      const count = numbers.length;
      let sum = 0;
      let min = numbers[0];
      let max = numbers[0];
      for (let i = 0; i < count; i++) {
        const val = numbers[i];
        sum += val;
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const mean = sum / count;
      let varianceSum = 0;
      for (let i = 0; i < count; i++) {
        const diff = numbers[i] - mean;
        varianceSum += diff * diff;
      }
      const variance = count > 1 ? varianceSum / (count - 1) : 0;
      const stdDev = Math.sqrt(variance);
      const sorted = [...numbers].sort((a, b) => a - b);
      const median = count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[Math.floor(count / 2)];
      const p95Index = Math.min(count - 1, Math.floor(count * 0.95));
      const p99Index = Math.min(count - 1, Math.floor(count * 0.99));
      return {
        count,
        sum,
        mean: Number(mean.toFixed(4)),
        median: Number(median.toFixed(4)),
        variance: Number(variance.toFixed(4)),
        stdDev: Number(stdDev.toFixed(4)),
        min,
        max,
        p95: sorted[p95Index],
        p99: sorted[p99Index],
      };
    }
    case 'ENCRYPT_MEDIA': {
      const buffer = Buffer.from(payload.bufferBase64, 'base64');
      const key = Buffer.from(payload.keyHex, 'hex');
      if (key.length !== 32) throw new Error('AES-256-GCM key must be 32 bytes');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
      const authTag = cipher.getAuthTag();
      return {
        encryptedBase64: encrypted.toString('base64'),
        ivHex: iv.toString('hex'),
        authTagHex: authTag.toString('hex'),
        algorithm: 'aes-256-gcm',
      };
    }
    case 'DECRYPT_MEDIA': {
      const encrypted = Buffer.from(payload.encryptedBase64, 'base64');
      const iv = Buffer.from(payload.ivHex, 'hex');
      const authTag = Buffer.from(payload.authTagHex, 'hex');
      const key = Buffer.from(payload.keyHex, 'hex');
      if (key.length !== 32) throw new Error('AES-256-GCM key must be 32 bytes');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return { decryptedBase64: decrypted.toString('base64') };
    }
    case 'GENERATE_DATA_EXPORT': {
      const exportedAt = new Date().toISOString();
      const exportPayload = {
        exportedAt,
        user: payload.user,
        posts: payload.posts,
        comments: payload.comments,
        conversations: payload.conversations,
      };
      const jsonString = JSON.stringify(exportPayload, null, 2);
      const byteSize = Buffer.byteLength(jsonString, 'utf8');
      return {
        jsonString,
        stats: {
          totalPosts: payload.posts?.length || 0,
          totalComments: payload.comments?.length || 0,
          totalConversations: payload.conversations?.length || 0,
          exportedAt,
          byteSize,
        },
      };
    }
    case 'GENERATE_PDF': {
      const { title, author = 'Social Network', metadata = {}, sections = [] } = payload;
      const escapePdfText = (text) => text.replace(/\\\\/g, '\\\\\\\\').replace(/\\(/g, '\\\\(').replace(/\\)/g, '\\\\)');
      const objects = [];
      const addObject = (content) => {
        objects.push(content);
        return objects.length;
      };

      addObject('<< /Type /Catalog /Pages 2 0 R >>');
      objects.push(''); // placeholder for Pages (2)
      const fontObjId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

      const linesPerPage = 32;
      const allLines = [];
      allLines.push({ text: title, isHeading: true });
      allLines.push({ text: 'Generated: ' + new Date().toISOString() + ' | Author: ' + author, isHeading: false });
      allLines.push({ text: '------------------------------------------------------------', isHeading: false });

      const metaKeys = Object.keys(metadata);
      for (const metaKey of metaKeys) {
        allLines.push({ text: metaKey + ': ' + metadata[metaKey], isHeading: false });
      }
      if (metaKeys.length > 0) {
        allLines.push({ text: '------------------------------------------------------------', isHeading: false });
      }

      for (const section of sections) {
        allLines.push({ text: '\\n[ ' + section.title + ' ]', isHeading: true });
        const contentLines = (section.content || '').split('\\n');
        for (const cl of contentLines) {
          if (cl.length <= 80) {
            allLines.push({ text: cl, isHeading: false });
          } else {
            const words = cl.split(' ');
            let current = '';
            for (const w of words) {
              if ((current + ' ' + w).trim().length > 80) {
                allLines.push({ text: current.trim(), isHeading: false });
                current = w;
              } else {
                current = (current + ' ' + w).trim();
              }
            }
            if (current) allLines.push({ text: current.trim(), isHeading: false });
          }
        }
      }

      const pages = [];
      for (let i = 0; i < allLines.length; i += linesPerPage) {
        const pageLines = allLines.slice(i, i + linesPerPage);
        let stream = 'BT\\n/F1 11 Tf\\n50 780 Td\\n16 TL\\n';
        for (const pl of pageLines) {
          if (pl.isHeading) {
            stream += '/F1 14 Tf\\n(' + escapePdfText(pl.text) + ') Tj\\nT*\\n/F1 11 Tf\\n';
          } else {
            stream += '(' + escapePdfText(pl.text) + ') Tj\\nT*\\n';
          }
        }
        stream += 'ET';
        pages.push({ contentStream: stream });
      }

      if (pages.length === 0) {
        pages.push({ contentStream: 'BT\\n/F1 12 Tf\\n50 750 Td\\n(Empty Document) Tj\\nET' });
      }

      const pageObjIds = [];
      for (const page of pages) {
        const streamByteLen = Buffer.byteLength(page.contentStream, 'utf8');
        const streamObjId = addObject('<< /Length ' + streamByteLen + ' >>\\nstream\\n' + page.contentStream + '\\nendstream');
        const pageObjId = addObject('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ' + fontObjId + ' 0 R >> >> /Contents ' + streamObjId + ' 0 R >>');
        pageObjIds.push(pageObjId);
      }

      objects[1] = '<< /Type /Pages /Kids [' + pageObjIds.map((id) => id + ' 0 R').join(' ') + '] /Count ' + pageObjIds.length + ' >>';

      let pdfOutput = '%PDF-1.4\\n%\\xE2\\xE3\\xCF\\xD3\\n';
      const offsets = [];
      for (let i = 0; i < objects.length; i++) {
        offsets.push(Buffer.byteLength(pdfOutput, 'utf8'));
        pdfOutput += (i + 1) + ' 0 obj\\n' + objects[i] + '\\nendobj\\n';
      }

      const xrefOffset = Buffer.byteLength(pdfOutput, 'utf8');
      pdfOutput += 'xref\\n0 ' + (objects.length + 1) + '\\n0000000000 65535 f \\n';
      for (const offset of offsets) {
        pdfOutput += offset.toString().padStart(10, '0') + ' 00000 n \\n';
      }
      pdfOutput += 'trailer\\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\\nstartxref\\n' + xrefOffset + '\\n%%EOF\\n';

      const pdfBuffer = Buffer.from(pdfOutput, 'utf8');
      return {
        pdfBase64: pdfBuffer.toString('base64'),
        byteLength: pdfBuffer.length,
        pageCount: pageObjIds.length,
      };
    }
    default:
      throw new Error('Unknown worker task type: ' + type);
  }
}

if (parentPort) {
  parentPort.on('message', (request) => {
    try {
      const result = handleTask(request.type, request.payload);
      parentPort.postMessage({ id: request.id, success: true, result });
    } catch (err) {
      parentPort.postMessage({ id: request.id, success: false, error: err.message || String(err) });
    }
  });
}
`;

interface PendingTask {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: NodeJS.Timeout;
}

interface ManagedWorker {
  worker: Worker;
  activeTasks: number;
}

@Injectable()
export class ComputeWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ComputeWorkerService.name);
  private readonly workers: ManagedWorker[] = [];
  private readonly pendingTasks = new Map<string, PendingTask>();
  private isDestroyed = false;
  private poolSize = 2;

  onModuleInit(): void {
    const cpus = typeof os.availableParallelism === 'function' ? os.availableParallelism() : 2;
    this.poolSize = Math.max(1, Math.min(cpus, 4));

    for (let i = 0; i < this.poolSize; i++) {
      this.spawnWorker(i);
    }
  }

  private spawnWorker(index: number): void {
    if (this.isDestroyed) return;

    try {
      const worker = new Worker(WORKER_SCRIPT, { eval: true });
      const managed: ManagedWorker = { worker, activeTasks: 0 };

      worker.on('message', (response: WorkerTaskResponse) => {
        const pending = this.pendingTasks.get(response.id);
        if (!pending) return;

        this.pendingTasks.delete(response.id);
        clearTimeout(pending.timer);
        managed.activeTasks = Math.max(0, managed.activeTasks - 1);

        if (response.success) {
          pending.resolve(response.result);
        } else {
          pending.reject(new Error(response.error || 'Worker task failed'));
        }
      });

      worker.on('error', (err) => {
        this.logger.warn(`Worker [${index}] encountered error: ${(err as Error).message}`);
        this.replaceWorker(managed, index);
      });

      worker.on('exit', (code) => {
        if (!this.isDestroyed && code !== 0) {
          this.logger.warn(`Worker [${index}] exited with code ${code}, respawning...`);
          this.replaceWorker(managed, index);
        }
      });

      this.workers.push(managed);
    } catch (err) {
      this.logger.warn(
        `Failed to spawn worker thread [${index}], falling back to inline compute: ${(err as Error).message}`,
      );
    }
  }

  private replaceWorker(oldManaged: ManagedWorker, index: number): void {
    const idx = this.workers.indexOf(oldManaged);
    if (idx !== -1) {
      this.workers.splice(idx, 1);
    }
    try {
      void oldManaged.worker.terminate();
    } catch {
      // Ignore termination error
    }
    this.spawnWorker(index);
  }

  /**
   * Executes a heavy compute task in a worker thread.
   */
  async runTask<TResult>(
    type: WorkerTaskType,
    payload: unknown,
    timeoutMs = 15000,
  ): Promise<TResult> {
    if (this.isDestroyed) {
      throw new Error('ComputeWorkerService has been destroyed');
    }

    // If no workers spawned (e.g. sandboxed test environment), run synchronously via task handlers
    if (this.workers.length === 0) {
      return new Promise<TResult>((resolve, reject) => {
        setImmediate(() => {
          try {
            const res = executeComputeTask(type, payload);
            resolve(res as TResult);
          } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        });
      });
    }

    // Pick least loaded worker
    let chosen = this.workers[0];
    for (let i = 1; i < this.workers.length; i++) {
      if (this.workers[i].activeTasks < chosen.activeTasks) {
        chosen = this.workers[i];
      }
    }

    const taskId = uid(16);

    return new Promise<TResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingTasks.delete(taskId);
        chosen.activeTasks = Math.max(0, chosen.activeTasks - 1);
        reject(new Error(`Worker task '${type}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingTasks.set(taskId, {
        resolve: resolve as (val: any) => void,
        reject,
        timer,
      });

      chosen.activeTasks++;
      const request: WorkerTaskRequest = {
        id: taskId,
        type,
        payload,
      };

      chosen.worker.postMessage(request);
    });
  }

  /**
   * Parses large JSON string asynchronously in a worker thread.
   */
  async parseJsonAsync<T>(jsonStr: string, maxSizeBytes?: number): Promise<T> {
    return this.runTask<T>('PARSE_JSON', { jsonStr, maxSizeBytes });
  }

  /**
   * Stringifies large objects asynchronously in a worker thread.
   */
  async stringifyJsonAsync(data: unknown, space?: number): Promise<string> {
    return this.runTask<string>('STRINGIFY_JSON', { data, space });
  }

  /**
   * Computes statistical aggregates and percentiles over large numeric series.
   */
  async computeStatsAsync(numbers: number[]): Promise<ComputeStatsResult> {
    return this.runTask<ComputeStatsResult>('COMPUTE_STATS', { numbers });
  }

  /**
   * Encrypts media buffer using AES-256-GCM in worker thread.
   */
  async encryptMediaAsync(buffer: Buffer, keyHex: string): Promise<EncryptedMediaResult> {
    return this.runTask<EncryptedMediaResult>('ENCRYPT_MEDIA', {
      bufferBase64: buffer.toString('base64'),
      keyHex,
    });
  }

  /**
   * Decrypts media buffer using AES-256-GCM in worker thread.
   */
  async decryptMediaAsync(
    encryptedBuffer: Buffer,
    ivHex: string,
    authTagHex: string,
    keyHex: string,
  ): Promise<Buffer> {
    const res = await this.runTask<{ decryptedBase64: string }>('DECRYPT_MEDIA', {
      encryptedBase64: encryptedBuffer.toString('base64'),
      ivHex,
      authTagHex,
      keyHex,
    });
    return Buffer.from(res.decryptedBase64, 'base64');
  }

  /**
   * Compiles user GDPR export payload in worker thread.
   */
  async generateDataExportAsync(payload: UserDataExportPayload): Promise<ExportArchiveResult> {
    return this.runTask<ExportArchiveResult>('GENERATE_DATA_EXPORT', payload, 30000);
  }

  /**
   * Generates a standard-compliant PDF document binary buffer in worker thread.
   */
  async generatePdfAsync(
    payload: GeneratePdfPayload,
    timeoutMs = 30000,
  ): Promise<GeneratePdfResult> {
    return this.runTask<GeneratePdfResult>('GENERATE_PDF', payload, timeoutMs);
  }

  onModuleDestroy(): void {
    this.isDestroyed = true;
    for (const [id, pending] of this.pendingTasks) {
      clearTimeout(pending.timer);
      pending.reject(new Error('ComputeWorkerService destroyed'));
      this.pendingTasks.delete(id);
    }

    for (const managed of this.workers) {
      try {
        managed.worker.removeAllListeners();
        void managed.worker.terminate();
      } catch {
        // Ignore termination error
      }
    }
    this.workers.length = 0;
  }
}
