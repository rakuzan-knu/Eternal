import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../redis/redis.service';
import {
  ShowcaseMediaType,
  type MediaSearchResultDto,
  type MediaDetailsResponseDto,
  sanitizePlainText,
} from '@common/contracts';
import { SoundCloudService } from '../integrations/soundcloud.service';

interface AniListMedia {
  id: number;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  coverImage?: {
    large?: string;
    extraLarge?: string;
  };
  averageScore?: number;
  seasonYear?: number;
  startDate?: {
    year?: number;
  };
  siteUrl?: string;
}

const POPULAR_GAMES_DATABASE: MediaSearchResultDto[] = [
  // --- Esports & Competitive ---
  {
    id: 'game-dota2',
    title: 'Dota 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
    releaseYear: 2013,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/570/Dota_2/',
  },
  {
    id: 'game-cs2',
    title: 'Counter-Strike 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
    releaseYear: 2023,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/730/CounterStrike_2/',
  },
  {
    id: 'game-csgo',
    title: 'Counter-Strike: Global Offensive',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
    releaseYear: 2012,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/730/CounterStrike_2/',
  },
  {
    id: 'game-cs16',
    title: 'Counter-Strike 1.6',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/10/header.jpg',
    releaseYear: 2000,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/10/CounterStrike/',
  },
  {
    id: 'game-lol',
    title: 'League of Legends',
    posterUrl:
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2009,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://www.leagueoflegends.com/',
  },
  {
    id: 'game-valorant',
    title: 'Valorant',
    posterUrl:
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2020,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://playvalorant.com/',
  },
  {
    id: 'game-deadlock',
    title: 'Deadlock',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1422450/header.jpg',
    releaseYear: 2024,
    rating: 9.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1422450/Deadlock/',
  },
  {
    id: 'game-fortnite',
    title: 'Fortnite',
    posterUrl:
      'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2017,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://www.fortnite.com/',
  },
  {
    id: 'game-apex',
    title: 'Apex Legends',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1172470/header.jpg',
    releaseYear: 2019,
    rating: 8.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1172470/Apex_Legends/',
  },
  {
    id: 'game-overwatch2',
    title: 'Overwatch 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2357570/header.jpg',
    releaseYear: 2022,
    rating: 8.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2357570/Overwatch_2/',
  },
  {
    id: 'game-rocketleague',
    title: 'Rocket League',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/252950/header.jpg',
    releaseYear: 2015,
    rating: 9.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://www.rocketleague.com/',
  },
  {
    id: 'game-pubg',
    title: 'PUBG: BATTLEGROUNDS',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/578080/header.jpg',
    releaseYear: 2017,
    rating: 8.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/578080/PUBG_BATTLEGROUNDS/',
  },
  {
    id: 'game-r6siege',
    title: "Tom Clancy's Rainbow Six Siege",
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/359550/header.jpg',
    releaseYear: 2015,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/359550/Tom_Clancys_Rainbow_Six_Siege/',
  },
  {
    id: 'game-thefinals',
    title: 'THE FINALS',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2073850/header.jpg',
    releaseYear: 2023,
    rating: 8.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2073850/THE_FINALS/',
  },
  {
    id: 'game-deltaforce',
    title: 'Delta Force',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2507950/header.jpg',
    releaseYear: 2024,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2507950/Delta_Force/',
  },
  {
    id: 'game-naraka',
    title: 'NARAKA: BLADEPOINT',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1203220/header.jpg',
    releaseYear: 2021,
    rating: 8.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1203220/NARAKA_BLADEPOINT/',
  },
  {
    id: 'game-brawlhalla',
    title: 'Brawlhalla',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/291550/header.jpg',
    releaseYear: 2017,
    rating: 8.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/291550/Brawlhalla/',
  },
  {
    id: 'game-smite',
    title: 'SMITE',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/386360/header.jpg',
    releaseYear: 2015,
    rating: 8.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/386360/SMITE/',
  },
  {
    id: 'game-tf2',
    title: 'Team Fortress 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/440/header.jpg',
    releaseYear: 2007,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/440/Team_Fortress_2/',
  },
  {
    id: 'game-aimlabs',
    title: 'Aimlabs',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/714010/header.jpg',
    releaseYear: 2023,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/714010/Aimlabs/',
  },

  // --- RPG, Action & Open World ---
  {
    id: 'game-eldenring',
    title: 'ELDEN RING',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
    releaseYear: 2022,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1245620/ELDEN_RING/',
  },
  {
    id: 'game-bg3',
    title: "Baldur's Gate 3",
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg',
    releaseYear: 2023,
    rating: 9.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1086940/Baldurs_Gate_3/',
  },
  {
    id: 'game-wukong',
    title: 'Black Myth: Wukong',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2358720/header.jpg',
    releaseYear: 2024,
    rating: 9.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2358720/Black_Myth_Wukong/',
  },
  {
    id: 'game-spacemarine2',
    title: 'Warhammer 40,000: Space Marine 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2183900/header.jpg',
    releaseYear: 2024,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2183900/Warhammer_40000_Space_Marine_2/',
  },
  {
    id: 'game-rdr2',
    title: 'Red Dead Redemption 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg',
    releaseYear: 2019,
    rating: 9.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1174180/Red_Dead_Redemption_2/',
  },
  {
    id: 'game-gta5',
    title: 'Grand Theft Auto V',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg',
    releaseYear: 2015,
    rating: 9.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/271590/Grand_Theft_Auto_V/',
  },
  {
    id: 'game-gtasa',
    title: 'Grand Theft Auto: San Andreas',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/12120/header.jpg',
    releaseYear: 2004,
    rating: 9.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/12120/Grand_Theft_Auto_San_Andreas/',
  },
  {
    id: 'game-cyberpunk',
    title: 'Cyberpunk 2077',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
    releaseYear: 2020,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/',
  },
  {
    id: 'game-witcher3',
    title: 'The Witcher 3: Wild Hunt',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg',
    releaseYear: 2015,
    rating: 9.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/292030/The_Witcher_3_Wild_Hunt/',
  },
  {
    id: 'game-skyrim',
    title: 'The Elder Scrolls V: Skyrim Special Edition',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/489830/header.jpg',
    releaseYear: 2016,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl:
      'https://store.steampowered.com/app/489830/The_Elder_Scrolls_V_Skyrim_Special_Edition/',
  },
  {
    id: 'game-fallout4',
    title: 'Fallout 4',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/377160/header.jpg',
    releaseYear: 2015,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/377160/Fallout_4/',
  },
  {
    id: 'game-godofwar-ragnarok',
    title: 'God of War Ragnarök',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2322010/header.jpg',
    releaseYear: 2024,
    rating: 9.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2322010/God_of_War_Ragnarok/',
  },
  {
    id: 'game-godofwar',
    title: 'God of War',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1593500/header.jpg',
    releaseYear: 2022,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1593500/God_of_War/',
  },
  {
    id: 'game-hogwarts',
    title: 'Hogwarts Legacy',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/990080/header.jpg',
    releaseYear: 2023,
    rating: 9.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/990080/Hogwarts_Legacy/',
  },
  {
    id: 'game-atomicheart',
    title: 'Atomic Heart',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/668580/header.jpg',
    releaseYear: 2023,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/668580/Atomic_Heart/',
  },
  {
    id: 'game-stalker2',
    title: 'S.T.A.L.K.E.R. 2: Heart of Chornobyl',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1643320/header.jpg',
    releaseYear: 2024,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1643320/STALKER_2_Heart_of_Chornobyl/',
  },
  {
    id: 'game-metroexodus',
    title: 'Metro Exodus',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/412020/header.jpg',
    releaseYear: 2019,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/412020/Metro_Exodus/',
  },
  {
    id: 'game-diablo4',
    title: 'Diablo IV',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2344520/header.jpg',
    releaseYear: 2023,
    rating: 8.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2344520/Diablo_IV/',
  },
  {
    id: 'game-pathofexile',
    title: 'Path of Exile',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/238960/header.jpg',
    releaseYear: 2013,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/238960/Path_of_Exile/',
  },
  {
    id: 'game-darksouls3',
    title: 'Dark Souls III',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/374320/header.jpg',
    releaseYear: 2016,
    rating: 9.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/374320/DARK_SOULS_III/',
  },
  {
    id: 'game-darksouls2',
    title: 'Dark Souls II: Scholar of the First Sin',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/335300/header.jpg',
    releaseYear: 2015,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl:
      'https://store.steampowered.com/app/335300/DARK_SOULS_II_Scholar_of_the_First_Sin/',
  },
  {
    id: 'game-dmc5',
    title: 'Devil May Cry 5',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/601150/header.jpg',
    releaseYear: 2019,
    rating: 9.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/601150/Devil_May_Cry_5/',
  },
  {
    id: 'game-detroit',
    title: 'Detroit: Become Human',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1222140/header.jpg',
    releaseYear: 2020,
    rating: 9.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1222140/Detroit_Become_Human/',
  },
  {
    id: 'game-destiny2',
    title: 'Destiny 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1085660/header.jpg',
    releaseYear: 2019,
    rating: 8.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1085660/Destiny_2/',
  },
  {
    id: 'game-warframe',
    title: 'Warframe',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/230410/header.jpg',
    releaseYear: 2013,
    rating: 9.0,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/230410/Warframe/',
  },
  {
    id: 'game-halo',
    title: 'Halo: The Master Chief Collection',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/976730/header.jpg',
    releaseYear: 2019,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/976730/Halo_The_Master_Chief_Collection/',
  },
  {
    id: 'game-titanfall2',
    title: 'Titanfall 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1237970/header.jpg',
    releaseYear: 2020,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1237970/Titanfall_2/',
  },
  {
    id: 'game-cod-mw3',
    title: 'Call of Duty: Modern Warfare III',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2519060/header.jpg',
    releaseYear: 2023,
    rating: 8.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2519060/Call_of_Duty_Modern_Warfare_III/',
  },
  {
    id: 'game-borderlands3',
    title: 'Borderlands 3',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/397540/header.jpg',
    releaseYear: 2020,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/397540/Borderlands_3/',
  },
  {
    id: 'game-batman',
    title: 'Batman: Arkham Knight',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/208650/header.jpg',
    releaseYear: 2015,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/208650/Batman_Arkham_Knight/',
  },
  {
    id: 'game-watchdogs2',
    title: 'Watch_Dogs 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/447040/header.jpg',
    releaseYear: 2016,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/447040/Watch_Dogs_2/',
  },
  {
    id: 'game-ac-odyssey',
    title: "Assassin's Creed Odyssey",
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/812140/header.jpg',
    releaseYear: 2018,
    rating: 9.0,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/812140/Assassins_Creed_Odyssey/',
  },

  // --- Gacha, Anime & Asian ARPG ---
  {
    id: 'game-genshin',
    title: 'Genshin Impact',
    posterUrl:
      'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2020,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://genshin.hoyoverse.com/',
  },
  {
    id: 'game-hsr',
    title: 'Honkai: Star Rail',
    posterUrl:
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2023,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://hsr.hoyoverse.com/',
  },
  {
    id: 'game-zzz',
    title: 'Zenless Zone Zero',
    posterUrl:
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2024,
    rating: 9.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://zenless.hoyoverse.com/',
  },
  {
    id: 'game-wuwa',
    title: 'Wuthering Waves',
    posterUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2024,
    rating: 9.0,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://wutheringwaves.kurogames.com/',
  },
  {
    id: 'game-blackdesert',
    title: 'Black Desert',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/582660/header.jpg',
    releaseYear: 2017,
    rating: 8.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/582660/Black_Desert/',
  },
  {
    id: 'game-wherewindsmeet',
    title: 'Where Winds Meet',
    posterUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2024,
    rating: 9.0,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://www.wherewindsmeetgame.com/',
  },
  {
    id: 'game-crimsondesert',
    title: 'Crimson Desert',
    posterUrl:
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2025,
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://crimsondesert.pearlabyss.com/',
  },

  // --- MMO & Online Worlds ---
  {
    id: 'game-wow',
    title: 'World of Warcraft',
    posterUrl:
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2004,
    rating: 9.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://worldofwarcraft.blizzard.com/',
  },
  {
    id: 'game-eso',
    title: 'The Elder Scrolls Online',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/306130/header.jpg',
    releaseYear: 2014,
    rating: 8.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/306130/The_Elder_Scrolls_Online/',
  },
  {
    id: 'game-albion',
    title: 'Albion Online',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/761890/header.jpg',
    releaseYear: 2017,
    rating: 8.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/761890/Albion_Online/',
  },
  {
    id: 'game-hearthstone',
    title: 'Hearthstone',
    posterUrl:
      'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2014,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://hearthstone.blizzard.com/',
  },
  {
    id: 'game-wot',
    title: 'World of Tanks',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1407200/header.jpg',
    releaseYear: 2010,
    rating: 8.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1407200/World_of_Tanks/',
  },
  {
    id: 'game-warthunder',
    title: 'War Thunder',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/236390/header.jpg',
    releaseYear: 2013,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/236390/War_Thunder/',
  },
  {
    id: 'game-trove',
    title: 'Trove',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/304050/header.jpg',
    releaseYear: 2015,
    rating: 8.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/304050/Trove/',
  },
  {
    id: 'game-vrchat',
    title: 'VRChat',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/438100/header.jpg',
    releaseYear: 2017,
    rating: 9.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/438100/VRChat/',
  },
  {
    id: 'game-roblox',
    title: 'ROBLOX',
    posterUrl:
      'https://images.unsplash.com/photo-1612287233207-6f81c967520e?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2006,
    rating: 8.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://www.roblox.com/',
  },
  {
    id: 'game-gmod',
    title: "Garry's Mod",
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/4000/header.jpg',
    releaseYear: 2006,
    rating: 9.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/4000/Garrys_Mod/',
  },

  // --- Co-Op, Survival & Indie Hits ---
  {
    id: 'game-minecraft',
    title: 'Minecraft',
    posterUrl:
      'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2011,
    rating: 9.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://www.minecraft.net/',
  },
  {
    id: 'game-terraria',
    title: 'Terraria',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/105600/header.jpg',
    releaseYear: 2011,
    rating: 9.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/105600/Terraria/',
  },
  {
    id: 'game-stardew',
    title: 'Stardew Valley',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/413150/header.jpg',
    releaseYear: 2016,
    rating: 9.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/413150/Stardew_Valley/',
  },
  {
    id: 'game-rust',
    title: 'Rust',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/252490/header.jpg',
    releaseYear: 2018,
    rating: 8.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/252490/Rust/',
  },
  {
    id: 'game-dayz',
    title: 'DayZ',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/221100/header.jpg',
    releaseYear: 2018,
    rating: 8.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/221100/DayZ/',
  },
  {
    id: 'game-tarkov',
    title: 'Escape from Tarkov',
    posterUrl:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2017,
    rating: 9.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://www.escapefromtarkov.com/',
  },
  {
    id: 'game-valheim',
    title: 'Valheim',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/892970/header.jpg',
    releaseYear: 2021,
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/892970/Valheim/',
  },
  {
    id: 'game-palworld',
    title: 'Palworld',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1623730/header.jpg',
    releaseYear: 2024,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1623730/Palworld/',
  },
  {
    id: 'game-lethalcompany',
    title: 'Lethal Company',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1966720/header.jpg',
    releaseYear: 2023,
    rating: 9.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1966720/Lethal_Company/',
  },
  {
    id: 'game-chainedtogether',
    title: 'Chained Together',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2567870/header.jpg',
    releaseYear: 2024,
    rating: 9.0,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2567870/Chained_Together/',
  },
  {
    id: 'game-phasmophobia',
    title: 'Phasmophobia',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/739630/header.jpg',
    releaseYear: 2020,
    rating: 9.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/739630/Phasmophobia/',
  },
  {
    id: 'game-deadbydaylight',
    title: 'Dead by Daylight',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/381210/header.jpg',
    releaseYear: 2016,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/381210/Dead_by_Daylight/',
  },
  {
    id: 'game-deeprock',
    title: 'Deep Rock Galactic',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/548430/header.jpg',
    releaseYear: 2020,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/548430/Deep_Rock_Galactic/',
  },
  {
    id: 'game-seaofthieves',
    title: 'Sea of Thieves',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1172620/header.jpg',
    releaseYear: 2020,
    rating: 9.0,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1172620/Sea_of_Thieves/',
  },
  {
    id: 'game-zomboid',
    title: 'Project Zomboid',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/108600/header.jpg',
    releaseYear: 2013,
    rating: 9.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/108600/Project_Zomboid/',
  },
  {
    id: 'game-theforest',
    title: 'The Forest',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/242760/header.jpg',
    releaseYear: 2018,
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/242760/The_Forest/',
  },
  {
    id: 'game-raft',
    title: 'Raft',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/648800/header.jpg',
    releaseYear: 2022,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/648800/Raft/',
  },
  {
    id: 'game-ark',
    title: 'ARK: Survival Evolved',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/346110/header.jpg',
    releaseYear: 2017,
    rating: 8.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/346110/ARK_Survival_Evolved/',
  },
  {
    id: 'game-7daystodie',
    title: '7 Days to Die',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/251570/header.jpg',
    releaseYear: 2013,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/251570/7_Days_to_Die/',
  },
  {
    id: 'game-dontstarve',
    title: "Don't Starve Together",
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/322330/header.jpg',
    releaseYear: 2016,
    rating: 9.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/322330/Dont_Starve_Together/',
  },
  {
    id: 'game-subnautica',
    title: 'Subnautica',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/264710/header.jpg',
    releaseYear: 2018,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/264710/Subnautica/',
  },
  {
    id: 'game-subnautica-belowzero',
    title: 'Subnautica: Below Zero',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/848450/header.jpg',
    releaseYear: 2021,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/848450/Subnautica_Below_Zero/',
  },
  {
    id: 'game-dyinglight',
    title: 'Dying Light',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/239140/header.jpg',
    releaseYear: 2015,
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/239140/Dying_Light/',
  },
  {
    id: 'game-left4dead2',
    title: 'Left 4 Dead 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/550/header.jpg',
    releaseYear: 2009,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/550/Left_4_Dead_2/',
  },
  {
    id: 'game-payday2',
    title: 'PAYDAY 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/218620/header.jpg',
    releaseYear: 2013,
    rating: 9.0,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/218620/PAYDAY_2/',
  },
  {
    id: 'game-killingfloor2',
    title: 'Killing Floor 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/232090/header.jpg',
    releaseYear: 2016,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/232090/Killing_Floor_2/',
  },
  {
    id: 'game-readyornot',
    title: 'Ready or Not',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1144200/header.jpg',
    releaseYear: 2023,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1144200/Ready_or_Not/',
  },
  {
    id: 'game-barony',
    title: 'Barony',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/371970/header.jpg',
    releaseYear: 2015,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/371970/Barony/',
  },
  {
    id: 'game-unturned',
    title: 'Unturned',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/304930/header.jpg',
    releaseYear: 2014,
    rating: 9.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/304930/Unturned/',
  },
  {
    id: 'game-deadcells',
    title: 'Dead Cells',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/588650/header.jpg',
    releaseYear: 2018,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/588650/Dead_Cells/',
  },
  {
    id: 'game-undertale',
    title: 'Undertale',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/391540/header.jpg',
    releaseYear: 2015,
    rating: 9.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/391540/Undertale/',
  },
  {
    id: 'game-portal2',
    title: 'Portal 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/620/header.jpg',
    releaseYear: 2011,
    rating: 9.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/620/Portal_2/',
  },
  {
    id: 'game-halflife2',
    title: 'Half-Life 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/220/header.jpg',
    releaseYear: 2004,
    rating: 9.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/220/HalfLife_2/',
  },

  // --- Casual, Party & Strategy ---
  {
    id: 'game-amongus',
    title: 'Among Us',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/945360/header.jpg',
    releaseYear: 2018,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/945360/Among_Us/',
  },
  {
    id: 'game-fallguys',
    title: 'Fall Guys',
    posterUrl:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2020,
    rating: 8.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://www.fallguys.com/',
  },
  {
    id: 'game-stumbleguys',
    title: 'Stumble Guys',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1677740/header.jpg',
    releaseYear: 2021,
    rating: 8.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1677740/Stumble_Guys/',
  },
  {
    id: 'game-sims4',
    title: 'The Sims 4',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1222670/header.jpg',
    releaseYear: 2014,
    rating: 8.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1222670/The_Sims_4/',
  },
  {
    id: 'game-geometrydash',
    title: 'Geometry Dash',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/322170/header.jpg',
    releaseYear: 2014,
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/322170/Geometry_Dash/',
  },
  {
    id: 'game-btd6',
    title: 'Bloons TD 6',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/960090/header.jpg',
    releaseYear: 2018,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/960090/Bloons_TD_6/',
  },
  {
    id: 'game-pvz',
    title: 'Plants vs. Zombies GOTY Edition',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/3590/header.jpg',
    releaseYear: 2009,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/3590/Plants_vs_Zombies_GOTY_Edition/',
  },
  {
    id: 'game-osu',
    title: 'osu!',
    posterUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2007,
    rating: 9.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://osu.ppy.sh/',
  },
  {
    id: 'game-factorio',
    title: 'Factorio',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/427520/header.jpg',
    releaseYear: 2020,
    rating: 9.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/427520/Factorio/',
  },
  {
    id: 'game-mindustry',
    title: 'Mindustry',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1127400/header.jpg',
    releaseYear: 2019,
    rating: 9.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1127400/Mindustry/',
  },
  {
    id: 'game-rimworld',
    title: 'RimWorld',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/294100/header.jpg',
    releaseYear: 2018,
    rating: 9.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/294100/RimWorld/',
  },
  {
    id: 'game-frostpunk',
    title: 'Frostpunk',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/323190/header.jpg',
    releaseYear: 2018,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/323190/Frostpunk/',
  },
  {
    id: 'game-civ6',
    title: "Sid Meier's Civilization VI",
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/289070/header.jpg',
    releaseYear: 2016,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/289070/Sid_Meiers_Civilization_VI/',
  },
  {
    id: 'game-civ5',
    title: "Sid Meier's Civilization V",
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/8930/header.jpg',
    releaseYear: 2010,
    rating: 9.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/8930/Sid_Meiers_Civilization_V/',
  },
  {
    id: 'game-hoi4',
    title: 'Hearts of Iron IV',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/394360/header.jpg',
    releaseYear: 2016,
    rating: 9.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/394360/Hearts_of_Iron_IV/',
  },
  {
    id: 'game-ck3',
    title: 'Crusader Kings III',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1158310/header.jpg',
    releaseYear: 2020,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1158310/Crusader_Kings_III/',
  },
  {
    id: 'game-mountandblade2',
    title: 'Mount & Blade II: Bannerlord',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/261550/header.jpg',
    releaseYear: 2022,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/261550/Mount__Blade_II_Bannerlord/',
  },
  {
    id: 'game-totalwar-rome2',
    title: 'Total War: ROME II - Emperor Edition',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/214950/header.jpg',
    releaseYear: 2013,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/214950/Total_War_ROME_II__Emperor_Edition/',
  },
  {
    id: 'game-celltosingularity',
    title: 'Cell to Singularity - Evolution Never Ends',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/977400/header.jpg',
    releaseYear: 2021,
    rating: 9.1,
    type: ShowcaseMediaType.GAME,
    externalUrl:
      'https://store.steampowered.com/app/977400/Cell_to_Singularity__Evolution_Never_Ends/',
  },

  // --- Racing & Simulation ---
  {
    id: 'game-forzahorizon5',
    title: 'Forza Horizon 5',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1551360/header.jpg',
    releaseYear: 2021,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1551360/Forza_Horizon_5/',
  },
  {
    id: 'game-forzahorizon4',
    title: 'Forza Horizon 4',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1293830/header.jpg',
    releaseYear: 2018,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1293830/Forza_Horizon_4/',
  },
  {
    id: 'game-forzahorizon6',
    title: 'Forza Horizon 6',
    posterUrl:
      'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2025,
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://forza.net/',
  },
  {
    id: 'game-beamng',
    title: 'BeamNG.drive',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/284160/header.jpg',
    releaseYear: 2015,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/284160/BeamNGdrive/',
  },
  {
    id: 'game-assettocorsa',
    title: 'Assetto Corsa',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/244210/header.jpg',
    releaseYear: 2014,
    rating: 9.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/244210/Assetto_Corsa/',
  },
  {
    id: 'game-iracing',
    title: 'iRacing',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/266410/header.jpg',
    releaseYear: 2015,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/266410/iRacing/',
  },
  {
    id: 'game-ets2',
    title: 'Euro Truck Simulator 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/227300/header.jpg',
    releaseYear: 2012,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/227300/Euro_Truck_Simulator_2/',
  },
  {
    id: 'game-thecrew2',
    title: 'The Crew 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/646910/header.jpg',
    releaseYear: 2018,
    rating: 8.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/646910/The_Crew_2/',
  },
  {
    id: 'game-nfs-mostwanted',
    title: 'Need for Speed: Most Wanted',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1262560/header.jpg',
    releaseYear: 2012,
    rating: 8.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1262560/Need_for_Speed_Most_Wanted/',
  },
  {
    id: 'game-nfs-heat',
    title: 'Need for Speed Heat',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1222680/header.jpg',
    releaseYear: 2019,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1222680/Need_for_Speed_Heat/',
  },
  {
    id: 'game-nfs-unbound',
    title: 'Need for Speed Unbound',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1846380/header.jpg',
    releaseYear: 2022,
    rating: 8.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1846380/Need_for_Speed_Unbound/',
  },

  // --- Franchises: Mafia, Battlefield, Far Cry, Resident Evil ---
  {
    id: 'game-mafia1',
    title: 'Mafia: Definitive Edition',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1030840/header.jpg',
    releaseYear: 2020,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1030840/Mafia_Definitive_Edition/',
  },
  {
    id: 'game-mafia2',
    title: 'Mafia II: Definitive Edition',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1030830/header.jpg',
    releaseYear: 2020,
    rating: 8.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1030830/Mafia_II_Definitive_Edition/',
  },
  {
    id: 'game-mafia3',
    title: 'Mafia III: Definitive Edition',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/360430/header.jpg',
    releaseYear: 2020,
    rating: 7.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/360430/Mafia_III_Definitive_Edition/',
  },
  {
    id: 'game-bf1',
    title: 'Battlefield 1',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1238840/header.jpg',
    releaseYear: 2016,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1238840/Battlefield_1/',
  },
  {
    id: 'game-bf3',
    title: 'Battlefield 3',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1238820/header.jpg',
    releaseYear: 2011,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1238820/Battlefield_3/',
  },
  {
    id: 'game-bf4',
    title: 'Battlefield 4',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1238860/header.jpg',
    releaseYear: 2013,
    rating: 9.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1238860/Battlefield_4/',
  },
  {
    id: 'game-bf5',
    title: 'Battlefield V',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1238810/header.jpg',
    releaseYear: 2018,
    rating: 8.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1238810/Battlefield_V/',
  },
  {
    id: 'game-bf6',
    title: 'Battlefield 2042',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1517290/header.jpg',
    releaseYear: 2021,
    rating: 7.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1517290/Battlefield_2042/',
  },
  {
    id: 'game-farcry3',
    title: 'Far Cry 3',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/220240/header.jpg',
    releaseYear: 2012,
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/220240/Far_Cry_3/',
  },
  {
    id: 'game-farcry5',
    title: 'Far Cry 5',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/552520/header.jpg',
    releaseYear: 2018,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/552520/Far_Cry_5/',
  },
  {
    id: 'game-farcry6',
    title: 'Far Cry 6',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2369390/header.jpg',
    releaseYear: 2021,
    rating: 8.4,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2369390/Far_Cry_6/',
  },
  {
    id: 'game-justcause3',
    title: 'Just Cause 3',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/225540/header.jpg',
    releaseYear: 2015,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/225540/Just_Cause_3/',
  },
  {
    id: 'game-justcause4',
    title: 'Just Cause 4 Reloaded',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/517630/header.jpg',
    releaseYear: 2018,
    rating: 8.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/517630/Just_Cause_4_Reloaded/',
  },
  {
    id: 'game-arma3',
    title: 'Arma 3',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/107410/header.jpg',
    releaseYear: 2013,
    rating: 9.3,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/107410/Arma_3/',
  },
  {
    id: 'game-mkx',
    title: 'Mortal Kombat X',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/307780/header.jpg',
    releaseYear: 2015,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/307780/Mortal_Kombat_X/',
  },
  {
    id: 'game-alanwake',
    title: 'Alan Wake',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/108710/header.jpg',
    releaseYear: 2012,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/108710/Alan_Wake/',
  },

  // --- Resident Evil Franchise ---
  {
    id: 'game-re1',
    title: 'Resident Evil / biohazard HD REMASTER',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/304240/header.jpg',
    releaseYear: 2015,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/304240/Resident_Evil/',
  },
  {
    id: 'game-re2',
    title: 'Resident Evil 2',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/883710/header.jpg',
    releaseYear: 2019,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/883710/Resident_Evil_2/',
  },
  {
    id: 'game-re3',
    title: 'Resident Evil 3',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/952060/header.jpg',
    releaseYear: 2020,
    rating: 8.6,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/952060/Resident_Evil_3/',
  },
  {
    id: 'game-re4',
    title: 'Resident Evil 4',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/2050650/header.jpg',
    releaseYear: 2023,
    rating: 9.7,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/2050650/Resident_Evil_4/',
  },
  {
    id: 'game-re5',
    title: 'Resident Evil 5',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/21690/header.jpg',
    releaseYear: 2009,
    rating: 8.8,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/21690/Resident_Evil_5/',
  },
  {
    id: 'game-re6',
    title: 'Resident Evil 6',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/221040/header.jpg',
    releaseYear: 2013,
    rating: 8.0,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/221040/Resident_Evil_6/',
  },
  {
    id: 'game-re7',
    title: 'Resident Evil 7 Biohazard',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/418370/header.jpg',
    releaseYear: 2017,
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/418370/Resident_Evil_7_Biohazard/',
  },
  {
    id: 'game-revillage',
    title: 'Resident Evil Village',
    posterUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1196590/header.jpg',
    releaseYear: 2021,
    rating: 9.5,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/app/1196590/Resident_Evil_Village/',
  },

  // --- Upcoming & Cult Hype ---
  {
    id: 'game-arcraiders',
    title: 'ARC Raiders',
    posterUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2025,
    rating: 9.2,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://arcraiders.com/',
  },
  {
    id: 'game-repo',
    title: 'R.E.P.O.',
    posterUrl:
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2025,
    rating: 9.0,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/',
  },
  {
    id: 'game-peak',
    title: 'Peak',
    posterUrl:
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2025,
    rating: 9.0,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/',
  },
  {
    id: 'game-echoesofaincrad',
    title: 'Echoes of Aincrad',
    posterUrl:
      'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2025,
    rating: 9.1,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/',
  },
  {
    id: 'game-mechachameleon',
    title: 'MECHA CHAMELEON',
    posterUrl:
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    releaseYear: 2025,
    rating: 8.9,
    type: ShowcaseMediaType.GAME,
    externalUrl: 'https://store.steampowered.com/',
  },
];

