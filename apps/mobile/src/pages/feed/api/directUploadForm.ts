import {
  prepareDirectUploadForm,
  type DirectUploadPurpose,
  type NativeUploadFile,
  type UploadFormEntry,
} from '@social-network/shared-api-client';

// Native FormData has no entries() API. Track only forms constructed by this application.
const nativeEntries = new WeakMap<FormData, UploadFormEntry[]>();

export function appendUploadField(
  body: FormData,
  name: string,
  value: string | Blob | NativeUploadFile,
  filename?: string,
) {
  if (typeof value === 'string') body.append(name, value);
  else if ('uri' in value) body.append(name, value);
  else if (filename) body.append(name, value, filename);
  else body.append(name, value);
  const entries = nativeEntries.get(body) ?? [];
  entries.push([name, value]);
  nativeEntries.set(body, entries);
}

export async function prepareMobileUploadForm(
  api: Parameters<typeof prepareDirectUploadForm>[0],
  body: FormData,
  purpose: DirectUploadPurpose,
  signal?: AbortSignal,
  conversationId?: string,
) {
  const entries = nativeEntries.get(body);
  return prepareDirectUploadForm(api, body, purpose, {
    signal,
    entries,
    ...(conversationId ? { conversationId } : {}),
  });
}
