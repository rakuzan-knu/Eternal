import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth.handlers';

export const server = setupServer(...authHandlers);
