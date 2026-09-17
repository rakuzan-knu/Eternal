import { describe, it, expect } from 'vitest';
import { folderIconOptions } from '../chatFolderIcons';

describe('folderIconOptions', () => {
  it('contains expected default folder icons', () => {
    expect(folderIconOptions.length).toBeGreaterThan(5);
    const keys = folderIconOptions.map((o) => o.key);
    expect(keys).toContain('folder');
    expect(keys).toContain('heart');
    expect(keys).toContain('star');
    expect(keys).toContain('game');
  });
});
