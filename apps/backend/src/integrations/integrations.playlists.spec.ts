import { type ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PrismaService } from '@common/prisma';
import { OptionalAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShowcaseService } from '../showcase/showcase.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { SpotifyService } from './spotify.service';
import { SoundCloudService } from './soundcloud.service';

const findUnique = vi.fn();
let app: NestFastifyApplication;
const playlist = {
  id: 'private-playlist',
  userId: 'owner',
  title: 'Private favourites',
  isPublic: false,
  user: { id: 'owner', username: 'owner', displayName: 'Owner' },
  tracks: [],
  createdAt: new Date('2026-10-01T00:00:00Z'),
};
beforeEach(async () => {
  findUnique.mockResolvedValue(playlist);
  const module = await Test.createTestingModule({
    controllers: [IntegrationsController],
    providers: [
      { provide: PrismaService, useValue: { userPlaylist: { findUnique } } },
      ...[IntegrationsService, ShowcaseService, SpotifyService, SoundCloudService].map(
        (provide) => ({ provide, useValue: {} }),
      ),
    ],
  })
    .overrideGuard(OptionalAuthGuard)
    .useValue({
      canActivate(context: ExecutionContext) {
        const request = context
          .switchToHttp()
          .getRequest<{ headers: Record<string, string | undefined>; user?: { id: string } }>();
        const id = request.headers['x-test-user'];
        if (id) request.user = { id };
        return true;
      },
    })
    .overrideGuard(AuthGuard)
    .useValue({ canActivate: () => true })
    .compile();
  app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterEach(async () => {
  await app.close();
  vi.clearAllMocks();
});
it('allows the authenticated owner to read a private playlist', async () => {
  const result = await app.inject({
    method: 'GET',
    url: '/integrations/music/playlists/private-playlist',
    headers: { 'x-test-user': 'owner' },
  });
  expect(result.statusCode).toBe(200);
  expect(result.json()).toMatchObject({ id: playlist.id, isPrivate: true, creatorId: 'owner' });
});
it.each([undefined, 'another-user'])('hides private playlists from %s', async (user) => {
  const result = await app.inject({
    method: 'GET',
    url: '/integrations/music/playlists/private-playlist',
    headers: user ? { 'x-test-user': user } : {},
  });
  expect(result.statusCode).toBe(404);
  expect(result.body).not.toContain(playlist.title);
});
it('keeps public shared playlists readable without a session', async () => {
  findUnique.mockResolvedValue({ ...playlist, isPublic: true });
  const result = await app.inject({
    method: 'GET',
    url: '/integrations/music/playlists/private-playlist',
  });
  expect(result.statusCode).toBe(200);
  expect(result.json()).toMatchObject({ isPrivate: false });
});
it('returns the same response for an unknown playlist', async () => {
  findUnique.mockResolvedValue(null);
  const result = await app.inject({ method: 'GET', url: '/integrations/music/playlists/missing' });
  expect(result.statusCode).toBe(404);
});
