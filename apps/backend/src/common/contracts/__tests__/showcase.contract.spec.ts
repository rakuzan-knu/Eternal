import {
  showcasePrivacySchema,
  showcaseMediaTypeSchema,
  showcaseMediaItemSchema,
  profileAnthemSchema,
  spotlightMediaSchema,
  liveActivityStatusSchema,
  connectedAccountsSchema,
  updateShowcaseSchema,
  mediaSearchResultSchema,
  profileShowcaseSchema,
  ShowcasePrivacy,
  ShowcaseMediaType,
} from '../showcase';

describe('Showcase Contract & Schemas', () => {
  it('validates privacy enum and media type enum', () => {
    expect(showcasePrivacySchema.parse(ShowcasePrivacy.PUBLIC)).toBe('PUBLIC');
    expect(showcasePrivacySchema.parse(ShowcasePrivacy.FOLLOWERS)).toBe('FOLLOWERS');
    expect(showcasePrivacySchema.parse(ShowcasePrivacy.PRIVATE)).toBe('PRIVATE');

    expect(showcaseMediaTypeSchema.parse(ShowcaseMediaType.ANIME)).toBe('ANIME');
    expect(showcaseMediaTypeSchema.parse(ShowcaseMediaType.GAME)).toBe('GAME');
    expect(showcaseMediaTypeSchema.parse(ShowcaseMediaType.MOVIE)).toBe('MOVIE');
    expect(showcaseMediaTypeSchema.parse(ShowcaseMediaType.SERIES)).toBe('SERIES');
  });

  it('validates and sanitizes showcaseMediaItemSchema', () => {
    const item = showcaseMediaItemSchema.parse({
      type: 'ANIME',
      title: '<b>Attack on Titan</b>',
      posterUrl: 'https://example.com/poster.jpg',
      userComment: '<i>Great show</i>',
      tags: ['<b>action</b>', 'drama', 'action'],
      rating: 9.5,
      releaseYear: 2013,
      position: 1,
    });

    expect(item.title).toBe('Attack on Titan');
    expect(item.userComment).toBe('Great show');
    expect(item.tags).toEqual(['action', 'drama']);
  });

  it('validates profileAnthemSchema', () => {
    const anthem = profileAnthemSchema.parse({
      title: '<b>Bohemian Rhapsody</b>',
      artist: '<b>Queen</b>',
      albumArt: 'https://example.com/art.jpg',
      previewUrl: 'https://example.com/preview.mp3',
      durationMs: 354000,
    });
    expect(anthem.title).toBe('Bohemian Rhapsody');
    expect(anthem.artist).toBe('Queen');
  });

  it('validates spotlightMediaSchema', () => {
    const spotlight = spotlightMediaSchema.parse({
      title: '<b>Elden Ring</b>',
      posterUrl: 'https://example.com/elden.jpg',
      subtitle: '<b>GOTY 2022</b>',
      tags: ['rpg', 'souls'],
      rating: 10,
    });
    expect(spotlight.title).toBe('Elden Ring');
    expect(spotlight.subtitle).toBe('GOTY 2022');
    expect(spotlight.type).toBe('GAME');
  });

  it('validates liveActivityStatusSchema', () => {
    const activity = liveActivityStatusSchema.parse({
      type: 'gaming',
      title: '<b>Playing Cyberpunk</b>',
      subtitle: '<b>Night City</b>',
      details: '<b>Exploring Dogtown</b>',
      imageUrl: 'https://example.com/game.jpg',
      playtimeHours: 120,
    });
    expect(activity.title).toBe('Playing Cyberpunk');
    expect(activity.subtitle).toBe('Night City');
    expect(activity.details).toBe('Exploring Dogtown');
  });

  it('validates connectedAccountsSchema', () => {
    const accounts = connectedAccountsSchema.parse({
      github: 'octocat',
      steam: '76561198000000000',
      spotify: 'spotify-user',
    });
    expect(accounts.github).toBe('octocat');
  });

  it('validates updateShowcaseSchema with HTML sanitization on pronouns and timezone', () => {
    const update = updateShowcaseSchema.parse({
      privacyMeta: 'PUBLIC',
      showAge: true,
      pronouns: '<b>they/them</b>',
      timezone: '<b>UTC+3</b>',
      accentColor: '#6366f1',
    });
    expect(update.pronouns).toBe('they/them');
    expect(update.timezone).toBe('UTC+3');
    expect(update.accentColor).toBe('#6366f1');
  });

  it('validates mediaSearchResultSchema', () => {
    const res = mediaSearchResultSchema.parse({
      id: 'media-1',
      title: 'Spirited Away',
      posterUrl: 'https://example.com/poster.jpg',
      type: 'ANIME',
      releaseYear: 2001,
      rating: 8.6,
    });
    expect(res.id).toBe('media-1');
  });

  it('validates profileShowcaseSchema', () => {
    const showcase = profileShowcaseSchema.parse({
      id: 'sc-1',
      userId: 'u-1',
      hasVisibleWidgets: true,
      relationship: 'PUBLIC',
      privacyMeta: 'PUBLIC',
      privacyActivity: 'PUBLIC',
      privacyShowcase: 'PUBLIC',
      privacyLinks: 'PUBLIC',
      accentColor: '#10b981',
      showAge: true,
      showBirthdate: false,
      showGender: true,
      showTimezone: true,
      mediaItems: [],
    });
    expect(showcase.id).toBe('sc-1');
  });
});
