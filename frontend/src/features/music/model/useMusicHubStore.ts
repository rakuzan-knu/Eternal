import { create } from 'zustand';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { musicEventBridge } from './musicEvents';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import type {
  MusicPlaylist,
  MusicLibraryFilter,
  MusicLibrarySort,
  MusicLibraryViewMode,
  MusicFolder,
  PlaylistCollaborator,
  PlaylistInvite,
  MusicRecentlyPlayedItem,
  MusicHomeCategory,
} from './types';
import { generateSpotifyId } from './types';

// Storage keys
const GLOBAL_PLAYLISTS_KEY = 'eternal_music_global_playlists_v1';
const GLOBAL_INVITES_KEY = 'eternal_music_playlist_invites_v1';
const USER_LIB_KEY_PREFIX = 'eternal_music_user_lib_';

// Helper to get active user id from auth-session in localStorage without circular dependency
export const getActiveUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth-session');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.state?.userId || null;
    }
  } catch {}
  return null;
};

// Global playlists storage (so custom & collaborative playlists are discoverable by invite/link across accounts)
export const loadGlobalPlaylists = (): Record<string, MusicPlaylist> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(GLOBAL_PLAYLISTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveGlobalPlaylist = (playlist: MusicPlaylist) => {
  if (typeof window === 'undefined') return;
  try {
    const all = loadGlobalPlaylists();
    all[playlist.id] = playlist;
    localStorage.setItem(GLOBAL_PLAYLISTS_KEY, JSON.stringify(all));
  } catch {}
};

export const deleteGlobalPlaylist = (playlistId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const all = loadGlobalPlaylists();
    delete all[playlistId];
    localStorage.setItem(GLOBAL_PLAYLISTS_KEY, JSON.stringify(all));
  } catch {}
};

// Global invites storage (shared across accounts so invitations sent to other users are preserved)
export const loadGlobalInvites = (): PlaylistInvite[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GLOBAL_INVITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveGlobalInvites = (invites: PlaylistInvite[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GLOBAL_INVITES_KEY, JSON.stringify(invites));
    window.dispatchEvent(new CustomEvent('eternal_playlist_invite_updated'));
  } catch {}
};

// User library storage (liked tracks, created playlists, saved playlists, folders, recently played, recommendation seeds)
export interface UserMusicLibraryData {
  likedTracks: SpotifyTrack[];
  userPlaylistIds: string[];
  savedPlaylistIds: string[];
  musicFolders: MusicFolder[];
  recentlyPlayed: MusicRecentlyPlayedItem[];
  lastActiveGenre?: string;
  lastActiveSeed?: string;
  pinnedItemIds: string[];
}

