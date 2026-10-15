import { BadRequestException } from '@nestjs/common';

// Only the verified OpenID callback may establish or replace a Steam identity.
export function steamAccountPreferences(existing: unknown, requested: unknown): unknown {
  if (requested === undefined || requested === existing) return existing;
  if (requested === null) return null;
  if (
    !existing ||
    typeof existing !== 'object' ||
    !('verified' in existing) ||
    existing.verified !== true ||
    !('steamId' in existing) ||
    typeof existing.steamId !== 'string' ||
    !requested ||
    typeof requested !== 'object' ||
    Array.isArray(requested)
  ) {
    throw new BadRequestException('Authenticate Steam before changing Steam settings');
  }
  for (const key of ['steamId', 'verified', 'authenticatedAt']) {
    if (key in requested && Reflect.get(requested, key) !== Reflect.get(existing, key)) {
      throw new BadRequestException('Steam identity can only be changed through authentication');
    }
  }
  const preferences: Record<string, unknown> = {};
  if ('displayOnProfile' in requested) {
    if (typeof requested.displayOnProfile !== 'boolean')
      throw new BadRequestException('Invalid Steam settings');
    preferences.displayOnProfile = requested.displayOnProfile;
  }
  if ('featuredGame' in requested) {
    if (
      requested.featuredGame !== null &&
      requested.featuredGame !== 'dota2' &&
      requested.featuredGame !== 'cs2'
    )
      throw new BadRequestException('Invalid Steam settings');
    preferences.featuredGame = requested.featuredGame;
  }
  if ('featuredGames' in requested) {
    if (
      !Array.isArray(requested.featuredGames) ||
      requested.featuredGames.length > 2 ||
      !requested.featuredGames.every(
        (game: unknown) => typeof game === 'string' && ['dota2', 'cs2'].includes(game),
      )
    )
      throw new BadRequestException('Invalid Steam settings');
    preferences.featuredGames = requested.featuredGames;
  }
  return { ...existing, ...preferences };
}
