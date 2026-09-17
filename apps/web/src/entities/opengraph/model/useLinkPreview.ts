import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/httpClient';
import type { LinkEmbedData } from './types';

export type { LinkEmbedData, OpenGraphData } from './types';

export function useLinkPreview(url?: string | null) {
  return useQuery<LinkEmbedData | null>({
    queryKey: ['link-preview', url],
    queryFn: async () => {
      if (!url) return null;
      try {
        // Primary endpoint
        const res = await apiClient.get('/messenger/link-preview', {
          params: { url },
        });
        return res.data;
      } catch {
        try {
          // Fallback endpoint
          const res = await apiClient.get('/og-preview', {
            params: { url },
          });
          return res.data;
        } catch {
          return null;
        }
      }
    },
    enabled: Boolean(url),
    staleTime: Infinity, // 48h cached on server
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
