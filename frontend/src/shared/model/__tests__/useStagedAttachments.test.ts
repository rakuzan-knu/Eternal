import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStagedAttachments } from '../useStagedAttachments';

describe('useStagedAttachments', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
      revokeObjectURL: vi.fn(),
    });
  });

  it('starts with empty files and no error', () => {
    const { result } = renderHook(() => useStagedAttachments());
    expect(result.current.files).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('adds accepted files with preview URLs', () => {
    const { result } = renderHook(() => useStagedAttachments());
    const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['b'], 'photo2.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.addFiles([file1, file2]);
    });

    expect(result.current.files).toHaveLength(2);
    expect(result.current.files[0].previewUrl).toBe('blob:photo1.jpg');
    expect(result.current.error).toBeNull();
  });

  it('removes file at index and revokes URL', () => {
    const { result } = renderHook(() => useStagedAttachments());
    const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['b'], 'photo2.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.addFiles([file1, file2]);
    });

    act(() => {
      result.current.removeFile(0);
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].file.name).toBe('photo2.jpg');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo1.jpg');
  });

  it('replaces file at index', () => {
    const { result } = renderHook(() => useStagedAttachments());
    const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' });
    const replacement = new File(['c'], 'replaced.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.addFiles([file1]);
    });

    act(() => {
      result.current.replaceFile(0, replacement);
    });

    expect(result.current.files[0].file.name).toBe('replaced.jpg');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo1.jpg');
  });

  it('clears all files and revokes URLs', () => {
    const { result } = renderHook(() => useStagedAttachments());
    const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.addFiles([file1]);
    });

    act(() => {
      result.current.clear();
    });

    expect(result.current.files).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('dismisses error', () => {
    const { result } = renderHook(() => useStagedAttachments());
    const hugeFile = new File(['data'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(hugeFile, 'size', { value: 30 * 1024 * 1024 });

    act(() => {
      result.current.addFiles([hugeFile]);
    });

    expect(result.current.error).toBeDefined();

    act(() => {
      result.current.dismissError();
    });

    expect(result.current.error).toBeNull();
  });
});
