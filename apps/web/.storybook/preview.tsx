import type { Preview } from '@storybook/react';
import React from 'react';
import { MotionConfig } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '../src/index.css';
// MSW browser worker for mocking API calls in Storybook
import { worker } from '../src/mocks/browser';
import TextScalePreview from './TextScalePreview';

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
  globalTypes: {
    textScale: {
      description: 'Root text size for accessibility review',
      toolbar: {
        title: 'Text size',
        items: [
          { value: 1, title: '100%' },
          { value: 1.5, title: '150%' },
          { value: 2, title: '200%' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { textScale: 1 },
  parameters: {
    viewport: {
      viewports: {
        mobile: {
          name: 'Phone · 390px',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
        narrow: {
          name: 'Narrow · 320px',
          styles: { width: '320px', height: '740px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet · 768px',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop · 1280px',
          styles: { width: '1280px', height: '900px' },
          type: 'desktop',
        },
      },
    },
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
    (Story, context) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MotionConfig reducedMotion="user">
            <TextScalePreview scale={Number(context.globals.textScale) || 1}>
              <Story />
            </TextScalePreview>
          </MotionConfig>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
};

export default preview;
