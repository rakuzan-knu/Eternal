import { Module, forwardRef } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { SpotifyCallbackController } from './spotify-callback.controller';
import { IntegrationsService } from './integrations.service';
import { SteamPresenceService } from './steam-presence.service';
import { SpotifyService } from './spotify.service';
import { SpotifyPresenceService } from './spotify-presence.service';
import { SoundCloudService } from './soundcloud.service';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '@common/prisma';
import { ShowcaseModule } from '../showcase/showcase.module';
import { MessengerModule } from '../messenger/messenger.module';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    forwardRef(() => ShowcaseModule),
    forwardRef(() => MessengerModule),
  ],
  controllers: [IntegrationsController, SpotifyCallbackController],
  providers: [
    IntegrationsService,
    SteamPresenceService,
    SpotifyService,
    SpotifyPresenceService,
    SoundCloudService,
  ],
  exports: [
    IntegrationsService,
    SteamPresenceService,
    SpotifyService,
    SpotifyPresenceService,
    SoundCloudService,
  ],
})
export class IntegrationsModule {}