export const loadUserLibrary = (userId: string | null): UserMusicLibraryData => {
  const defaultData: UserMusicLibraryData = {
    likedTracks: [],
    userPlaylistIds: [],
    savedPlaylistIds: [],
    musicFolders: [],
    recentlyPlayed: [],
    lastActiveGenre: undefined,
    lastActiveSeed: undefined,
    pinnedItemIds: [],
  };
  if (typeof window === 'undefined') return defaultData;
  const key = `${USER_LIB_KEY_PREFIX}${userId || 'guest'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        likedTracks: Array.isArray(parsed.likedTracks) ? parsed.likedTracks : [],
        userPlaylistIds: Array.isArray(parsed.userPlaylistIds) ? parsed.userPlaylistIds : [],
        savedPlaylistIds: Array.isArray(parsed.savedPlaylistIds) ? parsed.savedPlaylistIds : [],
        musicFolders: Array.isArray(parsed.musicFolders) ? parsed.musicFolders : [],
        recentlyPlayed: Array.isArray(parsed.recentlyPlayed)
          ? parsed.recentlyPlayed.map((item: any) => ({
              ...item,
              id: PLAYLIST_ALIASES[item.id] || item.id,
              playlistId: item.playlistId
                ? PLAYLIST_ALIASES[item.playlistId] || item.playlistId
                : undefined,
              subtitle:
                (item.subtitle || '').replace(/\s*✓?\s*Playlist added\s*/gi, '').trim() ||
                item.subtitle,
            }))
          : [],
        lastActiveGenre:
          typeof parsed.lastActiveGenre === 'string' ? parsed.lastActiveGenre : undefined,
        lastActiveSeed:
          typeof parsed.lastActiveSeed === 'string' ? parsed.lastActiveSeed : undefined,
        pinnedItemIds: Array.isArray(parsed.pinnedItemIds) ? parsed.pinnedItemIds : [],
      };
    }
  } catch {}
  return defaultData;
};

export const saveUserLibrary = (userId: string | null, data: UserMusicLibraryData) => {
  if (typeof window === 'undefined') return;
  const key = `${USER_LIB_KEY_PREFIX}${userId || 'guest'}`;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

/**
 * Intelligent genre / category detector for real-time recommendation adapting
 */
export function detectGenre(track?: SpotifyTrack | null, query?: string): string {
  const text =
    `${track?.title || ''} ${track?.artist || ''} ${track?.album || ''} ${query || ''}`.toLowerCase();
  if (/rock|alternative|grunge|metal|punk|nirvana|linkin park|queen|metallica/i.test(text)) {
    return 'Rock';
  }
  if (/phonk|drift|memphis|kordhell|giga/i.test(text)) {
    return 'Phonk';
  }
  if (/hip[- ]?hop|rap|trap|carti|lil |yachty|keef|future/i.test(text)) {
    return 'Hip-Hop';
  }
  if (/lo[- ]?fi|chill|relax|study|ambient/i.test(text)) {
    return 'Lo-Fi & Chill';
  }
  if (/electronic|hyperpop|edm|dance|house|synth|sophie|vyzee/i.test(text)) {
    return 'Electronic';
  }
  if (/pop|the weeknd|billie|taylor/i.test(text)) {
    return 'Pop';
  }
  if (track?.artist) return track.artist;
  return 'Popular';
}

// One-time legacy store migration from 'eternal-music-hub-v4'
if (typeof window !== 'undefined') {
  try {
    const legacyRaw = localStorage.getItem('eternal-music-hub-v4');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      const state = parsed.state || parsed;
      const currentUserId = getActiveUserId();
      if (currentUserId && state) {
        const globals = loadGlobalPlaylists();
        if (Array.isArray(state.customPlaylists)) {
          state.customPlaylists.forEach((pl: MusicPlaylist) => {
            globals[pl.id] = pl;
          });
          localStorage.setItem(GLOBAL_PLAYLISTS_KEY, JSON.stringify(globals));
        }
        if (Array.isArray(state.playlistInvites)) {
          saveGlobalInvites(state.playlistInvites);
        }
        saveUserLibrary(currentUserId, {
          likedTracks: Array.isArray(state.likedTracks) ? state.likedTracks : [],
          userPlaylistIds: Array.isArray(state.customPlaylists)
            ? state.customPlaylists.map((p: MusicPlaylist) => p.id)
            : [],
          savedPlaylistIds: Array.isArray(state.savedPlaylistIds) ? state.savedPlaylistIds : [],
          pinnedItemIds: Array.isArray(state.pinnedItemIds) ? state.pinnedItemIds : [],
          musicFolders: Array.isArray(state.musicFolders) ? state.musicFolders : [],
          recentlyPlayed: Array.isArray(state.recentlyPlayed) ? state.recentlyPlayed : [],
          lastActiveGenre: state.lastActiveGenre || undefined,
          lastActiveSeed: state.lastActiveSeed || undefined,
        });
      }
      localStorage.removeItem('eternal-music-hub-v4');
    }
  } catch {}
}

// Real Liked Tracks start empty - only tracks the user likes appear here
export const STARTER_LIKED_TRACKS: SpotifyTrack[] = [];

// Aliases to seamlessly resolve legacy slugs to Spotify 22-character IDs
export const PLAYLIST_ALIASES: Record<string, string> = {
  'mr-popular': '6jdVMq0SyG45lT3526KWSL',
  'fruktoviy-1': '37i9dQZF1DX0XUsuxWHRQd',
  'larping-1': '37i9dQZF1DX4eRPd9frC1m',
  'larping-jet': '37i9dQZF1DWXRqgorJj26U',
  'larp-songs': '37i9dQZF1DX1lVhptIYRda',
  'vyzee-up-up-slowed': '37i9dQZF1DXdbXrPNafg9d',
  'rock-classics': '6jdVMq0SyG45lT3526KWSL',
};

// Real Curated Catalog Playlists with streamable SoundCloud tracks & real artwork (22-char Spotify IDs)
export const CATALOG_PLAYLISTS: MusicPlaylist[] = [
  {
    id: '6jdVMq0SyG45lT3526KWSL',
    title: 'mr popular',
    description: 'predayed classic collection and high-octane vibes',
    coverUrl: 'https://i1.sndcdn.com/artworks-BD5byda0O2zneRrU-iTpQAA-t500x500.png',
    creator: 'predayed',
    creatorUsername: 'predayed',
    creatorAvatar: 'https://i1.sndcdn.com/avatars-osunQeCQOvvT0aci-9cHMkA-t500x500.jpg',
    createdAt: '2026-09-09',
    tracks: [
      {
        id: 'sc-1528516891',
        title:
          'Popular (From The Idol Vol. 1 (Music from the HBO Original Series)) [feat. Playboi Carti]',
        artist: 'The Weeknd',
        albumArt: 'https://i1.sndcdn.com/artworks-GdVBk2V7lCpU-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/theweeknd/the-weeknd-playboi-carti-1',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1528516891',
        artistAvatar: 'https://i1.sndcdn.com/avatars-hlvKdkpTrNN7RIgm-Pkvv0g-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1528525069',
        title: 'Popular - The Weeknd, Playboi Carti, Madonna (slowed)',
        artist: 'vampirefreakk_',
        albumArt: 'https://i1.sndcdn.com/artworks-OGjvIjVYN3vy7qcx-LFbw0A-t500x500.jpg',
        durationMs: 226943,
        previewUrl: null,
        spotifyUrl:
          'https://soundcloud.com/lee-56068254/popular-the-weeknd-playboi-carti-madonna-slowed',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1528525069',
        artistAvatar: 'https://i1.sndcdn.com/avatars-osunQeCQOvvT0aci-9cHMkA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2195706963',
        title: 'mr popular (NOW ON ALL PLATS)',
        artist: 'predayed',
        albumArt: 'https://i1.sndcdn.com/artworks-BD5byda0O2zneRrU-iTpQAA-t500x500.png',
        durationMs: 92070,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/predayed/mrpopularfr',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2195706963',
        artistAvatar: 'https://i1.sndcdn.com/avatars-ySwanaOytApTPx6C-N5yPrw-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2243161817',
        title: 'mr 2 popular (OUT ALL PLATS)',
        artist: 'predayed',
        albumArt: 'https://i1.sndcdn.com/artworks-F0g3yYMrcExTPziz-nDGOCw-t500x500.png',
        durationMs: 90517,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/predayed/mrpopular2',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2243161817',
        artistAvatar: 'https://i1.sndcdn.com/avatars-ySwanaOytApTPx6C-N5yPrw-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-317594712',
        title: 'Magnolia',
        artist: 'playboicarti',
        albumArt: 'https://i1.sndcdn.com/artworks-000217724759-2g2j7z-t500x500.jpg',
        durationMs: 181858,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/playboicarti/magnolia-1',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/317594712',
        artistAvatar: 'https://i1.sndcdn.com/avatars-zJpnCcnVmgrQrEJD-ei2XdA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-844910608',
        title: 'Playboi Carti - Magnolia Slowed Reverb',
        artist: 'jimihepp12',
        albumArt: 'https://i1.sndcdn.com/artworks-H3UaxWZWXmINHYZ1-29B9mw-t500x500.jpg',
        durationMs: 211557,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/jimihepp12/playboi-carti-magnolia-slowed-reverb',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/844910608',
        artistAvatar: 'https://i1.sndcdn.com/avatars-BBUMnyBSuqs3r6li-tnkNfg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1356822547',
        title: 'POLAND - LIL YACHTY(PROD. F1LTHY)',
        artist: 'Lil Yachty, RD, Lil Boat',
        albumArt: 'https://i1.sndcdn.com/artworks-t37DmDkWzjSlzDzK-p6sjMg-t500x500.jpg',
        durationMs: 83302,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/770rd/poland-lil-yachtyprod-f1lthy',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1356822547',
        artistAvatar: 'https://i1.sndcdn.com/avatars-vl9cIfV0spqknYB9-3tqkSg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1473527491',
        title: 'Molodoy Kaluga - Borya (Lil Yachty - Poland remix)',
        artist: 'Kaluzheyro',
        albumArt: 'https://i1.sndcdn.com/artworks-p188vIOaUWzgr8h4-z4C3YQ-t500x500.jpg',
        durationMs: 102423,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/gruppabryzgi/molodoj-kaluga-borya-lil',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1473527491',
        artistAvatar: 'https://i1.sndcdn.com/avatars-z6rtj2wqPkm0kF7q-xJPLYA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-73081887',
        title: 'Love Sosa',
        artist: 'ChiefKeef',
        albumArt: 'https://i1.sndcdn.com/artworks-000039963889-fwtyui-t500x500.jpg',
        durationMs: 204193,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/chiefkeef/love-sosa1',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/73081887',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000335353511-4v62xu-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-271225763',
        title: 'Love Sosa',
        artist: 'ChiefKeef',
        albumArt: 'https://i1.sndcdn.com/artworks-eqcqmo5hoDf7-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/chiefkeef/love-sosa-2',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/271225763',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000335353511-4v62xu-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1061669701',
        title: 'Drunk And Nasty (feat. Sharc)',
        artist: "Pi'erre Bourne",
        albumArt: 'https://i1.sndcdn.com/artworks-R2LfOOCuFPCm-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/pierrebourne/drunk-and-nasty-feat-sharc',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1061669701',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000273739176-9qz0ah-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-786918034',
        title: "Chavo - MICHIGAN (Prod. Pi'erre Bourne)",
        artist: 'CHAVO',
        albumArt: 'https://i1.sndcdn.com/artworks-z5C1Vhy8lJGjg2Je-AQFOIg-t500x500.jpg',
        durationMs: 149492,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/uptownchavo/michigan',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/786918034',
        artistAvatar: 'https://i1.sndcdn.com/avatars-F0A0gneCEysslaI0-ubPdwQ-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
    ],
  },
  {
    id: '37i9dQZF1DX0XUsuxWHRQd',
    title: 'FRUITY 1.0',
    description: 'Fresh vibe, light beats and bright summer memories.',
    coverUrl: 'https://i1.sndcdn.com/artworks-WFXqb7UTHPKOToHg-YIwKIQ-t500x500.jpg',
    creator: 'Dragon',
    creatorUsername: 'dragonchik',
    creatorAvatar: 'https://i1.sndcdn.com/artworks-WFXqb7UTHPKOToHg-YIwKIQ-t500x500.jpg',
    createdAt: '2026-09-06',
    tracks: [
      {
        id: 'sc-2353145726',
        title: 'FRUITY 2.0',
        artist: 'ELEVEN EIGHT',
        albumArt: 'https://i1.sndcdn.com/artworks-7psyTWbyQeGPy3HG-OAykGg-t500x500.jpg',
        durationMs: 126046,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/118811118/fruktovyj-2-0',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2353145726',
        artistAvatar: 'https://i1.sndcdn.com/avatars-26NygWXuhDcFeH4M-tQMF1Q-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2350711880',
        title: 'FRUITY 1.0',
        artist: 'ELEVEN EIGHT',
        albumArt: 'https://i1.sndcdn.com/artworks-WFXqb7UTHPKOToHg-YIwKIQ-t500x500.jpg',
        durationMs: 88105,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/118811118/fruktovyj-1-0',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2350711880',
        artistAvatar: 'https://i1.sndcdn.com/avatars-26NygWXuhDcFeH4M-tQMF1Q-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2351360759',
        title: 'ELEVEN EIGHT – FRUITY 1.0',
        artist: 'pei goron',
        albumArt: 'https://i1.sndcdn.com/artworks-xNcw2gkjWnfzyFOf-JWdPxQ-t500x500.jpg',
        durationMs: 88105,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/user-52103069/eleven-ejt-fruktovyj-1-0',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2351360759',
        artistAvatar: 'https://i1.sndcdn.com/avatars-n6NVWvzs8XzWWTEG-fcHqsw-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1030355119',
        title: 'Gimme The Loot',
        artist: 'Big Baby Tape',
        albumArt: 'https://i1.sndcdn.com/artworks-hoTg8gsNpXjYVtcB-Be8JhQ-t500x500.jpg',
        durationMs: 132694,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/tapeboss/gimme-loot',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1030355119',
        artistAvatar: 'https://i1.sndcdn.com/avatars-yh8EOsSO2EJHC74W-zt69qg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-572259732',
        title: 'Big Baby Tape - Gimme The Loot (Remix)',
        artist: 'Denis Earshot',
        albumArt: 'https://i1.sndcdn.com/artworks-000485528679-978hlk-t500x500.jpg',
        durationMs: 133867,
        previewUrl: null,
        spotifyUrl:
          'https://soundcloud.com/denis-earshot/big-baby-tape-gimme-the-loot-ya-vzyal-tvoe-bu',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/572259732',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000577919922-9iw6pk-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2123144406',
        title: 'Deja Vu',
        artist: 'RESCENE',
        albumArt: 'https://i1.sndcdn.com/artworks-oR35vdzWgVNtYzVw-RzXHdw-t500x500.jpg',
        durationMs: 184043,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/rescene_official/deja-vu',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2123144406',
        artistAvatar: 'https://i1.sndcdn.com/avatars-xs1jSjIlbD5Jeydu-FBZXPQ-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-296743155',
        title: 'Deja Vu',
        artist: 'J. Cole',
        albumArt: 'https://i1.sndcdn.com/artworks-74vQe2f01lfB-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/j-cole/deja-vu-1',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/296743155',
        artistAvatar: 'https://i1.sndcdn.com/avatars-n4rXKVpzd04kCtce-mc32MA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2282720300',
        title: 'SQWOZ BAB — WOMANIZER',
        artist: 'New School',
        albumArt: 'https://i1.sndcdn.com/artworks-9UZx9fh1x8ypKUOg-PMRqFg-t500x500.png',
        durationMs: 149650,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/newschooool/sqwoz-bab-womanizer-4',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2282720300',
        artistAvatar: 'https://i1.sndcdn.com/avatars-47ap93i8nSrxl31o-SdQw4Q-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2236533047',
        title: 'SQWOZ BAB - KUPER',
        artist: 'New School',
        albumArt: 'https://i1.sndcdn.com/artworks-FgEyAaZWtBX2K9vB-nuAVHg-t500x500.png',
        durationMs: 103000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/newschooool/sqwoz-bab-kuper',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2236533047',
        artistAvatar: 'https://i1.sndcdn.com/avatars-47ap93i8nSrxl31o-SdQw4Q-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2038987001',
        title: 'SQWOZ BAB — TOKYO',
        artist: 'New School',
        albumArt: 'https://i1.sndcdn.com/artworks-27xCtTpD0MUImX50-ySsy5g-t500x500.png',
        durationMs: 157719,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/newschooool/sqwoz-bab-tokyo',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2038987001',
        artistAvatar: 'https://i1.sndcdn.com/avatars-47ap93i8nSrxl31o-SdQw4Q-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2339355563',
        title: 'PRIORA UBER BLACK (PROD. FUMIKO!)',
        artist: 'ELEVEN EIGHT',
        albumArt: 'https://i1.sndcdn.com/artworks-LeOhwXXqzmpU3pbb-zzeYyg-t500x500.jpg',
        durationMs: 120523,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/118811118/priora-uber-blek-prod-fumiko',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2339355563',
        artistAvatar: 'https://i1.sndcdn.com/avatars-26NygWXuhDcFeH4M-tQMF1Q-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2360119364',
        title: 'ELEVEN EIGHT - PRIORA UBER BLACK (Bass Boosted)',
        artist: 'drugbloodd',
        albumArt: 'https://i1.sndcdn.com/artworks-xXLTeEtgaO7Ix03l-MGRMgQ-t500x500.jpg',
        durationMs: 121280,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/drugbloood/eleven-ejt-priora-uber-blek',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2360119364',
        artistAvatar: 'https://i1.sndcdn.com/avatars-YQKmfEhHycYHxdIk-ZT8UJg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
    ],
  },
  {
    id: '37i9dQZF1DX4eRPd9frC1m',
    title: '💸 #1 Larping playlist 🥩',
    description: 'Pure adrenaline and drift vibes. The ultimate larp collection.',
    coverUrl: 'https://i1.sndcdn.com/artworks-G5I9N5ZeNrWDVX2D-OtWzZw-t500x500.png',
    creator: 'karnol',
    creatorUsername: 'karolina-208787240',
    creatorAvatar: 'https://i1.sndcdn.com/artworks-9fT88QsCBPzMJpz7-A9aMlQ-t500x500.jpg',
    createdAt: '2026-09-07',
    tracks: [
      {
        id: 'sc-1200564529',
        title: 'MURDER IN MY MIND',
        artist: 'KORDHELL',
        albumArt: 'https://i1.sndcdn.com/artworks-24UT7UzWHbeNAya7-4R911Q-t500x500.jpg',
        durationMs: 145046,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/kordhell/murder-in-my-mind',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1200564529',
        artistAvatar: 'https://i1.sndcdn.com/avatars-IwkAewk5iACtjj7t-mjkT9g-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1200563992',
        title: 'MURDER IN MY MIND (Slowed & Reverb)',
        artist: 'KORDHELL',
        albumArt: 'https://i1.sndcdn.com/artworks-24UT7UzWHbeNAya7-4R911Q-t500x500.jpg',
        durationMs: 178046,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/kordhell/murder-in-my-mind-sowed-reverb',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1200563992',
        artistAvatar: 'https://i1.sndcdn.com/avatars-IwkAewk5iACtjj7t-mjkT9g-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-977665876',
        title: 'Close Eyes',
        artist: 'DVRST',
        albumArt: 'https://i1.sndcdn.com/artworks-PGOhLJywxoxv3dDz-GcLxlg-t500x500.jpg',
        durationMs: 132382,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/dvrstmusic/close-eyes',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/977665876',
        artistAvatar: 'https://i1.sndcdn.com/avatars-91G3KMdmclZj1XN2-blvgeQ-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1067581129',
        title: 'dvrst - close eyes (slowed + reverb)|buy=spotify',
        artist: 'slowedmusicvibe.',
        albumArt: 'https://i1.sndcdn.com/artworks-bNwQLDELnkrhBLSF-RcM5HQ-t500x500.jpg',
        durationMs: 143119,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/slowedmusicvibe/dvrst-close-eyes-slowed-reverb',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1067581129',
        artistAvatar: 'https://i1.sndcdn.com/avatars-yxeb6SaleHXg8Hbi-1Xixrg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1161656437',
        title: 'COWBELL WARRIOR! (Prod. SXMPRA)',
        artist: 'SXMPRA',
        albumArt: 'https://i1.sndcdn.com/artworks-zouz25kVtvi20mjP-uyAKkQ-t500x500.jpg',
        durationMs: 149507,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/sxmpra/cowbell-warrior-prod-sxmpra',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1161656437',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000698942995-wsudj4-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1386099787',
        title: 'COWBELL WARRIOR!',
        artist: 'SXMPRA',
        albumArt: 'https://i1.sndcdn.com/artworks-0DUkppnDPp4g-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/sxmpra/cowbell-warrior',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1386099787',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000698942995-wsudj4-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1242511540',
        title: 'Why Not',
        artist: 'GHOSTFACE PLAYA',
        albumArt: 'https://i1.sndcdn.com/artworks-Y161y4z1DNLMDqBp-bU2QPQ-t500x500.jpg',
        durationMs: 165046,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/ghostfaceplaya/why-not',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1242511540',
        artistAvatar: 'https://i1.sndcdn.com/avatars-psW2kXRpuWONuViI-Y0DWPA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1255460602',
        title: 'Ghostface Playa - Why Not (slowed + reverb)',
        artist: 'Crack',
        albumArt: 'https://i1.sndcdn.com/artworks-P1g88OtnEXAnpKth-MRcbFg-t500x500.jpg',
        durationMs: 206831,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/8ballong/ghostface-playa-why-not-slowed',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1255460602',
        artistAvatar: 'https://i1.sndcdn.com/avatars-nTmnklzlWCOLU0Cf-REXcow-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1246319776',
        title: 'OVERDO$E',
        artist: 'PHARMACIST',
        albumArt: 'https://i1.sndcdn.com/artworks-e8HHkLpGsz8dXe1n-Un247Q-t500x500.jpg',
        durationMs: 181650,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/pharmasix/overdoe',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1246319776',
        artistAvatar: 'https://i1.sndcdn.com/avatars-GsDse7RdDGzTeyhd-4nVWRg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1427976136',
        title: 'OVERDO$E 2 - RELAP$E',
        artist: 'PHARMACIST',
        albumArt: 'https://i1.sndcdn.com/artworks-iDBBsQLou3EYIgoM-3GIgPw-t500x500.jpg',
        durationMs: 183790,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/pharmasix/overdoe-2-relape',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1427976136',
        artistAvatar: 'https://i1.sndcdn.com/avatars-GsDse7RdDGzTeyhd-4nVWRg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2358806243',
        title: 'The Larping Tombstone - Larping the Rooms',
        artist: 'karnol',
        albumArt: 'https://i1.sndcdn.com/artworks-9fT88QsCBPzMJpz7-A9aMlQ-t500x500.jpg',
        durationMs: 150488,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/karolina-208787240/the-larping-tombstone-larping',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2358806243',
        artistAvatar: 'https://i1.sndcdn.com/avatars-a9wCuA8a2HYGzyRn-331atw-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
    ],
  },
  {
    id: '37i9dQZF1DWXRqgorJj26U',
    title: 'Larping playlist',
    description: 'Night drives, larping culture, and heavy bass.',
    coverUrl: 'https://i1.sndcdn.com/artworks-G5I9N5ZeNrWDVX2D-OtWzZw-t500x500.png',
    creator: 'karnol',
    creatorUsername: 'karolina-208787240',
    creatorAvatar: 'https://i1.sndcdn.com/artworks-9fT88QsCBPzMJpz7-A9aMlQ-t500x500.jpg',
    createdAt: '2026-09-04',
    tracks: [
      {
        id: 'sc-2358806243',
        title: 'The Larping Tombstone - Larping the Rooms',
        artist: 'karnol',
        albumArt: 'https://i1.sndcdn.com/artworks-9fT88QsCBPzMJpz7-A9aMlQ-t500x500.jpg',
        durationMs: 150488,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/karolina-208787240/the-larping-tombstone-larping',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2358806243',
        artistAvatar: 'https://i1.sndcdn.com/avatars-a9wCuA8a2HYGzyRn-331atw-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1427976136',
        title: 'OVERDO$E 2 - RELAP$E',
        artist: 'PHARMACIST',
        albumArt: 'https://i1.sndcdn.com/artworks-iDBBsQLou3EYIgoM-3GIgPw-t500x500.jpg',
        durationMs: 183790,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/pharmasix/overdoe-2-relape',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1427976136',
        artistAvatar: 'https://i1.sndcdn.com/avatars-GsDse7RdDGzTeyhd-4nVWRg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1246319776',
        title: 'OVERDO$E',
        artist: 'PHARMACIST',
        albumArt: 'https://i1.sndcdn.com/artworks-e8HHkLpGsz8dXe1n-Un247Q-t500x500.jpg',
        durationMs: 181650,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/pharmasix/overdoe',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1246319776',
        artistAvatar: 'https://i1.sndcdn.com/avatars-GsDse7RdDGzTeyhd-4nVWRg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1255460602',
        title: 'Ghostface Playa - Why Not (slowed + reverb)',
        artist: 'Crack',
        albumArt: 'https://i1.sndcdn.com/artworks-P1g88OtnEXAnpKth-MRcbFg-t500x500.jpg',
        durationMs: 206831,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/8ballong/ghostface-playa-why-not-slowed',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1255460602',
        artistAvatar: 'https://i1.sndcdn.com/avatars-nTmnklzlWCOLU0Cf-REXcow-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1242511540',
        title: 'Why Not',
        artist: 'GHOSTFACE PLAYA',
        albumArt: 'https://i1.sndcdn.com/artworks-Y161y4z1DNLMDqBp-bU2QPQ-t500x500.jpg',
        durationMs: 165046,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/ghostfaceplaya/why-not',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1242511540',
        artistAvatar: 'https://i1.sndcdn.com/avatars-psW2kXRpuWONuViI-Y0DWPA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1386099787',
        title: 'COWBELL WARRIOR!',
        artist: 'SXMPRA',
        albumArt: 'https://i1.sndcdn.com/artworks-0DUkppnDPp4g-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/sxmpra/cowbell-warrior',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1386099787',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000698942995-wsudj4-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1161656437',
        title: 'COWBELL WARRIOR! (Prod. SXMPRA)',
        artist: 'SXMPRA',
        albumArt: 'https://i1.sndcdn.com/artworks-zouz25kVtvi20mjP-uyAKkQ-t500x500.jpg',
        durationMs: 149507,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/sxmpra/cowbell-warrior-prod-sxmpra',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1161656437',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000698942995-wsudj4-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1067581129',
        title: 'dvrst - close eyes (slowed + reverb)|buy=spotify',
        artist: 'slowedmusicvibe.',
        albumArt: 'https://i1.sndcdn.com/artworks-bNwQLDELnkrhBLSF-RcM5HQ-t500x500.jpg',
        durationMs: 143119,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/slowedmusicvibe/dvrst-close-eyes-slowed-reverb',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1067581129',
        artistAvatar: 'https://i1.sndcdn.com/avatars-yxeb6SaleHXg8Hbi-1Xixrg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-977665876',
        title: 'Close Eyes',
        artist: 'DVRST',
        albumArt: 'https://i1.sndcdn.com/artworks-PGOhLJywxoxv3dDz-GcLxlg-t500x500.jpg',
        durationMs: 132382,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/dvrstmusic/close-eyes',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/977665876',
        artistAvatar: 'https://i1.sndcdn.com/avatars-91G3KMdmclZj1XN2-blvgeQ-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1200563992',
        title: 'MURDER IN MY MIND (Slowed & Reverb)',
        artist: 'KORDHELL',
        albumArt: 'https://i1.sndcdn.com/artworks-24UT7UzWHbeNAya7-4R911Q-t500x500.jpg',
        durationMs: 178046,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/kordhell/murder-in-my-mind-sowed-reverb',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1200563992',
        artistAvatar: 'https://i1.sndcdn.com/avatars-IwkAewk5iACtjj7t-mjkT9g-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1200564529',
        title: 'MURDER IN MY MIND',
        artist: 'KORDHELL',
        albumArt: 'https://i1.sndcdn.com/artworks-24UT7UzWHbeNAya7-4R911Q-t500x500.jpg',
        durationMs: 145046,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/kordhell/murder-in-my-mind',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1200564529',
        artistAvatar: 'https://i1.sndcdn.com/avatars-IwkAewk5iACtjj7t-mjkT9g-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
    ],
  },
  {
    id: '37i9dQZF1DX1lVhptIYRda',
    title: 'Larp Songs',
    description: 'High-energy collection of modern internet hits.',
    coverUrl: 'https://i1.sndcdn.com/artworks-9fT88QsCBPzMJpz7-A9aMlQ-t500x500.jpg',
    creator: 'karnol',
    creatorUsername: 'karolina-208787240',
    creatorAvatar: 'https://i1.sndcdn.com/artworks-9fT88QsCBPzMJpz7-A9aMlQ-t500x500.jpg',
    createdAt: '2026-09-03',
    tracks: [
      {
        id: 'sc-1356822547',
        title: 'POLAND - LIL YACHTY(PROD. F1LTHY)',
        artist: 'Lil Yachty, RD, Lil Boat',
        albumArt: 'https://i1.sndcdn.com/artworks-t37DmDkWzjSlzDzK-p6sjMg-t500x500.jpg',
        durationMs: 83302,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/770rd/poland-lil-yachtyprod-f1lthy',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1356822547',
        artistAvatar: 'https://i1.sndcdn.com/avatars-vl9cIfV0spqknYB9-3tqkSg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1473527491',
        title: 'Molodoy Kaluga - Borya (Lil Yachty - Poland remix)',
        artist: 'Kaluzheyro',
        albumArt: 'https://i1.sndcdn.com/artworks-p188vIOaUWzgr8h4-z4C3YQ-t500x500.jpg',
        durationMs: 102423,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/gruppabryzgi/molodoj-kaluga-borya-lil',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1473527491',
        artistAvatar: 'https://i1.sndcdn.com/avatars-z6rtj2wqPkm0kF7q-xJPLYA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2255958509',
        title: 'SWAG LIKE ITS 2014',
        artist: '𝑺𝑲𝑼𝑳𝑳𝑭𝑨𝑪𝑬',
        albumArt: 'https://i1.sndcdn.com/artworks-6y9ifEQ5iCgCxZ9S-kMOZXQ-t500x500.png',
        durationMs: 104299,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/nodum-bad/swag-like-its-2014',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2255958509',
        artistAvatar: 'https://i1.sndcdn.com/avatars-E37k4C8vHxN4Oz8k-p8QkqA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2300356001',
        title: 'SWAG LIKE ITS 2014 FEAT.CHXKY X $UPRATY$ PROD.GBMANICARMY',
        artist: '𝑺𝑲𝑼𝑳𝑳𝑭𝑨𝑪𝑬',
        albumArt: 'https://i1.sndcdn.com/artworks-D8JO8K4AX004u5O0-4Q3fIQ-t500x500.jpg',
        durationMs: 350551,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/nodum-bad/swag-like-its-2014-feat-chxky',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2300356001',
        artistAvatar: 'https://i1.sndcdn.com/avatars-E37k4C8vHxN4Oz8k-p8QkqA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2394855294',
        title: 'Fear Of Missing Out (FOMO)',
        artist: 'SK',
        albumArt: 'https://i1.sndcdn.com/artworks-VCjVIz6sNiF3TKSS-fYWE5Q-t500x500.jpg',
        durationMs: 181672,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/s6kier/fear-of-missing-out-fomo',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2394855294',
        artistAvatar: 'https://a1.sndcdn.com/images/default_avatar_large.png',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2156624187',
        title: 'fear of missing out (ss3bby olswel)',
        artist: 'chaos2x',
        albumArt: 'https://i1.sndcdn.com/artworks-TxoblKa56KW2dnGZ-KY8GRA-t500x500.jpg',
        durationMs: 91458,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/chaos2x/fear-of-missing-out-ss3bby',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2156624187',
        artistAvatar: 'https://i1.sndcdn.com/avatars-By1zfcPSESsv1msh-qHuiyQ-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2157170529',
        title: 'BUCKSHOT & FAKEMINK - FEVER (PROD. OSCAR18 + GRIMOIRE)',
        artist: 'BUCKSHOT',
        albumArt: 'https://i1.sndcdn.com/artworks-p7TjGkxivzrv6Tz7-IX16GQ-t500x500.png',
        durationMs: 144568,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/buckshottt/buckshot-fakemink-fever',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2157170529',
        artistAvatar: 'https://i1.sndcdn.com/avatars-V4qnfaYI6evltUC1-cRJoDw-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2168889330',
        title: 'Buckshot x Fakemink - Fever (Slowed/Reverb)',
        artist: 'Pauly',
        albumArt: 'https://i1.sndcdn.com/artworks-ZSMa0ZN3WYI5lyZn-ge6pJA-t500x500.jpg',
        durationMs: 170945,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/paulythemenace/buckshot-x-fakemink-fever-slowedreverb',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2168889330',
        artistAvatar: 'https://i1.sndcdn.com/avatars-L3yyAdz7CY44oYhM-quiMyA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2287550495',
        title: 'LEGACY (slowed down)',
        artist: 'PIXY',
        albumArt: 'https://i1.sndcdn.com/artworks-N9VYQyhsNW9xQvxn-7VZ6Og-t500x500.png',
        durationMs: 161811,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/pixychu/legacy-slowed',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2287550495',
        artistAvatar: 'https://i1.sndcdn.com/avatars-UF7vrgZSrsjeyM71-9yvelA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2285328146',
        title: 'LEGACY',
        artist: 'PIXY',
        albumArt: 'https://i1.sndcdn.com/artworks-fgooaE4nM7ZG1pJG-w4X7fw-t500x500.png',
        durationMs: 134164,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/pixychu/legacy-2',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2285328146',
        artistAvatar: 'https://i1.sndcdn.com/avatars-UF7vrgZSrsjeyM71-9yvelA-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2358806243',
        title: 'The Larping Tombstone - Larping the Rooms',
        artist: 'karnol',
        albumArt: 'https://i1.sndcdn.com/artworks-9fT88QsCBPzMJpz7-A9aMlQ-t500x500.jpg',
        durationMs: 150488,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/karolina-208787240/the-larping-tombstone-larping',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2358806243',
        artistAvatar: 'https://i1.sndcdn.com/avatars-a9wCuA8a2HYGzyRn-331atw-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
    ],
  },
  {
    id: '37i9dQZF1DXdbXrPNafg9d',
    title: 'VYZEE - Up, Up, Up - Slowed',
    description: 'Atmospheric hyperpop and deep spatial textures.',
    coverUrl: 'https://i1.sndcdn.com/artworks-000137229328-zszzq3-t500x500.jpg',
    creator: 'Omar',
    creatorUsername: 'omar',
    creatorAvatar: 'https://i1.sndcdn.com/artworks-000137229328-zszzq3-t500x500.jpg',
    createdAt: '2026-09-01',
    tracks: [
      {
        id: 'sc-234530246',
        title: 'VYZEE',
        artist: 'SOPHIE',
        albumArt: 'https://i1.sndcdn.com/artworks-000137229328-zszzq3-t500x500.jpg',
        durationMs: 202577,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/msmsmsm/sophie-vyzee',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/234530246',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000458300934-j263b0-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2261390708',
        title: 'Just Staring / SOPHIE - VYZEE',
        artist: 'nn',
        albumArt: 'https://i1.sndcdn.com/artworks-Rowr0mycvLGCT8Z3-6cGRcQ-t500x500.png',
        durationMs: 197834,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/foidslayer333larp/just-staring-sophie-vyzee',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2261390708',
        artistAvatar: 'https://i1.sndcdn.com/avatars-J1c4QXnz3uUVvtdx-cbeUVw-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1473633886',
        title: 'SOPHIE - VYZEE [MELODIC PART EXTENTED EDIT] [FREE DL]',
        artist: 'friganya',
        albumArt: 'https://i1.sndcdn.com/artworks-XpWMuTjGhkHBSwyI-Y4RJkg-t500x500.jpg',
        durationMs: 197767,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/friganya/sophie-vyzee-melodic-part-extented-edit',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1473633886',
        artistAvatar: 'https://i1.sndcdn.com/avatars-braWYUkETbG4Pl37-8bznFg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1753913496',
        title: 'Von dutch',
        artist: 'charlixcx',
        albumArt: 'https://i1.sndcdn.com/artworks-oT3dCh48p5kA-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/charlixcx/von-dutch',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1753913496',
        artistAvatar: 'https://i1.sndcdn.com/avatars-lTPCFIvezuMPzClN-S17C5g-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1932317141',
        title: 'Von dutch a. g. cook remix featuring addison rae',
        artist: 'charlixcx',
        albumArt: 'https://i1.sndcdn.com/artworks-FPv84F58bFTS-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/charlixcx/von-dutch-a-g-cook-remix',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1932317141',
        artistAvatar: 'https://i1.sndcdn.com/avatars-lTPCFIvezuMPzClN-S17C5g-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-458500734',
        title: 'Immaterial',
        artist: 'SOPHIE',
        albumArt: 'https://i1.sndcdn.com/artworks-000360857988-dv3j41-t500x500.jpg',
        durationMs: 232928,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/msmsmsm/immaterial',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/458500734',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000458300934-j263b0-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1825196118',
        title: 'SOPHIE - DRY',
        artist: 'Immaterial',
        albumArt: 'https://i1.sndcdn.com/artworks-nnYyXban1rF509Li-KH24Mg-t500x500.jpg',
        durationMs: 210123,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/benjamin-andres-salgado-fuentes/sophie-dry',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1825196118',
        artistAvatar: 'https://i1.sndcdn.com/avatars-42VzMP9yGtL1UcNk-2U6iNg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1932317141',
        title: 'Von dutch a. g. cook remix featuring addison rae',
        artist: 'charlixcx',
        albumArt: 'https://i1.sndcdn.com/artworks-FPv84F58bFTS-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/charlixcx/von-dutch-a-g-cook-remix',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1932317141',
        artistAvatar: 'https://i1.sndcdn.com/avatars-lTPCFIvezuMPzClN-S17C5g-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1732610658',
        title: 'Britpop',
        artist: 'A. G. Cook',
        albumArt: 'https://i1.sndcdn.com/artworks-I7lDNKvvMQrq-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/agcook/a-g-cook-britpop',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1732610658',
        artistAvatar: 'https://i1.sndcdn.com/avatars-000238886924-9hggyy-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-2393207469',
        title: "IT'S ME, IT'S VERITY HYPERPOP (SLOWED)",
        artist: 'TRXSHY',
        albumArt: 'https://i1.sndcdn.com/artworks-lcYllBlTitGZ-0-t500x500.jpg',
        durationMs: 30000,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/trxshy-music/its-me-its-verity-hyperpop-3',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/2393207469',
        artistAvatar: 'https://a1.sndcdn.com/images/default_avatar_large.png',
        releaseDate: '2024-01-01',
      },
      {
        id: 'sc-1471264162',
        title: 'ElyOtto - Sugar Crash (Instrumental) (Slowed  Reverb) (SugarCrash!)',
        artist: '4437',
        albumArt: 'https://i1.sndcdn.com/avatars-XXJaYWfTCu2uTrMD-A0Lpzg-t500x500.jpg',
        durationMs: 171247,
        previewUrl: null,
        spotifyUrl: 'https://soundcloud.com/user-783689179/elyotto-sugar-crash',
        source: 'soundcloud',
        streamUrl: '/api/integrations/soundcloud/stream/1471264162',
        artistAvatar: 'https://i1.sndcdn.com/avatars-XXJaYWfTCu2uTrMD-A0Lpzg-t500x500.jpg',
        releaseDate: '2024-01-01',
      },
    ],
  },
];

export const STARTER_RECOMMENDED_TRACKS: SpotifyTrack[] = [
  {
    id: 'sc-1356822547',
    title: 'POLAND - LIL YACHTY(PROD. F1LTHY)',
    artist: 'Lil Yachty, RD, Lil Boat',
    albumArt: 'https://i1.sndcdn.com/artworks-t37DmDkWzjSlzDzK-p6sjMg-t500x500.jpg',
    durationMs: 83000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com/lilyachty/poland',
    source: 'soundcloud',
    streamUrl: '/api/integrations/soundcloud/stream/1356822547',
    releaseDate: '2022-10-11',
  },
  {
    id: 'sc-2255958509',
    title: 'SWAG LIKE ITS 2014',
    artist: '𝑺𝑲𝑼𝑳𝑭𝑨𝑪𝑬',
    albumArt: 'https://i1.sndcdn.com/artworks-6y9ifEQ5iCgCxZ9S-kMOZXQ-t500x500.png',
    durationMs: 112000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com',
    source: 'soundcloud',
    streamUrl: '/api/integrations/soundcloud/stream/2255958509',
    releaseDate: '2024-02-14',
  },
  {
    id: 'sc-2394855294',
    title: 'Fear Of Missing Out (FOMO)',
    artist: 'SK',
    albumArt: 'https://i1.sndcdn.com/artworks-VCjVIz6sNiF3TKSS-fYWE5Q-t500x500.jpg',
    durationMs: 145000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com',
    source: 'soundcloud',
    streamUrl: '/api/integrations/soundcloud/stream/2394855294',
    releaseDate: '2024-05-20',
  },
  {
    id: 'sc-2157170529',
    title: 'BUCKSHOT & FAKEMINK - FEVER (PROD. OSCAR18 + GRIMOIRE)',
    artist: 'BUCKSHOT',
    albumArt: 'https://i1.sndcdn.com/artworks-p7TjGkxivzrv6Tz7-IX16GQ-t500x500.png',
    durationMs: 138000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com',
    source: 'soundcloud',
    streamUrl: '/api/integrations/soundcloud/stream/2157170529',
    releaseDate: '2023-11-10',
  },
  {
    id: 'sc-2287550495',
    title: 'LEGACY (slowed down)',
    artist: 'PIXY',
    albumArt: 'https://i1.sndcdn.com/artworks-N9VYQyhsNW9xQvxn-7VZ6Og-t500x500.png',
    durationMs: 162000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com',
    source: 'soundcloud',
    streamUrl: '/api/integrations/soundcloud/stream/2287550495',
    releaseDate: '2024-03-01',
  },
  {
    id: 'sc-1528525069',
    title: 'Popular - The Weeknd, Playboi Carti, Madonna (slowed)',
    artist: 'vampirefreakk_',
    albumArt: 'https://i1.sndcdn.com/artworks-OGjvIjVYN3vy7qcx-LFbw0A-t500x500.jpg',
    durationMs: 226943,
    previewUrl: null,
    spotifyUrl:
      'https://soundcloud.com/lee-56068254/popular-the-weeknd-playboi-carti-madonna-slowed',
    source: 'soundcloud',
    streamUrl: '/api/integrations/soundcloud/stream/1528525069',
    releaseDate: '2023-06-02',
  },
];

const computeSavedPlaylists = (
  customPlaylists: MusicPlaylist[],
  savedPlaylistIds: string[],
): MusicPlaylist[] => {
  const savedCatalog = CATALOG_PLAYLISTS.filter((p) => savedPlaylistIds.includes(p.id));
  return [...customPlaylists, ...savedCatalog];
};

const resolveUserPlaylists = (
  userId: string | null,
  userLib: UserMusicLibraryData,
  globalPlaylists: Record<string, MusicPlaylist>,
): MusicPlaylist[] => {
  const list: MusicPlaylist[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();

  // 1. Playlists created by this user
  for (const id of userLib.userPlaylistIds) {
    const pl = globalPlaylists[id];
    if (pl && !seenIds.has(pl.id)) {
      const normTitle = (pl.title || '').trim().toLowerCase();
      if (normTitle && seenTitles.has(normTitle)) {
        continue;
      }
      list.push(pl);
      seenIds.add(pl.id);
      if (normTitle) seenTitles.add(normTitle);
    }
  }

  // 2. Playlists where user is a collaborator
  if (userId) {
    for (const pl of Object.values(globalPlaylists)) {
      if (!seenIds.has(pl.id)) {
        const isCollab = pl.collaborators?.some((c) => c.id === userId);
        const isCreator = pl.creatorId === userId;
        if (isCollab || isCreator) {
          const normTitle = (pl.title || '').trim().toLowerCase();
          if (normTitle && seenTitles.has(normTitle)) {
            continue;
          }
          list.push(pl);
          seenIds.add(pl.id);
          if (normTitle) seenTitles.add(normTitle);
        }
      }
    }
  }

  return list;
};

interface MusicHubState {
  likedTracks: SpotifyTrack[];
  customPlaylists: MusicPlaylist[];
  savedPlaylistIds: string[];
  playlists: MusicPlaylist[];
  catalogPlaylists: MusicPlaylist[];
  musicFolders: MusicFolder[];
  playlistInvites: PlaylistInvite[];
  selectedPlaylistId: string | null;
  isLibraryExpanded: boolean;
  isLibraryFullWidth: boolean;
  libraryFilter: MusicLibraryFilter;
  librarySearchQuery: string;
  librarySort: MusicLibrarySort;
  libraryViewMode: MusicLibraryViewMode;
  isNowPlayingPanelOpen: boolean;
  cachedTracks: Record<string, SpotifyTrack>;
  recentlyPlayed: MusicRecentlyPlayedItem[];
  lastActiveGenre?: string;
  lastActiveSeed?: string;
  homeCategory: MusicHomeCategory;
  pinnedItemIds: string[];

  // Actions
  isItemPinned: (id: string) => boolean;
  togglePinItem: (id: string) => void;
  pinItem: (id: string) => void;
  unpinItem: (id: string) => void;
  setHomeCategory: (category: MusicHomeCategory) => void;
  recordRecentlyPlayed: (
    item: Omit<MusicRecentlyPlayedItem, 'playedAt'> & { playedAt?: number },
  ) => void;
  setRecommendationSeed: (genre?: string, seedQuery?: string) => void;
  toggleLikeTrack: (track: SpotifyTrack) => void;
  isTrackLiked: (trackId: string) => boolean;
  isPlaylistSaved: (playlistId: string) => boolean;
  toggleSavePlaylist: (playlistId: string) => void;
  addPlaylistToLibrary: (playlistId: string) => void;
  removePlaylistFromLibrary: (playlistId: string) => void;
  toggleLibraryFullWidth: () => void;
  setLibraryFullWidth: (full: boolean) => void;
  createPlaylist: (
    title?: string,
    description?: string,
    coverUrl?: string,
    creator?: string,
    creatorId?: string,
    isPrivate?: boolean,
    creatorUsername?: string,
    creatorAvatar?: string | null,
    folderId?: string | null,
  ) => MusicPlaylist;
  deletePlaylist: (id: string) => void;
  deletePlaylistPermanently: (playlistId: string) => void;
  leavePlaylistCollaboration: (playlistId: string, userId: string) => void;
  togglePlaylistPrivacy: (playlistId: string) => void;
  updatePlaylistDetails: (
    playlistId: string,
    updates: { title?: string; description?: string; coverUrl?: string; isPrivate?: boolean },
  ) => void;
  addTrackToPlaylist: (playlistId: string, track: SpotifyTrack) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  sendPlaylistInvite: (
    playlistId: string,
    invitee: { id: string; username: string; displayName?: string | null; avatar?: string | null },
    inviter: { id: string; username: string; displayName?: string | null; avatar?: string | null },
  ) => PlaylistInvite;
  respondToPlaylistInvite: (
    inviteId: string,
    accept: boolean,
    user?: { id: string; username: string; displayName?: string | null; avatar?: string | null },
  ) => void;
  getPendingInviteForUser: (
    playlistId: string,
    userId?: string,
    username?: string,
  ) => PlaylistInvite | undefined;
  getInvitesForUser: (userId?: string, username?: string) => PlaylistInvite[];
  setSelectedPlaylistId: (id: string | null) => void;
  setLibraryFilter: (filter: MusicLibraryFilter) => void;
  setLibrarySearchQuery: (query: string) => void;
  setLibrarySort: (sort: MusicLibrarySort) => void;
  setLibraryViewMode: (mode: MusicLibraryViewMode) => void;
  toggleLibraryExpanded: () => void;
  setLibraryExpanded: (expanded: boolean) => void;
  toggleNowPlayingPanel: () => void;
  setNowPlayingPanelOpen: (open: boolean) => void;
  cacheTrack: (track: SpotifyTrack) => void;
  getPlaylistById: (id: string) => MusicPlaylist | undefined;
  getTrackById: (id: string) => SpotifyTrack | undefined;
  createMusicFolder: (name?: string) => MusicFolder;
  renameMusicFolder: (id: string, newName: string) => void;
  deleteMusicFolder: (id: string) => void;
  movePlaylistToFolder: (folderId: string, playlistId: string) => void;
  removePlaylistFromFolder: (folderId: string, playlistId: string) => void;
  switchUserLibrary: (userId: string | null) => void;
  fetchUserLikedTracksFromBackend: (userId?: string | null) => Promise<void>;
  fetchUserFoldersFromBackend: (userId?: string | null) => Promise<void>;
  fetchUserPlaylistsFromBackend: (userId?: string | null) => Promise<void>;
  resetForLogout: () => void;
}

// Initial bootstrap from current user's library
const initialUserId = getActiveUserId();
const initialUserLib = loadUserLibrary(initialUserId);
const initialGlobalPlaylists = loadGlobalPlaylists();
const initialCustomPlaylists = resolveUserPlaylists(
  initialUserId,
  initialUserLib,
  initialGlobalPlaylists,
);
const initialSavedPlaylists = computeSavedPlaylists(
  initialCustomPlaylists,
  initialUserLib.savedPlaylistIds,
);
const initialInvites = loadGlobalInvites();

export const useMusicHubStore = create<MusicHubState>()((set, get) => ({
  likedTracks: initialUserLib.likedTracks,
  customPlaylists: initialCustomPlaylists,
  savedPlaylistIds: initialUserLib.savedPlaylistIds,
  playlists: initialSavedPlaylists,
  catalogPlaylists: CATALOG_PLAYLISTS,
  musicFolders: initialUserLib.musicFolders,
  playlistInvites: initialInvites,
  selectedPlaylistId: null,
  isLibraryExpanded: true,
  isLibraryFullWidth: false,
  libraryFilter: 'all',
  librarySearchQuery: '',
  librarySort: 'recent',
  libraryViewMode: 'list',
  setLibraryViewMode: (mode) => set({ libraryViewMode: mode }),
  isNowPlayingPanelOpen: true,
  cachedTracks: {},
  recentlyPlayed: initialUserLib.recentlyPlayed || [],
  lastActiveGenre: initialUserLib.lastActiveGenre,
  lastActiveSeed: initialUserLib.lastActiveSeed,
  homeCategory: 'all',
  setHomeCategory: (category) => set({ homeCategory: category }),
  pinnedItemIds: initialUserLib.pinnedItemIds || [],

  isItemPinned: (id) => get().pinnedItemIds.includes(id),

  togglePinItem: (id) => {
    const { pinnedItemIds } = get();
    const isPinned = pinnedItemIds.includes(id);
    const updated = isPinned ? pinnedItemIds.filter((item) => item !== id) : [id, ...pinnedItemIds];
    set({ pinnedItemIds: updated });
    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, { ...lib, pinnedItemIds: updated });
  },

  pinItem: (id) => {
    const { pinnedItemIds } = get();
    if (pinnedItemIds.includes(id)) return;
    const updated = [id, ...pinnedItemIds];
    set({ pinnedItemIds: updated });
    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, { ...lib, pinnedItemIds: updated });
  },

  unpinItem: (id) => {
    const { pinnedItemIds } = get();
    if (!pinnedItemIds.includes(id)) return;
    const updated = pinnedItemIds.filter((item) => item !== id);
    set({ pinnedItemIds: updated });
    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, { ...lib, pinnedItemIds: updated });
  },

  setRecommendationSeed: (genre, seedQuery) => {
    set((s) => ({
      lastActiveGenre: genre || s.lastActiveGenre,
      lastActiveSeed: seedQuery || s.lastActiveSeed,
    }));
    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, {
      ...lib,
      lastActiveGenre: genre || lib.lastActiveGenre,
      lastActiveSeed: seedQuery || lib.lastActiveSeed,
    });
  },

  recordRecentlyPlayed: (item) => {
    const { recentlyPlayed } = get();
    const playedAt = item.playedAt || Date.now();
    const newItem: MusicRecentlyPlayedItem = { ...item, playedAt };

    const filtered = recentlyPlayed.filter((i) => i.id !== item.id);
    const updated = [newItem, ...filtered].slice(0, 20);

    const genre = item.genre || (item.track ? detectGenre(item.track) : undefined);

    set((s) => ({
      recentlyPlayed: updated,
      lastActiveGenre: genre || s.lastActiveGenre,
      lastActiveSeed: item.title || s.lastActiveSeed,
    }));

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, {
      ...lib,
      recentlyPlayed: updated,
      lastActiveGenre: genre || lib.lastActiveGenre,
      lastActiveSeed: item.title || lib.lastActiveSeed,
    });
  },

  toggleLikeTrack: (track) => {
    const { likedTracks } = get();
    const exists = likedTracks.some((t) => t.id === track.id);
    let updated: SpotifyTrack[];
    const isNowLiked = !exists;

    if (exists) {
      updated = likedTracks.filter((t) => t.id !== track.id);
      if (typeof integrationsApi?.removeLikedTrack === 'function') {
        integrationsApi.removeLikedTrack(track.id).catch(() => {});
      }
    } else {
      const trackWithAddedAt: SpotifyTrack = {
        ...track,
        addedAt: track.addedAt || new Date().toISOString(),
      };
      updated = [trackWithAddedAt, ...likedTracks];
      if (typeof integrationsApi?.addLikedTrack === 'function') {
        integrationsApi.addLikedTrack(trackWithAddedAt).catch(() => {});
      }
    }

    set({ likedTracks: updated });
    musicEventBridge.emitLikeToggled(track, isNowLiked);

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, { ...lib, likedTracks: updated });
  },

  isTrackLiked: (trackId) => {
    return get().likedTracks.some((t) => t.id === trackId);
  },

  isPlaylistSaved: (playlistId) => {
    const { savedPlaylistIds, customPlaylists } = get();
    return (
      savedPlaylistIds.includes(playlistId) || customPlaylists.some((p) => p.id === playlistId)
    );
  },

  toggleSavePlaylist: (playlistId) => {
    const { savedPlaylistIds, customPlaylists } = get();
    const isSaved = savedPlaylistIds.includes(playlistId);
    let updatedSaved: string[];

    if (isSaved) {
      updatedSaved = savedPlaylistIds.filter((id) => id !== playlistId);
    } else {
      updatedSaved = [playlistId, ...savedPlaylistIds];
    }

    set({
      savedPlaylistIds: updatedSaved,
      playlists: computeSavedPlaylists(customPlaylists, updatedSaved),
    });

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, { ...lib, savedPlaylistIds: updatedSaved });
  },

  addPlaylistToLibrary: (playlistId) => {
    const { savedPlaylistIds, customPlaylists } = get();
    if (!savedPlaylistIds.includes(playlistId)) {
      const updated = [playlistId, ...savedPlaylistIds];
      set({
        savedPlaylistIds: updated,
        playlists: computeSavedPlaylists(customPlaylists, updated),
      });

      const activeId = getActiveUserId();
      const lib = loadUserLibrary(activeId);
      saveUserLibrary(activeId, { ...lib, savedPlaylistIds: updated });
    }
  },

  removePlaylistFromLibrary: (playlistId) => {
    const { savedPlaylistIds, customPlaylists, selectedPlaylistId } = get();
    const updatedSaved = savedPlaylistIds.filter((id) => id !== playlistId);
    const updatedCustom = customPlaylists.filter((p) => p.id !== playlistId);
    set({
      savedPlaylistIds: updatedSaved,
      customPlaylists: updatedCustom,
      playlists: computeSavedPlaylists(updatedCustom, updatedSaved),
      selectedPlaylistId: selectedPlaylistId === playlistId ? null : selectedPlaylistId,
    });

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, {
      ...lib,
      savedPlaylistIds: updatedSaved,
      userPlaylistIds: lib.userPlaylistIds.filter((id) => id !== playlistId),
    });
  },

  createPlaylist: (
    title,
    description,
    coverUrl,
    creator,
    creatorId,
    isPrivate = false,
    creatorUsername,
    creatorAvatar,
    folderId,
  ) => {
    const { customPlaylists, savedPlaylistIds, musicFolders } = get();
    const customCount = customPlaylists.filter((p) => p.title.startsWith('My Playlist')).length + 1;
    const defaultTitle = title?.trim() || `My Playlist #${customCount}`;

    const newPlaylist: MusicPlaylist = {
      id: generateSpotifyId(22),
      title: defaultTitle,
      description: description?.trim(),
      coverUrl: coverUrl || '',
      tracks: [],
      creator: creator || 'You',
      creatorId: creatorId,
      creatorUsername: creatorUsername,
      creatorAvatar: creatorAvatar,
      createdAt: new Date().toISOString().split('T')[0],
      isPrivate: Boolean(isPrivate),
      collaborators: [],
    };

    // Save to global playlists registry
    saveGlobalPlaylist(newPlaylist);

    const updatedCustom = [newPlaylist, ...customPlaylists];
    const updatedSaved = [newPlaylist.id, ...savedPlaylistIds];

    let updatedFolders = musicFolders;
    if (folderId) {
      updatedFolders = musicFolders.map((f) => {
        if (f.id === folderId && !f.playlistIds.includes(newPlaylist.id)) {
          return { ...f, playlistIds: [...f.playlistIds, newPlaylist.id] };
        }
        return f;
      });
    }

    set({
      customPlaylists: updatedCustom,
      savedPlaylistIds: updatedSaved,
      musicFolders: updatedFolders,
      playlists: computeSavedPlaylists(updatedCustom, updatedSaved),
      selectedPlaylistId: newPlaylist.id,
    });

    // Save to user's library
    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, {
      ...lib,
      userPlaylistIds: [newPlaylist.id, ...lib.userPlaylistIds],
      savedPlaylistIds: updatedSaved,
      musicFolders: updatedFolders,
    });

    if (typeof integrationsApi?.createUserPlaylist === 'function') {
      integrationsApi
        .createUserPlaylist({
          id: newPlaylist.id,
          title: defaultTitle,
          description: description?.trim(),
          coverUrl: coverUrl || '',
          folderId: folderId || null,
          isPublic: !isPrivate,
        })
        .then((remotePl) => {
          if (remotePl?.id && remotePl.id !== newPlaylist.id) {
            deleteGlobalPlaylist(newPlaylist.id);
            saveGlobalPlaylist({ ...newPlaylist, id: remotePl.id });
            const curLib = loadUserLibrary(activeId);
            saveUserLibrary(activeId, {
              ...curLib,
              userPlaylistIds: curLib.userPlaylistIds.map((id) =>
                id === newPlaylist.id ? remotePl.id : id,
              ),
              savedPlaylistIds: curLib.savedPlaylistIds.map((id) =>
                id === newPlaylist.id ? remotePl.id : id,
              ),
            });
            set((s) => ({
              customPlaylists: s.customPlaylists.map((p) =>
                p.id === newPlaylist.id ? { ...p, id: remotePl.id } : p,
              ),
              playlists: s.playlists.map((p) =>
                p.id === newPlaylist.id ? { ...p, id: remotePl.id } : p,
              ),
              selectedPlaylistId:
                s.selectedPlaylistId === newPlaylist.id ? remotePl.id : s.selectedPlaylistId,
              musicFolders: s.musicFolders.map((f) => ({
                ...f,
                playlistIds: f.playlistIds.map((id) => (id === newPlaylist.id ? remotePl.id : id)),
              })),
            }));
          }
        })
        .catch(() => {});
    }

    return newPlaylist;
  },

  updatePlaylistDetails: (playlistId, updates) => {
    const { customPlaylists, savedPlaylistIds } = get();
    const updatedCustom = customPlaylists.map((pl) => {
      if (pl.id === playlistId) {
        const updated = {
          ...pl,
          title: updates.title !== undefined ? updates.title.trim() : pl.title,
          description:
            updates.description !== undefined ? updates.description.trim() : pl.description,
          coverUrl: updates.coverUrl !== undefined ? updates.coverUrl.trim() : pl.coverUrl,
          isPrivate: updates.isPrivate !== undefined ? updates.isPrivate : pl.isPrivate,
        };
        saveGlobalPlaylist(updated);
        return updated;
      }
      return pl;
    });

    set({
      customPlaylists: updatedCustom,
      playlists: computeSavedPlaylists(updatedCustom, savedPlaylistIds),
    });
  },

  togglePlaylistPrivacy: (playlistId) => {
    const { customPlaylists, savedPlaylistIds } = get();
    const updatedCustom = customPlaylists.map((pl) => {
      if (pl.id === playlistId) {
        const updated = {
          ...pl,
          isPrivate: !pl.isPrivate,
        };
        saveGlobalPlaylist(updated);
        return updated;
      }
      return pl;
    });
    set({
      customPlaylists: updatedCustom,
      playlists: computeSavedPlaylists(updatedCustom, savedPlaylistIds),
    });
  },

  deletePlaylistPermanently: async (playlistId) => {
    const { customPlaylists, savedPlaylistIds, musicFolders, selectedPlaylistId } = get();

    // Identify target playlist and any ghost duplicates (same title & owner)
    const target = customPlaylists.find((p) => p.id === playlistId);
    const targetTitle = target?.title?.trim().toLowerCase();
    const targetCreator = target?.creatorId;

    const idsToPurge = new Set<string>([playlistId]);
    if (targetTitle) {
      customPlaylists.forEach((p) => {
        if (
          p.title.trim().toLowerCase() === targetTitle &&
          (p.creatorId === targetCreator || p.creator === 'You' || target?.creator === 'You')
        ) {
          idsToPurge.add(p.id);
        }
      });
    }

    idsToPurge.forEach((id) => deleteGlobalPlaylist(id));

    const updatedCustom = customPlaylists.filter((p) => !idsToPurge.has(p.id));
    const updatedSaved = savedPlaylistIds.filter((id) => !idsToPurge.has(id));
    const updatedFolders = musicFolders.map((f) => ({
      ...f,
      playlistIds: f.playlistIds.filter((id) => !idsToPurge.has(id)),
    }));

    set({
      customPlaylists: updatedCustom,
      savedPlaylistIds: updatedSaved,
      musicFolders: updatedFolders,
      playlists: computeSavedPlaylists(updatedCustom, updatedSaved),
      selectedPlaylistId: idsToPurge.has(selectedPlaylistId || '') ? null : selectedPlaylistId,
    });

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, {
      ...lib,
      userPlaylistIds: lib.userPlaylistIds.filter((id) => !idsToPurge.has(id)),
      savedPlaylistIds: updatedSaved,
      musicFolders: updatedFolders,
    });

    if (typeof integrationsApi?.deleteUserPlaylist === 'function') {
      try {
        await Promise.all(
          Array.from(idsToPurge).map((id) =>
            integrationsApi.deleteUserPlaylist(id).catch(() => {}),
          ),
        );
      } catch {}
    }
  },

  leavePlaylistCollaboration: (playlistId, userId) => {
    const { customPlaylists, savedPlaylistIds, selectedPlaylistId } = get();
    const updatedCustom = customPlaylists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      const updated = {
        ...pl,
        collaborators: (pl.collaborators || []).filter((c) => c.id !== userId),
      };
      saveGlobalPlaylist(updated);
      return updated;
    });
    const updatedSaved = savedPlaylistIds.filter((id) => id !== playlistId);

    set({
      customPlaylists: updatedCustom,
      savedPlaylistIds: updatedSaved,
      playlists: computeSavedPlaylists(updatedCustom, updatedSaved),
      selectedPlaylistId: selectedPlaylistId === playlistId ? null : selectedPlaylistId,
    });

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, {
      ...lib,
      userPlaylistIds: lib.userPlaylistIds.filter((id) => id !== playlistId),
      savedPlaylistIds: updatedSaved,
    });
  },

  deletePlaylist: (id) => {
    get().deletePlaylistPermanently(id);
  },

  addTrackToPlaylist: (playlistId, track) => {
    const { customPlaylists, savedPlaylistIds } = get();
    const updatedCustom = customPlaylists.map((p) => {
      if (p.id !== playlistId) return p;
      if (p.tracks.some((t) => t.id === track.id)) return p;
      const updated = {
        ...p,
        tracks: [track, ...p.tracks],
      };
      saveGlobalPlaylist(updated);
      return updated;
    });

    set({
      customPlaylists: updatedCustom,
      playlists: computeSavedPlaylists(updatedCustom, savedPlaylistIds),
    });

    if (typeof integrationsApi?.addTrackToUserPlaylist === 'function') {
      integrationsApi.addTrackToUserPlaylist(playlistId, track).catch(() => {});
    }
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    const { customPlaylists, savedPlaylistIds } = get();
    const updatedCustom = customPlaylists.map((p) => {
      if (p.id !== playlistId) return p;
      const updated = {
        ...p,
        tracks: p.tracks.filter((t) => t.id !== trackId),
      };
      saveGlobalPlaylist(updated);
      return updated;
    });

    set({
      customPlaylists: updatedCustom,
      playlists: computeSavedPlaylists(updatedCustom, savedPlaylistIds),
    });

    if (typeof integrationsApi?.removeTrackFromUserPlaylist === 'function') {
      integrationsApi.removeTrackFromUserPlaylist(playlistId, trackId).catch(() => {});
    }
  },

  setSelectedPlaylistId: (id) => set({ selectedPlaylistId: id }),
  setLibraryFilter: (filter) => set({ libraryFilter: filter }),
  setLibrarySearchQuery: (query) => set({ librarySearchQuery: query }),
  setLibrarySort: (sort) => set({ librarySort: sort }),
  toggleLibraryExpanded: () =>
    set((s) => {
      if (s.isLibraryFullWidth) {
        return { isLibraryFullWidth: false, isLibraryExpanded: false };
      }
      return { isLibraryExpanded: !s.isLibraryExpanded };
    }),
  setLibraryExpanded: (expanded) => set({ isLibraryExpanded: expanded }),
  toggleLibraryFullWidth: () =>
    set((s) => ({
      isLibraryFullWidth: !s.isLibraryFullWidth,
      isLibraryExpanded: !s.isLibraryFullWidth ? true : s.isLibraryExpanded,
    })),
  setLibraryFullWidth: (full) =>
    set({
      isLibraryFullWidth: full,
      isLibraryExpanded: full ? true : undefined,
    }),
  toggleNowPlayingPanel: () => set((s) => ({ isNowPlayingPanelOpen: !s.isNowPlayingPanelOpen })),
  setNowPlayingPanelOpen: (open) => set({ isNowPlayingPanelOpen: open }),

  getPlaylistById: (id) => {
    const resolvedId = PLAYLIST_ALIASES[id] || id;
    const { customPlaylists, catalogPlaylists } = get();
    const local = customPlaylists.find((p) => p.id === resolvedId || p.id === id);
    if (local) return local;
    const globalPlaylists = loadGlobalPlaylists();
    if (globalPlaylists[resolvedId]) return globalPlaylists[resolvedId];
    if (globalPlaylists[id]) return globalPlaylists[id];
    return (
      catalogPlaylists.find((p) => p.id === resolvedId || p.id === id) ||
      CATALOG_PLAYLISTS.find((p) => p.id === resolvedId || p.id === id)
    );
  },

  getTrackById: (id) => {
    const cleanId = id.replace(/^sc-/, '');
    const { likedTracks, customPlaylists, cachedTracks = {}, catalogPlaylists } = get();
    if (cachedTracks[id]) return cachedTracks[id];
    if (cachedTracks[cleanId]) return cachedTracks[cleanId];
    const liked = likedTracks.find(
      (t) => t.id === id || t.id === `sc-${cleanId}` || t.id.endsWith(cleanId),
    );
    if (liked) return liked;

    for (const pl of customPlaylists) {
      const t = pl.tracks.find(
        (tr) => tr.id === id || tr.id === `sc-${cleanId}` || tr.id.endsWith(cleanId),
      );
      if (t) return t;
    }

    const globals = loadGlobalPlaylists();
    for (const pl of Object.values(globals)) {
      const t = pl.tracks.find(
        (tr) => tr.id === id || tr.id === `sc-${cleanId}` || tr.id.endsWith(cleanId),
      );
      if (t) return t;
    }

    const allCatalog =
      catalogPlaylists && catalogPlaylists.length > 0 ? catalogPlaylists : CATALOG_PLAYLISTS;
    for (const pl of allCatalog) {
      const t = pl.tracks.find(
        (tr) => tr.id === id || tr.id === `sc-${cleanId}` || tr.id.endsWith(cleanId),
      );
      if (t) return t;
    }

    return undefined;
  },

  cacheTrack: (track) => {
    set((s) => ({
      cachedTracks: {
        ...s.cachedTracks,
        [track.id]: track,
      },
    }));
  },

  createMusicFolder: (name) => {
    const { musicFolders } = get();
    const folderCount = musicFolders.filter((f) => f.name.startsWith('New Folder')).length + 1;
    const defaultName =
      name?.trim() || (folderCount === 1 ? 'New Folder' : `New Folder #${folderCount}`);

    const newFolder: MusicFolder = {
      id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: defaultName,
      playlistIds: [],
      createdAt: new Date().toISOString(),
    };
    const updatedFolders = [...musicFolders, newFolder];
    set({ musicFolders: updatedFolders });

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, { ...lib, musicFolders: updatedFolders });

    if (typeof integrationsApi?.createMusicFolder === 'function') {
      integrationsApi
        .createMusicFolder({ id: newFolder.id, name: defaultName })
        .then((remoteFolder) => {
          if (remoteFolder?.id && remoteFolder.id !== newFolder.id) {
            set((s) => ({
              musicFolders: s.musicFolders.map((f) =>
                f.id === newFolder.id ? { ...f, id: remoteFolder.id } : f,
              ),
            }));
            const currentLib = loadUserLibrary(activeId);
            saveUserLibrary(activeId, {
              ...currentLib,
              musicFolders: currentLib.musicFolders.map((f) =>
                f.id === newFolder.id ? { ...f, id: remoteFolder.id } : f,
              ),
            });
          }
        })
        .catch(() => {});
    }

    return newFolder;
  },

  renameMusicFolder: (id, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const { musicFolders } = get();
    const updatedFolders = musicFolders.map((f) => (f.id === id ? { ...f, name: trimmed } : f));
    set({ musicFolders: updatedFolders });

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, { ...lib, musicFolders: updatedFolders });

    if (typeof integrationsApi?.renameMusicFolder === 'function') {
      integrationsApi.renameMusicFolder(id, trimmed).catch(() => {});
    }
  },

  deleteMusicFolder: async (id) => {
    const { musicFolders } = get();
    const targetFolder = musicFolders.find((f) => f.id === id);
    const updatedFolders = musicFolders.filter((f) => f.id !== id);
    set({ musicFolders: updatedFolders });

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, { ...lib, musicFolders: updatedFolders });

    if (typeof integrationsApi?.deleteMusicFolder === 'function') {
      try {
        await integrationsApi.deleteMusicFolder(id);
        if (targetFolder?.name) {
          await integrationsApi.deleteMusicFolder(targetFolder.name).catch(() => {});
        }
      } catch {}
    }
  },

  sendPlaylistInvite: (playlistId, invitee, inviter) => {
    const playlist = get().getPlaylistById(playlistId);
    const newInvite: PlaylistInvite = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      playlistId,
      playlistTitle: playlist?.title || 'Playlist',
      playlistCover: playlist?.coverUrl || '',
      inviterId: inviter.id,
      inviterUsername: inviter.username,
      inviterDisplayName: inviter.displayName,
      inviterAvatar: inviter.avatar,
      inviteeId: invitee.id,
      inviteeUsername: invitee.username,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const globalInvites = [newInvite, ...loadGlobalInvites()];
    saveGlobalInvites(globalInvites);

    set({ playlistInvites: globalInvites });
    return newInvite;
  },

  respondToPlaylistInvite: (inviteId, accept, user) => {
    const { customPlaylists, savedPlaylistIds } = get();
    const globalInvites = loadGlobalInvites();
    const invite = globalInvites.find((i) => i.id === inviteId);
    if (!invite) return;

    const updatedInvites = globalInvites.map((i) =>
      i.id === inviteId
        ? { ...i, status: accept ? ('accepted' as const) : ('declined' as const) }
        : i,
    );
    saveGlobalInvites(updatedInvites);

    if (accept && user) {
      const targetPlaylist = get().getPlaylistById(invite.playlistId);
      if (targetPlaylist) {
        const newCollaborator: PlaylistCollaborator = {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          role: 'editor',
          joinedAt: new Date().toISOString(),
        };

        const existingCollabs = targetPlaylist.collaborators || [];
        const alreadyCollab = existingCollabs.some(
          (c) => c.id === user.id || c.username === user.username,
        );
        const updatedCollabs = alreadyCollab
          ? existingCollabs
          : [...existingCollabs, newCollaborator];
        const updatedTarget = { ...targetPlaylist, collaborators: updatedCollabs };
        saveGlobalPlaylist(updatedTarget);

        const activeId = getActiveUserId();
        const lib = loadUserLibrary(activeId);
        const updatedUserPlaylists = lib.userPlaylistIds.includes(invite.playlistId)
          ? lib.userPlaylistIds
          : [invite.playlistId, ...lib.userPlaylistIds];
        const updatedSavedIds = lib.savedPlaylistIds.includes(invite.playlistId)
          ? lib.savedPlaylistIds
          : [invite.playlistId, ...lib.savedPlaylistIds];

        saveUserLibrary(activeId, {
          ...lib,
          userPlaylistIds: updatedUserPlaylists,
          savedPlaylistIds: updatedSavedIds,
        });

        const newCustom = resolveUserPlaylists(
          activeId,
          {
            ...lib,
            userPlaylistIds: updatedUserPlaylists,
            savedPlaylistIds: updatedSavedIds,
          },
          loadGlobalPlaylists(),
        );

        set({
          playlistInvites: updatedInvites,
          customPlaylists: newCustom,
          savedPlaylistIds: updatedSavedIds,
          playlists: computeSavedPlaylists(newCustom, updatedSavedIds),
        });
        return;
      }
    }

    set({ playlistInvites: updatedInvites });
  },

  getPendingInviteForUser: (playlistId, userId, username) => {
    const invites = loadGlobalInvites();
    return invites.find(
      (i) =>
        i.playlistId === playlistId &&
        i.status === 'pending' &&
        ((userId && i.inviteeId === userId) || (username && i.inviteeUsername === username)),
    );
  },

  getInvitesForUser: (userId, username) => {
    const invites = loadGlobalInvites();
    return invites.filter(
      (i) => (userId && i.inviteeId === userId) || (username && i.inviteeUsername === username),
    );
  },

  movePlaylistToFolder: (folderId, playlistId) => {
    const { musicFolders } = get();
    const updatedFolders = musicFolders.map((f) => {
      if (f.id === folderId && !f.playlistIds.includes(playlistId)) {
        return { ...f, playlistIds: [...f.playlistIds, playlistId] };
      }
      return f;
    });
    set({ musicFolders: updatedFolders });

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, { ...lib, musicFolders: updatedFolders });
  },

  removePlaylistFromFolder: (folderId, playlistId) => {
    const { musicFolders } = get();
    const updatedFolders = musicFolders.map((f) => {
      if (f.id === folderId) {
        return { ...f, playlistIds: f.playlistIds.filter((id) => id !== playlistId) };
      }
      return f;
    });
    set({ musicFolders: updatedFolders });

    const activeId = getActiveUserId();
    const lib = loadUserLibrary(activeId);
    saveUserLibrary(activeId, { ...lib, musicFolders: updatedFolders });
  },

  switchUserLibrary: (userId) => {
    const userLib = loadUserLibrary(userId);
    const globalPlaylists = loadGlobalPlaylists();
    const custom = resolveUserPlaylists(userId, userLib, globalPlaylists);
    const computed = computeSavedPlaylists(custom, userLib.savedPlaylistIds);

    set({
      likedTracks: userLib.likedTracks,
      customPlaylists: custom,
      savedPlaylistIds: userLib.savedPlaylistIds,
      playlists: computed,
      musicFolders: userLib.musicFolders,
      playlistInvites: loadGlobalInvites(),
      recentlyPlayed: userLib.recentlyPlayed || [],
      lastActiveGenre: userLib.lastActiveGenre,
      lastActiveSeed: userLib.lastActiveSeed,
      pinnedItemIds: userLib.pinnedItemIds || [],
    });

    if (userId) {
      get().fetchUserLikedTracksFromBackend(userId);
      get().fetchUserFoldersFromBackend(userId);
      get().fetchUserPlaylistsFromBackend(userId);
    }
  },

  fetchUserFoldersFromBackend: async (userId?: string | null) => {
    const activeId = userId !== undefined ? userId : getActiveUserId();
    if (!activeId || typeof integrationsApi?.getMusicFolders !== 'function') return;
    try {
      const folders = await integrationsApi.getMusicFolders();
      if (Array.isArray(folders)) {
        set(() => {
          const merged: MusicFolder[] = folders.map((f: any) => ({
            id: f.id,
            name: f.name,
            playlistIds: f.playlistIds || [],
            createdAt: f.createdAt || new Date().toISOString(),
          }));
          const lib = loadUserLibrary(activeId);
          saveUserLibrary(activeId, { ...lib, musicFolders: merged });
          return { musicFolders: merged };
        });
      }
    } catch (err) {
      console.warn('Failed to fetch music folders from backend:', err);
    }
  },

  fetchUserPlaylistsFromBackend: async (userId?: string | null) => {
    const activeId = userId !== undefined ? userId : getActiveUserId();
    if (!activeId || typeof integrationsApi?.getUserPlaylists !== 'function') return;
    try {
      const remotePlaylists = await integrationsApi.getUserPlaylists();
      if (Array.isArray(remotePlaylists)) {
        set((s) => {
          const remoteMap = new Map<string, MusicPlaylist>();
          const remoteTitles = new Set<string>();
          remotePlaylists.forEach((p) => {
            remoteMap.set(p.id, {
              ...p,
              collaborators: p.collaborators || [],
            });
            remoteTitles.add((p.title || '').trim().toLowerCase());
            saveGlobalPlaylist(p);
          });

          // Non-owned playlists (e.g. collaborative playlists where current user is a guest collaborator)
          const nonOwnedPlaylists = s.customPlaylists.filter((p) => {
            const isOwnedByMe =
              p.creatorId === activeId ||
              p.creator === 'You' ||
              (!p.creatorId && p.id.startsWith('p-'));
            return !isOwnedByMe && !remoteMap.has(p.id);
          });

          // Clean up stale local ghost IDs that matched a remote playlist by title
          const staleIdsToPurge: string[] = [];
          s.customPlaylists.forEach((p) => {
            const norm = (p.title || '').trim().toLowerCase();
            if (!remoteMap.has(p.id) && remoteTitles.has(norm)) {
              staleIdsToPurge.push(p.id);
              deleteGlobalPlaylist(p.id);
            }
          });

          const mergedCustom = [...Array.from(remoteMap.values()), ...nonOwnedPlaylists];
          const purgeSet = new Set(staleIdsToPurge);
          const validIds = new Set([
            ...mergedCustom.map((p) => p.id),
            ...CATALOG_PLAYLISTS.map((p) => p.id),
          ]);
          const mergedSaved = s.savedPlaylistIds.filter(
            (id) =>
              !purgeSet.has(id) &&
              (validIds.has(id) || id.startsWith('sc-') || id.startsWith('sp-')),
          );
          remotePlaylists.forEach((p) => {
            if (!mergedSaved.includes(p.id)) mergedSaved.push(p.id);
          });

          const computed = computeSavedPlaylists(mergedCustom, mergedSaved);

          const lib = loadUserLibrary(activeId);
          saveUserLibrary(activeId, {
            ...lib,
            userPlaylistIds: mergedCustom.map((p) => p.id),
            savedPlaylistIds: mergedSaved,
          });

          return {
            customPlaylists: mergedCustom,
            savedPlaylistIds: mergedSaved,
            playlists: computed,
          };
        });
      }
    } catch (err) {
      console.warn('Failed to fetch user playlists from backend:', err);
    }
  },

  fetchUserLikedTracksFromBackend: async (userId?: string | null) => {
    const activeId = userId !== undefined ? userId : getActiveUserId();
    if (!activeId || typeof integrationsApi?.getLikedTracks !== 'function') return;
    try {
      const backendTracks = await integrationsApi.getLikedTracks();
      if (Array.isArray(backendTracks)) {
        const local = get().likedTracks;
        // If local has tracks not in backend (e.g. migration from local storage to PostgreSQL)
        if (
          local.length > 0 &&
          backendTracks.length === 0 &&
          typeof integrationsApi?.syncLikedTracks === 'function'
        ) {
          const synced = await integrationsApi.syncLikedTracks(local);
          if (Array.isArray(synced)) {
            set({ likedTracks: synced });
            const lib = loadUserLibrary(activeId);
            saveUserLibrary(activeId, { ...lib, likedTracks: synced });
            return;
          }
        }
        set({ likedTracks: backendTracks });
        const lib = loadUserLibrary(activeId);
        saveUserLibrary(activeId, { ...lib, likedTracks: backendTracks });
      }
    } catch (err) {
      console.warn('Failed to fetch user liked tracks from backend:', err);
    }
  },

  resetForLogout: () => {
    set({
      likedTracks: [],
      customPlaylists: [],
      savedPlaylistIds: [],
      playlists: [],
      musicFolders: [],
      selectedPlaylistId: null,
      recentlyPlayed: [],
      lastActiveGenre: undefined,
      lastActiveSeed: undefined,
      pinnedItemIds: [],
    });
  },
}));

