import { BlindedSfuService } from '../blinded-sfu.service';

describe('BlindedSfuService (blinded-crypto core)', () => {
  let service: BlindedSfuService;

  beforeEach(() => {
    service = new BlindedSfuService();
  });

  it('sign/verify roundtrip on the demo 2048-bit key', () => {
    const ticket = `0${'ab'.repeat(64)}`.slice(0, 128); // fixed 512-bit-range ticket
    const signature = service.signBlindedMessage(ticket);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
    expect(service.verifyTicket(ticket, signature)).toBe(true);
  });

  it('rejects tampered signatures and garbage', () => {
    const ticket = '41';
    const signature = service.signBlindedMessage(ticket);
    const tampered = signature.slice(0, -1) + (signature.endsWith('0') ? '1' : '0');
    expect(service.verifyTicket(ticket, tampered)).toBe(false);
    expect(service.verifyTicket('zz', 'zz')).toBe(false);
    expect(service.verifyTicket(ticket, signature)).toBe(true);
  });

  it('registers sessions only with valid tickets', () => {
    const ticket = '42';
    const signature = service.signBlindedMessage(ticket);
    const ok = service.registerBlindedSession('sock-1', 'room-token', ticket, signature);
    expect(ok.success).toBe(true);
    expect(ok.blindedParticipantId).toMatch(/^bp_/);
    expect(service.registerBlindedSession('sock-2', 'room-token', ticket, 'dead')).toEqual({
      success: false,
    });
    service.removeSession('sock-1');
  });
});
