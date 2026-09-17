import { sessionViewSchema } from '../sessions';

describe('sessions contract schemas (sessions.spec.ts)', () => {
  it('should validate sessionViewSchema with complete fields', () => {
    const now = new Date();
    const parsed = sessionViewSchema.parse({
      id: 'sess-1',
      deviceName: 'Chrome on MacOS',
      ip: '127.0.0.1',
      city: 'San Francisco',
      country: 'USA',
      createdAt: now,
      lastActiveAt: now,
      isCurrent: true,
    });
    expect(parsed.id).toBe('sess-1');
    expect(parsed.isCurrent).toBe(true);
    expect(parsed.deviceName).toBe('Chrome on MacOS');
  });

  it('should validate sessionViewSchema with nullable fields', () => {
    const now = new Date();
    const parsed = sessionViewSchema.parse({
      id: 'sess-2',
      deviceName: null,
      ip: null,
      city: null,
      country: null,
      createdAt: now,
      lastActiveAt: now,
      isCurrent: false,
    });
    expect(parsed.id).toBe('sess-2');
    expect(parsed.deviceName).toBeNull();
    expect(parsed.isCurrent).toBe(false);
  });
});
