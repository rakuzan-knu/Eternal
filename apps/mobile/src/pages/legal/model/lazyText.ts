import { useQuery } from '@tanstack/react-query';
import type { ContentLanguage } from './documents';

export function useLazyText<T>(
  kind: 'document' | 'content' | 'safety-center',
  id: string,
  lang: ContentLanguage,
  load: () => Promise<T>,
) {
  return useQuery({
    queryKey: ['mobile', 'texts', kind, id, lang],
    queryFn: load,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 1,
    networkMode: 'always',
  });
}

export const lazyTextCopy = {
  en: { loading: 'Loading', failed: "This page couldn't be loaded." },
  uk: { loading: 'Завантаження', failed: 'Не вдалося завантажити сторінку.' },
} satisfies Record<ContentLanguage, Record<string, string>>;
