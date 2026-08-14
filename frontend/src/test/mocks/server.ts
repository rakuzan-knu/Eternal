import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth.handlers';
import { profileHandlers } from './handlers/profile.handlers';
import { postsHandlers } from './handlers/posts.handlers';

export const server = setupServer(...authHandlers, ...profileHandlers, ...postsHandlers);
