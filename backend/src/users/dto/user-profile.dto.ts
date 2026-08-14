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

  @ApiProperty()
  isPrivate!: boolean;

  @ApiProperty({ example: false, description: 'Verification checkmark status' })
  isVerified!: boolean;

  @ApiPropertyOptional({
    example: 'DEVELOPER',
    nullable: true,
    description: 'Active single primary badge',
  })
  primaryBadge?: string | null;

  @ApiPropertyOptional({
    example: ['DEVELOPER', 'BETA_TESTER'],
    description: 'List of owned badge IDs',
  })
  badges?: string[];

  @ApiPropertyOptional({
    example: 'AyateAgh',
    nullable: true,
    description: 'Linked GitHub username',
  })
  githubUsername?: string | null;

  @ApiPropertyOptional({
    example: 5,
    description: 'Total merged Pull Requests count in main repository',
  })
  mergedPrsCount?: number;

  @ApiPropertyOptional({
    enum: FollowStatusView,
    description: "Viewer's follow relationship; omitted for owner/anonymous",
  })
  followStatus?: FollowStatusView;

  @ApiPropertyOptional({
    description: 'Exact ISO date when visible, otherwise a LastSeenGranularity bucket',
  })
  lastSeen?: string | LastSeenGranularity | null;

  @ApiPropertyOptional()
  lastSeenAt?: string | LastSeenGranularity | null;

  @ApiPropertyOptional()
  isOnline?: boolean;

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
}
