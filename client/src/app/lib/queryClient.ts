import { QueryClient } from '@tanstack/react-query';

// Articles only change when the scraper runs (~daily) and the server already
// caches reads for 5 minutes, so an aggressive client staleTime is safe and
// keeps NeonDB egress down.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