const POPULAR_ANIME_DATABASE: Array<MediaSearchResultDto & { aliases?: string[] }> = [
  {
    id: 'anime-sao',
    title: 'Sword Art Online',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/11/39717l.jpg',
    releaseYear: 2012,
    rating: 8.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/11757/Sword_Art_Online',
    aliases: ['sao', 'kirito'],
  },
  {
    id: 'anime-codegeass',
    title: 'Code Geass: Lelouch of the Rebellion',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/4/9391l.jpg',
    releaseYear: 2006,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/1575/Code_Geass__Hangyaku_no_Lelouch',
    aliases: ['lelouch'],
  },
  {
    id: 'anime-gto',
    title: 'Great Teacher Onizuka (GTO)',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/13/11460l.jpg',
    releaseYear: 1999,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/245/Great_Teacher_Onizuka',
    aliases: ['onizuka', 'gto'],
  },
  {
    id: 'anime-hxh',
    title: 'Hunter x Hunter (2011)',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1337/99013l.jpg',
    releaseYear: 2011,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/11061/Hunter_x_Hunter_2011',
    aliases: ['hxh'],
  },
  {
    id: 'anime-spiritedaway',
    title: 'Spirited Away',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/6/79597l.jpg',
    releaseYear: 2001,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/199/Sen_to_Chihiro_no_Kamikakushi',
    aliases: [],
  },
  {
    id: 'anime-gurrenlagann',
    title: 'Tengen Toppa Gurren Lagann',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/4/5123l.jpg',
    releaseYear: 2007,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/2001/Tengen_Toppa_Gurren_Lagann',
    aliases: [],
  },
  {
    id: 'anime-berserk',
    title: 'Berserk',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/79352l.jpg',
    releaseYear: 1997,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/33/Kenpuu_Denki_Berserk',
    aliases: ['guts'],
  },
  {
    id: 'anime-steinsgate',
    title: 'Steins;Gate',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1935/127974l.jpg',
    releaseYear: 2011,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/9253/Steins_Gate',
    aliases: ['steins gate'],
  },
  {
    id: 'anime-onepiece',
    title: 'One Piece',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg',
    releaseYear: 1999,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/21/One_Piece',
    aliases: ['luffy'],
  },
  {
    id: 'anime-frieren',
    title: "Frieren: Beyond Journey's End",
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
    releaseYear: 2023,
    rating: 9.9,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/52991/Sousou_no_Frieren',
    aliases: ['frieren'],
  },
  {
    id: 'anime-gintama',
    title: 'Gintama',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/73249l.jpg',
    releaseYear: 2006,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/918/Gintama',
    aliases: [],
  },
  {
    id: 'anime-vinlandsaga',
    title: 'Vinland Saga',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1500/103005l.jpg',
    releaseYear: 2019,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/37521/Vinland_Saga',
    aliases: [],
  },
  {
    id: 'anime-kuroko',
    title: "Kuroko's Basketball",
    posterUrl: 'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
    releaseYear: 2012,
    rating: 9.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/11771/Kuroko_no_Basket',
    aliases: ['basketball kuroko'],
  },
  {
    id: 'anime-yourname',
    title: 'Your Name (Kimi no Na wa)',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/5/87048l.jpg',
    releaseYear: 2016,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/32281/Kimi_no_Na_wa',
    aliases: ['kimi no na wa'],
  },
  {
    id: 'anime-bluelock',
    title: 'Blue Lock',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1258/126926l.jpg',
    releaseYear: 2022,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/49596/Blue_Lock',
    aliases: ['blue lock'],
  },
  {
    id: 'anime-deathnote',
    title: 'Death Note',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg',
    releaseYear: 2006,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/1535/Death_Note',
    aliases: ['death note'],
  },
  {
    id: 'anime-asilentvoice',
    title: 'A Silent Voice (Koe no Katachi)',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1122/96481l.jpg',
    releaseYear: 2016,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/28851/Koe_no_Katachi',
    aliases: ['voice shape', 'koe no katachi'],
  },
  {
    id: 'anime-haikyuu',
    title: 'Haikyuu!!',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/7/76014l.jpg',
    releaseYear: 2014,
    rating: 9.5,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/20583/Haikyuu',
    aliases: ['volleyball', 'haikyuu'],
  },
  {
    id: 'anime-naruto',
    title: 'Naruto: Shippuden',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/13/17405l.jpg',
    releaseYear: 2007,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/1735/Naruto__Shippuuden',
    aliases: ['naruto'],
  },
  {
    id: 'anime-boruto',
    title: 'Boruto: Naruto Next Generations',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/9/84460l.jpg',
    releaseYear: 2017,
    rating: 8.0,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/34566/Boruto__Naruto_Next_Generations',
    aliases: ['boruto'],
  },
  {
    id: 'anime-bleach',
    title: 'Bleach: Thousand-Year Blood War',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1764/126627l.jpg',
    releaseYear: 2022,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/41467/Bleach__Sennen_Kessen-hen',
    aliases: ['bleach', 'bleach: thousand-year blood war'],
  },
  {
    id: 'anime-mobpsycho',
    title: 'Mob Psycho 100',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/80356l.jpg',
    releaseYear: 2016,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/32182/Mob_Psycho_100',
    aliases: ['mob psycho'],
  },
  {
    id: 'anime-onepunchman',
    title: 'One Punch Man',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/12/76049l.jpg',
    releaseYear: 2015,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/30276/One_Punch_Man',
    aliases: ['one punch man'],
  },
  {
    id: 'anime-rezero',
    title: 'Re:Zero - Starting Life in Another World',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1522/128039l.jpg',
    releaseYear: 2016,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/31240/Re_Zero_kara_Hajimeru_Isekai_Seikatsu',
    aliases: ['re:zero'],
  },
  {
    id: 'anime-monster',
    title: 'Monster',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/67341l.jpg',
    releaseYear: 2004,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/19/Monster',
    aliases: ['monster'],
  },
  {
    id: 'anime-grandblue',
    title: 'Grand Blue Dreaming',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1792/93740l.jpg',
    releaseYear: 2018,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/37105/Grand_Blue',
    aliases: ['the endless ocean', 'grand blue'],
  },
  {
    id: 'anime-chainsawman',
    title: 'Chainsaw Man',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',
    releaseYear: 2022,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/44511/Chainsaw_Man',
    aliases: [],
  },
  {
    id: 'anime-demonslayer',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
    releaseYear: 2019,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/38000/Kimetsu_no_Yaiba',
    aliases: ['demon slayer'],
  },
  {
    id: 'anime-hellsing',
    title: 'Hellsing Ultimate',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/6/73245l.jpg',
    releaseYear: 2006,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/777/Hellsing_Ultimate',
    aliases: ['hellsing'],
  },
  {
    id: 'anime-initiald',
    title: 'Initial D First Stage',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/13/21303l.jpg',
    releaseYear: 1998,
    rating: 9.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/185/Initial_D_First_Stage',
    aliases: ['ae86', 'initial d'],
  },
  {
    id: 'anime-dororo',
    title: 'Dororo',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1879/95833l.jpg',
    releaseYear: 2019,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/37520/Dororo',
    aliases: ['dororo'],
  },
  {
    id: 'anime-sololeveling',
    title: 'Solo Leveling',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1598/141846l.jpg',
    releaseYear: 2024,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/52299/Ore_dake_Level_Up_na_Ken',
    aliases: ['solo leveling'],
  },
  {
    id: 'anime-jujutsukaisen',
    title: 'Jujutsu Kaisen',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
    releaseYear: 2020,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/40748/Jujutsu_Kaisen',
    aliases: ['magic battle', 'jujutsu kaisen'],
  },
  {
    id: 'anime-haruhi',
    title: 'The Disappearance of Haruhi Suzumiya',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1749/119934l.jpg',
    releaseYear: 2010,
    rating: 9.5,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/7311/Suzumiya_Haruhi_no_Shoushitsu',
    aliases: ['haruhi'],
  },
  {
    id: 'anime-bunnygirl',
    title: 'Rascal Does Not Dream of Bunny Girl Senpai',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1301/93586l.jpg',
    releaseYear: 2018,
    rating: 9.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl:
      'https://myanimelist.net/anime/37450/Seishun_Buta_Yarou_wa_Bunny_Girl_Senpai_no_Yume_wo_Minai',
    aliases: ['bunny girl senpai', 'dreaming girl'],
  },
  {
    id: 'anime-tunneltosummer',
    title: 'The Tunnel to Summer, the Exit of Goodbyes',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1761/123168l.jpg',
    releaseYear: 2022,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/50593/Natsu_e_no_Tunnel_Sayonara_no_Deguchi',
    aliases: ['tunnel into summer', 'exit of farewells'],
  },
  {
    id: 'anime-kon',
    title: 'K-ON!',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/76120l.jpg',
    releaseYear: 2009,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/5680/K-On',
    aliases: ['kayon', 'keion', 'k-on'],
  },
  {
    id: 'anime-spyfamily',
    title: 'SPY x FAMILY',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1441/122795l.jpg',
    releaseYear: 2022,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/50265/Spy_x_Family',
    aliases: ['spy family', 'spy x family'],
  },
  {
    id: 'anime-overlord',
    title: 'Overlord',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/7/88019l.jpg',
    releaseYear: 2015,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/29803/Overlord',
    aliases: ['overlord'],
  },
  {
    id: 'anime-evangelion',
    title: 'Neon Genesis Evangelion',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1314/108941l.jpg',
    releaseYear: 1995,
    rating: 9.5,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/30/Neon_Genesis_Evangelion',
    aliases: ['evangelion'],
  },
  {
    id: 'anime-slime',
    title: 'That Time I Got Reincarnated as a Slime',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1694/93337l.jpg',
    releaseYear: 2018,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/37430/Tensei_shitara_Slime_Datta_Ken',
    aliases: ['reincarnation as a slime'],
  },
  {
    id: 'anime-kaguya',
    title: 'Kaguya-sama: Love is War',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1295/106551l.jpg',
    releaseYear: 2019,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl:
      'https://myanimelist.net/anime/37999/Kaguya-sama_wa_Kokurasetai__Tensai-tachi_no_Renai_Zunousen',
    aliases: ['kaguya sama', 'love is war'],
  },
  {
    id: 'anime-fragrantflower',
    title: 'The Fragrant Flower Blooms With Dignity',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1230/145610l.jpg',
    releaseYear: 2025,
    rating: 9.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/59784/Kaoru_Hana_wa_Rin_to_Saku',
    aliases: ['fragrant flower blooms with dignity'],
  },
  {
    id: 'anime-mha',
    title: 'My Hero Academia',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
    releaseYear: 2016,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/31964/Boku_no_Hero_Academia',
    aliases: ["my hero's academy", 'mha'],
  },
  {
    id: 'anime-horimiya',
    title: 'Horimiya',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1695/111486l.jpg',
    releaseYear: 2021,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/42897/Horimiya',
    aliases: ['horimia', 'horimiya'],
  },
  {
    id: 'anime-angelnextdoor',
    title: 'The Angel Next Door Spoils Me Rotten',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1580/129373l.jpg',
    releaseYear: 2023,
    rating: 9.0,
    type: ShowcaseMediaType.ANIME,
    externalUrl:
      'https://myanimelist.net/anime/50739/Otonari_no_Tenshi-sama_ni_Itsunomanika_Dame_Ningen_ni_Sareteita_Ken',
    aliases: ['the angel next door'],
  },
  {
    id: 'anime-souleater',
    title: 'Soul Eater',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/9/7804l.jpg',
    releaseYear: 2008,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/3588/Soul_Eater',
    aliases: ['soul eater'],
  },
  {
    id: 'anime-classroomelite',
    title: 'Classroom of the Elite',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/5/86830l.jpg',
    releaseYear: 2017,
    rating: 9.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl:
      'https://myanimelist.net/anime/35507/Youkoso_Jitsuryoku_Shijou_Shugi_no_Kyoushitsu_e',
    aliases: ['welcome to classroom of excellence', 'classroom of the elite'],
  },
  {
    id: 'anime-dressupdarling',
    title: 'My Dress-Up Darling',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1179/119897l.jpg',
    releaseYear: 2022,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/48736/Sono_Bisque_Doll_wa_Koi_wo_Suru',
    aliases: ['this porcelain doll fell in love', 'my dress-up darling'],
  },
  {
    id: 'anime-quintuplets',
    title: 'The Quintessential Quintuplets',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1824/96982l.jpg',
    releaseYear: 2019,
    rating: 9.0,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/38101/5-toubun_no_Hanayome',
    aliases: ['five brides', 'quintuplets'],
  },
  {
    id: 'anime-sakurasou',
    title: 'The Pet Girl of Sakurasou',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/4/43643l.jpg',
    releaseYear: 2012,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/13759/Sakurasou_no_Pet_na_Kanojo',
    aliases: ['the cat from sakurasou', 'sakurasou'],
  },
  {
    id: 'anime-arifureta',
    title: 'Arifureta: From Commonplace to World’s Strongest',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1805/101859l.jpg',
    releaseYear: 2019,
    rating: 8.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/36882/Arifureta_Shokugyou_de_Sekai_Saikyou',
    aliases: ['arifureta'],
  },
  {
    id: 'anime-konosuba',
    title: "KonoSuba: God's Blessing on this Wonderful World!",
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/77838l.jpg',
    releaseYear: 2016,
    rating: 9.5,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/30831/Kono_Subarashii_Sekai_ni_Shukufuku_wo',
    aliases: ['the goddess blesses this beautiful world', 'konosuba'],
  },
  {
    id: 'anime-smartphone',
    title: 'In Another World With My Smartphone',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/87340l.jpg',
    releaseYear: 2017,
    rating: 8.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/35203/Isekai_wa_Smartphone_to_Tomo_ni',
    aliases: ['in another world with a smartphone'],
  },
  {
    id: 'anime-wisemansgrandchild',
    title: "Wise Man's Grandchild",
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1183/98338l.jpg',
    releaseYear: 2019,
    rating: 8.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/36407/Kenja_no_Mago',
    aliases: ["the sage's grandson", "wise man's grandchild"],
  },
  {
    id: 'anime-eminenceinshadow',
    title: 'The Eminence in Shadow',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1874/121869l.jpg',
    releaseYear: 2022,
    rating: 9.5,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/48316/Kage_no_Jitsuryokusha_ni_Naritakute',
    aliases: ['climbing in the shadows', 'eminence in shadow'],
  },
  {
    id: 'anime-shieldhero',
    title: 'The Rising of the Shield Hero',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1490/101365l.jpg',
    releaseYear: 2019,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/35790/Tate_no_Yuusha_no_Nariagari',
    aliases: ['the rising of the shield hero'],
  },
  {
    id: 'anime-deathmarch',
    title: 'Death March to the Parallel World Rhapsody',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/89907l.jpg',
    releaseYear: 2018,
    rating: 8.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl:
      'https://myanimelist.net/anime/34497/Death_March_kara_Hajimaru_Isekai_Kyousoukyoku',
    aliases: ['death march into the rhapsody of a parallel world'],
  },
  {
    id: 'anime-danmachi',
    title: 'Is It Wrong to Try to Pick Up Girls in a Dungeon?',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/2/70187l.jpg',
    releaseYear: 2015,
    rating: 9.0,
    type: ShowcaseMediaType.ANIME,
    externalUrl:
      'https://myanimelist.net/anime/28121/Dungeon_ni_Deai_wo_Motomeru_no_wa_Machigatteiru_Darou_ka',
    aliases: ["maybe i'll meet you in the dungeon", 'danmachi'],
  },
  {
    id: 'anime-demonkingacademy',
    title: 'The Misfit of Demon King Academy',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1449/108428l.jpg',
    releaseYear: 2020,
    rating: 8.9,
    type: ShowcaseMediaType.ANIME,
    externalUrl:
      'https://myanimelist.net/anime/40496/Maou_Gakuin_no_Futekigousha__Shijou_Saikyou_no_Maou_no_Shiso_Tensei_shite_Shison-tachi_no_Gakkou_e_Kayou',
    aliases: ['the misfit of demon king academy'],
  },
  {
    id: 'anime-hyouka',
    title: 'Hyouka',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/13/37087l.jpg',
    releaseYear: 2012,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/12189/Hyouka',
    aliases: ['hyouka'],
  },
  {
    id: 'anime-assassinationclassroom',
    title: 'Assassination Classroom',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/5/75810l.jpg',
    releaseYear: 2015,
    rating: 9.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/24833/Ansatsu_Kyoushitsu',
    aliases: ['assasination classroom', 'assassination classroom'],
  },
  {
    id: 'anime-magichighschool',
    title: 'The Irregular at Magic High School',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/11/64019l.jpg',
    releaseYear: 2014,
    rating: 8.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/20785/Mahouka_Koukou_no_Rettousei',
    aliases: ['the irregular at magic high school'],
  },
  {
    id: 'anime-oregairu',
    title: 'My Teen Romantic Comedy SNAFU',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/12/49605l.jpg',
    releaseYear: 2013,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl:
      'https://myanimelist.net/anime/14813/Yahari_Ore_no_Seishun_Love_Comedy_wa_Machigatteiru',
    aliases: ['my teen romantic comedy snafu', 'oregairu'],
  },
  {
    id: 'anime-sevendeadlysins',
    title: 'The Seven Deadly Sins',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/65409l.jpg',
    releaseYear: 2014,
    rating: 9.0,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/23755/Nanatsu_no_Taizai',
    aliases: ['the seven deadly sins'],
  },
  {
    id: 'anime-fmab',
    title: 'Fullmetal Alchemist: Brotherhood',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1223/96541l.jpg',
    releaseYear: 2009,
    rating: 9.9,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/5114/Fullmetal_Alchemist__Brotherhood',
    aliases: ['fma', 'fmab'],
  },
  {
    id: 'anime-aot',
    title: 'Attack on Titan',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
    releaseYear: 2013,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/16498/Shingeki_no_Kyojin',
    aliases: ['attack on titan', 'aot'],
  },
  {
    id: 'anime-jojo',
    title: "JoJo's Bizarre Adventure",
    posterUrl: 'https://cdn.myanimelist.net/images/anime/3/40409l.jpg',
    releaseYear: 2012,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/14719/JoJo_no_Kimyou_na_Bouken_TV',
    aliases: ['jojo'],
  },
];

