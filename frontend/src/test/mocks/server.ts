import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth.handlers';
import { profileHandlers } from './handlers/profile.handlers';

export const server = setupServer(...authHandlers, ...profileHandlers);
