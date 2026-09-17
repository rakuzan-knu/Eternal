export type WorkerTaskType =
  | 'PARSE_JSON'
  | 'STRINGIFY_JSON'
  | 'COMPUTE_STATS'
  | 'ENCRYPT_MEDIA'
  | 'DECRYPT_MEDIA'
  | 'GENERATE_DATA_EXPORT'
  | 'GENERATE_PDF'
  | 'CRDT_MERGE';

/** Payload for CRDT_MERGE worker task */
export interface CrdtMergePayload {
  /** Serialized PNCounterState[] or LWWState[] chunks to merge */
  chunks: string[];
  type: 'pn' | 'lww';
}

/** Result of CRDT_MERGE task */
export interface CrdtMergeResult {
  merged: string; // JSON serialized merged state
}

export interface WorkerTaskRequest {
  id: string;
  type: WorkerTaskType;
  payload: unknown;
}

export interface WorkerTaskResponse {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface ComputeStatsResult {
  count: number;
  sum: number;
  mean: number;
  median: number;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}

export interface EncryptedMediaResult {
  encryptedBase64: string;
  ivHex: string;
  authTagHex: string;
  algorithm: 'aes-256-gcm';
}

export interface UserDataExportPayload {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    createdAt: string | Date;
  };
  posts: Array<{
    id: string;
    caption: string | null;
    createdAt: string | Date;
    likesCount: number;
    commentsCount: number;
  }>;
  comments: Array<{
    id: string;
    text: string;
    createdAt: string | Date;
  }>;
  conversations: Array<{
    id: string;
    title: string | null;
    updatedAt: string | Date;
  }>;
}

export interface ExportArchiveResult {
  jsonString: string;
  stats: {
    totalPosts: number;
    totalComments: number;
    totalConversations: number;
    exportedAt: string;
    byteSize: number;
  };
}

export interface GeneratePdfPayload {
  title: string;
  author?: string;
  subject?: string;
  metadata?: Record<string, string>;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

export interface GeneratePdfResult {
  pdfBase64: string;
  byteLength: number;
  pageCount: number;
}
