import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyCursorToDOM } from '../cursorLoader';

const renderCursor = vi.hoisted(() => vi.fn());
vi.mock('../cursorEngine', () => ({ applyCursorToDOM: renderCursor }));

describe('deferred cursor renderer', () => {
  beforeEach(() => {
    renderCursor.mockClear();
  });

  it('does not load/apply the custom renderer for default cursors', () => {
    applyCursorToDOM(false, 'dota2');
    expect(renderCursor).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute('data-custom-cursor')).toBe(false);
  });

  it('does not restore a stale selection when disabled while the module loads', async () => {
    applyCursorToDOM(true, 'dota2', 'classic');
    applyCursorToDOM(false, 'dota2');
    await vi.dynamicImportSettled();
    expect(renderCursor).not.toHaveBeenCalled();
    applyCursorToDOM(true, 'pixel-3d', 'cyber', 44);
    expect(renderCursor).toHaveBeenCalledWith(true, 'pixel-3d', 'cyber', 44);
  });
});
