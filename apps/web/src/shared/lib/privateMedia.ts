import { apiClient } from '@/shared/api/httpClient';
import { useAuthStore } from '@/shared/model/useAuthStore';

export const isPrivateMedia = (
  url: string | null | undefined,
): url is `private-media://${string}` => Boolean(url?.startsWith('private-media://'));

/** Resolve at the presentation/download boundary only. Durable messages keep the opaque ref. */
export async function resolveMediaUrl(url: string, signal?: AbortSignal): Promise<string> {
  if (!isPrivateMedia(url)) return url;
  const id = url.slice('private-media://'.length);
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) {
    throw new Error('Invalid private attachment reference');
  }
  const accountId = useAuthStore.getState().userId;
  const response = await apiClient.get<unknown>(`/uploads/direct/private/${id}`, { signal });
  const data = response.data;
  if (
    !data ||
    typeof data !== 'object' ||
    !('url' in data) ||
    typeof data.url !== 'string' ||
    !('expiresAt' in data) ||
    typeof data.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(data.expiresAt)) ||
    Date.parse(data.expiresAt) <= Date.now()
  ) {
    throw new Error('Invalid private attachment response');
  }
  if (useAuthStore.getState().userId !== accountId)
    throw new Error('Sign in to open private attachments');
  const signed = new URL(data.url);
  const localDevelopment =
    import.meta.env.DEV &&
    signed.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(signed.hostname);
  if ((signed.protocol !== 'https:' && !localDevelopment) || signed.username || signed.password)
    throw new Error('Invalid private attachment URL');
  return signed.href;
}

export async function fetchMedia(url: string, init?: RequestInit): Promise<Response> {
  return fetch(await resolveMediaUrl(url, init?.signal ?? undefined), {
    ...init,
    ...(isPrivateMedia(url) ? { credentials: 'omit', referrerPolicy: 'no-referrer' } : {}),
  });
}
