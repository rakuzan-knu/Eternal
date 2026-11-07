import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ read: vi.fn(), exec: vi.fn(), packaged: true }));
vi.mock('node:fs', () => ({ readFileSync: mocks.read }));
vi.mock('node:child_process', () => ({ execFileSync: mocks.exec }));
vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return mocks.packaged;
    },
  },
}));
import {
  devToolsEnabled,
  getPolicies,
  loadPolicies,
  parsePolicies,
  readPolicySource,
} from './policies';

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.read.mockReset();
  mocks.exec.mockReset();
  mocks.packaged = true;
});

describe('enterprise policy boundary', () => {
  it('validates known values, ignores unknown keys without logging their content', () => {
    const warn = vi.fn();
    expect(parsePolicies({ DisableTelemetry: true, FutureKey: 'secret' }, warn)).toEqual({
      DisableTelemetry: true,
    });
    expect(warn).toHaveBeenCalledWith(1);
    for (const invalid of [
      { DisableTelemetry: 'false' },
      { EnableDevTools: 1 },
      { UpdateChannel: 'nightly' },
      [],
      null,
    ])
      expect(() => parsePolicies(invalid, warn)).toThrow();
  });
  it('uses machine values before user preferences per key and freezes the result', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    mocks.exec.mockReturnValue(
      JSON.stringify([
        { DisableTelemetry: false, UpdateChannel: 'beta' },
        { DisableTelemetry: true },
      ]),
    );
    expect(loadPolicies(vi.fn())).toEqual({ DisableTelemetry: true, UpdateChannel: 'beta' });
    expect(Object.isFrozen(getPolicies())).toBe(true);
    const args = mocks.exec.mock.calls[0];
    expect(args?.[1].at(-1)).toContain('Registry64');
    expect(args?.[1].at(-1)).toContain('RegistryValueKind]::DWord');
    expect(args?.[2]).toMatchObject({ windowsHide: true, timeout: 10000 });
  });
  it('reads the managed plist through plutil on macOS', () => {
    mocks.read.mockReturnValue('binary plist');
    mocks.exec.mockReturnValue('{"DisableAutoLaunch":true}');
    expect(readPolicySource('darwin')).toEqual([{ DisableAutoLaunch: true }]);
    expect(mocks.exec).toHaveBeenCalledWith(
      '/usr/bin/plutil',
      ['-convert', 'json', '-o', '-', '/Library/Managed Preferences/com.eternal.desktop.plist'],
      expect.any(Object),
    );
  });
  it('allows missing Linux policy, rejects unreadable, malformed and oversized policy', () => {
    mocks.read.mockImplementation(() => {
      throw Object.assign(new Error(), { code: 'ENOENT' });
    });
    expect(readPolicySource('linux')).toEqual([]);
    mocks.read.mockImplementation(() => {
      throw Object.assign(new Error(), { code: 'EACCES' });
    });
    expect(() => readPolicySource('linux')).toThrow('Unable to read');
    mocks.read.mockReturnValue('{broken');
    expect(() => readPolicySource('linux')).toThrow();
    mocks.read.mockReturnValue(' '.repeat(65537));
    expect(() => readPolicySource('linux')).toThrow('size limit');
  });
  it('applies explicit DevTools false in development and true in packaged builds', () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    mocks.read.mockReturnValue('{"EnableDevTools":true}');
    loadPolicies(vi.fn());
    expect(devToolsEnabled()).toBe(true);
    mocks.packaged = false;
    mocks.read.mockReturnValue('{"EnableDevTools":false}');
    loadPolicies(vi.fn());
    expect(devToolsEnabled()).toBe(false);
    mocks.read.mockReturnValue('{}');
    loadPolicies(vi.fn());
    expect(devToolsEnabled()).toBe(true);
  });
});
