import { http, HttpResponse } from 'msw';

export const musicHandlers = [
  http.get('*/integrations/music/liked-tracks', () => {
    return HttpResponse.json({ likedTracks: [] });
  }),

  http.post('*/integrations/music/liked-tracks', async () => {
    return HttpResponse.json({ success: true });
  }),

  http.delete('*/integrations/music/liked-tracks/:trackId', async () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('*/integrations/music/liked-tracks/sync', async () => {
    return HttpResponse.json({ likedTracks: [] });
  }),

  http.get('*/integrations/music/folders', () => {
    return HttpResponse.json([]);
  }),

  http.post('*/integrations/music/folders', async () => {
    return HttpResponse.json({
      id: 'fld-mock',
      name: 'New Folder',
      playlistIds: [],
      createdAt: new Date().toISOString(),
    });
  }),

  http.patch('*/integrations/music/folders/:id', async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    return HttpResponse.json({
      id: params.id,
      name: body?.name || 'Folder',
      playlistIds: [],
      createdAt: new Date().toISOString(),
    });
  }),

  http.delete('*/integrations/music/folders/:id', async () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('*/integrations/music/playlists', () => {
    return HttpResponse.json([]);
  }),

  http.get('*/integrations/music/playlists/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Playlist',
      description: '',
      coverUrl: '',
      creator: 'User',
      creatorId: 'user-1',
      creatorUsername: 'user1',
      tracks: [],
      createdAt: new Date().toISOString(),
    });
  }),

  http.post('*/integrations/music/playlists', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    return HttpResponse.json({
      id: `pl-${Date.now()}`,
      title: body?.title || 'Playlist',
      description: body?.description || '',
      coverUrl: body?.coverUrl || '',
      creator: 'You',
      tracks: [],
      createdAt: new Date().toISOString(),
    });
  }),

  http.patch('*/integrations/music/playlists/:id', async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    return HttpResponse.json({
      id: params.id,
      title: body?.title || 'Playlist',
      tracks: [],
      createdAt: new Date().toISOString(),
    });
  }),

  http.delete('*/integrations/music/playlists/:id', async () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('*/integrations/music/playlists/:id/tracks', async () => {
    return HttpResponse.json({ success: true });
  }),

  http.delete('*/integrations/music/playlists/:id/tracks/:trackId', async () => {
    return HttpResponse.json({ success: true });
  }),
];
