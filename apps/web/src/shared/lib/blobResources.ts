/** Own a temporary URL only for the duration of its asynchronous consumer. */
export async function withObjectUrl<T>(
  blob: Blob,
  consume: (url: string) => Promise<T>,
): Promise<T> {
  const url = URL.createObjectURL(blob);
  try {
    return await consume(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Allow the download to acquire its source before revoking our reference.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
