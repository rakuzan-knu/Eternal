export interface TwitchUserData {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  description: string;
}

export interface TwitchUsersResponse {
  data: TwitchUserData[];
}

export interface TwitchFollowersResponse {
  total: number;
}

export interface TwitchStreamData {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
}

export interface TwitchStreamsResponse {
  data: TwitchStreamData[];
}

export interface RobloxUserLookup {
  id: number;
  name: string;
  displayName: string;
  hasVerifiedBadge?: boolean;
}

export interface RobloxLookupResponse {
  data: RobloxUserLookup[];
}

export interface RobloxThumbData {
  targetId: number;
  state: string;
  imageUrl: string;
}

export interface RobloxThumbResponse {
  data: RobloxThumbData[];
}

export interface RobloxUserProfileResponse {
  description?: string;
  created?: string;
  isBanned?: boolean;
  id?: number;
  name?: string;
  displayName?: string;
  hasVerifiedBadge?: boolean;
}

export interface RobloxOpenCloudUserResponse {
  about?: string;
}

export interface RobloxFriendsCountResponse {
  count: number;
}

export interface RobloxCollectibleItem {
  userAssetId: number;
  assetId: number;
  name: string;
  recentAveragePrice?: number;
  originalPrice?: number;
  assetStock?: number;
  buildersClubMembershipType?: number;
}

export interface RobloxCollectiblesResponse {
  data: RobloxCollectibleItem[];
}

export interface RobloxPlaceItem {
  id: number;
  name: string;
  description?: string;
  rootPlace?: {
    id: number;
    name?: string;
  };
}

export interface RobloxPlacesResponse {
  data: RobloxPlaceItem[];
}

export interface GitHubUserResponse {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
}

export interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  personastate?: number;
  communityvisibilitystate?: number;
}

export interface SteamPlayerSummariesResponse {
  response: {
    players?: SteamPlayerSummary[];
  };
}

export interface SteamOwnedGame {
  appid: number;
  name?: string;
  playtime_forever: number;
  img_icon_url?: string;
}

export interface SteamOwnedGamesResponse {
  response: {
    game_count?: number;
    games?: SteamOwnedGame[];
  };
}

export interface OpenDotaProfile {
  account_id: number;
  personaname: string;
  avatarfull: string;
}

export interface OpenDotaResponse {
  rank_tier?: number;
  leaderboard_rank?: number;
  profile?: OpenDotaProfile;
}

export interface OpenDotaWinLossResponse {
  win: number;
  lose: number;
}

export interface YouTubeChannelSnippet {
  title: string;
  description: string;
  customUrl?: string;
  thumbnails?: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
}

export interface YouTubeChannelStatistics {
  viewCount: string;
  subscriberCount: string;
  videoCount: string;
}

export interface YouTubeChannelItem {
  id: string;
  snippet?: YouTubeChannelSnippet;
  statistics?: YouTubeChannelStatistics;
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
}

export interface YouTubeChannelsResponse {
  items?: YouTubeChannelItem[];
}

export interface YouTubePlaylistItem {
  id: string;
  snippet?: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails?: {
      medium?: { url: string };
      high?: { url: string };
    };
    resourceId?: {
      videoId: string;
    };
  };
  contentDetails?: {
    videoId: string;
    videoPublishedAt?: string;
  };
}

export interface YouTubePlaylistItemsResponse {
  items?: YouTubePlaylistItem[];
}

export interface YouTubeVideoItem {
  id: string;
  snippet?: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails?: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
}

export interface YouTubeVideosResponse {
  items?: YouTubeVideoItem[];
}

export interface YouTubeSearchItem {
  id?: { channelId?: string };
  snippet?: { channelId?: string };
}

export interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

export interface TwitchAccountInput {
  id?: string;
  username?: string;
  channel?: string;
  followersCount?: number;
}

export interface TwitchLiveStatus {
  isLive: boolean;
  streamTitle: string;
  gameName: string;
  viewersCount: number;
  streamThumbnailUrl: string | null;
  startedAt: string | null;
  followersCount: number;
}
