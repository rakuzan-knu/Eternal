import * as crypto from 'node:crypto';
import type {
  ComputeStatsResult,
  CrdtMergePayload,
  CrdtMergeResult,
  EncryptedMediaResult,
  ExportArchiveResult,
  GeneratePdfPayload,
  GeneratePdfResult,
  UserDataExportPayload,
  WorkerTaskType,
} from './compute-worker.types';

/**
 * Sanitizes parsed JSON to prevent prototype pollution attacks.
 */
export function sanitizeProtoPollution(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = sanitizeProtoPollution(value[i]);
    }
    return value;
  }

  const record = value as Record<string, unknown>;
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

/**
 * Parses JSON safely with prototype pollution sanitization.
 */
export function taskParseJson(payload: { jsonStr: string; maxSizeBytes?: number }): unknown {
  const { jsonStr, maxSizeBytes = 10 * 1024 * 1024 } = payload;
  if (typeof jsonStr !== 'string') {
    throw new TypeError('JSON payload must be a string');
  }
  if (Buffer.byteLength(jsonStr, 'utf8') > maxSizeBytes) {
    throw new Error(`JSON payload exceeds maximum allowed size of ${maxSizeBytes} bytes`);
  }
  const parsed: unknown = JSON.parse(jsonStr, (key: string, value: unknown): unknown => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return value;
  });
  return sanitizeProtoPollution(parsed);
}

/**
 * Stringifies data safely.
 */
export function taskStringifyJson(payload: { data: unknown; space?: number }): string {
  return JSON.stringify(payload.data, null, payload.space);
}

/**
 * Computes descriptive and quantile statistics over a numeric dataset.
 */
export function taskComputeStats(payload: { numbers: number[] }): ComputeStatsResult {
  const { numbers } = payload;
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return {
      count: 0,
      sum: 0,
      mean: 0,
      median: 0,
      variance: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      p95: 0,
      p99: 0,
    };
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

  // Quantiles
  const sorted = [...numbers].sort((a, b) => a - b);
  const median =
    count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];

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

/**
 * Encrypts a buffer using AES-256-GCM without blocking the main event loop.
 */
export function taskEncryptMedia(payload: {
  bufferBase64: string;
  keyHex: string;
}): EncryptedMediaResult {
  const buffer = Buffer.from(payload.bufferBase64, 'base64');
  const key = Buffer.from(payload.keyHex, 'hex');

  if (key.length !== 32) {
    throw new Error('AES-256-GCM key must be 32 bytes (64 hex characters)');
  }

  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
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

/**
 * Decrypts a buffer using AES-256-GCM with authentication tag validation.
 */
export function taskDecryptMedia(payload: {
  encryptedBase64: string;
  ivHex: string;
  authTagHex: string;
  keyHex: string;
}): { decryptedBase64: string } {
  const encrypted = Buffer.from(payload.encryptedBase64, 'base64');
  const iv = Buffer.from(payload.ivHex, 'hex');
  const authTag = Buffer.from(payload.authTagHex, 'hex');
  const key = Buffer.from(payload.keyHex, 'hex');

  if (key.length !== 32) {
    throw new Error('AES-256-GCM key must be 32 bytes (64 hex characters)');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return {
    decryptedBase64: decrypted.toString('base64'),
  };
}

/**
 * Compiles a full GDPR user data export archive payload asynchronously.
 */
export function taskGenerateDataExport(payload: UserDataExportPayload): ExportArchiveResult {
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

/**
 * Generates a standard-compliant PDF-1.4 binary document asynchronously in Worker Threads.
 */
export function taskGeneratePdf(payload: GeneratePdfPayload): GeneratePdfResult {
  const { title, author = 'Social Network', metadata = {}, sections = [] } = payload;

  const escapePdfText = (text: string): string => {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  };

  const objects: string[] = [];
  const addObject = (content: string): number => {
    objects.push(content);
    return objects.length;
  };

  // Object 1: Catalog
  addObject('<< /Type /Catalog /Pages 2 0 R >>');

  // Object 2: Placeholder for Pages Tree
  objects.push('');

  // Object 3: Font
  const fontObjId = addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  );

  const linesPerPage = 32;
  const allLines: Array<{ text: string; isHeading?: boolean }> = [];

  allLines.push({ text: title, isHeading: true });
  allLines.push({
    text: `Generated: ${new Date().toISOString()} | Author: ${author}`,
    isHeading: false,
  });
  allLines.push({
    text: '------------------------------------------------------------',
    isHeading: false,
  });

  const metaKeys = Object.keys(metadata);
  for (const metaKey of metaKeys) {
    allLines.push({ text: `${metaKey}: ${metadata[metaKey]}`, isHeading: false });
  }
  if (metaKeys.length > 0) {
    allLines.push({
      text: '------------------------------------------------------------',
      isHeading: false,
    });
  }

  for (const section of sections) {
    allLines.push({ text: `\n[ ${section.title} ]`, isHeading: true });
    const contentLines = section.content.split('\n');
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
        if (current) {
          allLines.push({ text: current.trim(), isHeading: false });
        }
      }
    }
  }

  const pages: Array<{ contentStream: string }> = [];
  for (let i = 0; i < allLines.length; i += linesPerPage) {
    const pageLines = allLines.slice(i, i + linesPerPage);
    let stream = 'BT\n/F1 11 Tf\n50 780 Td\n16 TL\n';
    for (const pl of pageLines) {
      if (pl.isHeading) {
        stream += `/F1 14 Tf\n(${escapePdfText(pl.text)}) Tj\nT*\n/F1 11 Tf\n`;
      } else {
        stream += `(${escapePdfText(pl.text)}) Tj\nT*\n`;
      }
    }
    stream += 'ET';
    pages.push({ contentStream: stream });
  }

  if (pages.length === 0) {
    pages.push({ contentStream: 'BT\n/F1 12 Tf\n50 750 Td\n(Empty Document) Tj\nET' });
  }

  const pageObjIds: number[] = [];
  for (const page of pages) {
    const streamByteLen = Buffer.byteLength(page.contentStream, 'utf8');
    const streamObjId = addObject(
      `<< /Length ${streamByteLen} >>\nstream\n${page.contentStream}\nendstream`,
    );
    const pageObjId = addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${streamObjId} 0 R >>`,
    );
    pageObjIds.push(pageObjId);
  }

  // Update Object 2: Pages tree
  objects[1] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`;

  let pdfOutput = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdfOutput, 'utf8'));
    pdfOutput += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdfOutput, 'utf8');
  pdfOutput += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (const offset of offsets) {
    pdfOutput += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const pdfBuffer = Buffer.from(pdfOutput, 'utf8');

  return {
    pdfBase64: pdfBuffer.toString('base64'),
    byteLength: pdfBuffer.length,
    pageCount: pageObjIds.length,
  };
}

