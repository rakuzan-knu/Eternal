import { ShowcaseMediaType } from '@backend/common/contracts';
import type { MediaModalItem } from './useMediaDetailModalStore';

export interface SimilarMediaItem {
  id?: string;
  title: string;
  posterUrl: string;
  type: ShowcaseMediaType;
  rating?: number;
  releaseYear?: number;
  subtitle?: string;
}

export interface MediaDetailPayload {
  title: string;
  subtitle: string;
  rank: number;
  miniPosterUrl: string;
  bannerUrl?: string;
  videoUrl: string;
  videoDuration: string;
  videoThumbnail: string;
  screenshots: string[];
  description: string;
  platformButton: {
    label: string;
    type:
      | 'steam'
      | 'riot'
      | 'battlenet'
      | 'epic'
      | 'minecraft'
      | 'roblox'
      | 'anilist'
      | 'tmdb'
      | 'crunchyroll'
      | 'netflix'
      | 'web'
      | 'myanimelist'
      | 'mal'
      | 'imdb';
    url: string;
  };
  reviews: {
    recentReviews?: {
      label: string;
      count: string;
      tone: 'mixed' | 'positive' | 'mostly-positive' | 'overwhelmingly-positive';
    };
    languageReviews?: {
      label: string;
      language: string;
      count: string;
      tone: 'mixed' | 'positive' | 'mostly-positive' | 'overwhelmingly-positive';
    };
    openCritic?: {
      tier: 'MIGHTY' | 'STRONG' | 'FAIR' | 'TOP 100';
      score: number;
    };
    metacritic?: number;
    userScore?: number;
  };
  details: {
    genres: string;
    publisher: string;
    developer: string;
    releaseDate: string;
    platform: string;
    socialLinks: {
      web?: string;
      facebook?: string;
      twitter?: string;
      instagram?: string;
      youtube?: string;
      reddit?: string;
      twitch?: string;
    };
    metadataSource: {
      name: string;
      url: string;
    };
    developerClaimUrl?: string;
  };
  similarItems: SimilarMediaItem[];
}

import { CURATED_MEDIA_CATALOG_PART1 } from './curatedMediaCatalogPart1';
import { CURATED_MEDIA_CATALOG_PART2 } from './curatedMediaCatalogPart2';

export const CURATED_MEDIA_CATALOG: Record<string, MediaDetailPayload> = {
  ...CURATED_MEDIA_CATALOG_PART1,
  ...CURATED_MEDIA_CATALOG_PART2,
};

/**
 * Deterministically generates a rich 1-to-1 MediaDetailPayload for ANY item
 * so even custom or unlisted titles render completely without empty holes.
 */
