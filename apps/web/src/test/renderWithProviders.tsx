import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReactElement, ReactNode } from 'react';

export function renderWithProviders(
  ui: ReactElement,
  {
    initialEntries = ['/'],
    wrapper: Wrapper,
    ...options
  }: { initialEntries?: string[] } & RenderOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Providers({ children }: { children: ReactNode }) {
    const content = (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
    return Wrapper ? <Wrapper>{content}</Wrapper> : content;
  }

  return render(ui, { ...options, wrapper: Providers });
}
