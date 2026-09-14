import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { MessengerGateway } from '../messenger/gateway/messenger.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SpotifyService } from './spotify.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SpotifyPresenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SpotifyPresenceService.name);
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messengerGateway: MessengerGateway,
    private readonly eventEmitter: EventEmitter2,
    private readonly spotifyService: SpotifyService,
  ) {}

  onModuleInit() {
    // Initial poll after short delay to let sockets and gateway settle
    setTimeout(() => void this.pollOnlineSpotifyUsers(), 6000);
    // Poll every 15 seconds (safe for rate limits with client-side interpolation)
    this.pollInterval = setInterval(() => void this.pollOnlineSpotifyUsers(), 15_000);
    this.logger.log('SpotifyPresenceService initialized: poller scheduled every 15s.');
  }

  onModuleDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async pollOnlineSpotifyUsers(): Promise<void> {
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

      // 3. Filter down to users with linked & verified Spotify accounts
      for (const sc of showcases) {
        const connected = (sc.connectedAccounts as Record<string, any>) || {};
        const spotify = connected.spotify;

        if (!spotify || !spotify.verified || !spotify.accessToken) {
          continue;
        }

        const isPrivateActivity =
          sc.privacyActivity === 'PRIVATE' || spotify.displayOnProfile === false;

        // Fetch currently playing track safely
        const liveTrack = await this.spotifyService.getCurrentlyPlayingTrack(sc.userId, spotify);

        const prevSpotifyActivity = spotify.currentActivity || null;
        const steamActivity = connected.steam?.currentActivity || null;

        let hasSpotifyChanged = false;

        if (!liveTrack) {
          if (prevSpotifyActivity !== null) {
            spotify.currentActivity = null;
            hasSpotifyChanged = true;
          }
        } else {
          const isSameTrack =
            prevSpotifyActivity && prevSpotifyActivity.trackId === liveTrack.trackId;

          const isPauseChanged =
            Boolean(prevSpotifyActivity?.isPaused) !== Boolean(liveTrack.isPaused);

          spotify.currentActivity = liveTrack;

          if (!isSameTrack || !prevSpotifyActivity || isPauseChanged) {
            hasSpotifyChanged = true;
          } else {
            // If track progress drifted or user seeks, trigger update
            const progressDiff = Math.abs(
              (prevSpotifyActivity.progressMs || 0) - liveTrack.progressMs,
            );
            if (progressDiff > 10000) {
              hasSpotifyChanged = true;
            }
          }
        }

        // Priority resolution: Game always takes priority over Music in single-line status
        const activeGame = steamActivity && steamActivity.title ? steamActivity : null;
        const activeMusic = spotify.currentActivity;

        const effectivePrimaryActivity = activeGame ? activeGame : activeMusic;

        // Check if primary activityStatus changed
        const prevPrimary = sc.activityStatus as any;
        const isPauseChangedInPrimary =
          Boolean(prevPrimary?.isPaused) !== Boolean(effectivePrimaryActivity?.isPaused);

        const isPrimaryChanged =
          (!prevPrimary && Boolean(effectivePrimaryActivity)) ||
          (Boolean(prevPrimary) && !effectivePrimaryActivity) ||
          prevPrimary?.title !== effectivePrimaryActivity?.title ||
          prevPrimary?.type !== effectivePrimaryActivity?.type ||
          isPauseChangedInPrimary ||
          (effectivePrimaryActivity?.type === 'spotify' &&
            prevPrimary?.trackId !== effectivePrimaryActivity?.trackId);

        if (hasSpotifyChanged || isPrimaryChanged) {
          connected.spotify = spotify;

          await this.prisma.profileShowcase.update({
            where: { userId: sc.userId },
            data: {
              connectedAccounts: connected,
              activityStatus: effectivePrimaryActivity ? effectivePrimaryActivity : Prisma.DbNull,
            },
          });

          this.eventEmitter.emit('showcase.presence.updated', {
            userId: sc.userId,
            activityStatus: effectivePrimaryActivity || null,
            connectedAccounts: connected,
            isPrivate: isPrivateActivity,
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Error during Spotify presence polling: ${(err as Error).message}`);
    } finally {
      this.isPolling = false;
    }
  }
}
