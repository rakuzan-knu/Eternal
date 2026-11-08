import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({
  packaged: true,
  open: vi.fn(),
  message: vi.fn(),
}));
vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return mocks.packaged;
    },
    getAppPath: () => '/development/desktop',
  },
  shell: { openPath: mocks.open },
  dialog: { showMessageBox: mocks.message },
}));
import { openLicenseMaterials } from './licenses';

beforeEach(() => {
  mocks.packaged = true;
  mocks.open.mockReset().mockResolvedValue('');
  mocks.message.mockReset().mockResolvedValue({ response: 0 });
  vi.stubGlobal('process', { ...process, resourcesPath: '/installed/resources' });
});
afterEach(() => vi.unstubAllGlobals());

describe('bundled license access', () => {
  it('opens the installed resources directory without taking a caller-controlled path', async () => {
    await openLicenseMaterials();
    expect(mocks.open).toHaveBeenCalledWith(resolve('/installed/resources', 'licenses'));
    expect(mocks.message).not.toHaveBeenCalled();
  });
  it('uses the project assets for a development run', async () => {
    mocks.packaged = false;
    await openLicenseMaterials();
    expect(mocks.open).toHaveBeenCalledWith(resolve('/development/desktop', 'build/licenses'));
  });
  it.each(['returned error', 'rejected error'])('reports a safe error for %s', async (kind) => {
    if (kind === 'returned error') mocks.open.mockResolvedValue('private path details');
    else mocks.open.mockRejectedValue(new Error('private path details'));
    await openLicenseMaterials();
    expect(mocks.message).toHaveBeenCalledWith({
      type: 'error',
      title: 'Eternal licenses',
      message: 'Unable to open the bundled license materials.',
    });
  });
});
