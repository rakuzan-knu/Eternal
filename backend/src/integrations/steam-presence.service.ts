import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';

interface SteamUserEntry {
  userId: string;
  steamId: string;
  existingActivity: any;
  privacyActivity: string;
  displayOnProfile: boolean;
  connectedAccounts: Record<string, any>;
}

@Injectable()
export class SteamPresenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SteamPresenceService.name);
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => MessengerGateway))
    private readonly messengerGateway: MessengerGateway,
  ) {}

  private readonly gameAssetCache = new Map<
    string,
    { imageUrl: string; headerUrl: string | null }
  >();

  private async resolveGameAssets(
    gameId: string | null,
    gameTitle: string,
  ): Promise<{ imageUrl: string; headerUrl: string | null }> {
    const titleLower = gameTitle.toLowerCase();
    if (gameId === '570' || titleLower.includes('dota')) {
      return {
        imageUrl: '/icons/brands/dota2.png',
        headerUrl: '/icons/brands/dota2.png',
      };
    }
    if (gameId === '730' || titleLower.includes('counter-strike')) {
      return {
        imageUrl: '/icons/brands/cs2.png',
        headerUrl: '/icons/brands/cs2.png',
      };
    }
    if (!gameId) {
      return { imageUrl: '/icons/brands/steam.png', headerUrl: null };
    }

    if (this.gameAssetCache.has(gameId)) {
      return this.gameAssetCache.get(gameId)!;
    }

    try {
      const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${gameId}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        const app = data?.[gameId]?.data;
        if (app) {
          const assets = {
            imageUrl: app.capsule_image || app.header_image || '/icons/brands/steam.png',
            headerUrl: app.header_image || null,
          };
          this.gameAssetCache.set(gameId, assets);
          return assets;
        }
      }
    } catch {
      // Ignore network timeout and fall through to fallback
    }

    const fallback = {
      imageUrl: '/icons/brands/steam.png',
      headerUrl: null,
    };
    return fallback;
  }

  onModuleInit() {
    // Initial poll after short delay to let sockets and gateway settle
    setTimeout(() => void this.pollOnlineSteamUsers(), 5000);
    // Poll every 30 seconds
    this.pollInterval = setInterval(() => void this.pollOnlineSteamUsers(), 30_000);
    this.logger.log('SteamPresenceService initialized: batch poller scheduled every 30s.');
  }

  onModuleDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async pollOnlineSteamUsers(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      // 1. Get unique online user IDs from gateway
      const onlineUserIds = this.messengerGateway.getOnlineUserIds();
      if (!onlineUserIds || onlineUserIds.length === 0) {
        return;
      }

      const uniqueOnlineIds = Array.from(new Set(onlineUserIds));

      // 2. Query showcases of online users
      const showcases = await this.prisma.profileShowcase.findMany({
        where: {
          userId: { in: uniqueOnlineIds },
        },
        select: {
          userId: true,
          connectedAccounts: true,
          activityStatus: true,
          privacyActivity: true,
        },
      });

      // 3. Filter down to users with linked Steam accounts
      const steamUsers: SteamUserEntry[] = [];
      for (const sc of showcases) {
        const connected = (sc.connectedAccounts as Record<string, any>) || {};
        const steam = connected.steam;
        const steamId = steam?.steamId || (typeof steam === 'string' ? steam : null);

        if (steamId && /^\d{17}$/.test(String(steamId))) {
          steamUsers.push({
            userId: sc.userId,
            steamId: String(steamId),
            existingActivity: sc.activityStatus,
            privacyActivity: sc.privacyActivity || 'PUBLIC',
            displayOnProfile: steam?.displayOnProfile !== false,
            connectedAccounts: connected,
          });
        }
      }

      if (steamUsers.length === 0) {
        return;
      }

      // 4. Batch steam IDs into chunks of up to 100
      const chunks: SteamUserEntry[][] = [];
      for (let i = 0; i < steamUsers.length; i += 100) {
        chunks.push(steamUsers.slice(i, i + 100));
      }

      const apiKey = process.env.STEAM_API_KEY || '18B0A1F74A0040B2757301E4164776C7';

      // 5. Process each batch
      for (const chunk of chunks) {
        const steamIdQuery = chunk.map((u) => u.steamId).join(',');
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamIdQuery}`;

        let summaryRes: Response;
        try {
          summaryRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
        } catch (fetchErr) {
          // Outage / timeout protection: graceful abort without wiping database
          this.logger.warn(`Steam API fetch timeout/network error: ${(fetchErr as Error).message}`);
          continue;
        }

        if (!summaryRes.ok) {
          // Outage / 500 protection: graceful abort
          this.logger.warn(`Steam API responded with HTTP ${summaryRes.status}. Skipping cycle.`);
          continue;
        }

        let summaryJson: any;
        try {
          summaryJson = await summaryRes.json();
        } catch {
          this.logger.warn(`Steam API returned non-JSON body. Skipping cycle.`);
          continue;
        }

        const players = summaryJson?.response?.players;
        if (!Array.isArray(players)) {
          this.logger.warn(`Steam API returned invalid response structure. Skipping cycle.`);
          continue;
        }

        const playerMap = new Map<string, any>();
        for (const p of players) {
          if (p.steamid) {
            playerMap.set(p.steamid, p);
          }
        }

        // 6. Process each user in chunk with dirty checking and privacy compliance
        for (const entry of chunk) {
          const player = playerMap.get(entry.steamId);
          if (!player) {
            // Player not found in response, skip safely
            continue;
          }

          const gameTitle = player.gameextrainfo ? String(player.gameextrainfo).trim() : null;
          const gameId = player.gameid ? String(player.gameid).trim() : null;
          const prevActivity = entry.existingActivity;
          const isPrivateActivity = entry.privacyActivity === 'PRIVATE' || !entry.displayOnProfile;

          if (!gameTitle) {
            // User is not playing any game (or Steam Game details is set to private)
            if (prevActivity && prevActivity.type === 'gaming' && prevActivity.isSteam) {
              const connected = entry.connectedAccounts || {};
              if (connected.steam) {
                connected.steam.currentActivity = null;
              }

              // Fallback to active Spotify playback if user is listening to music!
              const fallbackMusic = connected.spotify?.currentActivity || null;

              await this.prisma.profileShowcase.update({
                where: { userId: entry.userId },
                data: {
                  connectedAccounts: connected,
                  activityStatus: fallbackMusic ? fallbackMusic : Prisma.DbNull,
                },
              });

              this.eventEmitter.emit('showcase.presence.updated', {
                userId: entry.userId,
                activityStatus: fallbackMusic,
                isPrivate: isPrivateActivity,
              });
            }
          } else {
            // User is currently in a game
            let isCloudflareSteam = false;
            if (prevActivity?.imageUrl) {
              try {
                const parsed = new URL(prevActivity.imageUrl);
                isCloudflareSteam =
                  parsed.hostname === 'cdn.cloudflare.steamstatic.com' ||
                  parsed.hostname.endsWith('.steamstatic.com');
              } catch {
                isCloudflareSteam = false;
              }
            }
            const hasWorkingImage = Boolean(prevActivity?.imageUrl && !isCloudflareSteam);

            const isSameGame =
              prevActivity &&
              prevActivity.type === 'gaming' &&
              (prevActivity.gameId === gameId || prevActivity.title === gameTitle) &&
              hasWorkingImage;

            if (isSameGame) {
              // DIRTY CHECKING: User continues playing the same game with valid assets!
              // Skip database write and skip socket emit to prevent spam!
              continue;
            }

            // Preserve startedAt if same game, otherwise reset
            const startedAt =
              prevActivity &&
              (prevActivity.gameId === gameId || prevActivity.title === gameTitle) &&
              prevActivity.startedAt
                ? prevActivity.startedAt
                : new Date().toISOString();

            // Resolve authentic icons and wide headers
            const { imageUrl, headerUrl } = await this.resolveGameAssets(gameId, gameTitle);

            const newActivity = {
              type: 'gaming',
              title: gameTitle,
              gameId: gameId || null,
              subtitle: 'Playing on Steam',
              details: gameId ? `Steam App ID: ${gameId}` : 'Steam Game',
              imageUrl,
              headerUrl,
              externalUrl: gameId ? `https://store.steampowered.com/app/${gameId}` : null,
              startedAt,
              isSteam: true,
            };

            const connected = entry.connectedAccounts || {};
            if (connected.steam) {
              connected.steam.currentActivity = newActivity;
            }

            await this.prisma.profileShowcase.update({
              where: { userId: entry.userId },
              data: {
                connectedAccounts: connected,
                activityStatus: newActivity as any,
              },
            });

            this.eventEmitter.emit('showcase.presence.updated', {
              userId: entry.userId,
              activityStatus: newActivity,
              isPrivate: isPrivateActivity,
            });
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error during pollOnlineSteamUsers: ${(err as Error).message}`);
    } finally {
      this.isPolling = false;
    }
  }
}
