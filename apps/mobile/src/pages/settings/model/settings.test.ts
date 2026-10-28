import { expect, it, vi } from 'vitest';

vi.mock('../api/settingsApi', () => ({ settingsApi: {} }));

const { dndPreset, profileUpdate, usernameProblem } = await import('./settings');

it('sends only the profile fields that changed, normalized', () => {
  const profile = { displayName: 'Alex', username: 'alex', bio: null };
  expect(profileUpdate(profile, { displayName: 'Alex', username: 'alex', bio: '' })).toEqual({});
  expect(
    profileUpdate(profile, { displayName: ' Alex R ', username: '@Alex.R', bio: ' Hi ' }),
  ).toEqual({ displayName: 'Alex R', username: 'alex.r', bio: 'Hi' });
});

it('explains why a username is invalid', () => {
  expect(usernameProblem('a')).toMatch(/at least 2/);
  expect(usernameProblem('_alex')).toMatch(/letters, numbers/);
  expect(usernameProblem('al..ex')).toMatch(/letters, numbers/);
  expect(usernameProblem('alex_r')).toBeNull();
});

it('turns pause presets into an end time', () => {
  const now = new Date('2026-10-27T22:30:00');
  expect(dndPreset('off', now)).toBeNull();
  expect(new Date(dndPreset('1h', now) ?? '').getTime() - now.getTime()).toBe(3600e3);
  const tomorrow = new Date(dndPreset('tomorrow', now) ?? '');
  expect([tomorrow.getDate(), tomorrow.getHours()]).toEqual([28, 8]);
});
