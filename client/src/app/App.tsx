import { RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { AppProvider } from './contexts/AppContext';
import { queryClient } from './lib/queryClient';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </QueryClientProvider>
  );
}
