import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../redis/redis.service';
import { ShowcaseMediaType, type MediaSearchResultDto } from '@common/contracts';

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
    aliases: ['мастера мечей онлайн', 'сао', 'sao', 'kirito', 'кирито', 'асуна'],
  },
  {
    id: 'anime-codegeass',
    title: 'Code Geass: Lelouch of the Rebellion',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/4/9391l.jpg',
    releaseYear: 2006,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/1575/Code_Geass__Hangyaku_no_Lelouch',
    aliases: ['код гиас', 'лелуш', 'lelouch'],
  },
  {
    id: 'anime-gto',
    title: 'Great Teacher Onizuka (GTO)',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/13/11460l.jpg',
    releaseYear: 1999,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/245/Great_Teacher_Onizuka',
    aliases: ['крутой учитель онидзука', 'онидзука', 'onizuka', 'gto'],
  },
  {
    id: 'anime-hxh',
    title: 'Hunter x Hunter (2011)',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1337/99013l.jpg',
    releaseYear: 2011,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/11061/Hunter_x_Hunter_2011',
    aliases: ['охотник х охотник', 'гон', 'киллуа', 'hxh'],
  },
  {
    id: 'anime-spiritedaway',
    title: 'Spirited Away',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/6/79597l.jpg',
    releaseYear: 2001,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/199/Sen_to_Chihiro_no_Kamikakushi',
    aliases: ['унесённые призраками', 'унесенные призраками', 'миядзаки'],
  },
  {
    id: 'anime-gurrenlagann',
    title: 'Tengen Toppa Gurren Lagann',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/4/5123l.jpg',
    releaseYear: 2007,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/2001/Tengen_Toppa_Gurren_Lagann',
    aliases: ['гуррен-лаганн', 'гуррен лаганн', 'камина', 'симон'],
  },
  {
    id: 'anime-berserk',
    title: 'Berserk',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/79352l.jpg',
    releaseYear: 1997,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/33/Kenpuu_Denki_Berserk',
    aliases: ['берсерк', 'гатс', 'guts', 'гриффит'],
  },
  {
    id: 'anime-steinsgate',
    title: 'Steins;Gate',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1935/127974l.jpg',
    releaseYear: 2011,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/9253/Steins_Gate',
    aliases: ['врата штейна', 'окабэ', 'steins gate'],
  },
  {
    id: 'anime-onepiece',
    title: 'One Piece',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg',
    releaseYear: 1999,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/21/One_Piece',
    aliases: ['ван пис', 'луффи', 'luffy', 'ванпис'],
  },
  {
    id: 'anime-frieren',
    title: "Frieren: Beyond Journey's End",
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
    releaseYear: 2023,
    rating: 9.9,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/52991/Sousou_no_Frieren',
    aliases: ['фрирен', 'frieren', 'провожающая в последний путь'],
  },
  {
    id: 'anime-gintama',
    title: 'Gintama',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/73249l.jpg',
    releaseYear: 2006,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/918/Gintama',
    aliases: ['гинтама', 'гинтоки'],
  },
  {
    id: 'anime-vinlandsaga',
    title: 'Vinland Saga',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1500/103005l.jpg',
    releaseYear: 2019,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/37521/Vinland_Saga',
    aliases: ['сага о винланде', 'торфинн', 'аскеладд'],
  },
  {
    id: 'anime-kuroko',
    title: "Kuroko's Basketball",
    posterUrl: 'https://cdn.myanimelist.net/images/anime/11/50453l.jpg',
    releaseYear: 2012,
    rating: 9.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/11771/Kuroko_no_Basket',
    aliases: ['баскетбол куроко', 'куроко', 'basketball kuroko'],
  },
  {
    id: 'anime-yourname',
    title: 'Your Name (Kimi no Na wa)',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/5/87048l.jpg',
    releaseYear: 2016,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/32281/Kimi_no_Na_wa',
    aliases: ['твоё имя', 'твое имя', 'kimi no na wa'],
  },
  {
    id: 'anime-bluelock',
    title: 'Blue Lock',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1258/126926l.jpg',
    releaseYear: 2022,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/49596/Blue_Lock',
    aliases: ['синяя тюрьма', 'блю лок', 'blue lock'],
  },
  {
    id: 'anime-deathnote',
    title: 'Death Note',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg',
    releaseYear: 2006,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/1535/Death_Note',
    aliases: ['тетрадь смерти', 'лайт', 'ягами', 'death note'],
  },
  {
    id: 'anime-asilentvoice',
    title: 'A Silent Voice (Koe no Katachi)',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1122/96481l.jpg',
    releaseYear: 2016,
    rating: 9.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/28851/Koe_no_Katachi',
    aliases: ['форма голоса', 'voice shape', 'koe no katachi'],
  },
  {
    id: 'anime-haikyuu',
    title: 'Haikyuu!!',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/7/76014l.jpg',
    releaseYear: 2014,
    rating: 9.5,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/20583/Haikyuu',
    aliases: ['волейбол', 'volleyball', 'хината', 'haikyuu'],
  },
  {
    id: 'anime-naruto',
    title: 'Naruto: Shippuden',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/13/17405l.jpg',
    releaseYear: 2007,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/1735/Naruto__Shippuuden',
    aliases: ['наруто', 'саске', 'naruto'],
  },
  {
    id: 'anime-boruto',
    title: 'Boruto: Naruto Next Generations',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/9/84460l.jpg',
    releaseYear: 2017,
    rating: 8.0,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/34566/Boruto__Naruto_Next_Generations',
    aliases: ['боруто', 'boruto'],
  },
  {
    id: 'anime-bleach',
    title: 'Bleach: Thousand-Year Blood War',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1764/126627l.jpg',
    releaseYear: 2022,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/41467/Bleach__Sennen_Kessen-hen',
    aliases: ['блич', 'ичиго', 'bleach'],
  },
  {
    id: 'anime-mobpsycho',
    title: 'Mob Psycho 100',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/80356l.jpg',
    releaseYear: 2016,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/32182/Mob_Psycho_100',
    aliases: ['моб психо 100', 'моб', 'mob psycho'],
  },
  {
    id: 'anime-onepunchman',
    title: 'One Punch Man',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/12/76049l.jpg',
    releaseYear: 2015,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/30276/One_Punch_Man',
    aliases: ['ванпанчмен', 'сайтама', 'one punch man'],
  },
  {
    id: 'anime-rezero',
    title: 'Re:Zero - Starting Life in Another World',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1522/128039l.jpg',
    releaseYear: 2016,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/31240/Re_Zero_kara_Hajimeru_Isekai_Seikatsu',
    aliases: ['резеро', 're:zero', 'субару', 'эмилия', 'рем'],
  },
  {
    id: 'anime-monster',
    title: 'Monster',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/67341l.jpg',
    releaseYear: 2004,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/19/Monster',
    aliases: ['монстр', 'йохан', 'monster'],
  },
  {
    id: 'anime-grandblue',
    title: 'Grand Blue Dreaming',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1792/93740l.jpg',
    releaseYear: 2018,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/37105/Grand_Blue',
    aliases: ['необъятный океан', 'the endless ocean', 'grand blue'],
  },
  {
    id: 'anime-chainsawman',
    title: 'Chainsaw Man',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',
    releaseYear: 2022,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/44511/Chainsaw_Man',
    aliases: ['человек-бензопила', 'человек бензопила', 'дэндзи', 'макима'],
  },
  {
    id: 'anime-demonslayer',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
    releaseYear: 2019,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/38000/Kimetsu_no_Yaiba',
    aliases: ['клинок рассекающий демонов', 'тандзиро', 'нэзуко', 'demon slayer'],
  },
  {
    id: 'anime-hellsing',
    title: 'Hellsing Ultimate',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/6/73245l.jpg',
    releaseYear: 2006,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/777/Hellsing_Ultimate',
    aliases: ['хеллсинг', 'алукард', 'hellsing'],
  },
  {
    id: 'anime-initiald',
    title: 'Initial D First Stage',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/13/21303l.jpg',
    releaseYear: 1998,
    rating: 9.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/185/Initial_D_First_Stage',
    aliases: ['инициал ди', 'такуми', 'ae86', 'initial d'],
  },
  {
    id: 'anime-dororo',
    title: 'Dororo',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1879/95833l.jpg',
    releaseYear: 2019,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/37520/Dororo',
    aliases: ['дороро', 'хяккимару', 'dororo'],
  },
  {
    id: 'anime-sololeveling',
    title: 'Solo Leveling',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1598/141846l.jpg',
    releaseYear: 2024,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/52299/Ore_dake_Level_Up_na_Ken',
    aliases: ['поднятие уровня в одиночку', 'соло левелинг', 'сун джин ву', 'solo leveling'],
  },
  {
    id: 'anime-jujutsukaisen',
    title: 'Jujutsu Kaisen',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
    releaseYear: 2020,
    rating: 9.6,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/40748/Jujutsu_Kaisen',
    aliases: ['магическая битва', 'годжо', 'гокун', 'magic battle', 'jujutsu kaisen'],
  },
  {
    id: 'anime-haruhi',
    title: 'The Disappearance of Haruhi Suzumiya',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1749/119934l.jpg',
    releaseYear: 2010,
    rating: 9.5,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/7311/Suzumiya_Haruhi_no_Shoushitsu',
    aliases: ['исчезновение харухи судзумии', 'харухи', 'haruhi'],
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
    aliases: [
      'этот глупый свин не понимает мечту девочки-зайки',
      'май сакурадзима',
      'bunny girl senpai',
      'dreaming girl',
    ],
  },
  {
    id: 'anime-tunneltosummer',
    title: 'The Tunnel to Summer, the Exit of Goodbyes',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1761/123168l.jpg',
    releaseYear: 2022,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/50593/Natsu_e_no_Tunnel_Sayonara_no_Deguchi',
    aliases: ['туннель в лето выход прощаний', 'tunnel into summer', 'exit of farewells'],
  },
  {
    id: 'anime-kon',
    title: 'K-ON!',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/76120l.jpg',
    releaseYear: 2009,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/5680/K-On',
    aliases: ['кэйон', 'кейон', 'kayon', 'keion', 'k-on'],
  },
  {
    id: 'anime-spyfamily',
    title: 'SPY x FAMILY',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1441/122795l.jpg',
    releaseYear: 2022,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/50265/Spy_x_Family',
    aliases: ['семья шпиона', 'аня', 'лойд', 'йор', 'spy family', 'spy x family'],
  },
  {
    id: 'anime-overlord',
    title: 'Overlord',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/7/88019l.jpg',
    releaseYear: 2015,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/29803/Overlord',
    aliases: ['повелитель', 'аинз', 'overlord'],
  },
  {
    id: 'anime-evangelion',
    title: 'Neon Genesis Evangelion',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1314/108941l.jpg',
    releaseYear: 1995,
    rating: 9.5,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/30/Neon_Genesis_Evangelion',
    aliases: ['евангелион', 'синдзи', 'аска', 'рэй', 'evangelion'],
  },
  {
    id: 'anime-slime',
    title: 'That Time I Got Reincarnated as a Slime',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1694/93337l.jpg',
    releaseYear: 2018,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/37430/Tensei_shitara_Slime_Datta_Ken',
    aliases: ['о моем перерождении в слизь', 'римуру', 'reincarnation as a slime'],
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
    aliases: ['госпожа кагуя', 'кагуя', 'kaguya sama', 'love is war'],
  },
  {
    id: 'anime-fragrantflower',
    title: 'The Fragrant Flower Blooms With Dignity',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1230/145610l.jpg',
    releaseYear: 2025,
    rating: 9.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/59784/Kaoru_Hana_wa_Rin_to_Saku',
    aliases: ['душистый цветок расцветает с достоинством', 'fragrant flower blooms with dignity'],
  },
  {
    id: 'anime-mha',
    title: 'My Hero Academia',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
    releaseYear: 2016,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/31964/Boku_no_Hero_Academia',
    aliases: ['моя геройская академия', 'дэку', 'мидория', "my hero's academy", 'mha'],
  },
  {
    id: 'anime-horimiya',
    title: 'Horimiya',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1695/111486l.jpg',
    releaseYear: 2021,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/42897/Horimiya',
    aliases: ['хоримия', 'horimia', 'horimiya'],
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
    aliases: ['ангел по соседству', 'махиру', 'the angel next door'],
  },
  {
    id: 'anime-souleater',
    title: 'Soul Eater',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/9/7804l.jpg',
    releaseYear: 2008,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/3588/Soul_Eater',
    aliases: ['пожиратель душ', 'мака', 'soul eater'],
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
    aliases: [
      'добро пожаловать в класс превосходства',
      'аянокоджи',
      'welcome to classroom of excellence',
      'classroom of the elite',
    ],
  },
  {
    id: 'anime-dressupdarling',
    title: 'My Dress-Up Darling',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1179/119897l.jpg',
    releaseYear: 2022,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/48736/Sono_Bisque_Doll_wa_Koi_wo_Suru',
    aliases: [
      'эта фарфоровая кукла влюбилась',
      'марин китагава',
      'this porcelain doll fell in love',
      'my dress-up darling',
    ],
  },
  {
    id: 'anime-quintuplets',
    title: 'The Quintessential Quintuplets',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1824/96982l.jpg',
    releaseYear: 2019,
    rating: 9.0,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/38101/5-toubun_no_Hanayome',
    aliases: ['пять невест', 'пять невест', 'five brides', 'quintuplets'],
  },
  {
    id: 'anime-sakurasou',
    title: 'The Pet Girl of Sakurasou',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/4/43643l.jpg',
    releaseYear: 2012,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/13759/Sakurasou_no_Pet_na_Kanojo',
    aliases: ['кошечка из сакурасо', 'маширо сиина', 'the cat from sakurasou', 'sakurasou'],
  },
  {
    id: 'anime-arifureta',
    title: 'Arifureta: From Commonplace to World’s Strongest',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1805/101859l.jpg',
    releaseYear: 2019,
    rating: 8.7,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/36882/Arifureta_Shokugyou_de_Sekai_Saikyou',
    aliases: ['арифурэта', 'хадзиме', 'arifureta'],
  },
  {
    id: 'anime-konosuba',
    title: "KonoSuba: God's Blessing on this Wonderful World!",
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/77838l.jpg',
    releaseYear: 2016,
    rating: 9.5,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/30831/Kono_Subarashii_Sekai_ni_Shukufuku_wo',
    aliases: [
      'этот замечательный мир',
      'коносуба',
      'аква',
      'мэгумин',
      'the goddess blesses this beautiful world',
      'konosuba',
    ],
  },
  {
    id: 'anime-smartphone',
    title: 'In Another World With My Smartphone',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/87340l.jpg',
    releaseYear: 2017,
    rating: 8.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/35203/Isekai_wa_Smartphone_to_Tomo_ni',
    aliases: ['в другом мире со смартфоном', 'in another world with a smartphone'],
  },
  {
    id: 'anime-wisemansgrandchild',
    title: "Wise Man's Grandchild",
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1183/98338l.jpg',
    releaseYear: 2019,
    rating: 8.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/36407/Kenja_no_Mago',
    aliases: ['внук мудреца', "the sage's grandson", "wise man's grandchild"],
  },
  {
    id: 'anime-eminenceinshadow',
    title: 'The Eminence in Shadow',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1874/121869l.jpg',
    releaseYear: 2022,
    rating: 9.5,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/48316/Kage_no_Jitsuryokusha_ni_Naritakute',
    aliases: [
      'восхождение в тени',
      'сид кагэно',
      'тень',
      'climbing in the shadows',
      'eminence in shadow',
    ],
  },
  {
    id: 'anime-shieldhero',
    title: 'The Rising of the Shield Hero',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1490/101365l.jpg',
    releaseYear: 2019,
    rating: 9.1,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/35790/Tate_no_Yuusha_no_Nariagari',
    aliases: ['восхождение героя щита', 'наофуми', 'рафталия', 'the rising of the shield hero'],
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
    aliases: [
      'марш смерти под рапсодию параллельного мира',
      'death march into the rhapsody of a parallel world',
    ],
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
    aliases: [
      'может я встречу тебя в подземелье',
      'данмачи',
      'белл кранел',
      'гестия',
      "maybe i'll meet you in the dungeon",
      'danmachi',
    ],
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
    aliases: [
      'непризнанный школой владыка демонов',
      'анос волдигод',
      'the misfit of demon king academy',
    ],
  },
  {
    id: 'anime-hyouka',
    title: 'Hyouka',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/13/37087l.jpg',
    releaseYear: 2012,
    rating: 9.2,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/12189/Hyouka',
    aliases: ['хёка', 'хотаро орэки', 'hyouka'],
  },
  {
    id: 'anime-assassinationclassroom',
    title: 'Assassination Classroom',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/5/75810l.jpg',
    releaseYear: 2015,
    rating: 9.3,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/24833/Ansatsu_Kyoushitsu',
    aliases: ['класс убийц', 'коро-сенсей', 'assasination classroom', 'assassination classroom'],
  },
  {
    id: 'anime-magichighschool',
    title: 'The Irregular at Magic High School',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/11/64019l.jpg',
    releaseYear: 2014,
    rating: 8.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/20785/Mahouka_Koukou_no_Rettousei',
    aliases: ['непутёвый ученик в школе магии', 'тацуя сиба', 'the irregular at magic high school'],
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
    aliases: [
      'как и ожидал моя школьная романтическая жизнь не удалась',
      'орегайру',
      'хатиман',
      'my teen romantic comedy snafu',
      'oregairu',
    ],
  },
  {
    id: 'anime-sevendeadlysins',
    title: 'The Seven Deadly Sins',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/8/65409l.jpg',
    releaseYear: 2014,
    rating: 9.0,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/23755/Nanatsu_no_Taizai',
    aliases: ['семь смертных грехов', 'мелиодас', 'the seven deadly sins'],
  },
  {
    id: 'anime-fmab',
    title: 'Fullmetal Alchemist: Brotherhood',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/1223/96541l.jpg',
    releaseYear: 2009,
    rating: 9.9,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/5114/Fullmetal_Alchemist__Brotherhood',
    aliases: ['стальной алхимик', 'эдвард элрик', 'fma', 'fmab'],
  },
  {
    id: 'anime-aot',
    title: 'Attack on Titan',
    posterUrl: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
    releaseYear: 2013,
    rating: 9.8,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/16498/Shingeki_no_Kyojin',
    aliases: ['атака титанов', 'эрен', 'леви', 'attack on titan', 'aot'],
  },
  {
    id: 'anime-jojo',
    title: "JoJo's Bizarre Adventure",
    posterUrl: 'https://cdn.myanimelist.net/images/anime/3/40409l.jpg',
    releaseYear: 2012,
    rating: 9.4,
    type: ShowcaseMediaType.ANIME,
    externalUrl: 'https://myanimelist.net/anime/14719/JoJo_no_Kimyou_na_Bouken_TV',
    aliases: ['джоджо', 'невероятные приключения джоджо', 'jojo'],
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
    aliases: ['крестный отец', 'крёстный отец', 'godfather', 'дон корлеоне'],
  },
  {
    id: 'movie-dune2',
    title: 'Dune: Part Two',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    releaseYear: 2024,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt15239678/',
    aliases: ['дюна', 'dune', 'пол атрейдес', 'тимоти шаламе'],
  },
  {
    id: 'movie-matrix',
    title: 'The Matrix',
    posterUrl: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    releaseYear: 1999,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0133093/',
    aliases: ['матрица', 'нео', 'matrix', 'neo', 'киану ривз'],
  },
  {
    id: 'movie-trumanshow',
    title: 'The Truman Show',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vuza0WqY239yBNa1n7BTRo99ho1.jpg',
    releaseYear: 1998,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0120382/',
    aliases: ['шоу трумана', 'the truman show', 'джим керри'],
  },
  {
    id: 'movie-gladiator',
    title: 'Gladiator',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
    releaseYear: 2000,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0172495/',
    aliases: ['гладиатор', 'максимус', 'gladiator', 'рассел кроу'],
  },
  {
    id: 'movie-oppenheimer',
    title: 'Oppenheimer',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    releaseYear: 2023,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt15398776/',
    aliases: ['оппенгеймер', 'oppenheimer', 'киллиан мерфи', 'нолан'],
  },
  {
    id: 'movie-terminator2',
    title: 'Terminator 2: Judgment Day',
    posterUrl: 'https://image.tmdb.org/t/p/w500/5M0j0B18abtBI5em2Gq4HBACj6c.jpg',
    releaseYear: 1991,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0103064/',
    aliases: ['терминатор', 'арнольд', 'terminator', 'шварценеггер', 'судный день'],
  },
  {
    id: 'movie-mrbean',
    title: 'Mr. Bean',
    posterUrl: 'https://image.tmdb.org/t/p/w500/5m1h277252F7eR11uM7yv8Wk9lG.jpg',
    releaseYear: 1997,
    rating: 9.1,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0118689/',
    aliases: ['мистер бин', 'роуэн аткинсон', 'mr. bean', 'mr bean'],
  },
  {
    id: 'movie-indianajones',
    title: 'Indiana Jones and the Last Crusade',
    posterUrl: 'https://image.tmdb.org/t/p/w500/4p1N2Qrt8j0E79vBLLaoRJq4Ns7.jpg',
    releaseYear: 1989,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0097576/',
    aliases: ['индиана джонс', 'indiana jones', 'харрисон форд', 'последний крестовый поход'],
  },
  {
    id: 'movie-forrestgump',
    title: 'Forrest Gump',
    posterUrl: 'https://image.tmdb.org/t/p/w500/arw2VCBveWOVZr6pxd9XTd1TdQa.jpg',
    releaseYear: 1994,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0109830/',
    aliases: ['форрест гамп', 'том хэнкс', 'forrest gump', 'forest gump'],
  },
  {
    id: 'movie-lotr-rotk',
    title: 'The Lord of the Rings: The Return of the King',
    posterUrl: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
    releaseYear: 2003,
    rating: 9.9,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0167260/',
    aliases: [
      'властелин колец',
      'lotr',
      'the lord of the rings',
      'возвращение короля',
      'фродо',
      'арагорн',
    ],
  },
  {
    id: 'movie-backtothefuture',
    title: 'Back to the Future',
    posterUrl: 'https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg',
    releaseYear: 1985,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0088763/',
    aliases: ['назад в будущее', 'марти макфлай', 'док браун', 'back to the future'],
  },
  {
    id: 'movie-avengers-endgame',
    title: 'Avengers: Endgame',
    posterUrl: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    releaseYear: 2019,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt4154796/',
    aliases: ['мстители', 'avengers', 'финал', 'железный человек', 'танос', 'endgame'],
  },
  {
    id: 'movie-avengers-infinitywar',
    title: 'Avengers: Infinity War',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
    releaseYear: 2018,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt4154756/',
    aliases: ['война бесконечности', 'infinity war', 'мстители'],
  },
  {
    id: 'movie-braveheart',
    title: 'Braveheart',
    posterUrl: 'https://image.tmdb.org/t/p/w500/or1gBugydmjToAEqDpHTj3Xumq4.jpg',
    releaseYear: 1995,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0112573/',
    aliases: ['храброе сердце', 'мел гибсон', 'braveheart', 'brave heart', 'уильям уоллес'],
  },
  {
    id: 'movie-goodwillhunting',
    title: 'Good Will Hunting',
    posterUrl: 'https://image.tmdb.org/t/p/w500/bABFGqqQtNqIo49F00UIe2x6C8L.jpg',
    releaseYear: 1997,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0119217/',
    aliases: ['умница уилл хантинг', 'робин уильямс', 'мэтт дэймон', 'good will hunting'],
  },
  {
    id: 'movie-greenmile',
    title: 'The Green Mile',
    posterUrl: 'https://image.tmdb.org/t/p/w500/8VG8fDNiy50H4Fed0wSVmdnLiOH.jpg',
    releaseYear: 1999,
    rating: 9.9,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0120689/',
    aliases: ['зеленая миля', 'зелёная миля', 'the green mile', 'джон коффи', 'том хэнкс'],
  },
  {
    id: 'movie-starwars5',
    title: 'Star Wars: Episode V - The Empire Strikes Back',
    posterUrl: 'https://image.tmdb.org/t/p/w500/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg',
    releaseYear: 1980,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0080684/',
    aliases: ['звездные войны', 'звёздные войны', 'star wars', 'дарт вейдер', 'люк скайуокер'],
  },
  {
    id: 'movie-interstellar',
    title: 'Interstellar',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    releaseYear: 2014,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0816692/',
    aliases: ['интерстеллар', 'купер', 'нолан', 'interstellar'],
  },
  {
    id: 'movie-psycho',
    title: 'Psycho',
    posterUrl: 'https://image.tmdb.org/t/p/w500/yz4555KyHGkhxwh9R1KtLYe4nUQ.jpg',
    releaseYear: 1960,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0054215/',
    aliases: ['психо', 'хичкок', 'psycho', 'норман бейтс'],
  },
  {
    id: 'movie-fightclub',
    title: 'Fight Club',
    posterUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    releaseYear: 1999,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0137523/',
    aliases: ['бойцовский клуб', 'тайлер дерден', 'fight club', 'брэд питт'],
  },
  {
    id: 'movie-darkknight',
    title: 'The Dark Knight',
    posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    releaseYear: 2008,
    rating: 9.9,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0468569/',
    aliases: [
      'темный рыцарь',
      'тёмный рыцарь',
      'бэтмен',
      'джокер',
      'the dark knight',
      'batman',
      'нолан',
    ],
  },
  {
    id: 'movie-joker',
    title: 'Joker',
    posterUrl: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg',
    releaseYear: 2019,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt7286456/',
    aliases: ['джокер', 'хоакин феникс', 'joker'],
  },
  {
    id: 'series-strangerthings',
    title: 'Stranger Things',
    posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    releaseYear: 2016,
    rating: 9.5,
    type: ShowcaseMediaType.SERIES,
    externalUrl: 'https://www.imdb.com/title/tt4574334/',
    aliases: ['очень странные дела', 'stranger things', 'одиннадцать', 'stranger'],
  },
  {
    id: 'movie-prestige',
    title: 'The Prestige',
    posterUrl: 'https://image.tmdb.org/t/p/w500/bdN3gXuIZYaJP7ftKK2sU0nPtEA.jpg',
    releaseYear: 2006,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0482571/',
    aliases: ['престиж', 'нолан', 'the prestige', 'хью джекман', 'кристиан бэйл'],
  },
  {
    id: 'movie-alien',
    title: 'Alien',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg',
    releaseYear: 1979,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0078748/',
    aliases: ['чужой', 'alien', 'ридли скотт', 'ксеноморф', 'рипли'],
  },
  {
    id: 'movie-intouchables',
    title: 'The Intouchables (1+1)',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1QUeLdhpR9WJ09pU1Q835N2p0wG.jpg',
    releaseYear: 2011,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1675434/',
    aliases: ['1+1', 'один плюс один', 'неприкасаемые', 'the intouchables', 'омар си'],
  },
  {
    id: 'movie-walle',
    title: 'WALL-E',
    posterUrl: 'https://image.tmdb.org/t/p/w500/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg',
    releaseYear: 2008,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0910970/',
    aliases: ['валл-и', 'валли', 'wall-e', 'walle', 'ева'],
  },
  {
    id: 'movie-lionking',
    title: 'The Lion King',
    posterUrl: 'https://image.tmdb.org/t/p/w500/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg',
    releaseYear: 1994,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0110357/',
    aliases: ['король лев', 'симба', 'the lion king', 'муфаса'],
  },
  {
    id: 'movie-shutterisland',
    title: 'Shutter Island',
    posterUrl: 'https://image.tmdb.org/t/p/w500/4GDy0PHYX3VRXUtwK5ysagvkiv5.jpg',
    releaseYear: 2010,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1130884/',
    aliases: ['остров проклятых', 'ди каприо', 'shutter island', 'скорсезе'],
  },
  {
    id: 'movie-coco',
    title: 'Coco',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gGEsBPAijhVUFoiNpgZXqRVWJt2.jpg',
    releaseYear: 2017,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt2380307/',
    aliases: ['тайна коко', 'коко', 'coco', 'the secret of coco', 'мигель'],
  },
  {
    id: 'movie-shrek',
    title: 'Shrek',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg',
    releaseYear: 2001,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0126029/',
    aliases: ['шрек', 'осел', 'shrek'],
  },
  {
    id: 'movie-harrypotter1',
    title: "Harry Potter and the Sorcerer's Stone",
    posterUrl: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
    releaseYear: 2001,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0241527/',
    aliases: ['гарри поттер', 'harry potter', 'хогвартс', 'дамблдор', 'философский камень'],
  },
  {
    id: 'movie-homealone',
    title: 'Home Alone',
    posterUrl: 'https://image.tmdb.org/t/p/w500/9wSbe4CwObACCQva6ioq3z6DV01.jpg',
    releaseYear: 1990,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0099785/',
    aliases: ['один дома', 'кевин', 'home alone', 'маколей калкин'],
  },
  {
    id: 'movie-zootopia',
    title: 'Zootopia',
    posterUrl: 'https://image.tmdb.org/t/p/w500/hlK0e0wAQ3VLuJcsFFZysFiFi5t.jpg',
    releaseYear: 2016,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt2948356/',
    aliases: ['зверополис', 'джуди хоппс', 'ник уайлд', 'zootopia'],
  },
  {
    id: 'movie-monstersinc',
    title: 'Monsters, Inc.',
    posterUrl: 'https://image.tmdb.org/t/p/w500/sgheTspFnyHwRz937zN1bK659w5.jpg',
    releaseYear: 2001,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0198781/',
    aliases: ['корпорация монстров', 'салли', 'майк вазовски', 'monsters inc'],
  },
  {
    id: 'movie-titanic',
    title: 'Titanic',
    posterUrl: 'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
    releaseYear: 1997,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0120338/',
    aliases: ['титаник', 'джек и роза', 'ди каприо', 'titanic'],
  },
  {
    id: 'movie-ratatouille',
    title: 'Ratatouille',
    posterUrl: 'https://image.tmdb.org/t/p/w500/npHNjldbeTHdKKw28bJKs7lzWRj.jpg',
    releaseYear: 2007,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0382932/',
    aliases: ['рататуй', 'реми', 'ratatouille', 'лингвини'],
  },
  {
    id: 'movie-httyd',
    title: 'How to Train Your Dragon',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ygGmAO60t8GyqUo9xYeYxSZAR3b.jpg',
    releaseYear: 2010,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0892769/',
    aliases: ['как приручить дракона', 'беззубик', 'иккинг', 'how to train your dragon'],
  },
  {
    id: 'movie-hachiko',
    title: "Hachi: A Dog's Tale",
    posterUrl: 'https://image.tmdb.org/t/p/w500/1X6hZ1sW1jF3jO3Zp9qW4V1n5wG.jpg',
    releaseYear: 2009,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1028532/',
    aliases: ['хатико', 'hachiko', 'hachi', 'самый верный друг'],
  },
  {
    id: 'movie-sherlock',
    title: 'Sherlock Holmes',
    posterUrl: 'https://image.tmdb.org/t/p/w500/momkKuWburNTqKBF6ez7rvhYVhE.jpg',
    releaseYear: 2009,
    rating: 9.4,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0988045/',
    aliases: ['шерлок холмс', 'роберт дауни', 'sherlock holmes', 'ватсон'],
  },
  {
    id: 'movie-pirates',
    title: 'Pirates of the Caribbean: The Curse of the Black Pearl',
    posterUrl: 'https://image.tmdb.org/t/p/w500/z8onk7LV9M9z9zT76TeKJ96TQmu.jpg',
    releaseYear: 2003,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0325980/',
    aliases: ['пираты карибского моря', 'джек воробей', 'pirates of caribbean', 'джонни депп'],
  },
  {
    id: 'movie-spiderverse',
    title: 'Spider-Man: Into the Spider-Verse',
    posterUrl: 'https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
    releaseYear: 2018,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt4633694/',
    aliases: ['человек-паук', 'человек паук', 'майлз моралес', 'spider man', 'spider-man'],
  },
  {
    id: 'movie-fordvsferrari',
    title: 'Ford v Ferrari',
    posterUrl: 'https://image.tmdb.org/t/p/w500/6ApDtO7xaAKR9vfa6k4q9QvA09j.jpg',
    releaseYear: 2019,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1950186/',
    aliases: [
      'ford против ferrari',
      'форд против феррари',
      'ford vs ferrari',
      'кэрролл шелби',
      'кен майлз',
    ],
  },
  {
    id: 'movie-aladdin',
    title: 'Aladdin',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vL5LR60FXgl42N7N5Lg3K789w5L.jpg',
    releaseYear: 1992,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0103639/',
    aliases: ['аладдин', 'джинн', 'alladin', 'aladdin', 'жасмин'],
  },
  {
    id: 'movie-goodfellas',
    title: 'Goodfellas',
    posterUrl: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kcuo.jpg',
    releaseYear: 1990,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0099685/',
    aliases: ['славные парни', 'goodfellas', 'скорсезе', 'де ниро'],
  },
  {
    id: 'movie-up',
    title: 'Up',
    posterUrl: 'https://image.tmdb.org/t/p/w500/vpbaStTMt8qqgE2daU0BNekAhxU.jpg',
    releaseYear: 2009,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1049413/',
    aliases: ['вверх', 'карл фредриксен', 'рассел', 'up'],
  },
  {
    id: 'movie-granturismo',
    title: 'Gran Turismo',
    posterUrl: 'https://image.tmdb.org/t/p/w500/51tqzRtKMMFEYUpSY9UN57G4jnv.jpg',
    releaseYear: 2023,
    rating: 9.1,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1320261/',
    aliases: ['гран туризмо', 'gran turismo', 'ян марденборо'],
  },
  {
    id: 'series-f1',
    title: 'Formula 1: Drive to Survive',
    posterUrl: 'https://image.tmdb.org/t/p/w500/84s0L6P7rM8oZ4f0Kk8e3E9F8lK.jpg',
    releaseYear: 2019,
    rating: 9.4,
    type: ShowcaseMediaType.SERIES,
    externalUrl: 'https://www.imdb.com/title/tt8289930/',
    aliases: ['формула 1', 'formula 1', 'f1', 'drive to survive'],
  },
  {
    id: 'movie-treasureisland',
    title: 'Treasure Island',
    posterUrl: 'https://image.tmdb.org/t/p/w500/2L23f9vA6oO6o61qT26n8p9O1w.jpg',
    releaseYear: 1988,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0122295/',
    aliases: [
      'остров сокровищ',
      'treasure island',
      'доктор ливси',
      'джон сильвер',
      'джеймс хокинс',
    ],
  },
  {
    id: 'movie-mib',
    title: 'Men in Black',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uLOmOF5IzWkuRGquy5GE6LNYznG.jpg',
    releaseYear: 1997,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0119654/',
    aliases: ['люди в черном', 'люди в чёрном', 'men in black', 'mib', 'уилл смит', 'агент джей'],
  },
  {
    id: 'movie-odyssey2001',
    title: '2001: A Space Odyssey',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg',
    releaseYear: 1968,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0062622/',
    aliases: ['космическая одиссея', 'odyssey', 'кубрик', 'hal 9000'],
  },
  {
    id: 'movie-findingnemo',
    title: 'Finding Nemo',
    posterUrl: 'https://image.tmdb.org/t/p/w500/eHuGQ10FUzK1mdOY69Tu8osAQ7N.jpg',
    releaseYear: 2003,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0266543/',
    aliases: ['в поисках немо', 'немо', 'дори', 'finding nemo'],
  },
  {
    id: 'movie-thehobbit',
    title: 'The Hobbit: An Unexpected Journey',
    posterUrl: 'https://image.tmdb.org/t/p/w500/yHA9Fc37VmpIVvUMOGw9Yg8um4V.jpg',
    releaseYear: 2012,
    rating: 9.4,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0903624/',
    aliases: ['хоббит', 'the hobbit', 'бильбо бэггинс', 'гендальф', 'нежданное путешествие'],
  },
  {
    id: 'movie-iceage',
    title: 'Ice Age',
    posterUrl: 'https://image.tmdb.org/t/p/w500/zpaQwR0YViPd83bx1e559US1w98.jpg',
    releaseYear: 2002,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0268380/',
    aliases: ['ледниковый период', 'мэнни', 'сид', 'скрэт', 'ice age'],
  },
  {
    id: 'movie-pussinboots2',
    title: 'Puss in Boots: The Last Wish',
    posterUrl: 'https://image.tmdb.org/t/p/w500/kuf6dutpsT0vSV9Vv4yy2n9Zebw.jpg',
    releaseYear: 2022,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt3915174/',
    aliases: ['кот в сапогах', 'puss in boots', 'последнее желание', 'волк смерть'],
  },
  {
    id: 'movie-toystory',
    title: 'Toy Story',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg',
    releaseYear: 1995,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0114709/',
    aliases: ['история игрушек', 'вуди', 'базз лайтер', 'toy story'],
  },
  {
    id: 'series-breakingbad',
    title: 'Breaking Bad',
    posterUrl: 'https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    releaseYear: 2008,
    rating: 9.9,
    type: ShowcaseMediaType.SERIES,
    externalUrl: 'https://www.imdb.com/title/tt0903747/',
    aliases: ['во все тяжкие', 'breaking bad', 'уолтер уайт', 'хайзенберг', 'джесси пинкман'],
  },
  {
    id: 'series-arcane',
    title: 'Arcane',
    posterUrl: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn397FvFeNZ91.jpg',
    releaseYear: 2021,
    rating: 9.8,
    type: ShowcaseMediaType.SERIES,
    externalUrl: 'https://www.imdb.com/title/tt11126994/',
    aliases: ['аркейн', 'arcane', 'джинкс', 'вай', 'лига легенд'],
  },
  {
    id: 'movie-pulpfiction',
    title: 'Pulp Fiction',
    posterUrl: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    releaseYear: 1994,
    rating: 9.8,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0110912/',
    aliases: ['криминальное чтиво', 'тарантино', 'pulp fiction', 'винсент вега', 'джулс'],
  },
  {
    id: 'movie-shawshank',
    title: 'The Shawshank Redemption',
    posterUrl: 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
    releaseYear: 1994,
    rating: 9.9,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0111161/',
    aliases: ['побег из шоушенка', 'энди дюфрейн', 'the shawshank redemption'],
  },
  {
    id: 'movie-inception',
    title: 'Inception',
    posterUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    releaseYear: 2010,
    rating: 9.7,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1375666/',
    aliases: ['начало', 'inception', 'ди каприо', 'нолан', 'дом кобб'],
  },
  {
    id: 'movie-whiplash',
    title: 'Whiplash',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg',
    releaseYear: 2014,
    rating: 9.6,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt2582802/',
    aliases: ['одержимость', 'whiplash', 'барабанщик', 'флетчер'],
  },
  {
    id: 'movie-wolfofwallstreet',
    title: 'The Wolf of Wall Street',
    posterUrl: 'https://image.tmdb.org/t/p/w500/34m2tygAYBGqA9MXKhRDtzYd4MR.jpg',
    releaseYear: 2013,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt0993846/',
    aliases: ['волк с уолл-стрит', 'the wolf of wall street', 'джордан белфорт', 'ди каприо'],
  },
  {
    id: 'movie-bladerunner2049',
    title: 'Blade Runner 2049',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
    releaseYear: 2017,
    rating: 9.5,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt1856191/',
    aliases: ['бегущий по лезвию 2049', 'blade runner 2049', 'райан гослинг'],
  },
  {
    id: 'movie-lalaland',
    title: 'La La Land',
    posterUrl: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkVJt0Rf0.jpg',
    releaseYear: 2016,
    rating: 9.4,
    type: ShowcaseMediaType.MOVIE,
    externalUrl: 'https://www.imdb.com/title/tt3783958/',
    aliases: ['ла-ла ленд', 'la la land', 'райан гослинг', 'эмма стоун'],
  },
];

