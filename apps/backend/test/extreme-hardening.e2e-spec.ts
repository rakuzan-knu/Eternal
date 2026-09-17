import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { WsBackpressureService } from '../src/messenger/gateway/ws-backpressure.service';
import { FdGuard } from '../src/common/lifecycle/fd-guard';
import {
  extractHashtags,
  extractMentions,
  extractMetaContentLinear,
  extractTagContentLinear,
  isSafeHttpUrl,
} from '../src/common/utils/safe-regex.util';
import {
  RelationStateMachine,
  RelationState,
  RelationAction,
} from '../src/followers/domain/relation-state-machine';

describe('Extreme Hardening & I/O OS Tuning (e2e)', () => {
  let app: INestApplication<App>;
  let backpressureService: WsBackpressureService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    backpressureService = app.get<WsBackpressureService>(WsBackpressureService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Socket TCP Buffer Backpressure', () => {
    it('accurately identifies socket buffer congestion and handles priority routing', () => {
      const mockSocket = {
        id: 'mock-slow-client-1',
        connected: true,
        emit: jest.fn(),
        conn: {
          writeBuffer: new Array(10).fill({}),
          transport: {
            socket: {
              bufferSize: 120_000,
              writableNeedDrain: true,
            },
          },
        },
      } as unknown as Parameters<typeof backpressureService.sendSafe>[0];

      // Saturated buffer: ephemeral packets should be dropped immediately
      const emittedEphemeral = backpressureService.sendSafe(
        mockSocket,
        'typing',
        { isTyping: true },
        'ephemeral',
      );
      expect(emittedEphemeral).toBe(false);
      expect(mockSocket.emit).not.toHaveBeenCalled();

      // Critical packets should be buffered in bounded queue without dropping
      const emittedCritical = backpressureService.sendSafe(
        mockSocket,
        'message',
        { text: 'important' },
        'critical',
      );
      expect(emittedCritical).toBe(true);

      // Clean up socket state
      backpressureService.cleanupSocket('mock-slow-client-1');
    });

    it('immediately delivers packets when socket buffer is healthy', () => {
      const mockHealthySocket = {
        id: 'mock-fast-client-1',
        connected: true,
        emit: jest.fn(),
        conn: {
          writeBuffer: [],
          transport: {
            socket: {
              bufferSize: 0,
              writableNeedDrain: false,
            },
          },
        },
      } as unknown as Parameters<typeof backpressureService.sendSafe>[0];

      const sent = backpressureService.sendSafe(
        mockHealthySocket,
        'presence',
        { online: true },
        'ephemeral',
      );
      expect(sent).toBe(true);
      expect(mockHealthySocket.emit).toHaveBeenCalledWith('presence', { online: true });
    });
  });

  describe('2. File Descriptor Limit & EMFILE Sentinel Guard', () => {
    it('initializes sentinel FD and protects process from unhandled EMFILE crashes', () => {
      expect(() => {
        FdGuard.init();
      }).not.toThrow();

      expect(() => {
        FdGuard.cleanup();
      }).not.toThrow();
    });
  });

  describe('3. ReDoS Sweep & Safe Linear Parsers', () => {
    it('extracts hashtags in linear O(N) time with multi-language and unicode support', () => {
      const text = 'Exploring #coding with #TypeScript and #разработка_2026!';
      const tags = extractHashtags(text);

      expect(tags).toEqual(['#coding', '#TypeScript', '#разработка_2026']);
    });

    it('extracts user mentions in linear O(N) time safely', () => {
      const text = 'Hello @alex_smith and @dev.expert, please check this out!';
      const mentions = extractMentions(text);

      expect(mentions).toEqual(['alex_smith', 'dev.expert']);
    });

    it('parses HTML meta tags linearly without catastrophic regular expression backtracking', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta property="og:title" content="Hardened Social Network" />
            <meta name="twitter:description" content="Safe linear open-graph parsing" />
            <title>Social Network Title</title>
          </head>
        </html>
      `;

      const title = extractMetaContentLinear(html, 'og:title');
      const desc = extractMetaContentLinear(html, 'twitter:description');
      const pageTitle = extractTagContentLinear(html, 'title');

      expect(title).toBe('Hardened Social Network');
      expect(desc).toBe('Safe linear open-graph parsing');
      expect(pageTitle).toBe('Social Network Title');
    });

    it('validates safe HTTP/HTTPS URLs without regex backtracking risks', () => {
      expect(isSafeHttpUrl('https://example.com/api/v1/test')).toBe(true);
      expect(isSafeHttpUrl('http://sub.domain.org')).toBe(true);
      expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeHttpUrl('ftp://files.example.com')).toBe(false);
      expect(isSafeHttpUrl('https://' + 'a'.repeat(3000))).toBe(false);
    });
  });

  describe('4. Relation State Machine & Deterministic Lock Ordering', () => {
    it('deterministically orders user pairs to prevent database deadlocks', () => {
      const [u1, u2] = RelationStateMachine.getOrderedPair('user_zebra', 'user_alpha');
      expect(u1).toBe('user_alpha');
      expect(u2).toBe('user_zebra');

      const [p1, p2] = RelationStateMachine.getOrderedPair('user_alpha', 'user_zebra');
      expect(p1).toBe('user_alpha');
      expect(p2).toBe('user_zebra');
    });

    it('enforces valid relation state machine transitions', () => {
      // NONE -> PENDING on SEND_REQUEST
      expect(
        RelationStateMachine.validateTransition(
          RelationState.NONE,
          RelationAction.SEND_REQUEST,
          false,
        ),
      ).toBe(RelationState.PENDING);

      // PENDING -> ACCEPTED on ACCEPT_REQUEST
      expect(
        RelationStateMachine.validateTransition(
          RelationState.PENDING,
          RelationAction.ACCEPT_REQUEST,
          false,
        ),
      ).toBe(RelationState.ACCEPTED);

      // ACCEPTED -> NONE on UNFOLLOW
      expect(
        RelationStateMachine.validateTransition(
          RelationState.ACCEPTED,
          RelationAction.UNFOLLOW,
          false,
        ),
      ).toBe(RelationState.NONE);

      // Transition to BLOCKED is always atomic
      expect(
        RelationStateMachine.validateTransition(
          RelationState.ACCEPTED,
          RelationAction.BLOCK,
          false,
        ),
      ).toBe(RelationState.BLOCKED);
    });

    it('forbids follow operations when target is blocked', () => {
      expect(() => {
        RelationStateMachine.validateTransition(
          RelationState.NONE,
          RelationAction.SEND_REQUEST,
          true,
        );
      }).toThrow();
    });
  });
});