const POPULAR_CINEMA_DATABASE: Array<MediaSearchResultDto & { aliases?: string[] }> = [
  {
    id: 'movie-godfather',
    title: 'The Godfather',
    posterUrl: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    releaseYear: 1972,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0068646/',
    aliases: ['godfather'],
  },
  {
    id: 'movie-dune2',
    title: 'Dune: Part Two',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    releaseYear: 2024,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt15239678/',
    aliases: ['dune'],
  },
  {
    id: 'movie-matrix',
    title: 'The Matrix',
    posterUrl: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    releaseYear: 1999,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0133093/',
    aliases: ['matrix', 'neo'],
  },
  {
    id: 'movie-trumanshow',
    title: 'The Truman Show',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vuza0WqY239yBNa1n7BTRo99ho1.jpg',
    releaseYear: 1998,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0120382/',
    aliases: ['the truman show'],
  },
  {
    id: 'movie-gladiator',
    title: 'Gladiator',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
    releaseYear: 2000,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0172495/',
    aliases: ['gladiator'],
  },
  {
    id: 'movie-oppenheimer',
    title: 'Oppenheimer',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    releaseYear: 2023,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt15398776/',
    aliases: ['oppenheimer'],
  },
  {
    id: 'movie-terminator2',
    title: 'Terminator 2: Judgment Day',
    posterUrl: 'https://image.tmdb.org/t/p/w500/5M0j0B18abtBI5em2Gq4HBACj6c.jpg',
    releaseYear: 1991,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0103064/',
    aliases: ['terminator'],
  },
  {
    id: 'movie-mrbean',
    title: 'Mr. Bean',
    posterUrl: 'https://image.tmdb.org/t/p/w500/5m1h277252F7eR11uM7yv8Wk9lG.jpg',
    releaseYear: 1997,
    rating: 9.1,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0118689/',
    aliases: ['mr. bean', 'mr bean'],
  },
  {
    id: 'movie-indianajones',
    title: 'Indiana Jones and the Last Crusade',
    posterUrl: 'https://image.tmdb.org/t/p/w500/4p1N2Qrt8j0E79vBLLaoRJq4Ns7.jpg',
    releaseYear: 1989,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0097576/',
    aliases: ['indiana jones'],
  },
  {
    id: 'movie-forrestgump',
    title: 'Forrest Gump',
    posterUrl: 'https://image.tmdb.org/t/p/w500/arw2VCBveWOVZr6pxd9XTd1TdQa.jpg',
    releaseYear: 1994,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0109830/',
    aliases: ['forrest gump', 'forest gump'],
  },
  {
    id: 'movie-lotr-rotk',
    title: 'The Lord of the Rings: The Return of the King',
    posterUrl: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
    releaseYear: 2003,
    rating: 9.9,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0167260/',
    aliases: ['lotr', 'the lord of the rings'],
  },
  {
    id: 'movie-backtothefuture',
    title: 'Back to the Future',
    posterUrl: 'https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg',
    releaseYear: 1985,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0088763/',
    aliases: ['back to the future'],
  },
  {
    id: 'movie-avengers-endgame',
    title: 'Avengers: Endgame',
    posterUrl: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    releaseYear: 2019,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt4154796/',
    aliases: ['avengers', 'endgame'],
  },
  {
    id: 'movie-avengers-infinitywar',
    title: 'Avengers: Infinity War',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
    releaseYear: 2018,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt4154756/',
    aliases: ['infinity war'],
  },
  {
    id: 'movie-braveheart',
    title: 'Braveheart',
    posterUrl: 'https://image.tmdb.org/t/p/w500/or1gBugydmjToAEqDpHTj3Xumq4.jpg',
    releaseYear: 1995,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0112573/',
    aliases: ['braveheart', 'brave heart'],
  },
  {
    id: 'movie-goodwillhunting',
    title: 'Good Will Hunting',
    posterUrl: 'https://image.tmdb.org/t/p/w500/bABFGqqQtNqIo49F00UIe2x6C8L.jpg',
    releaseYear: 1997,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0119217/',
    aliases: ['good will hunting'],
  },
  {
    id: 'movie-greenmile',
    title: 'The Green Mile',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8VG8fDNiy50H4Fed0wSVmdnLiOH.jpg',
    releaseYear: 1999,
    rating: 9.9,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0120689/',
    aliases: ['the green mile'],
  },
  {
    id: 'movie-starwars5',
    title: 'Star Wars: Episode V - The Empire Strikes Back',
    posterUrl: 'https://image.tmdb.org/t/p/w500/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg',
    releaseYear: 1980,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0080684/',
    aliases: ['star wars'],
  },
  {
    id: 'movie-interstellar',
    title: 'Interstellar',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    releaseYear: 2014,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0816692/',
    aliases: ['interstellar'],
  },
  {
    id: 'movie-psycho',
    title: 'Psycho',
    posterUrl: 'https://image.tmdb.org/t/p/w500/yz4555KyHGkhxwh9R1KtLYe4nUQ.jpg',
    releaseYear: 1960,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0054215/',
    aliases: ['psycho'],
  },
  {
    id: 'movie-fightclub',
    title: 'Fight Club',
    posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    releaseYear: 1999,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0137523/',
    aliases: ['fight club'],
  },
  {
    id: 'movie-darkknight',
    title: 'The Dark Knight',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    releaseYear: 2008,
    rating: 9.9,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0468569/',
    aliases: ['the dark knight', 'batman'],
  },
  {
    id: 'movie-joker',
    title: 'Joker',
    posterUrl: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg',
    releaseYear: 2019,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt7286456/',
    aliases: ['joker'],
  },
  {
    id: 'series-strangerthings',
    title: 'Stranger Things',
    posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    releaseYear: 2016,
    rating: 9.5,
    type: ShowcaseMediaType.SERIES,
    externalUrl: 'https://www.imdb.com/title/tt4574334/',
    aliases: ['stranger things', 'stranger'],
  },
  {
    id: 'movie-prestige',
    title: 'The Prestige',
    posterUrl: 'https://image.tmdb.org/t/p/w500/bdN3gXuIZYaJP7ftKK2sU0nPtEA.jpg',
    releaseYear: 2006,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0482571/',
    aliases: ['the prestige'],
  },
  {
    id: 'movie-alien',
    title: 'Alien',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg',
    releaseYear: 1979,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0078748/',
    aliases: ['alien'],
  },
  {
    id: 'movie-intouchables',
    title: 'The Intouchables (1+1)',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1QUeLdhpR9WJ09pU1Q835N2p0wG.jpg',
    releaseYear: 2011,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1675434/',
    aliases: ['1+1', 'the intouchables'],
  },
  {
    id: 'movie-walle',
    title: 'WALL-E',
    posterUrl: 'https://image.tmdb.org/t/p/w500/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg',
    releaseYear: 2008,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0910970/',
    aliases: ['wall-e', 'walle'],
  },
  {
    id: 'movie-lionking',
    title: 'The Lion King',
    posterUrl: 'https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg',
    releaseYear: 1994,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0110357/',
    aliases: ['the lion king'],
  },
  {
    id: 'movie-shutterisland',
    title: 'Shutter Island',
    posterUrl: 'https://image.tmdb.org/t/p/w500/4GDy0PHYX3VRXUtwK5ysagvkiv5.jpg',
    releaseYear: 2010,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1130884/',
    aliases: ['shutter island'],
  },
  {
    id: 'movie-coco',
    title: 'Coco',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg',
    releaseYear: 2017,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt2380307/',
    aliases: ['coco', 'the secret of coco'],
  },
  {
    id: 'movie-shrek',
    title: 'Shrek',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg',
    releaseYear: 2001,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0126029/',
    aliases: ['shrek'],
  },
  {
    id: 'movie-harrypotter1',
    title: "Harry Potter and the Sorcerer's Stone",
    posterUrl: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
    releaseYear: 2001,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0241527/',
    aliases: ['harry potter'],
  },
  {
    id: 'movie-homealone',
    title: 'Home Alone',
    posterUrl: 'https://image.tmdb.org/t/p/w500/9wSbe4CwObACCQva6ioq3z6DV01.jpg',
    releaseYear: 1990,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0099785/',
    aliases: ['home alone'],
  },
  {
    id: 'movie-zootopia',
    title: 'Zootopia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/hlK0e0wAQ3VLuJcsFFZysFiFi5t.jpg',
    releaseYear: 2016,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt2948356/',
    aliases: ['zootopia'],
  },
  {
    id: 'movie-monstersinc',
    title: 'Monsters, Inc.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/sgheTspFnyHwRz937zN1bK659w5.jpg',
    releaseYear: 2001,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0198781/',
    aliases: ['monsters inc'],
  },
  {
    id: 'movie-titanic',
    title: 'Titanic',
    posterUrl: 'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
    releaseYear: 1997,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0120338/',
    aliases: ['titanic'],
  },
  {
    id: 'movie-ratatouille',
    title: 'Ratatouille',
    posterUrl: 'https://image.tmdb.org/t/p/w500/npHNjldbeTHdKKw28bJKs7lzWRj.jpg',
    releaseYear: 2007,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0382932/',
    aliases: ['ratatouille'],
  },
  {
    id: 'movie-httyd',
    title: 'How to Train Your Dragon',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ygGmAO60t8GyqUo9xYeYxSZAR3b.jpg',
    releaseYear: 2010,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0892769/',
    aliases: ['how to train your dragon'],
  },
  {
    id: 'movie-hachiko',
    title: "Hachi: A Dog's Tale",
    posterUrl: 'https://image.tmdb.org/t/p/w500/1X6hZ1sW1jF3jO3Zp9qW4V1n5wG.jpg',
    releaseYear: 2009,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1028532/',
    aliases: ['hachiko', 'hachi'],
  },
  {
    id: 'movie-sherlock',
    title: 'Sherlock Holmes',
    posterUrl: 'https://image.tmdb.org/t/p/w500/momkKuWburNTqKBF6ez7rvhYVhE.jpg',
    releaseYear: 2009,
    rating: 9.4,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0988045/',
    aliases: ['sherlock holmes'],
  },
  {
    id: 'movie-pirates',
    title: 'Pirates of the Caribbean: The Curse of the Black Pearl',
    posterUrl: 'https://image.tmdb.org/t/p/w500/z8onk7LV9M9z9zT76TeKJ96TQmu.jpg',
    releaseYear: 2003,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0325980/',
    aliases: ['pirates of caribbean'],
  },
  {
    id: 'movie-spiderverse',
    title: 'Spider-Man: Into the Spider-Verse',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
    releaseYear: 2018,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt4633694/',
    aliases: ['spider man', 'spider-man'],
  },
  {
    id: 'movie-fordvsferrari',
    title: 'Ford v Ferrari',
    posterUrl: 'https://image.tmdb.org/t/p/w500/6ApDtO7xaAKR9vfa6k4q9QvA09j.jpg',
    releaseYear: 2019,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1950186/',
    aliases: ['ford vs ferrari'],
  },
  {
    id: 'movie-aladdin',
    title: 'Aladdin',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vL5LR60FXgl42N7N5Lg3K789w5L.jpg',
    releaseYear: 1992,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0103639/',
    aliases: ['alladin', 'aladdin'],
  },
  {
    id: 'movie-goodfellas',
    title: 'Goodfellas',
    posterUrl: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kcuo.jpg',
    releaseYear: 1990,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0099685/',
    aliases: ['goodfellas'],
  },
  {
    id: 'movie-up',
    title: 'Up',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vpbaStTMt8qqgE2daU0BNekAhxU.jpg',
    releaseYear: 2009,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1049413/',
    aliases: ['up'],
  },
  {
    id: 'movie-granturismo',
    title: 'Gran Turismo',
    posterUrl: 'https://image.tmdb.org/t/p/w500/51tqzRtKMMFEYUpSY9UN57G4jnv.jpg',
    releaseYear: 2023,
    rating: 9.1,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1320261/',
    aliases: ['gran turismo'],
  },
  {
    id: 'series-f1',
    title: 'Formula 1: Drive to Survive',
    posterUrl: 'https://image.tmdb.org/t/p/w500/84s0L6P7rM8oZ4f0Kk8e3E9F8lK.jpg',
    releaseYear: 2019,
    rating: 9.4,
    type: ShowcaseMediaType.SERIES,
    externalUrl: 'https://www.imdb.com/title/tt8289930/',
    aliases: ['formula 1', 'f1', 'drive to survive'],
  },
  {
    id: 'movie-treasureisland',
    title: 'Treasure Island',
    posterUrl: 'https://image.tmdb.org/t/p/w500/2L23f9vA6oO6o61qT26n8p9O1w.jpg',
    releaseYear: 1988,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0122295/',
    aliases: ['treasure island'],
  },
  {
    id: 'movie-mib',
    title: 'Men in Black',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uLOmOF5IzWkuRGquy5GE6LNYznG.jpg',
    releaseYear: 1997,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0119654/',
    aliases: ['men in black', 'mib'],
  },
  {
    id: 'movie-odyssey2001',
    title: '2001: A Space Odyssey',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg',
    releaseYear: 1968,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0062622/',
    aliases: ['odyssey', 'hal 9000'],
  },
  {
    id: 'movie-findingnemo',
    title: 'Finding Nemo',
    posterUrl: 'https://image.tmdb.org/t/p/w500/eHuGQ10FUzK1mdOY69Tu8osAQ7N.jpg',
    releaseYear: 2003,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0266543/',
    aliases: ['finding nemo'],
  },
  {
    id: 'movie-thehobbit',
    title: 'The Hobbit: An Unexpected Journey',
    posterUrl: 'https://image.tmdb.org/t/p/w500/yHA9Fc37VmpIVvUMOGw9Yg8um4V.jpg',
    releaseYear: 2012,
    rating: 9.4,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0903624/',
    aliases: ['the hobbit'],
  },
  {
    id: 'movie-iceage',
    title: 'Ice Age',
    posterUrl: 'https://image.tmdb.org/t/p/w500/zpaQwR0YViPd83bx1e559US1w98.jpg',
    releaseYear: 2002,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0268380/',
    aliases: ['ice age'],
  },
  {
    id: 'movie-pussinboots2',
    title: 'Puss in Boots: The Last Wish',
    posterUrl: 'https://image.tmdb.org/t/p/w500/kuf6dutpsT0vSV9Vv4yy2n9Zebw.jpg',
    releaseYear: 2022,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt3915174/',
    aliases: ['puss in boots'],
  },
  {
    id: 'movie-toystory',
    title: 'Toy Story',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
    releaseYear: 1995,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0114709/',
    aliases: ['toy story'],
  },
  {
    id: 'series-breakingbad',
    title: 'Breaking Bad',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    releaseYear: 2008,
    rating: 9.9,
    type: ShowcaseMediaType.SERIES,
    externalUrl: 'https://www.imdb.com/title/tt0903747/',
    aliases: ['breaking bad'],
  },
  {
    id: 'series-arcane',
    title: 'Arcane',
    posterUrl: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn397FvFeNZ91.jpg',
    releaseYear: 2021,
    rating: 9.8,
    type: ShowcaseMediaType.SERIES,
    externalUrl: 'https://www.imdb.com/title/tt11126994/',
    aliases: ['arcane'],
  },
  {
    id: 'movie-pulpfiction',
    title: 'Pulp Fiction',
    posterUrl: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    releaseYear: 1994,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0110912/',
    aliases: ['pulp fiction'],
  },
  {
    id: 'movie-shawshank',
    title: 'The Shawshank Redemption',
    posterUrl: 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
    releaseYear: 1994,
    rating: 9.9,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0111161/',
    aliases: ['the shawshank redemption'],
  },
  {
    id: 'movie-inception',
    title: 'Inception',
    posterUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    releaseYear: 2010,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1375666/',
    aliases: ['inception'],
  },
  {
    id: 'movie-whiplash',
    title: 'Whiplash',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg',
    releaseYear: 2014,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt2582802/',
    aliases: ['whiplash'],
  },
  {
    id: 'movie-wolfofwallstreet',
    title: 'The Wolf of Wall Street',
    posterUrl: 'https://image.tmdb.org/t/p/w500/34m2tygAYBGqA9MXKhRDtzYd4MR.jpg',
    releaseYear: 2013,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0993846/',
    aliases: ['the wolf of wall street'],
  },
  {
    id: 'movie-bladerunner2049',
    title: 'Blade Runner 2049',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    releaseYear: 2017,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1856191/',
    aliases: ['blade runner 2049'],
  },
  {
    id: 'movie-lalaland',
    title: 'La La Land',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkVJt0Rf0.jpg',
    releaseYear: 2016,
    rating: 9.4,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt3783958/',
    aliases: ['la la land'],
  },
];

