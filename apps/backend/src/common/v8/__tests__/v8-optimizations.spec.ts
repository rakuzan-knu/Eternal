import {
  makeJwtAccessPayload,
  makeJwtRefreshPayload,
  makeWsEvent,
  makeUserBasic,
  makeReactionSummary,
  makeNotificationUnreadCounts,
  toSmi,
} from '../shape-stable';
import {
  parseWsFrame,
  parseBinaryFrameHeader,
  fastDecodeUtf8,
  parseJsonFromBuffer,
  BINARY_FRAME_HEADER_SIZE,
} from '../zero-alloc-parser';

describe('V8 Monomorphism & Zero-Alloc WS Parsing', () => {
  describe('Shape-Stable Factories & Smi Optimizations', () => {
    it('should maintain stable key order for JWT payloads', () => {
      const p1 = makeJwtAccessPayload('u1', 'u1@test.com', 'user1', 'jti1');
      const p2 = makeJwtAccessPayload('u2', 'u2@test.com', 'user2', 'jti2');

      expect(Object.keys(p1)).toEqual(['type', 'sub', 'email', 'username', 'jti']);
      expect(Object.keys(p2)).toEqual(['type', 'sub', 'email', 'username', 'jti']);

      const r1 = makeJwtRefreshPayload('u1', 'jti1');
      expect(Object.keys(r1)).toEqual(['type', 'sub', 'jti']);
    });

    it('should maintain stable key order for UserBasicShape with nulls instead of omitted keys', () => {
      const u1 = makeUserBasic('u1', 'user1', undefined, undefined);
      const u2 = makeUserBasic('u2', 'user2', 'User Two', 'https://avatar.png');

      expect(Object.keys(u1)).toEqual(['id', 'username', 'displayName', 'avatar']);
      expect(Object.keys(u2)).toEqual(['id', 'username', 'displayName', 'avatar']);
      expect(u1.displayName).toBeNull();
      expect(u1.avatar).toBeNull();
    });

    it('should create shape-stable WS event envelopes with Smi seq', () => {
      const ev = makeWsEvent(1, 'TEST_EVENT', { foo: 'bar' }, 123456789);
      expect(Object.keys(ev)).toEqual(['seq', 'event', 'payload', 'timestamp']);
      expect(ev.seq).toBe(1);

      // Verify Smi integer coercion
      const evFloat = makeWsEvent(42.8, 'FLOAT_TEST', null, 123456);
      expect(evFloat.seq).toBe(42);
    });

    it('should maintain stable key order and Smi count in makeReactionSummary', () => {
      const r1 = makeReactionSummary('❤️', 5, true, ['u1']);
      const r2 = makeReactionSummary('👍', 10.9, false, ['u2']);

      expect(Object.keys(r1)).toEqual(['emoji', 'count', 'selfReacted', 'users']);
      expect(Object.keys(r2)).toEqual(['emoji', 'count', 'selfReacted', 'users']);
      expect(r1.count).toBe(5);
      expect(r2.count).toBe(10); // Smi coerced
    });

    it('should maintain strict key order and Smi values in makeNotificationUnreadCounts', () => {
      const counts = makeNotificationUnreadCounts(12, 5, 3, 2, 1, 0, 1);
      expect(Object.keys(counts)).toEqual([
        'total',
        'likes',
        'comments',
        'follows',
        'mentions',
        'reposts',
        'system',
      ]);
      expect(counts.total).toBe(12);
      expect(counts.likes).toBe(5);
    });

    it('should correctly coerce values to Smi range with toSmi', () => {
      expect(toSmi(123)).toBe(123);
      expect(toSmi('456')).toBe(456);
      expect(toSmi(12.75)).toBe(12);
      expect(toSmi(null)).toBe(0);
      expect(toSmi(undefined)).toBe(0);
    });
  });

  describe('Zero-Allocation WS Parser & fastDecodeUtf8', () => {
    it('should pass-through plain objects directly without allocation', () => {
      const obj = { conversationId: 'c1', text: 'hello' };
      expect(parseWsFrame(obj)).toBe(obj);
    });

    it('should parse JSON strings correctly', () => {
      const raw = JSON.stringify({ conversationId: 'c1', text: 'hello' });
      expect(parseWsFrame(raw)).toEqual({ conversationId: 'c1', text: 'hello' });
    });

    it('should zero-copy parse binary frame headers using Buffer.subarray()', () => {
      const payloadBuf = Buffer.from('{"hello":"world"}', 'utf8');
      const frame = Buffer.alloc(BINARY_FRAME_HEADER_SIZE + payloadBuf.length);

      frame.writeUInt16LE(105, 0); // typeCode 105
      frame.writeUInt16LE(0, 2); // flags 0
      payloadBuf.copy(frame, BINARY_FRAME_HEADER_SIZE);

      const header = parseBinaryFrameHeader(frame);
      expect(header).not.toBeNull();
      expect(header?.typeCode).toBe(105);
      expect(fastDecodeUtf8(header!.payload)).toBe('{"hello":"world"}');
    });

    it('should decode utf8 via fastDecodeUtf8 without memory corruption', () => {
      const str = 'Testing UTF-8 zero-copy decoding 🚀 12345';
      const buf = Buffer.from(str, 'utf8');
      expect(fastDecodeUtf8(buf)).toBe(str);
      expect(fastDecodeUtf8(new Uint8Array(buf))).toBe(str);
    });

    it('should parse JSON directly from a Buffer using parseJsonFromBuffer', () => {
      const data = { id: 'test-123', status: 'ok', count: 42 };
      const buf = Buffer.from(JSON.stringify(data), 'utf8');
      expect(parseJsonFromBuffer(buf)).toEqual(data);
    });

    it('should parse Buffer containing JSON in parseWsFrame', () => {
      const data = { text: 'websocket buffer payload' };
      const buf = Buffer.from(JSON.stringify(data), 'utf8');
      expect(parseWsFrame(buf)).toEqual(data);
    });
  });
});
