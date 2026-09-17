// src/mocks/browser.ts - MSW v2 browser worker for Storybook
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
