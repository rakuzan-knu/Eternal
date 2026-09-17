import type { Preview } from '@storybook/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '../src/index.css';
// MSW browser worker for mocking API calls in Storybook
import { worker } from '../src/mocks/browser';

// Start MSW browser worker (non-blocking; stories render after it's ready)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  worker
    .start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: './mockServiceWorker.js',
      },
    })
    .catch((err) => {
      console.warn('[MSW] Mock service worker start skipped:', err);
    });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0b0b0c' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <div className="text-gray-100 font-sans antialiased">
            <Story />
          </div>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
};

export default preview;
