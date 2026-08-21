import { sessionViewSchema } from '../sessions';

describe('sessions.contract', () => {
  it('validates sessionViewSchema', () => {
    const now = new Date();
    const session = sessionViewSchema.parse({
      id: 'sess-123',
      deviceName: 'Chrome 120 / macOS',
      ip: '192.168.1.1',
      city: 'Berlin',
      country: 'DE',
      createdAt: now,
      lastActiveAt: now,
      isCurrent: true,
    });

    expect(session.id).toBe('sess-123');
    expect(session.city).toBe('Berlin');
    expect(session.isCurrent).toBe(true);
  });

  it('accepts null geo/device fields', () => {
    const now = new Date();
    const session = sessionViewSchema.parse({
      id: 'sess-anon',
      deviceName: null,
      ip: null,
      city: null,
      country: null,
      createdAt: now,
      lastActiveAt: now,
      isCurrent: false,
    });

    expect(session.deviceName).toBeNull();
    expect(session.isCurrent).toBe(false);
  });
});