export function getMediaDetails(item: MediaModalItem): MediaDetailPayload {
  const normTitle = (item.title || '').trim().toLowerCase();

  const ALIAS_MAP: Record<string, string> = {
    sao: 'sword art online',
    cs2: 'counter-strike 2',
    'cs:go': 'counter-strike 2',
    csgo: 'counter-strike 2',
    'counter-strike': 'counter-strike 2',
    'the witcher 3': 'the witcher 3: wild hunt',
    'witcher 3': 'the witcher 3: wild hunt',
    'baldurs gate 3': "baldur's gate 3",
    'gta 5': 'grand theft auto v',
    'gta v': 'grand theft auto v',
    'dark souls 3': 'dark souls iii',
    ds3: 'dark souls iii',
    'demon slayer': 'demon slayer: kimetsu no yaiba',
    kuroko: "kuroko's basketball",
    'kuroko no basket': "kuroko's basketball",
    "kuroko's basketball": "kuroko's basketball",
    'kuroko’s basketball': "kuroko's basketball",
    "kuroko's bassketball": "kuroko's basketball",
    dmc5: 'devil may cry 5',
    'dmc 5': 'devil may cry 5',
    'mobile legends': 'mobile legends: bang bang',
    mlbb: 'mobile legends: bang bang',
    haikyuu: 'haikyuu!!',
    haikyu: 'haikyuu!!',
    kirito: 'sword art online',
    'code geass: lelouch of the rebellion': 'code geass: lelouch of the rebellion',
    lelouch: 'code geass: lelouch of the rebellion',
    'great teacher onizuka (gto)': 'great teacher onizuka (gto)',
    onizuka: 'great teacher onizuka (gto)',
    gto: 'great teacher onizuka (gto)',
    'hunter x hunter (2011)': 'hunter x hunter (2011)',
    hxh: 'hunter x hunter (2011)',
    'spirited away': 'spirited away',
    'tengen toppa gurren lagann': 'tengen toppa gurren lagann',
    berserk: 'berserk',
    guts: 'berserk',
    'steins;gate': 'steins;gate',
    'steins gate': 'steins;gate',
    'one piece': 'one piece',
    luffy: 'one piece',
    "frieren: beyond journey's end": "frieren: beyond journey's end",
    frieren: "frieren: beyond journey's end",
    gintama: 'gintama',
    'vinland saga': 'vinland saga',
    'basketball kuroko': "kuroko's basketball",
    'your name (kimi no na wa)': 'your name (kimi no na wa)',
    'kimi no na wa': 'your name (kimi no na wa)',
    'a silent voice (koe no katachi)': 'a silent voice (koe no katachi)',
    'voice shape': 'a silent voice (koe no katachi)',
    'koe no katachi': 'a silent voice (koe no katachi)',
    volleyball: 'haikyuu!!',
    'naruto: shippuden': 'naruto: shippuden',
    naruto: 'naruto: shippuden',
    'boruto: naruto next generations': 'boruto: naruto next generations',
    boruto: 'boruto: naruto next generations',
    'bleach: thousand-year blood war': 'bleach',
    bleach: 'bleach',
    'mob psycho 100': 'mob psycho 100',
    'mob psycho': 'mob psycho 100',
    'one punch man': 'one punch man',
    're:zero - starting life in another world': 're:zero - starting life in another world',
    're:zero': 're:zero - starting life in another world',
    monster: 'monster',
    'grand blue dreaming': 'grand blue dreaming',
    'the endless ocean': 'grand blue dreaming',
    'grand blue': 'grand blue dreaming',
    'chainsaw man': 'chainsaw man',
    'hellsing ultimate': 'hellsing ultimate',
    hellsing: 'hellsing ultimate',
    'initial d first stage': 'initial d first stage',
    ae86: 'initial d first stage',
    'initial d': 'initial d first stage',
    dororo: 'dororo',
    'solo leveling': 'solo leveling',
    'magic battle': 'jujutsu kaisen',
    'the disappearance of haruhi suzumiya': 'the disappearance of haruhi suzumiya',
    haruhi: 'the disappearance of haruhi suzumiya',
    'rascal does not dream of bunny girl senpai': 'rascal does not dream of bunny girl senpai',
    'bunny girl senpai': 'rascal does not dream of bunny girl senpai',
    'dreaming girl': 'rascal does not dream of bunny girl senpai',
    'the tunnel to summer, the exit of goodbyes': 'the tunnel to summer, the exit of goodbyes',
    'tunnel into summer': 'the tunnel to summer, the exit of goodbyes',
    'exit of farewells': 'the tunnel to summer, the exit of goodbyes',
    'k-on!': 'k-on!',
    kayon: 'k-on!',
    keion: 'k-on!',
    'k-on': 'k-on!',
    'spy x family': 'spy x family',
    'spy family': 'spy x family',
    overlord: 'overlord',
    'neon genesis evangelion': 'neon genesis evangelion',
    evangelion: 'neon genesis evangelion',
    'that time i got reincarnated as a slime': 'that time i got reincarnated as a slime',
    'reincarnation as a slime': 'that time i got reincarnated as a slime',
    'kaguya-sama: love is war': 'kaguya-sama: love is war',
    'kaguya sama': 'kaguya-sama: love is war',
    'love is war': 'kaguya-sama: love is war',
    'the fragrant flower blooms with dignity': 'the fragrant flower blooms with dignity',
    'fragrant flower blooms with dignity': 'the fragrant flower blooms with dignity',
    'my hero academia': 'my hero academia',
    'my hero': 'my hero academia',
    ', ': 'my hero academia',
    horimiya: 'horimiya',
    horimia: 'horimiya',
    'the angel next door spoils me rotten': 'the angel next door spoils me rotten',
    'the angel next door': 'the angel next door spoils me rotten',
    'soul eater': 'soul eater',
    'classroom of the elite': 'classroom of the elite',
    'welcome to classroom of excellence': 'classroom of the elite',
    'my dress-up darling': 'my dress-up darling',
    'this porcelain doll fell in love': 'my dress-up darling',
    'the quintessential quintuplets': 'the quintessential quintuplets',
    'five brides': 'the quintessential quintuplets',
    quintuplets: 'the quintessential quintuplets',
    'the pet girl of sakurasou': 'the pet girl of sakurasou',
    'the cat from sakurasou': 'the pet girl of sakurasou',
    sakurasou: 'the pet girl of sakurasou',
    'arifureta: from commonplace to world’s strongest':
      'arifureta: from commonplace to world’s strongest',
    arifureta: 'arifureta: from commonplace to world’s strongest',
    "konosuba: god's blessing on this wonderful world!":
      "konosuba: god's blessing on this wonderful world!",
    'the goddess blesses this beautiful world': "konosuba: god's blessing on this wonderful world!",
    konosuba: "konosuba: god's blessing on this wonderful world!",
    'in another world with my smartphone': 'in another world with my smartphone',
    'in another world with a smartphone': 'in another world with my smartphone',
    "wise man's grandchild": "wise man's grandchild",
    'the sage': "wise man's grandchild",
    's grandchild': "wise man's grandchild",
    'the eminence in shadow': 'the eminence in shadow',
    'climbing in the shadows': 'the eminence in shadow',
    'eminence in shadow': 'the eminence in shadow',
    'the rising of the shield hero': 'the rising of the shield hero',
    'death march to the parallel world rhapsody': 'death march to the parallel world rhapsody',
    'death march into the rhapsody of a parallel world':
      'death march to the parallel world rhapsody',
    'is it wrong to try to pick up girls in a dungeon?':
      'is it wrong to try to pick up girls in a dungeon?',
    "maybe i'll meet you in the dungeon": 'is it wrong to try to pick up girls in a dungeon?',
    'the misfit of demon king academy': 'the misfit of demon king academy',
    hyouka: 'hyouka',
    'assassination classroom': 'assassination classroom',
    'assasination classroom': 'assassination classroom',
    'the irregular at magic high school': 'the irregular at magic high school',
    'my teen romantic comedy snafu': 'my teen romantic comedy snafu',
    oregairu: 'my teen romantic comedy snafu',
    'the seven deadly sins': 'the seven deadly sins',
    'fullmetal alchemist: brotherhood': 'fullmetal alchemist: brotherhood',
    fma: 'fullmetal alchemist: brotherhood',
    fmab: 'fullmetal alchemist: brotherhood',
    aot: 'attack on titan',
    "jojo's bizarre adventure": "jojo's bizarre adventure",
    jojo: "jojo's bizarre adventure",

    // Game Aliases
    'cs 1.6': 'counter-strike 1.6',
    'cs1.6': 'counter-strike 1.6',
    '1.6': 'counter-strike 1.6',
    lol: 'league of legends',
    val: 'valorant',
    apex: 'apex legends',
    ow: 'overwatch 2',
    ow2: 'overwatch 2',
    pubg: 'pubg: battlegrounds',
    r6: "tom clancy's rainbow six siege",
    r6s: "tom clancy's rainbow six siege",
    'rainbow six': "tom clancy's rainbow six siege",
    'rainbow six siege': "tom clancy's rainbow six siege",
    finals: 'the finals',
    naraka: 'naraka: bladepoint',
    tf2: 'team fortress 2',
    bg3: "baldur's gate 3",
    wukong: 'black myth: wukong',
    sm2: 'warhammer 40,000: space marine 2',
    'space marine 2': 'warhammer 40,000: space marine 2',
    rdr2: 'red dead redemption 2',
    'rdr 2': 'red dead redemption 2',
    'gta sa': 'grand theft auto: san andreas',
    'san andreas': 'grand theft auto: san andreas',
    skyrim: 'the elder scrolls v: skyrim special edition',
    fallout: 'fallout 4',
    'fallout 4': 'fallout 4',
    'gow ragnarok': 'god of war ragnarök',
    'god of war ragnarok': 'god of war ragnarök',
    gow: 'god of war',
    hogwarts: 'hogwarts legacy',
    'atomic heart': 'atomic heart',
    'stalker 2': 's.t.a.l.k.e.r. 2: heart of chornobyl',
    stalker: 's.t.a.l.k.e.r. 2: heart of chornobyl',
    'diablo 4': 'diablo iv',
    poe: 'path of exile',
    ds2: 'dark souls ii: scholar of the first sin',
    'dark souls 2': 'dark souls ii: scholar of the first sin',
    halo: 'halo: the master chief collection',
    'cod mw3': 'call of duty: modern warfare iii',
    'watch dogs 2': 'watch_dogs 2',
    're village': 'resident evil village',
  };

  const lookupKey = ALIAS_MAP[normTitle] || normTitle;

  // 1. Return exact curated match if available
  if (CURATED_MEDIA_CATALOG[lookupKey]) {
    const curated = CURATED_MEDIA_CATALOG[lookupKey];
    const isWideSteamHeader = Boolean(item.posterUrl && item.posterUrl.includes('/header.jpg'));
    const isGenericFallback = !item.posterUrl || item.posterUrl.includes('apps/570/header.jpg');
    const preferCurated = Boolean(
      curated.miniPosterUrl && (isGenericFallback || isWideSteamHeader || !item.posterUrl),
    );

    return {
      ...curated,
      miniPosterUrl: preferCurated
        ? curated.miniPosterUrl
        : item.posterUrl || curated.miniPosterUrl,
      title: curated.title || item.title,
    };
  }

  // 2. Deterministic generator based on type & title hash
  const title = item.title || 'Untitled';
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const derivedRank = 1 + (absHash % 48);
  const derivedRating = item.rating || Number((7.5 + (absHash % 24) / 10).toFixed(1));
  const openCriticScore = Math.min(98, Math.max(78, Math.round(derivedRating * 10)));
  const derivedReviewsCount = 10000 + (absHash % 90000);

  const isGame = item.type === ShowcaseMediaType.GAME;
  const isAnime = item.type === ShowcaseMediaType.ANIME;
  const isSportsAnime =
    isAnime && /(?:basketball|kuroko|lock|haikyuu|slam|ippo|free|sports)/i.test(title);

  // Curated high-performance direct MP4 streaming trailers (0.1s load time)
  const sampleVideos = isGame
    ? [
        'https://cdn.cloudflare.steamstatic.com/steam/apps/256875461/movie480.mp4', // Elden Ring
        'https://cdn.cloudflare.steamstatic.com/steam/apps/257081132/movie480.mp4', // Cyberpunk 2077
        'https://cdn.cloudflare.steamstatic.com/steam/apps/256692021/movie480.mp4', // Dota 2
        'https://cdn.cloudflare.steamstatic.com/steam/apps/256972298/movie480.mp4', // CS2
        'https://cdn.cloudflare.steamstatic.com/steam/apps/256987424/movie480.mp4', // Baldur's Gate 3
        'https://cdn.cloudflare.steamstatic.com/steam/apps/256927226/movie480.mp4', // The Witcher 3
        'https://cdn.cloudflare.steamstatic.com/steam/apps/256728780/movie480.mp4', // Devil May Cry 5
      ]
    : isAnime
      ? isSportsAnime
        ? [
            'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
          ]
        : [
            'https://cdn.cloudflare.steamstatic.com/steam/apps/256703995/movie480.mp4', // SAO
            'https://cdn.cloudflare.steamstatic.com/steam/apps/256666958/movie480.mp4', // Attack on Titan
            'https://cdn.cloudflare.steamstatic.com/steam/apps/256842621/movie480.mp4', // Demon Slayer
            'https://cdn.cloudflare.steamstatic.com/steam/apps/256974787/movie480.mp4', // Jujutsu Kaisen
          ]
      : [
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/256875461/movie480.mp4',
        ];

  const videoUrl = sampleVideos[absHash % sampleVideos.length];

  // High-definition 1080p screenshots tailored specifically to the medium
  const gameScreenshots = [
    'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/ss_943bf6fe62352757d9070c1d33e50b92fe8539f1.1920x1080.jpg?t=1787868578',
    'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/ss_2f649b68d579bf87011487d29bc4ccbfdd97d34f.1920x1080.jpg?t=1784714077',
    'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/ss_5710298af2318afd9aa72449ef29ac4a2ef64d8e.1920x1080.jpg?t=1788333513',
    'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1086940/ss_c73bc54415178c07fef85f54ee26621728c77504.1920x1080.jpg?t=1777363040',
    'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/570/ss_ad8eee787704745ccdecdfde3a5cd2733704898d.1920x1080.jpg?t=1769535998',
    'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/730/ss_796601d9d67faf53486eeb26d0724347cea67ddc.1920x1080.jpg?t=1784564069',
  ];

  const animeScreenshots = isSportsAnime
    ? [
        'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
        'https://cdn.myanimelist.net/images/anime/1258/126929l.jpg',
        'https://cdn.myanimelist.net/images/anime/11/75274l.jpg',
        'https://cdn.myanimelist.net/images/anime/9/56155l.jpg',
        'https://cdn.myanimelist.net/images/anime/4/68299l.jpg',
        'https://cdn.myanimelist.net/images/anime/10/78663l.jpg',
      ]
    : [
        'https://cdn.myanimelist.net/images/anime/11/39717l.jpg',
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/449800/ss_d97bb3eee60a98e0a040ac0f351504bb5bd68d15.1920x1080.jpg?t=1780891495',
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1490890/ss_098b736d17296bf0d2205795f7e3d5e0210bae42.1920x1080.jpg?t=1762753763',
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1877020/ss_35ba539268b35d55ee204417b1559020603a4eea.1920x1080.jpg?t=1734085250',
        'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/607890/ss_2ec43d93e9fc35865f1a698d02eac771906193c0.1920x1080.jpg?t=1750782337',
      ];

  const cinemaScreenshots = [
    'https://image.tmdb.org/t/p/original/rAiYTnrLEHV4iB4A9Xnwh8n8Keq.jpg',
    'https://image.tmdb.org/t/p/original/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg',
    'https://image.tmdb.org/t/p/original/pbrkL804c8yAv3zBZR4QPEafpAR.jpg',
    'https://image.tmdb.org/t/p/original/rLb2cw0iwgfFQMs900oo7j3UQ9.jpg',
    'https://image.tmdb.org/t/p/original/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg',
  ];

  const selectedPool = isGame ? gameScreenshots : isAnime ? animeScreenshots : cinemaScreenshots;
  const screenshots = [item.posterUrl, ...selectedPool].filter(Boolean);

  const subtitle =
    item.subtitle ||
    (isGame
      ? 'Action, Adventure, RPG'
      : isAnime
        ? 'Shounen, Fantasy, Action'
        : 'Drama, Thriller, Sci-Fi');

  const defaultDescription =
    item.userComment ||
    `${title} offers an immersive experience featuring rich narratives, distinct art direction, and memorable characters. Enjoyed by millions of fans worldwide with ongoing updates and a dedicated community.`;

  const platformButtonType = isGame ? 'steam' : isAnime ? 'anilist' : 'tmdb';

  const platformButtonLabel = isGame ? 'Steam' : isAnime ? 'AniList' : 'TMDB';

  const similarItems: SimilarMediaItem[] = isGame
    ? [
        {
          title: 'Elden Ring',
          posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
          type: ShowcaseMediaType.GAME,
          rating: 9.7,
          releaseYear: 2022,
          subtitle: 'Souls-like, RPG',
        },
        {
          title: 'Cyberpunk 2077',
          posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
          type: ShowcaseMediaType.GAME,
          rating: 9.0,
          releaseYear: 2020,
          subtitle: 'RPG, Open World',
        },
        {
          title: 'The Witcher 3: Wild Hunt',
          posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg',
          type: ShowcaseMediaType.GAME,
          rating: 9.8,
          releaseYear: 2015,
          subtitle: 'Action RPG',
        },
        {
          title: "Baldur's Gate 3",
          posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg',
          type: ShowcaseMediaType.GAME,
          rating: 9.6,
          releaseYear: 2023,
          subtitle: 'CRPG, Adventure',
        },
      ]
    : isAnime
      ? [
          {
            title: 'Attack on Titan',
            posterUrl: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
            type: ShowcaseMediaType.ANIME,
            rating: 9.2,
            releaseYear: 2013,
            subtitle: 'Action, Drama',
          },
          {
            title: 'Death Note',
            posterUrl: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg',
            type: ShowcaseMediaType.ANIME,
            rating: 9.1,
            releaseYear: 2006,
            subtitle: 'Thriller, Mystery',
          },
          {
            title: 'Jujutsu Kaisen',
            posterUrl: 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
            type: ShowcaseMediaType.ANIME,
            rating: 8.9,
            releaseYear: 2020,
            subtitle: 'Supernatural',
          },
          {
            title: 'Demon Slayer: Kimetsu no Yaiba',
            posterUrl: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
            type: ShowcaseMediaType.ANIME,
            rating: 9.0,
            releaseYear: 2019,
            subtitle: 'Action, Demons',
          },
        ]
      : [
          {
            title: 'Interstellar',
            posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
            type: ShowcaseMediaType.MOVIE,
            rating: 8.7,
            releaseYear: 2014,
            subtitle: 'Sci-Fi, Drama',
          },
          {
            title: 'Oppenheimer',
            posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
            type: ShowcaseMediaType.MOVIE,
            rating: 8.9,
            releaseYear: 2023,
            subtitle: 'Biography, Drama',
          },
          {
            title: 'Dune: Part Two',
            posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
            type: ShowcaseMediaType.MOVIE,
            rating: 9.6,
            releaseYear: 2024,
            subtitle: 'Sci-Fi, Adventure',
          },
        ];

  return {
    title,
    subtitle,
    rank: derivedRank,
    miniPosterUrl: item.posterUrl,
    bannerUrl: item.customBannerUrl || item.posterUrl,
    videoUrl,
    videoDuration: '0:48',
    videoThumbnail: item.posterUrl,
    screenshots,
    description: defaultDescription,
    platformButton: {
      label: platformButtonLabel,
      type: platformButtonType,
      url: item.externalUrl || 'https://store.steampowered.com/',
    },
    reviews: {
      recentReviews: {
        label: isGame ? 'Recent Reviews' : 'Audience Rating',
        count: isGame
          ? `Very Positive (${derivedReviewsCount.toLocaleString()})`
          : `${derivedRating} / 10`,
        tone: 'mostly-positive',
      },
      languageReviews: {
        label: isGame ? 'English Language Reviews' : 'All Reviews',
        language: 'English',
        count: `Very Positive (${(derivedReviewsCount * 5).toLocaleString()})`,
        tone: 'mostly-positive',
      },
      openCritic: {
        tier: 'MIGHTY',
        score: openCriticScore,
      },
    },
    details: {
      genres: subtitle,
      publisher: isGame
        ? 'Official Publisher'
        : isAnime
          ? 'Studio Production'
          : 'Production Studio',
      developer: isGame
        ? 'Lead Development Team'
        : isAnime
          ? 'Animation Studio'
          : 'Director / Creators',
      releaseDate: item.releaseYear ? `October 15, ${item.releaseYear}` : 'October 10, 2020',
      platform: isGame ? 'PC (Windows, Steam)' : isAnime ? 'TV, Streaming' : 'Theaters, Streaming',
      socialLinks: {
        web: item.externalUrl || undefined,
        facebook: 'https://facebook.com',
        twitter: 'https://x.com',
        instagram: 'https://instagram.com',
        youtube: 'https://youtube.com',
        reddit: 'https://reddit.com',
        twitch: isGame ? 'https://twitch.tv' : undefined,
      },
      metadataSource: {
        name: isGame ? 'IGDB' : isAnime ? 'AniList' : 'TMDB',
        url:
          item.externalUrl ||
          (isGame
            ? 'https://www.igdb.com'
            : isAnime
              ? 'https://anilist.co'
              : 'https://www.themoviedb.org'),
      },
      developerClaimUrl: isGame ? 'https://partner.steamgames.com/' : undefined,
    },
    similarItems,
  };
}