@Injectable()
export class MediaProxyService {
  private readonly logger = new Logger(MediaProxyService.name);
  private readonly CACHE_TTL_SECONDS = 86400; // 24 hours

  constructor(
    private readonly redis: RedisService,
    @Inject(forwardRef(() => SoundCloudService))
    private readonly soundCloudService: SoundCloudService,
  ) {}

  async searchMedia(query: string, type: ShowcaseMediaType): Promise<MediaSearchResultDto[]> {
    const cleanQuery = (query || '').trim().toLowerCase();
    const cacheKey = `showcase:search:${type}:${encodeURIComponent(cleanQuery || '__default__')}`;

    return this.redis.getOrSet(cacheKey, this.CACHE_TTL_SECONDS, async () => {
      let results: MediaSearchResultDto[] = [];

      switch (type) {
        case ShowcaseMediaType.ANIME:
          results = await this.searchAnime(cleanQuery);
          break;
        case ShowcaseMediaType.GAME:
          results = await this.searchGames(cleanQuery);
          break;
        case ShowcaseMediaType.MOVIE:
        case ShowcaseMediaType.SERIES:
          results = await this.searchCinema(cleanQuery, type);
          break;
        default:
          results = [];
      }

      return results;
    });
  }

  private async searchAnime(query: string): Promise<MediaSearchResultDto[]> {
    const clean = (query || '').trim().toLowerCase();

    // 1. Search in curated POPULAR_ANIME_DATABASE first
    const localMatches = POPULAR_ANIME_DATABASE.filter((item) => {
      if (!clean) return true;
      const titleMatch = item.title.toLowerCase().includes(clean);
      const aliasMatch = item.aliases?.some((a) => a.toLowerCase().includes(clean));
      return titleMatch || aliasMatch;
    }).map(({ aliases: _, ...rest }) => rest);

    if (!clean) {
      return localMatches.slice(0, 30);
    }

    if (localMatches.length >= 3) {
      return localMatches.slice(0, 15);
    }

    // 2. Query AniList for additional/unlisted anime
    try {
      const gqlQuery = `
        query ($search: String) {
          Page(page: 1, perPage: 10) {
            media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
                extraLarge
              }
              averageScore
              seasonYear
              startDate {
                year
              }
              siteUrl
            }
          }
        }
      `;

      const response = await axios.post<{
        data?: {
          Page?: {
            media?: AniListMedia[];
          };
        };
      }>(
        'https://graphql.anilist.co',
        { query: gqlQuery, variables: { search: query } },
        {
          timeout: 5000,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        },
      );

      const mediaList = response.data?.data?.Page?.media ?? [];
      const remoteResults = mediaList.map((m: AniListMedia) => {
        const title = m.title?.english || m.title?.romaji || m.title?.native || 'Unknown Anime';
        const posterUrl =
          m.coverImage?.extraLarge ||
          m.coverImage?.large ||
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';
        const releaseYear = m.seasonYear || m.startDate?.year || undefined;
        const rating = m.averageScore ? Number((m.averageScore / 10).toFixed(1)) : undefined;

        return {
          id: `anilist-${m.id}`,
          title,
          posterUrl,
          releaseYear,
          rating,
          type: ShowcaseMediaType.ANIME,
          externalUrl: m.siteUrl || `https://anilist.co/anime/${m.id}`,
        };
      });

      // Combine local matches with remote results (avoiding duplicates)
      const combined = [...localMatches];
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isBleach = (s: string) => s.includes('bleach');
      const hasBleachInLocal = localMatches.some((m) => isBleach(m.title.toLowerCase()));

      const seenNorm = new Set(localMatches.map((i) => normalize(i.title)));

      for (const item of remoteResults) {
        const itemLower = item.title.toLowerCase();
        const norm = normalize(item.title);

        // If local already has Bleach, don't add additional Bleach items from AniList
        if (hasBleachInLocal && isBleach(itemLower)) {
          continue;
        }

        if (!seenNorm.has(norm)) {
          seenNorm.add(norm);
          combined.push(item);
        }
      }

      return combined.slice(0, 15);
    } catch (error) {
      this.logger.warn(`AniList API query failed for "${query}": ${(error as Error).message}`);
      if (localMatches.length > 0) {
        return localMatches;
      }
      return [
        {
          id: `anime-${encodeURIComponent(query)}`,
          title: query.charAt(0).toUpperCase() + query.slice(1),
          posterUrl:
            'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
          type: ShowcaseMediaType.ANIME,
          rating: 8.5,
        },
      ];
    }
  }