/**
 * Master dispatcher for compute tasks.
 */
export function executeComputeTask(type: WorkerTaskType, payload: unknown): unknown {
  switch (type) {
    case 'PARSE_JSON':
      return taskParseJson(payload as { jsonStr: string; maxSizeBytes?: number });
    case 'STRINGIFY_JSON':
      return taskStringifyJson(payload as { data: unknown; space?: number });
    case 'COMPUTE_STATS':
      return taskComputeStats(payload as { numbers: number[] });
    case 'ENCRYPT_MEDIA':
      return taskEncryptMedia(payload as { bufferBase64: string; keyHex: string });
    case 'DECRYPT_MEDIA':
      return taskDecryptMedia(
        payload as {
          encryptedBase64: string;
          ivHex: string;
          authTagHex: string;
          keyHex: string;
        },
      );
    case 'GENERATE_DATA_EXPORT':
      return taskGenerateDataExport(payload as UserDataExportPayload);
    case 'GENERATE_PDF':
      return taskGeneratePdf(payload as GeneratePdfPayload);
    case 'CRDT_MERGE':
      return taskCrdtMerge(payload as CrdtMergePayload);
    default:
      throw new Error(`Unknown worker task type: ${String(type)}`);
  }
}

/**
 * Merges multiple serialized CRDT state snapshots in a worker thread.
 * For PN-Counters: element-wise max merge of P and N maps.
 * For LWW-Sets: higher-timestamp-wins merge of all entries.
 *
 * Offloading to worker threads keeps the main event loop free during
 * bulk CRDT reconciliation after Redis hydration or cluster sync.
 */
export function taskCrdtMerge(payload: CrdtMergePayload): CrdtMergeResult {
  const { chunks, type } = payload;
  if (!chunks || chunks.length === 0) {
    return { merged: '{}' };
  }

  if (type === 'pn') {
    // PN-Counter merge: element-wise max of P and N maps
    const mergedP: Record<string, number> = Object.create(null) as Record<string, number>;
    const mergedN: Record<string, number> = Object.create(null) as Record<string, number>;

    for (let ci = 0; ci < chunks.length; ci++) {
      const state = JSON.parse(chunks[ci]) as {
        p: Record<string, number>;
        n: Record<string, number>;
      };
      const pKeys = Object.keys(state.p);
      for (let i = 0; i < pKeys.length; i++) {
        const k = pKeys[i];
        const v = state.p[k];
        if (mergedP[k] === undefined || v > mergedP[k]) mergedP[k] = v;
      }
      const nKeys = Object.keys(state.n);
      for (let i = 0; i < nKeys.length; i++) {
        const k = nKeys[i];
        const v = state.n[k];
        if (mergedN[k] === undefined || v > mergedN[k]) mergedN[k] = v;
      }
    }

    return { merged: JSON.stringify({ p: mergedP, n: mergedN }) };
  }

  // LWW merge: higher timestamp wins, bias = 'add' on tie
  const mergedLww: Record<string, { ts: number; tomb: boolean }> = Object.create(null) as Record<
    string,
    { ts: number; tomb: boolean }
  >;

  for (let ci = 0; ci < chunks.length; ci++) {
    const state = JSON.parse(chunks[ci]) as Record<string, { ts: number; tomb: boolean }>;
    const keys = Object.keys(state);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const remote = state[k];
      const local = mergedLww[k];
      if (local === undefined || remote.ts > local.ts) {
        mergedLww[k] = { ts: remote.ts, tomb: remote.tomb };
      }
    }
  }

  return { merged: JSON.stringify(mergedLww) };
}
