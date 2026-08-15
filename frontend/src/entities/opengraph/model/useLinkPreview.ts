import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/httpClient';

export interface OpenGraphData {
  url: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
}

export function useLinkPreview(url?: string | null) {
  return useQuery<OpenGraphData | null>({
    queryKey: ['og-preview', url],
    queryFn: async () => {
      if (!url) return null;
      try {
        const res = await apiClient.get('/og-preview', {
          params: { url },
        });
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: Boolean(url),
    staleTime: Infinity, // Server caches in Redis for 7 days
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
}
