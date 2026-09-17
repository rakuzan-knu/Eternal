export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

export interface ValidateFilesResult {
  accepted: File[];
  errors: string[];
}

export function validateIncomingFiles(
  existingCount: number,
  incoming: File[],
): ValidateFilesResult {
  const errors: string[] = [];
  const accepted: File[] = [];
  let count = existingCount;

  for (const file of incoming) {
    if (count >= MAX_ATTACHMENTS_PER_MESSAGE) {
      errors.push(`You can only attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files at once.`);
      break;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      errors.push(`"${file.name}" is over 25 MB and wasn't attached.`);
      continue;
    }
    accepted.push(file);
    count += 1;
  }

  return { accepted, errors };
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