  private async searchGames(query: string): Promise<MediaSearchResultDto[]> {
    const rawgApiKey = process.env.RAWG_API_KEY;

    if (rawgApiKey && query) {
      try {
        const response = await axios.get<{
          results?: Array<{
            id: number;
            name: string;
            background_image?: string;
            released?: string;
            rating?: number;
            slug?: string;
          }>;
        }>(
          `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(query)}&page_size=10`,
          {
            timeout: 4000,
          },
        );

        const items = response.data?.results ?? [];
        if (items.length > 0) {
          return items.map((g) => ({
            id: `rawg-${g.id}`,
            title: g.name,
            posterUrl:
              g.background_image ||
              'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
            releaseYear: g.released ? new Date(g.released).getFullYear() : undefined,
            rating: g.rating ? Number((g.rating * 2).toFixed(1)) : undefined,
            type: ShowcaseMediaType.GAME,
            externalUrl: g.slug ? `https://rawg.io/games/${g.slug}` : undefined,
          }));
        }
      } catch (err) {
        this.logger.warn(`RAWG API search failed: ${(err as Error).message}`);
      }
    }

    if (!query) return POPULAR_GAMES_DATABASE;

    const filtered = POPULAR_GAMES_DATABASE.filter((g) => g.title.toLowerCase().includes(query));

    if (filtered.length > 0) return filtered;

    return [
      {
        id: `custom-game-${encodeURIComponent(query)}`,
        title: query.charAt(0).toUpperCase() + query.slice(1),
        posterUrl:
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
        releaseYear: new Date().getFullYear(),
        rating: 9.0,
        type: ShowcaseMediaType.GAME,
      },
      ...POPULAR_GAMES_DATABASE.slice(0, 4),
    ];
  }

