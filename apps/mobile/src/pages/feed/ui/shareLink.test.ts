import { afterEach, expect, it, vi } from 'vitest';
import { shareLink } from './shareLink';

const native = vi.hoisted(() => ({ Platform: { OS: 'web' }, share: vi.fn() }));
vi.mock('react-native', () => ({
  Platform: native.Platform,
  Share: { share: native.share, sharedAction: 'sharedAction' },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  native.Platform.OS = 'web';
});
const url = 'https://eternal.example/profile/sofia#post-123';

it('accepts the void result returned by the browser share API', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share });
  expect(await shareLink('Sofia on Eternal', url)).toBe('shared');
  expect(share).toHaveBeenCalledWith({ title: 'Sofia on Eternal', url });
});

it('copies the link when the browser has no share API', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  expect(await shareLink('Sofia on Eternal', url)).toBe('copied');
  expect(writeText).toHaveBeenCalledWith(url);
});

it('treats cancelling the browser share sheet as dismissal', async () => {
  const share = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
  vi.stubGlobal('navigator', { share });
  expect(await shareLink('Sofia on Eternal', url)).toBe('dismissed');
});

it('propagates a clipboard failure instead of reporting a successful copy', async () => {
  vi.stubGlobal('navigator', {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) },
  });
  await expect(shareLink('Sofia on Eternal', url)).rejects.toThrow('Permission denied');
});

it('uses native share results to distinguish sharing from cancellation', async () => {
  native.Platform.OS = 'ios';
  native.share.mockResolvedValueOnce({ action: 'sharedAction' });
  native.share.mockResolvedValueOnce({ action: 'dismissedAction' });
  expect(await shareLink('Sofia on Eternal', url)).toBe('shared');
  expect(await shareLink('Sofia on Eternal', url)).toBe('dismissed');
  expect(native.share).toHaveBeenCalledWith({
    title: 'Sofia on Eternal',
    message: `Sofia on Eternal\n${url}`,
  });
});
