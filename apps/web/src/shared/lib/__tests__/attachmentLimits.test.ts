import { describe, it, expect } from 'vitest';
import {
  validateIncomingFiles,
  formatFileSize,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from '../attachmentLimits';

describe('attachmentLimits', () => {
  describe('validateIncomingFiles', () => {
    it('accepts files within limit and below max count', () => {
      const file1 = new File(['hello'], 'test1.png', { type: 'image/png' });
      const file2 = new File(['world'], 'test2.png', { type: 'image/png' });

      const result = validateIncomingFiles(0, [file1, file2]);
      expect(result.accepted).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects files exceeding MAX_ATTACHMENTS_PER_MESSAGE', () => {
      const files = Array.from(
        { length: 12 },
        (_, i) => new File(['data'], `file${i}.png`, { type: 'image/png' }),
      );

      const result = validateIncomingFiles(0, files);
      expect(result.accepted).toHaveLength(MAX_ATTACHMENTS_PER_MESSAGE);
      expect(result.errors).toContain(
        `You can only attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files at once.`,
      );
    });

    it('rejects file larger than MAX_ATTACHMENT_SIZE_BYTES', () => {
      const smallFile = new File(['small'], 'small.png', { type: 'image/png' });
      const hugeFile = new File(['large'], 'huge.png', { type: 'image/png' });
      Object.defineProperty(hugeFile, 'size', { value: MAX_ATTACHMENT_SIZE_BYTES + 1024 });

      const result = validateIncomingFiles(0, [smallFile, hugeFile]);
      expect(result.accepted).toEqual([smallFile]);
      expect(result.errors).toContain(`"huge.png" is over 25 MB and wasn't attached.`);
    });

    it('stops accepting when existing count reaches limit', () => {
      const file = new File(['test'], 'file.png', { type: 'image/png' });
      const result = validateIncomingFiles(MAX_ATTACHMENTS_PER_MESSAGE, [file]);

      expect(result.accepted).toHaveLength(0);
      expect(result.errors).toContain(
        `You can only attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files at once.`,
      );
    });
  });

  describe('formatFileSize', () => {
    it('returns empty string for null or undefined or 0', () => {
      expect(formatFileSize(null)).toBe('');
      expect(formatFileSize(undefined)).toBe('');
      expect(formatFileSize(0)).toBe('');
    });

    it('formats bytes under 1MB into KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(500 * 1024)).toBe('500 KB');
    });

    it('formats bytes over 1MB into MB with 1 decimal', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });
});
