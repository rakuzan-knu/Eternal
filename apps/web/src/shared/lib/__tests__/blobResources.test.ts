import { afterEach, describe, expect, it, vi } from 'vitest';
import { withObjectUrl, downloadBlob } from '../blobResources';

describe('temporary blob ownership', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('releases URLs on successful and failed asynchronous consumers', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:owned');
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    expect(await withObjectUrl(new Blob(), async (url) => url)).toBe('blob:owned');
    await expect(
      withObjectUrl(new Blob(), async () => {
        throw new Error('decode failed');
      }),
    ).rejects.toThrow('decode failed');
    expect(create).toHaveBeenCalledTimes(2);
    expect(revoke.mock.calls).toEqual([['blob:owned'], ['blob:owned']]);
  });
  it('removes download anchors and releases their URL after the browser starts the download', () => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBlob(new Blob(), 'attachment.pdf');
    expect(document.querySelector('a[download="attachment.pdf"]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:download');
  });
});