  private async searchCinema(
    query: string,
    type: ShowcaseMediaType,
  ): Promise<MediaSearchResultDto[]> {
    const clean = (query || '').trim().toLowerCase();

    // 1. Search curated POPULAR_CINEMA_DATABASE first with multilingual aliases
    const localMatches = POPULAR_CINEMA_DATABASE.filter((item) => {
      if (!clean) return true;
      const titleMatch = item.title.toLowerCase().includes(clean);
      const aliasMatch = item.aliases?.some((a) => a.toLowerCase().includes(clean));
      return titleMatch || aliasMatch;
    }).map(({ aliases: _, ...rest }) => rest);

    if (!clean) {
      return localMatches
        .filter((c) =>
          type === ShowcaseMediaType.MOVIE ? c.type === ShowcaseMediaType.MOVIE : true,
        )
        .slice(0, 30);
    }

    if (localMatches.length >= 2) {
      return localMatches.slice(0, 15);
    }

    // 2. Query TMDB API for additional/unlisted movies or TV series
    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (tmdbApiKey && clean) {
      try {
        const endpoint = type === ShowcaseMediaType.MOVIE ? 'movie' : 'tv';
        const response = await axios.get<{
          results?: Array<{
            id: number;
            title?: string;
            name?: string;
            poster_path?: string;
            release_date?: string;
            first_air_date?: string;
            vote_average?: number;
          }>;
        }>(
          `https://api.themoviedb.org/3/search/${endpoint}?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}&page=1`,
          { timeout: 4000 },
        );

        const items = response.data?.results ?? [];
        if (items.length > 0) {
          const remoteResults = items.map((c) => ({
            id: `tmdb-${c.id}`,
            title: c.title || c.name || 'Unknown Title',
            posterUrl: c.poster_path
              ? `https://image.tmdb.org/t/p/w500${c.poster_path}`
              : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
            releaseYear: c.release_date
              ? new Date(c.release_date).getFullYear()
              : c.first_air_date
                ? new Date(c.first_air_date).getFullYear()
                : undefined,
            rating: c.vote_average ? Number(c.vote_average.toFixed(1)) : undefined,
            type,
            externalUrl: `https://www.themoviedb.org/${endpoint}/${c.id}`,
          }));

          const combined = [...localMatches, ...remoteResults];
          const unique = Array.from(
            new Map(combined.map((item) => [item.title.toLowerCase(), item])).values(),
          );
          return unique.slice(0, 15);
        }
      } catch (err) {
        this.logger.warn(`TMDB API search failed: ${(err as Error).message}`);
      }
    }

    if (localMatches.length > 0) return localMatches;

    return [
      {
        id: `custom-cinema-${encodeURIComponent(query)}`,
        title: query.charAt(0).toUpperCase() + query.slice(1),
        posterUrl:
          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
        releaseYear: new Date().getFullYear(),
        rating: 9.0,
        type,
      },
      ...POPULAR_CINEMA_DATABASE.slice(0, 3).map(({ aliases: _, ...rest }) => rest),
    ];
  }

  private cachedSpotifyToken: string | null = null;
  private cachedSpotifyTokenExpiresAt = 0;