// Subscribe to like events from elsewhere without direct store imports
if (typeof window !== 'undefined') {
  musicEventBridge.onLikeToggled(({ track, isLiked }) => {
    const store = useMusicHubStore.getState();
    const exists = store.likedTracks.some((t) => t.id === track.id);
    if (isLiked && !exists) {
      const trackWithAddedAt: SpotifyTrack = {
        ...track,
        addedAt: track.addedAt || new Date().toISOString(),
      };
      const updated = [trackWithAddedAt, ...store.likedTracks];
      useMusicHubStore.setState({ likedTracks: updated });
      const activeId = getActiveUserId();
      const lib = loadUserLibrary(activeId);
      saveUserLibrary(activeId, { ...lib, likedTracks: updated });
      if (typeof integrationsApi?.addLikedTrack === 'function') {
        integrationsApi.addLikedTrack(trackWithAddedAt).catch(() => {});
      }
    } else if (!isLiked && exists) {
      const updated = store.likedTracks.filter((t) => t.id !== track.id);
      useMusicHubStore.setState({ likedTracks: updated });
      const activeId = getActiveUserId();
      const lib = loadUserLibrary(activeId);
      saveUserLibrary(activeId, { ...lib, likedTracks: updated });
      if (typeof integrationsApi?.removeLikedTrack === 'function') {
        integrationsApi.removeLikedTrack(track.id).catch(() => {});
      }
    }
  });

  // Track playback listener for recently played & real-time recommendation updates
  musicEventBridge.onTrackPlayed(({ track, playlistId, playlistTitle }) => {
    const store = useMusicHubStore.getState();
    const genre = detectGenre(track);
    store.recordRecentlyPlayed({
      id: track.id,
      type: 'track',
      title: track.title,
      artist: track.artist,
      coverUrl: track.albumArt,
      genre,
      track,
      playlistId,
    });
    const targetPlaylist = playlistId
      ? store.getPlaylistById(playlistId)
      : playlistTitle
        ? store.playlists.find((p) => p.title === playlistTitle) ||
          store.catalogPlaylists.find((p) => p.title === playlistTitle)
        : undefined;

    if (targetPlaylist) {
      store.recordRecentlyPlayed({
        id: targetPlaylist.id,
        type: 'playlist',
        title: targetPlaylist.title,
        subtitle: targetPlaylist.creator ? `Playlist • ${targetPlaylist.creator}` : 'Playlist',
        coverUrl: targetPlaylist.coverUrl,
        tracksCount: targetPlaylist.tracks.length,
        isSaved: store.isPlaylistSaved(targetPlaylist.id),
        playlistId: targetPlaylist.id,
      });
    }
  });

  // Listen for invite updates across tabs or custom events
  window.addEventListener('eternal_playlist_invite_updated', () => {
    useMusicHubStore.setState({ playlistInvites: loadGlobalInvites() });
  });

  window.addEventListener('storage', (e) => {
    if (e.key === GLOBAL_INVITES_KEY) {
      useMusicHubStore.setState({ playlistInvites: loadGlobalInvites() });
    }
    if (e.key === 'auth-session') {
      const newUserId = getActiveUserId();
      useMusicHubStore.getState().switchUserLibrary(newUserId);
    }
  });

  if (initialUserId) {
    setTimeout(() => {
      useMusicHubStore.getState().fetchUserLikedTracksFromBackend(initialUserId);
      useMusicHubStore.getState().fetchUserFoldersFromBackend(initialUserId);
      useMusicHubStore.getState().fetchUserPlaylistsFromBackend(initialUserId);
    }, 100);
  }
}
