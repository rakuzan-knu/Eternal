import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutoDeletePeriod } from '@prisma/client';

export enum LastSeenGranularity {
  RECENTLY = 'RECENTLY',
  WITHIN_WEEK = 'WITHIN_WEEK',
  WITHIN_MONTH = 'WITHIN_MONTH',
  LONG_AGO = 'LONG_AGO',
}

export enum FollowStatusView {
  NONE = 'none',
  PENDING = 'pending',
  FOLLOWING = 'following',
}

export class RecommendationMutualFriendDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'alice' })
  username!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', nullable: true })
  avatar!: string | null;
}

export class RecommendationReasonDto {
  @ApiProperty({
    enum: ['MUTUAL_FRIENDS', 'NEARBY', 'SAME_CITY', 'POPULAR'],
    example: 'MUTUAL_FRIENDS',
  })
  type!: 'MUTUAL_FRIENDS' | 'NEARBY' | 'SAME_CITY' | 'POPULAR';

  @ApiProperty({ example: 'Followed by benjamin_edm and 2 others' })
  text!: string;

  @ApiPropertyOptional({ type: [RecommendationMutualFriendDto] })
  mutualFriends?: RecommendationMutualFriendDto[];

  @ApiPropertyOptional({ example: 3 })
  totalMutualCount?: number;
}

export class UserProfileDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  displayName!: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  avatar!: string | null;

  @ApiPropertyOptional({ nullable: true })
  banner?: string | null;

  @ApiPropertyOptional()
  bannerPosition?: number;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Only present when the viewer may see it' })
  birthDate?: string | null;

  @ApiProperty({ example: false })
  isPrivate!: boolean;

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiPropertyOptional({ nullable: true, example: 'verified' })
  primaryBadge?: string | null;

  @ApiPropertyOptional({ example: ['verified', 'contributor'] })
  badges?: string[];

  @ApiPropertyOptional({ nullable: true, example: 'johndoe' })
  githubUsername?: string | null;

  @ApiPropertyOptional({ example: 42 })
  mergedPrsCount?: number;

  @ApiPropertyOptional({
    description: 'Exact ISO date when visible, otherwise a LastSeenGranularity bucket',
  })
  lastSeen?: string | LastSeenGranularity | null;

  @ApiPropertyOptional()
  lastSeenAt?: string | LastSeenGranularity | null;

  @ApiPropertyOptional()
  isOnline?: boolean;

  @ApiPropertyOptional({
    enum: FollowStatusView,
    example: FollowStatusView.NONE,
    description: 'Follow status from the perspective of the requesting user',
  })
  followStatus?: FollowStatusView;

  @ApiPropertyOptional({ enum: AutoDeletePeriod, description: 'Owner-only' })
  autoDeletePeriod?: AutoDeletePeriod;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({
    example: false,
    description:
      'Whether the requesting user is following this profile. Always false for anonymous requests.',
  })
  isFollowing?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether this target user is following the requesting user.',
  })
  followsYou?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether both users follow each other (mutual friends).',
  })
  isFriend?: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: 'Number of accepted followers',
  })
  followersCount?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Number of posts published by this user',
  })
  postsCount?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Number of users this profile is following',
  })
  followingCount?: number;

  @ApiPropertyOptional({
    example: 'Best Friend',
    description: 'Private custom alias set by the viewer for this target user',
  })
  alias?: string | null;

  @ApiPropertyOptional({
    type: () => RecommendationReasonDto,
    description: 'Contextual reason why this profile was recommended to the viewer',
  })
  recommendationReason?: RecommendationReasonDto;
}
