import {
  dataExportPageSchema,
  type DataExportPage,
  type DataExportSection,
} from '@social-network/shared-contracts';
import { apiClient } from '@/shared/api/httpClient';

const MAX_PAGES = 1000;
const MAX_BYTES = 25 * 1024 * 1024;

export interface DataExportProgress {
  section: DataExportSection;
  records: number;
}

export async function prepareDataExport({
  password,
  sections,
  signal,
  onProgress,
}: {
  password: string;
  sections: readonly DataExportSection[];
  signal: AbortSignal;
  onProgress: (progress: DataExportProgress) => void;
}): Promise<Blob> {
  const pages: DataExportPage[] = [];
  let bytes = 0;
  let records = 0;
  const encoder = new TextEncoder();

  for (const section of new Set(sections)) {
    let cursor: string | undefined;
    const seenCursors = new Set<string>();
    const service = section === 'messages' ? 'messenger' : 'core';
    const endpoint =
      service === 'messenger' ? '/messenger/me/data-export' : '/users/me/data-export';

    do {
      signal.throwIfAborted();
      if (pages.length >= MAX_PAGES) throw new Error('EXPORT_LIMIT');
      const response = await apiClient.post<unknown>(
        endpoint,
        { password, section, limit: 100, ...(cursor ? { cursor } : {}) },
        { signal },
      );
      signal.throwIfAborted();
      const result = dataExportPageSchema.safeParse(response.data);
      if (!result.success || result.data.section !== section || result.data.service !== service) {
        throw new Error('EXPORT_RESPONSE');
      }
      const page = result.data;
      const next = page.nextCursor;
      if (next && seenCursors.has(next)) throw new Error('EXPORT_RESPONSE');
      if (next) seenCursors.add(next);
      bytes += encoder.encode(JSON.stringify(page)).byteLength;
      if (bytes > MAX_BYTES) throw new Error('EXPORT_LIMIT');
      pages.push(page);
      records += page.items.length;
      onProgress({ section, records });
      cursor = next ?? undefined;
    } while (cursor);
  }

  signal.throwIfAborted();
  return new Blob(
    [JSON.stringify({ schemaVersion: 1, preparedAt: new Date().toISOString(), sections, pages })],
    { type: 'application/json;charset=utf-8' },
  );
}

export function saveDataExport(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `eternal-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
