import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds fresh
      gcTime: 1000 * 60 * 3, // 3 minutes garbage collection time
    },
  },
});