  private async getSpotifyAppToken(): Promise<string | null> {
    if (this.cachedSpotifyToken && this.cachedSpotifyTokenExpiresAt > Date.now() + 120000) {
      return this.cachedSpotifyToken;
    }
    const clientId = process.env.SPOTIFY_CLIENT_ID || 'b3627072f2ec49d48d1ad97f901b24c3';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || 'f5b8151538af4b87b3e405351c01a129';
    if (!clientId || !clientSecret) return null;

    try {
      const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const res = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${creds}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 5000,
        },
      );
      if (res.data?.access_token) {
        this.cachedSpotifyToken = res.data.access_token;
        this.cachedSpotifyTokenExpiresAt =
          Date.now() + (res.data.expires_in || 3600) * 1000 - 300000;
        return this.cachedSpotifyToken;
      }
    } catch (err) {
      this.logger.warn(`Failed to acquire Spotify app token: ${(err as Error).message}`);
    }
    return null;
  }

  private async searchSpotifyCatalog(query: string): Promise<any[]> {
    try {
      const token = await this.getSpotifyAppToken();
      if (!token) return [];

      const trackUrlMatch =
        query.match(/spotify\.com\/track\/([a-zA-Z0-9]{22})/) || query.match(/^([a-zA-Z0-9]{22})$/);
      if (trackUrlMatch) {
        const rawTrackId = trackUrlMatch[1];
        if (/^[a-zA-Z0-9]{22}$/.test(rawTrackId)) {
          const safeTrackId = encodeURIComponent(rawTrackId);
          const trackApiUrl = new URL(`https://api.spotify.com/v1/tracks/${safeTrackId}`);
          if (trackApiUrl.origin === 'https://api.spotify.com') {
            try {
              const directRes = await axios.get(trackApiUrl.toString(), {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000,
              });
              const t = directRes.data;
              if (t && t.id && t.name) {
                return [
                  {
                    id: t.id,
                    trackId: t.id,
                    title: t.name,
                    artist: t.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
                    albumArt:
                      t.album?.images?.[0]?.url ||
                      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
                    previewUrl: t.preview_url || null,
                    spotifyUrl:
                      t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
                    durationMs: t.duration_ms || 0,
                  },
                ];
              }
            } catch {
              // Fall through to search query
            }
          }
        }
      }

      const res = await axios.get(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        },
      );

      const items = res.data?.tracks?.items;
      if (!Array.isArray(items) || items.length === 0) return [];

      return items
        .filter((t: any) => t && t.id && t.name)
        .map((t: any) => ({
          id: t.id,
          trackId: t.id,
          title: t.name,
          artist: t.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
          albumArt:
            t.album?.images?.[0]?.url ||
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
          previewUrl: t.preview_url || null,
          spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
          durationMs: t.duration_ms || 0,
        }));
    } catch (err) {
      this.logger.warn(`Spotify catalog search error: ${(err as Error).message}`);
      return [];
    }
  }

  async searchTracks(query: string): Promise<any[]> {
    const cleanQuery = (query || '').trim();

    // Verified Spotify Global Top 10 Most Streamed Tracks
    const TOP_10_SPOTIFY_TRACKS = [
      {
        id: '0VjIjW4GlUZAMYd2vXMi3b',
        trackId: '0VjIjW4GlUZAMYd2vXMi3b',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
        previewUrl: null,
        durationMs: 200040,
        spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
      },
      {
        id: '7qiZfU4dY1lWllzX7mPBI3',
        trackId: '7qiZfU4dY1lWllzX7mPBI3',
        title: 'Shape of You',
        artist: 'Ed Sheeran',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
        previewUrl: null,
        durationMs: 233712,
        spotifyUrl: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3',
      },
      {
        id: '7MXVkk9YMctZqd1Srtv4MB',
        trackId: '7MXVkk9YMctZqd1Srtv4MB',
        title: 'Starboy',
        artist: 'The Weeknd, Daft Punk',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452',
        previewUrl: null,
        durationMs: 230453,
        spotifyUrl: 'https://open.spotify.com/track/7MXVkk9YMctZqd1Srtv4MB',
      },
      {
        id: '4Dvkj6JhhA12EX05fT7y2e',
        trackId: '4Dvkj6JhhA12EX05fT7y2e',
        title: 'As It Was',
        artist: 'Harry Styles',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b27382ce362511fb3d9dda6578ee',
        previewUrl: null,
        durationMs: 167303,
        spotifyUrl: 'https://open.spotify.com/track/4Dvkj6JhhA12EX05fT7y2e',
      },
      {
        id: '3KkXRkHbMCARz0aVfEt68P',
        trackId: '3KkXRkHbMCARz0aVfEt68P',
        title: 'Sunflower - Spider-Man: Into the Spider-Verse',
        artist: 'Post Malone, Swae Lee',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f',
        previewUrl: null,
        durationMs: 158040,
        spotifyUrl: 'https://open.spotify.com/track/3KkXRkHbMCARz0aVfEt68P',
      },
      {
        id: '1zi7xx7UVEFkmKfv06H8x0',
        trackId: '1zi7xx7UVEFkmKfv06H8x0',
        title: 'One Dance',
        artist: 'Drake, Wizkid, Kyla',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2739416ed64daf84936d89e671c',
        previewUrl: null,
        durationMs: 173986,
        spotifyUrl: 'https://open.spotify.com/track/1zi7xx7UVEFkmKfv06H8x0',
      },
      {
        id: '567e29TDzLwZwfDuEpGTwo',
        trackId: '567e29TDzLwZwfDuEpGTwo',
        title: 'STAY (with Justin Bieber)',
        artist: 'The Kid LAROI, Justin Bieber',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273b4d59e6fa7e5e7cbc57ac33a',
        previewUrl: null,
        durationMs: 141805,
        spotifyUrl: 'https://open.spotify.com/track/567e29TDzLwZwfDuEpGTwo',
      },
      {
        id: '7qEHsqek33rTcFNT9PFqLf',
        trackId: '7qEHsqek33rTcFNT9PFqLf',
        title: 'Someone You Loved',
        artist: 'Lewis Capaldi',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b273fc2101e6889d6ce9025f85f2',
        previewUrl: null,
        durationMs: 182160,
        spotifyUrl: 'https://open.spotify.com/track/7qEHsqek33rTcFNT9PFqLf',
      },
      {
        id: '2QjOHCTQ1Jl3zawyYOpxh6',
        trackId: '2QjOHCTQ1Jl3zawyYOpxh6',
        title: 'Sweater Weather',
        artist: 'The Neighbourhood',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2738265a736a1eb838ad5a0b921',
        previewUrl: null,
        durationMs: 240400,
        spotifyUrl: 'https://open.spotify.com/track/2QjOHCTQ1Jl3zawyYOpxh6',
      },
      {
        id: '0pqnGHJpmpxLKifKRmU6WP',
        trackId: '0pqnGHJpmpxLKifKRmU6WP',
        title: 'Believer',
        artist: 'Imagine Dragons',
        albumArt: 'https://i.scdn.co/image/ab67616d0000b2735675e83f707f1d7271e5cf8a',
        previewUrl: null,
        durationMs: 204346,
        spotifyUrl: 'https://open.spotify.com/track/0pqnGHJpmpxLKifKRmU6WP',
      },
    ];

    if (!cleanQuery) {
      return TOP_10_SPOTIFY_TRACKS;
    }

    const cacheKey = `showcase:search:tracks:${encodeURIComponent(cleanQuery.toLowerCase())}`;

    return this.redis.getOrSet(cacheKey, this.CACHE_TTL_SECONDS, async () => {
      const [spotifyResults, scResults] = await Promise.all([
        this.searchSpotifyCatalog(cleanQuery).catch(() => []),
        this.soundCloudService.searchTracks(cleanQuery, 10).catch(() => []),
      ]);

      const baseSpotify =
        spotifyResults.length > 0
          ? spotifyResults
          : TOP_10_SPOTIFY_TRACKS.filter(
              (t) =>
                t.title.toLowerCase().includes(cleanQuery.toLowerCase()) ||
                t.artist.toLowerCase().includes(cleanQuery.toLowerCase()),
            );

      const mappedSpotify = baseSpotify.map((t: any) => ({
        ...t,
        source: 'spotify',
      }));

      const combined: any[] = [];
      const maxLen = Math.max(mappedSpotify.length, scResults.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < mappedSpotify.length) combined.push(mappedSpotify[i]);
        if (i < scResults.length) combined.push(scResults[i]);
      }

      return combined.slice(0, 20);
    });
  }

  /**
   * Fetch rich Discord-grade media details (official 1080p/4K screenshots, trailer, metadata)
   * for any game, anime, or cinema title.
   */
  async getMediaDetails(
    title: string,
    type: ShowcaseMediaType,
  ): Promise<MediaDetailsResponseDto | null> {
    const cleanTitle = (title || '').trim().toLowerCase();
    if (!cleanTitle) return null;

    const cacheKey = `showcase:details:${type}:${encodeURIComponent(cleanTitle)}`;

    return this.redis.getOrSet(cacheKey, this.CACHE_TTL_SECONDS, async () => {
      try {
        if (type === ShowcaseMediaType.GAME) {
          return await this.fetchGameDetails(cleanTitle);
        } else if (type === ShowcaseMediaType.ANIME) {
          return await this.fetchAnimeDetails(cleanTitle);
        } else {
          return await this.fetchCinemaDetails(cleanTitle, type);
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch media details for "${title}": ${(err as Error).message}`);
        return null;
      }
    });
  }

  private async fetchGameDetails(cleanTitle: string): Promise<MediaDetailsResponseDto | null> {
    const KNOWN_GAMES: Record<string, { appId: number; trailerUrl?: string }> = {
      'elden ring': {
        appId: 1245620,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256875461/movie480.mp4',
      },
      'dota 2': {
        appId: 570,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256692021/movie480.mp4',
      },
      'counter-strike 2': {
        appId: 730,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256972298/movie480.mp4',
      },
      cs2: {
        appId: 730,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256972298/movie480.mp4',
      },
      'counter-strike: global offensive': {
        appId: 730,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256972298/movie480.mp4',
      },
      'cs:go': {
        appId: 730,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256972298/movie480.mp4',
      },
      'cyberpunk 2077': {
        appId: 1091500,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/257081132/movie480.mp4',
      },
      'the witcher 3: wild hunt': {
        appId: 292030,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256927226/movie480.mp4',
      },
      'the witcher 3': {
        appId: 292030,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256927226/movie480.mp4',
      },
      'witcher 3': {
        appId: 292030,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256927226/movie480.mp4',
      },
      "baldur's gate 3": {
        appId: 1086940,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256987424/movie480.mp4',
      },
      'baldurs gate 3': {
        appId: 1086940,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256987424/movie480.mp4',
      },
      'grand theft auto v': {
        appId: 271590,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/257109786/movie480.mp4',
      },
      'gta 5': {
        appId: 271590,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/257109786/movie480.mp4',
      },
      'gta v': {
        appId: 271590,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/257109786/movie480.mp4',
      },
      deadlock: {
        appId: 1422450,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256972298/movie480.mp4',
      },
      rust: {
        appId: 252490,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256673550/movie480.mp4',
      },
      'apex legends': {
        appId: 1172470,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256807897/movie480.mp4',
      },
      terraria: {
        appId: 105600,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2029311/movie480.mp4',
      },
      'stardew valley': {
        appId: 413150,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256660296/movie480.mp4',
      },
      'hollow knight': {
        appId: 367520,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256682008/movie480.mp4',
      },
      'red dead redemption 2': {
        appId: 1174180,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256768371/movie480.mp4',
      },
      'black myth: wukong': {
        appId: 2358720,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/257040989/movie480.mp4',
      },
      'black myth wukong': {
        appId: 2358720,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/257040989/movie480.mp4',
      },
      'helldivers 2': {
        appId: 553850,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256976935/movie480.mp4',
      },
      'sekiro: shadows die twice': {
        appId: 814380,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256806899/movie480.mp4',
      },
      sekiro: {
        appId: 814380,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256806899/movie480.mp4',
      },
      'dark souls iii': {
        appId: 374320,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256663134/movie480.mp4',
      },
      'dark souls 3': {
        appId: 374320,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256663134/movie480.mp4',
      },
      'lies of p': {
        appId: 1627720,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256973335/movie480.mp4',
      },
      palworld: {
        appId: 1623730,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256994017/movie480.mp4',
      },
      'team fortress 2': {
        appId: 440,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/80924/movie480.mp4',
      },
      tf2: {
        appId: 440,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/80924/movie480.mp4',
      },
      'devil may cry 5': {
        appId: 601150,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256728780/movie480.mp4',
      },
      'dmc 5': {
        appId: 601150,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256728780/movie480.mp4',
      },
      dmc5: {
        appId: 601150,
        trailerUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256728780/movie480.mp4',
      },
    };

    let appId: number | null = null;
    let trailerUrl: string | undefined;

    const NON_STEAM_GAMES = new Set([
      'minecraft',
      'valorant',
      'league of legends',
      'fortnite',
      'genshin impact',
      'honkai: star rail',
      'zenless zone zero',
      'wuthering waves',
      'black desert',
      'where winds meet',
      'crimson desert',
      'world of warcraft',
      'hearthstone',
      'roblox',
      'escape from tarkov',
      'fall guys',
      'osu!',
      'forza horizon 6',
      'arc raiders',
      'r.e.p.o.',
      'peak',
      'echoes of aincrad',
      'mecha chameleon',
    ]);

    if (NON_STEAM_GAMES.has(cleanTitle)) {
      return null;
    }

    if (KNOWN_GAMES[cleanTitle]) {
      appId = KNOWN_GAMES[cleanTitle].appId;
      trailerUrl = KNOWN_GAMES[cleanTitle].trailerUrl;
    } else {
      // Look in POPULAR_GAMES_DATABASE
      const match = POPULAR_GAMES_DATABASE.find(
        (g) =>
          g.title.toLowerCase() === cleanTitle ||
          cleanTitle.includes(g.title.toLowerCase()) ||
          g.title.toLowerCase().includes(cleanTitle),
      );
      if (match?.externalUrl) {
        const idMatch = match.externalUrl.match(/\/app\/(\d+)/);
        if (idMatch) {
          appId = parseInt(idMatch[1], 10);
        } else {
          let isSteamHost = false;
          try {
            const parsed = new URL(match.externalUrl);
            isSteamHost =
              parsed.hostname === 'steampowered.com' ||
              parsed.hostname.endsWith('.steampowered.com') ||
              parsed.hostname === 'steamcommunity.com' ||
              parsed.hostname.endsWith('.steamcommunity.com');
          } catch {
            isSteamHost = false;
          }
          if (!isSteamHost) {
            // Non-Steam official game - do not search Steam Store API to avoid fuzzy spin-off matches
            return null;
          }
        }
      }

      // If still not found, search Steam Store API
      if (!appId) {
        try {
          const searchRes = await axios.get<{ items?: Array<{ id: number; name: string }> }>(
            `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanTitle)}&l=russian&cc=US`,
            { timeout: 3500 },
          );
          if (searchRes.data?.items?.[0]?.id) {
            appId = searchRes.data.items[0].id;
          }
        } catch {
          // ignore search failure
        }
      }
    }

    if (!appId) return null;

    try {
      const detailsRes = await axios.get<Record<string, { success: boolean; data?: any }>>(
        `https://store.steampowered.com/api/appdetails?appids=${appId}&l=russian`,
        { timeout: 5000 },
      );

      const d = detailsRes.data?.[appId.toString()]?.data;
      if (!d) return null;

      const screenshots: string[] = (d.screenshots || [])
        .map((s: { path_full?: string }) => s.path_full)
        .filter(Boolean);

      const steamMovieUrl = d.movies?.[0]?.id
        ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${d.movies[0].id}/movie480.mp4`
        : d.movies?.[0]?.mp4?.max || d.movies?.[0]?.webm?.max;

      const fallbackTrailer =
        trailerUrl ||
        steamMovieUrl ||
        'https://cdn.cloudflare.steamstatic.com/steam/apps/256692021/movie480.mp4';

      const stripHtml = (html: string) => (sanitizePlainText(html || '') as string).trim();

      return {
        title: d.name || cleanTitle,
        subtitle: (d.genres || []).map((g: any) => g.description).join(', ') || 'Game',
        description: stripHtml(d.short_description || d.about_the_game || ''),
        videoUrl:
          trailerUrl ||
          (steamMovieUrl && !steamMovieUrl.endsWith('.jpg') ? steamMovieUrl : undefined) ||
          fallbackTrailer,
        videoThumbnail: d.movies?.[0]?.thumbnail || d.header_image,
        videoDuration: '1:45',
        screenshots: screenshots.slice(0, 8),
        bannerUrl: d.header_image,
        genres: (d.genres || []).map((g: any) => g.description).join(', '),
        publisher: (d.publishers || []).join(', '),
        developer: (d.developers || []).join(', '),
        releaseDate: d.release_date?.date,
        metacritic: d.metacritic?.score,
        externalUrl: `https://store.steampowered.com/app/${appId}/`,
      };
    } catch {
      return null;
    }
  }

  private async fetchAnimeDetails(cleanTitle: string): Promise<MediaDetailsResponseDto | null> {
    const CURATED_ANIME: Record<string, Partial<MediaDetailsResponseDto>> = {
      'sword art online': {
        title: 'Sword Art Online',
        subtitle: 'Anime, Shounen, Virtual Reality, Action, Fantasy',
        description:
          'In 2022, ten thousand gamers find themselves trapped inside the full-dive MMORPG Sword Art Online. Dying in the game means dying in the real world. The only way out is to clear all 100 floors of the floating castle Aincrad.',
        videoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256703995/movie480.mp4',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/11/39717l.jpg',
        screenshots: [
          'https://cdn.cloudflare.steamstatic.com/steam/apps/626690/ss_8e3c59918237d6a5996fbf41e57c6aee132338c9.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/626690/ss_e15c3ec0b9dae3d069b82aa155e884b2c1f0e2ec.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/626690/ss_8b991ef2b8eec8f5cb5ffaf305e78b7a69bc92eb.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/626690/ss_868ee3a43fa48a313838ae85906c6e0c69d8a1db.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/607890/ss_0a631f4e15ba6a05e26ecb0bf95a9b7405e3f3b9.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/607890/ss_df85a11dfb68903348128522c09cbffba0e4ca06.1920x1080.jpg',
        ],
        genres: 'Action, Fantasy, Adventure, Romance, Shounen',
        publisher: 'Aniplex / A-1 Pictures',
        developer: 'Tomohiko Ito',
        releaseDate: 'July 7, 2012',
        externalUrl: 'https://myanimelist.net/anime/11757/Sword_Art_Online',
      },
      'attack on titan': {
        title: 'Attack on Titan',
        subtitle: 'Anime, Shounen, Action, Drama',
        description:
          'Centuries ago, mankind was forced to retreat behind immense walls to escape colossal man-eating Titans. After the fall of Wall Maria, young Eren Yeager vows to eradicate every Titan.',
        videoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256666958/movie480.mp4',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
        screenshots: [
          'https://cdn.cloudflare.steamstatic.com/steam/apps/449800/ss_495c654378f44d56fecf44c4b63f707f45b5da81.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/449800/ss_aa1a3f65e2154449890d96d99728cb11dfc28267.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/449800/ss_b669fcf3479d2bf95123d5da55bcf965ee92bcf7.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/449800/ss_5492167d30fdbfa39366df02e1b12bfa4e76cba9.1920x1080.jpg',
        ],
        genres: 'Action, Drama, Fantasy, Shounen',
        publisher: 'Kodansha / Pony Canyon',
        developer: 'Wit Studio / MAPPA',
        releaseDate: 'April 7, 2013',
        externalUrl: 'https://myanimelist.net/anime/16498/Shingeki_no_Kyojin',
      },
      'death note': {
        title: 'Death Note',
        subtitle: 'Psychological Thriller, Mystery, Supernatural',
        description:
          'High school genius Light Yagami discovers a mysterious notebook that can kill anyone whose name is written in it. When he attempts to rid the world of criminals, a brilliant detective known as L begins tracking him.',
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg',
        screenshots: [
          'https://cdn.cloudflare.steamstatic.com/steam/apps/449800/ss_aa1a3f65e2154449890d96d99728cb11dfc28267.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/626690/ss_e15c3ec0b9dae3d069b82aa155e884b2c1f0e2ec.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1490890/ss_69e2082260efb79a52dc0029b35239e23653fe1e.1920x1080.jpg',
        ],
        genres: 'Psychological, Supernatural, Thriller',
        publisher: 'NTV / Shueisha',
        developer: 'Madhouse',
        releaseDate: 'October 3, 2006',
        externalUrl: 'https://myanimelist.net/anime/1535/Death_Note',
      },
      'demon slayer: kimetsu no yaiba': {
        title: 'Demon Slayer: Kimetsu no Yaiba',
        subtitle: 'Action, Historical, Shounen, Demons',
        description:
          'Tanjiro Kamado joins the Demon Slayer Corps to find a cure for his sister Nezuko, who was turned into a demon, and avenge his slain family.',
        videoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256842621/movie480.mp4',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
        screenshots: [
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1490890/ss_911aa6e2b6dbecb94921616cbb6f1fbdf800ecae.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1490890/ss_b8354c0e66c72956cfb2f0a1ea335f6068808945.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1490890/ss_69e2082260efb79a52dc0029b35239e23653fe1e.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1490890/ss_493ce71d1fb586a1175f7ba1c9c7f2081f21db53.1920x1080.jpg',
        ],
        genres: 'Action, Fantasy, Shounen',
        publisher: 'Aniplex / Shueisha',
        developer: 'ufotable',
        releaseDate: 'April 6, 2019',
        externalUrl: 'https://myanimelist.net/anime/38000/Kimetsu_no_Yaiba',
      },
      'demon slayer': {
        title: 'Demon Slayer: Kimetsu no Yaiba',
        subtitle: 'Action, Historical, Shounen, Demons',
        description:
          'Tanjiro Kamado joins the Demon Slayer Corps to find a cure for his sister Nezuko, who was turned into a demon, and avenge his slain family.',
        videoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256842621/movie480.mp4',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
        screenshots: [
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1490890/ss_911aa6e2b6dbecb94921616cbb6f1fbdf800ecae.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1490890/ss_b8354c0e66c72956cfb2f0a1ea335f6068808945.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1490890/ss_69e2082260efb79a52dc0029b35239e23653fe1e.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1490890/ss_493ce71d1fb586a1175f7ba1c9c7f2081f21db53.1920x1080.jpg',
        ],
        genres: 'Action, Fantasy, Shounen',
        publisher: 'Aniplex / Shueisha',
        developer: 'ufotable',
        releaseDate: 'April 6, 2019',
        externalUrl: 'https://myanimelist.net/anime/38000/Kimetsu_no_Yaiba',
      },
      'jujutsu kaisen': {
        title: 'Jujutsu Kaisen',
        subtitle: 'Shounen, Supernatural, Action, Curses',
        description:
          'Yuji Itadori swallows a cursed talisman—the finger of the King of Curses Ryomen Sukuna—and enters Tokyo Jujutsu High School to exorcise deadly curses.',
        videoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/256974787/movie480.mp4',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
        screenshots: [
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1877020/ss_37a28ebf4b0051d9f8e43896dfa22ce63bb49fc3.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1877020/ss_459c03b1eefaf41fdf7928731b8162234559c5d0.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1877020/ss_42f0a1c13d7d42cfc05a1e2f3d532b2a64c4d166.1920x1080.jpg',
          'https://cdn.cloudflare.steamstatic.com/steam/apps/1877020/ss_f190bc1b9cefcddb7b2fb0a693b80b2a75fe135e.1920x1080.jpg',
        ],
        genres: 'Action, Supernatural, Shounen',
        publisher: 'TOHO animation / Shueisha',
        developer: 'MAPPA',
        releaseDate: 'October 3, 2020',
        externalUrl: 'https://myanimelist.net/anime/40748/Jujutsu_Kaisen',
      },
      "kuroko's basketball": {
        title: "Kuroko's Basketball",
        subtitle: 'Anime, Sports, Shounen, Basketball, Team Spirit',
        description:
          'The Teiko Middle School basketball team rose to national fame with their legendary Generation of Miracles. At Seirin High, Tetsuya Kuroko pairs up with Taiga Kagami to challenge each basketball prodigy and lead Seirin to victory in the Winter Cup.',
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
        screenshots: [
          'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
          'https://cdn.myanimelist.net/images/anime/9/56155l.jpg',
          'https://cdn.myanimelist.net/images/anime/4/68299l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/78663l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/76803l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/75195l.jpg',
          'https://cdn.myanimelist.net/images/anime/7/76014l.jpg',
        ],
        genres: 'Sports, Shounen, Basketball, School',
        publisher: 'Bandai Visual / Shueisha',
        developer: 'Production I.G',
        releaseDate: 'April 7, 2012',
        externalUrl: 'https://myanimelist.net/anime/11771/Kuroko_no_Basket',
      },
      'kuroko no basket': {
        title: "Kuroko's Basketball",
        subtitle: 'Anime, Sports, Shounen, Basketball, Team Spirit',
        description:
          'The Teiko Middle School basketball team rose to national fame with their legendary Generation of Miracles. At Seirin High, Tetsuya Kuroko pairs up with Taiga Kagami to challenge each basketball prodigy and lead Seirin to victory in the Winter Cup.',
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
        screenshots: [
          'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
          'https://cdn.myanimelist.net/images/anime/9/56155l.jpg',
          'https://cdn.myanimelist.net/images/anime/4/68299l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/78663l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/76803l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/75195l.jpg',
          'https://cdn.myanimelist.net/images/anime/7/76014l.jpg',
        ],
        genres: 'Sports, Shounen, Basketball, School',
        publisher: 'Bandai Visual / Shueisha',
        developer: 'Production I.G',
        releaseDate: 'April 7, 2012',
        externalUrl: 'https://myanimelist.net/anime/11771/Kuroko_no_Basket',
      },
      kuroko: {
        title: "Kuroko's Basketball",
        subtitle: 'Anime, Sports, Shounen, Basketball, Team Spirit',
        description:
          'The Teiko Middle School basketball team rose to national fame with their legendary Generation of Miracles. At Seirin High, Tetsuya Kuroko pairs up with Taiga Kagami to challenge each basketball prodigy and lead Seirin to victory in the Winter Cup.',
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
        screenshots: [
          'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
          'https://cdn.myanimelist.net/images/anime/9/56155l.jpg',
          'https://cdn.myanimelist.net/images/anime/4/68299l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/78663l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/76803l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/75195l.jpg',
          'https://cdn.myanimelist.net/images/anime/7/76014l.jpg',
        ],
        genres: 'Sports, Shounen, Basketball, School',
        publisher: 'Bandai Visual / Shueisha',
        developer: 'Production I.G',
        releaseDate: 'April 7, 2012',
        externalUrl: 'https://myanimelist.net/anime/11771/Kuroko_no_Basket',
      },
      kuroko_extra: {
        title: "Kuroko's Basketball",
        subtitle: 'Anime, Sports, Shounen, Basketball, Team Spirit',
        description:
          'The Teiko Middle School basketball team rose to national fame with their legendary Generation of Miracles. At Seirin High, Tetsuya Kuroko pairs up with Taiga Kagami to challenge each basketball prodigy and lead Seirin to victory in the Winter Cup.',
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
        screenshots: [
          'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
          'https://cdn.myanimelist.net/images/anime/9/56155l.jpg',
          'https://cdn.myanimelist.net/images/anime/4/68299l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/78663l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/76803l.jpg',
          'https://cdn.myanimelist.net/images/anime/10/75195l.jpg',
          'https://cdn.myanimelist.net/images/anime/7/76014l.jpg',
        ],
        genres: 'Sports, Shounen, Basketball, School',
        publisher: 'Bandai Visual / Shueisha',
        developer: 'Production I.G',
        releaseDate: 'April 7, 2012',
        externalUrl: 'https://myanimelist.net/anime/11771/Kuroko_no_Basket',
      },
      'blue lock': {
        title: 'Blue Lock',
        subtitle: 'Anime, Sports, Psychological Thriller, Soccer, Shounen',
        description:
          "After Japan's tragic defeat at the 2018 World Cup, the Japan Football Association launches Project Blue Lock: an extreme prison-like facility where 300 star high school forwards compete to become the world's greatest, most egoistic striker.",
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/1258/126929l.jpg',
        screenshots: [
          'https://cdn.myanimelist.net/images/anime/1258/126929l.jpg',
          'https://cdn.myanimelist.net/images/anime/11/75274l.jpg',
          'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
        ],
        genres: 'Sports, Thriller, Shounen, Soccer',
        publisher: 'Bandai Namco Filmworks / Kodansha',
        developer: 'Eight Bit',
        releaseDate: 'October 9, 2022',
        externalUrl: 'https://myanimelist.net/anime/49596/Blue_Lock',
      },
      'haikyuu!!': {
        title: 'Haikyuu!!',
        subtitle: 'Anime, Sports, Volleyball, School, Shounen',
        description:
          'Inspired after watching a volleyball ace nicknamed the "Little Giant", Shoyo Hinata joins Karasuno High\'s volleyball team, where he teams up with his former rival, the genius setter Tobio Kageyama.',
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/11/75274l.jpg',
        screenshots: [
          'https://cdn.myanimelist.net/images/anime/11/75274l.jpg',
          'https://cdn.myanimelist.net/images/anime/1258/126929l.jpg',
          'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
        ],
        genres: 'Sports, Volleyball, Comedy, Shounen',
        publisher: 'TOHO animation / Shueisha',
        developer: 'Production I.G',
        releaseDate: 'April 6, 2014',
        externalUrl: 'https://myanimelist.net/anime/20583/Haikyuu',
      },
      haikyuu: {
        title: 'Haikyuu!!',
        subtitle: 'Anime, Sports, Volleyball, School, Shounen',
        description:
          'Inspired after watching a volleyball ace nicknamed the "Little Giant", Shoyo Hinata joins Karasuno High\'s volleyball team, where he teams up with his former rival, the genius setter Tobio Kageyama.',
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://cdn.myanimelist.net/images/anime/11/75274l.jpg',
        screenshots: [
          'https://cdn.myanimelist.net/images/anime/11/75274l.jpg',
          'https://cdn.myanimelist.net/images/anime/1258/126929l.jpg',
          'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
        ],
        genres: 'Sports, Volleyball, Comedy, Shounen',
        publisher: 'TOHO animation / Shueisha',
        developer: 'Production I.G',
        releaseDate: 'April 6, 2014',
        externalUrl: 'https://myanimelist.net/anime/20583/Haikyuu',
      },
    };

    const ANIME_ALIASES: Record<string, string> = {
      sao: 'sword art online',
      'kuroko no basket': "kuroko's basketball",
      kuroko: "kuroko's basketball",
      haikyuu: 'haikyuu!!',
      'demon slayer': 'demon slayer: kimetsu no yaiba',
      'attack on titan': 'attack on titan',
      'death note': 'death note',
      'jujutsu kaisen': 'jujutsu kaisen',
      'blue lock': 'blue lock',
    };

    const resolvedTitle = ANIME_ALIASES[cleanTitle] || cleanTitle;

    const matchKey = Object.keys(CURATED_ANIME).find(
      (k) => resolvedTitle.includes(k) || k.includes(resolvedTitle),
    );

    if (matchKey && CURATED_ANIME[matchKey]) {
      const item = CURATED_ANIME[matchKey];
      return {
        title: item.title || cleanTitle,
        subtitle: item.subtitle || 'Anime',
        description: item.description || '',
        videoUrl:
          item.videoUrl ||
          'https://cdn.cloudflare.steamstatic.com/steam/apps/256666958/movie480.mp4',
        videoThumbnail: item.videoThumbnail,
        videoDuration: '1:30',
        screenshots: item.screenshots || [],
        genres: item.genres,
        publisher: item.publisher,
        developer: item.developer,
        releaseDate: item.releaseDate,
        externalUrl: item.externalUrl,
      };
    }

    return null;
  }

  private async fetchCinemaDetails(
    cleanTitle: string,
    type: ShowcaseMediaType,
  ): Promise<MediaDetailsResponseDto | null> {
    const CURATED_CINEMA: Record<string, Partial<MediaDetailsResponseDto>> = {
      interstellar: {
        title: 'Interstellar',
        subtitle: 'Sci-Fi, Drama, Adventure',
        description:
          'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.',
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
        screenshots: [
          'https://image.tmdb.org/t/p/original/rAiYTnrLEHV4iB4A9Xnwh8n8Keq.jpg',
          'https://image.tmdb.org/t/p/original/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg',
          'https://image.tmdb.org/t/p/original/pbrkL804c8yAv3zBZR4QPEafpAR.jpg',
        ],
        genres: 'Sci-Fi, Drama, Adventure',
        publisher: 'Paramount Pictures / Warner Bros.',
        developer: 'Christopher Nolan (Director)',
        releaseDate: 'November 5, 2014',
        externalUrl: 'https://www.themoviedb.org/movie/157336-interstellar',
      },
      oppenheimer: {
        title: 'Oppenheimer',
        subtitle: 'Biography, Drama, History',
        description:
          "The story of American theoretical physicist J. Robert Oppenheimer, director of the Manhattan Project's Los Alamos Laboratory during World War II, and the creation of the atomic bomb.",
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
        screenshots: [
          'https://image.tmdb.org/t/p/original/rLb2cw0iwgfFQMs900oo7j3UQ9.jpg',
          'https://image.tmdb.org/t/p/original/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg',
        ],
        genres: 'Biography, Drama, History',
        publisher: 'Universal Pictures',
        developer: 'Christopher Nolan (Director)',
        releaseDate: 'July 21, 2023',
        externalUrl: 'https://www.themoviedb.org/movie/872585-oppenheimer',
      },
      arcane: {
        title: 'Arcane',
        subtitle: 'Animation, Fantasy, Action, Drama',
        description:
          'Set in the utopian region of Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions—and the power that will tear them apart.',
        videoUrl:
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: 'https://image.tmdb.org/t/p/original/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
        screenshots: [
          'https://image.tmdb.org/t/p/original/rkB4LyZHo1NHXSTXYZaCRvMcaN.jpg',
          'https://image.tmdb.org/t/p/original/1Up4dO6jL7D3yF7w2B4n0I0V6R0.jpg',
        ],
        genres: 'Animation, Fantasy, Action',
        publisher: 'Riot Games / Netflix',
        developer: 'Fortiche Production',
        releaseDate: 'November 6, 2021',
        externalUrl: 'https://www.themoviedb.org/tv/94605-arcane',
      },
    };

    const matchKey = Object.keys(CURATED_CINEMA).find(
      (k) => cleanTitle.includes(k) || k.includes(cleanTitle),
    );

    if (matchKey && CURATED_CINEMA[matchKey]) {
      const item = CURATED_CINEMA[matchKey];
      return {
        title: item.title || cleanTitle,
        subtitle: item.subtitle || (type === ShowcaseMediaType.SERIES ? 'TV Series' : 'Movie'),
        description: item.description || '',
        videoUrl:
          item.videoUrl ||
          'https://cdn.discordapp.com/app-assets/356875988589740042/store/1486740188892893284.mp4?size=3072',
        videoThumbnail: item.videoThumbnail,
        videoDuration: '2:15',
        screenshots: item.screenshots || [],
        genres: item.genres,
        publisher: item.publisher,
        developer: item.developer,
        releaseDate: item.releaseDate,
        externalUrl: item.externalUrl,
      };
    }

    return null;
  }
}
