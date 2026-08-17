import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime } from '../formatRelativeTime';

describe('formatRelativeTime', () => {
  const BASE_TIME = new Date('2026-08-16T12:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for null, undefined, or empty', () => {
    expect(formatRelativeTime(null)).toBe('just now');
    expect(formatRelativeTime(undefined)).toBe('just now');
    expect(formatRelativeTime('')).toBe('just now');
  });

  it('returns "just now" for less than 1 minute', () => {
    const time = new Date(BASE_TIME - 30 * 1000).toISOString();
    expect(formatRelativeTime(time)).toBe('just now');
  });

  it('formats minutes', () => {
    const time = new Date(BASE_TIME - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(time)).toBe('5 minutes');
  });

  it('formats hours', () => {
    const time = new Date(BASE_TIME - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(time)).toBe('3 hours');
  });

  it('formats days', () => {
    const time = new Date(BASE_TIME - 4 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(time)).toBe('4 days');
  });

  it('formats weeks', () => {
    const time = new Date(BASE_TIME - 3 * 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(time)).toBe('3 weeks');
  });

  it('formats months', () => {
    const time = new Date(BASE_TIME - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(time)).toBe('2 months');
  });

  it('formats years', () => {
    const time = new Date(BASE_TIME - 400 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(time)).toBe('1 years');
  });
});
