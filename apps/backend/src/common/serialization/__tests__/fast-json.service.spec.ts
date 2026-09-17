import { FastJsonService, fastStringify, type FastJsonSchema } from '../fast-json.service';

describe('FastJsonService', () => {
  let service: FastJsonService;

  beforeEach(() => {
    service = new FastJsonService();
  });

  it('serializes pre-compiled STATUS_OK schema correctly', () => {
    const data = { status: 'ok', success: true, message: 'All good' };
    const result = service.stringify(data, 'STATUS_OK');
    const parsed = JSON.parse(result) as { status: string; success: boolean; message: string };

    expect(parsed.status).toBe('ok');
    expect(parsed.success).toBe(true);
    expect(parsed.message).toBe('All good');
  });

  it('serializes WS_TYPING schema fast and accurately', () => {
    const data = { conversationId: 'c1', userId: 'u1', isTyping: true };
    const result = service.stringify(data, 'WS_TYPING');
    const parsed = JSON.parse(result) as typeof data;

    expect(parsed).toEqual(data);
  });

  it('serializes USER_PROFILE schema accurately', () => {
    const data = {
      id: 'u1',
      email: 'test@example.com',
      username: 'tester',
      displayName: 'Tester User',
      avatar: null,
      bio: 'Hello world',
      banner: null,
      isPrivate: false,
      isVerified: true,
      primaryBadge: 'star',
      followersCount: 100,
      followingCount: 50,
      postsCount: 10,
      lastSeenAt: '2026-09-01T10:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const result = service.stringify(data, 'USER_PROFILE');
    const parsed = JSON.parse(result) as typeof data;

    expect(parsed).toEqual(data);
  });

  it('compiles custom dynamic schemas on-the-fly with caching', () => {
    const customSchema = {
      type: 'object',
      properties: {
        score: { type: 'number' },
        tag: { type: 'string' },
      },
    };

    const data = { score: 99.5, tag: 'leader' };
    const serializer1 = service.getSerializer(
      customSchema as FastJsonSchema,
      'custom-score-schema',
    );
    const serializer2 = service.getSerializer(
      customSchema as FastJsonSchema,
      'custom-score-schema',
    );

    expect(serializer1).toBe(serializer2);
    expect(JSON.parse(serializer1(data))).toEqual(data);
  });

  it('handles null and undefined safely', () => {
    expect(service.stringify(null)).toBe('null');
    expect(service.stringify(undefined)).toBe('null');
  });

  it('fastStringify helper executes properly without instance DI', () => {
    const data = { status: 'ok', success: true };
    const result = fastStringify(data, 'STATUS_OK');
    expect((JSON.parse(result) as { status: string }).status).toBe('ok');
  });
});