@Injectable()
export class MediaProxyService {
  private readonly logger = new Logger(MediaProxyService.name);
  private readonly CACHE_TTL_SECONDS = 86400; // 24 hours

  constructor(private readonly redis: RedisService) {}

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
      const seenTitles = new Set(localMatches.map((i) => i.title.toLowerCase()));

      for (const item of remoteResults) {
        if (!seenTitles.has(item.title.toLowerCase())) {
          seenTitles.add(item.title.toLowerCase());
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

  async searchTracks(query: string): Promise<any[]> {
    const cleanQuery = (query || '').trim();
    const cacheKey = `showcase:search:tracks:${encodeURIComponent(cleanQuery.toLowerCase())}`;

    return this.redis.getOrSet(cacheKey, this.CACHE_TTL_SECONDS, async () => {
      if (cleanQuery) {
        try {
          const res = await axios.get<{
            resultCount: number;
            results: Array<{
              trackName?: string;
              artistName?: string;
              artworkUrl100?: string;
              previewUrl?: string;
              trackViewUrl?: string;
              trackTimeMillis?: number;
            }>;
          }>(
            `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&entity=song&limit=15`,
            { timeout: 5000 },
          );

          if (res.data?.results && res.data.results.length > 0) {
            return res.data.results
              .filter((t) => Boolean(t.trackName && t.artistName))
              .map((t) => ({
                title: t.trackName || 'Unknown Title',
                artist: t.artistName || 'Unknown Artist',
                albumArt: t.artworkUrl100
                  ? t.artworkUrl100.replace('100x100bb', '600x600bb')
                  : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
                previewUrl: t.previewUrl || null,
                spotifyUrl: t.trackViewUrl || null,
                durationMs: t.trackTimeMillis || null,
              }));
          }
        } catch (err) {
          this.logger.warn(`iTunes music search failed: ${(err as Error).message}`);
        }
      }

      const POPULAR_TRACKS = [
        {
          title: 'Starboy',
          artist: 'The Weeknd, Daft Punk',
          albumArt:
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
          previewUrl:
            'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/0a/63/1f/0a631fd2-7e78-831d-b8d9-6bb46d29944a/mzaf_13617300305608687799.plus.aac.p.m4a',
          spotifyUrl: 'https://open.spotify.com/track/7MXVkk9YM5IZxh0wAEWWE9',
          durationMs: 230000,
        },
        {
          title: 'Blinding Lights',
          artist: 'The Weeknd',
          albumArt:
            'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
          previewUrl:
            'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/bf/25/74/bf257404-5858-6933-ee70-a35c43d922de/mzaf_16474136294723049103.plus.aac.p.m4a',
          spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
          durationMs: 200000,
        },
        {
          title: 'After Dark',
          artist: 'Mr.Kitty',
          albumArt:
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
          previewUrl:
            'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/c3/cf/00/c3cf004b-0e9e-4c74-e822-ff9bce545a90/mzaf_8407765103445778848.plus.aac.p.m4a',
          spotifyUrl: 'https://open.spotify.com/track/2LKOHdZ0skEs0Qk5iRdr02',
          durationMs: 257000,
        },
        {
          title: 'Never Gonna Give You Up',
          artist: 'Rick Astley',
          albumArt:
            'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
          previewUrl:
            'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/bc/99/aa/bc99aa9f-7a49-9c59-bf5b-fb52a900593b/mzaf_5255448378939109033.plus.aac.p.m4a',
          spotifyUrl: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
          durationMs: 213000,
        },
      ];

      if (!cleanQuery) {
        return POPULAR_TRACKS;
      }

      const filtered = POPULAR_TRACKS.filter(
        (t) =>
          t.title.toLowerCase().includes(cleanQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(cleanQuery.toLowerCase()),
      );

      if (filtered.length > 0) return filtered;

      return [
        {
          title: cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1),
          artist: 'Popular Artist',
          albumArt:
            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
          previewUrl: null,
          spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(cleanQuery)}`,
        },
        ...POPULAR_TRACKS.slice(0, 3),
      ];
    });
  }
}
