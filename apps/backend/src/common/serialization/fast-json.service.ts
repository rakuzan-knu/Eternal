import fastJson from 'fast-json-stringify';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Pre-compiled JSON Schemas for high-throughput REST and WebSocket serialization.
 */
export const SCHEMAS = {
  // Generic Status Response
  STATUS_OK: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      message: { type: 'string' },
      success: { type: 'boolean' },
    },
  },

  // WebSocket Typing Event
  WS_TYPING: {
    type: 'object',
    properties: {
      conversationId: { type: 'string' },
      userId: { type: 'string' },
      isTyping: { type: 'boolean' },
    },
  },

  // WebSocket Read Receipt Event
  WS_MESSAGE_READ: {
    type: 'object',
    properties: {
      conversationId: { type: 'string' },
      userId: { type: 'string' },
      messageId: { type: ['string', 'null'] },
      readAt: { type: 'string' },
    },
  },

  // Presence Batch Event
  WS_PRESENCE_BATCH: {
    type: 'object',
    properties: {
      online: { type: 'array', items: { type: 'string' } },
      offline: { type: 'array', items: { type: 'string' } },
      timestamp: { type: 'number' },
    },
  },

  // User Profile
  USER_PROFILE: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      username: { type: 'string' },
      displayName: { type: ['string', 'null'] },
      avatar: { type: ['string', 'null'] },
      bio: { type: ['string', 'null'] },
      banner: { type: ['string', 'null'] },
      isPrivate: { type: 'boolean' },
      isVerified: { type: 'boolean' },
      primaryBadge: { type: ['string', 'null'] },
      followersCount: { type: 'number' },
      followingCount: { type: 'number' },
      postsCount: { type: 'number' },
      lastSeenAt: { type: ['string', 'null'] },
      createdAt: { type: 'string' },
    },
  },

  // Post Response
  POST_RESPONSE: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      content: { type: 'string' },
      sharesCount: { type: 'number' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
      authorId: { type: 'string' },
      author: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          displayName: { type: ['string', 'null'] },
          avatar: { type: ['string', 'null'] },
        },
      },
      media: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            url: { type: 'string' },
            type: { type: 'string' },
            poster: { type: ['string', 'null'] },
            order: { type: 'number' },
          },
        },
      },
      likesCount: { type: 'number' },
      commentsCount: { type: 'number' },
      repostsCount: { type: 'number' },
      isLiked: { type: 'boolean' },
      isReposted: { type: 'boolean' },
      isSaved: { type: 'boolean' },
    },
  },
} as const;

export type SchemaKey = keyof typeof SCHEMAS;
export type FastJsonSchema = Parameters<typeof fastJson>[0];

@Injectable()
export class FastJsonService {
  private readonly logger = new Logger(FastJsonService.name);
  private readonly compiledSerializers = new Map<string, (doc: unknown) => string>();

  constructor() {
    this.precompileBuiltins();
  }

  private precompileBuiltins(): void {
    for (const [key, schema] of Object.entries(SCHEMAS)) {
      try {
        const stringifyFn = fastJson(schema as FastJsonSchema);
        this.compiledSerializers.set(key, stringifyFn);
      } catch (err) {
        this.logger.warn(`Failed to precompile schema ${key}: ${String(err)}`);
      }
    }
  }

  /**
   * Compiles or retrieves a cached fast-json-stringify serializer for a given JSON Schema.
   */
  getSerializer(
    schemaKeyOrSchema: SchemaKey | FastJsonSchema,
    customKey?: string,
  ): (doc: unknown) => string {
    const cacheKey =
      typeof schemaKeyOrSchema === 'string'
        ? schemaKeyOrSchema
        : (customKey ?? JSON.stringify(schemaKeyOrSchema));

    const existing = this.compiledSerializers.get(cacheKey);
    if (existing) return existing;

    const schema =
      typeof schemaKeyOrSchema === 'string' ? SCHEMAS[schemaKeyOrSchema] : schemaKeyOrSchema;
    if (!schema) {
      return (doc: unknown) => JSON.stringify(doc);
    }

    try {
      const stringifyFn = fastJson(schema);
      this.compiledSerializers.set(cacheKey, stringifyFn);
      return stringifyFn;
    } catch (err) {
      this.logger.warn(
        `Compilation failed for schema ${cacheKey}. Falling back to JSON.stringify: ${String(err)}`,
      );
      return (doc: unknown) => JSON.stringify(doc);
    }
  }

  /**
   * Serializes payload using pre-compiled schema serializer.
   * Falls back to native JSON.stringify on failure or missing schema.
   */
  stringify(payload: unknown, schemaKeyOrSchema?: SchemaKey | FastJsonSchema): string {
    if (payload === null || payload === undefined) {
      return 'null';
    }

    if (!schemaKeyOrSchema) {
      return JSON.stringify(payload);
    }

    try {
      const serializer = this.getSerializer(schemaKeyOrSchema);
      return serializer(payload);
    } catch {
      return JSON.stringify(payload);
    }
  }
}

// Singleton global helper for fast serialization outside of DI
const defaultService = new FastJsonService();
export const fastStringify = (data: unknown, schemaKey?: SchemaKey | FastJsonSchema): string =>
  defaultService.stringify(data, schemaKey);
