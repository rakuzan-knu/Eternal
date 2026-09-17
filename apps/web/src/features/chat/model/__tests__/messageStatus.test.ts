import { describe, it, expect } from 'vitest';
import {
  canTransitionMessageStatus,
  isTerminalMessageStatus,
  nextMessageStatus,
  normalizeMessageStatus,
  toLegacyStatus,
} from '../messageStatus';

describe('messageStatus machine', () => {
  it('normalizes legacy + canonical spellings', () => {
    expect(normalizeMessageStatus('SENDING')).toBe('pending');
    expect(normalizeMessageStatus('pending')).toBe('pending');
    expect(normalizeMessageStatus('SENT')).toBe('sent');
    expect(normalizeMessageStatus('DELIVERED')).toBe('delivered');
    expect(normalizeMessageStatus('READ')).toBe('read');
    expect(normalizeMessageStatus('ERROR')).toBe('failed');
    expect(normalizeMessageStatus('failed')).toBe('failed');
    expect(normalizeMessageStatus(null)).toBeUndefined();
    expect(normalizeMessageStatus('???')).toBeUndefined();
  });

  it('maps canonical back to legacy literals', () => {
    expect(toLegacyStatus('pending')).toBe('SENDING');
    expect(toLegacyStatus('sent')).toBe('SENT');
    expect(toLegacyStatus('delivered')).toBe('DELIVERED');
    expect(toLegacyStatus('read')).toBe('READ');
    expect(toLegacyStatus('failed')).toBe('ERROR');
  });

  it('enforces forward-only pending → sent → delivered → read', () => {
    expect(canTransitionMessageStatus('pending', 'sent')).toBe(true);
    expect(canTransitionMessageStatus('sent', 'delivered')).toBe(true);
    expect(canTransitionMessageStatus('delivered', 'read')).toBe(true);
    expect(canTransitionMessageStatus('pending', 'read')).toBe(true);
    // regressions are illegal
    expect(canTransitionMessageStatus('sent', 'pending')).toBe(false);
    expect(canTransitionMessageStatus('delivered', 'sent')).toBe(false);
    expect(canTransitionMessageStatus('read', 'delivered')).toBe(false);
    // same-state is a no-op
    expect(canTransitionMessageStatus('sent', 'sent')).toBe(false);
  });

  it('enters failed only from pending/sent and exits only via retry (→pending)', () => {
    expect(canTransitionMessageStatus('pending', 'failed')).toBe(true);
    expect(canTransitionMessageStatus('sent', 'failed')).toBe(true);
    expect(canTransitionMessageStatus('delivered', 'failed')).toBe(false);
    expect(canTransitionMessageStatus('failed', 'pending')).toBe(true);
    expect(canTransitionMessageStatus('failed', 'sent')).toBe(false);
  });

  it('nextMessageStatus never regresses (returns current on illegal move)', () => {
    expect(nextMessageStatus('DELIVERED', 'sent')).toBe('DELIVERED');
    expect(nextMessageStatus('SENDING', 'sent')).toBe('SENT');
    expect(nextMessageStatus('SENT', 'read')).toBe('READ');
  });

  it('detects terminal states', () => {
    expect(isTerminalMessageStatus('READ')).toBe(true);
    expect(isTerminalMessageStatus('ERROR')).toBe(true);
    expect(isTerminalMessageStatus('SENT')).toBe(false);
    expect(isTerminalMessageStatus(undefined)).toBe(false);
  });
});
