import { useCallback, useState } from 'react';
import { validateIncomingFiles } from '../lib/attachmentLimits';

export interface StagedFile {
  file: File;
  previewUrl: string;
  isSpoiler?: boolean;
}

export function useStagedAttachments() {
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const { accepted, errors } = validateIncomingFiles(prev.length, incoming);
      setError(errors[0] ?? null);
      if (accepted.length === 0) return prev;
      return [
        ...prev,
        ...accepted.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
          isSpoiler: false,
        })),
      ];
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const replaceFile = useCallback((index: number, newFile: File, isSpoiler?: boolean) => {
    setFiles((prev) => {
      if (!prev[index]) return prev;
      URL.revokeObjectURL(prev[index].previewUrl);
      const next = [...prev];
      next[index] = {
        file: newFile,
        previewUrl: URL.createObjectURL(newFile),
        isSpoiler: isSpoiler !== undefined ? isSpoiler : prev[index].isSpoiler,
      };
      return next;
    });
  }, []);

  const toggleSpoiler = useCallback((index: number) => {
    setFiles((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = {
        ...next[index],
        isSpoiler: !next[index].isSpoiler,
      };
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      return [];
    });
    setError(null);
  }, []);

  return {
    files,
    error,
    addFiles,
    removeFile,
    replaceFile,
    toggleSpoiler,
    clear,
    dismissError: () => setError(null),
  };
}
