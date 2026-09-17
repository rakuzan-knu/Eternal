import {
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { CircuitBreaker } from '../common/resilience/circuit-breaker';
import { safeJsonParse } from '../common/utils/json.util';
import { TraceContext } from '../common/tracing/trace-context';
import * as crypto from 'crypto';
import { timingSafeEqual } from '../common/crypto/timing-safe';
import type { Request, Response } from 'express';
import {
  GITHUB_REPOSITORY,
  type IGithubRepository,
} from './interfaces/github-repository.interface';

const CONTRIBUTOR_TIERS_MAPPING = [
  { count: 100, badgeId: 'CONTRIBUTOR_OPAL' },
  { count: 50, badgeId: 'CONTRIBUTOR_RUBY' },
  { count: 25, badgeId: 'CONTRIBUTOR_DIAMOND' },
  { count: 10, badgeId: 'CONTRIBUTOR_PLATINUM' },
  { count: 5, badgeId: 'CONTRIBUTOR_GOLD' },
  { count: 3, badgeId: 'CONTRIBUTOR_SILVER' },
  { count: 1, badgeId: 'CONTRIBUTOR_BRONZE' },
];

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    @Inject(GITHUB_REPOSITORY)
    private readonly githubRepo: IGithubRepository,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.circuitBreaker = new CircuitBreaker({
      name: 'GitHub-API',
      failureThreshold: 4,
      resetTimeoutMs: 20_000,
      halfOpenSuccessThreshold: 2,
      onStateChange: (from, to) => {
        this.logger.warn(`GitHub API CircuitBreaker transitioned from ${from} to ${to}`);
      },
    });
  }

  private get clientId(): string {
    return this.config.get<string>('GITHUB_CLIENT_ID') || '';
  }

  private get clientSecret(): string {
    return this.config.get<string>('GITHUB_CLIENT_SECRET') || '';
  }

  private get callbackUrl(): string {
    const configured = this.config.get<string>('GITHUB_CALLBACK_URL');
    if (configured && !configured.includes(':5000')) return configured;
    const port = this.config.get<number>('PORT') || 3000;
    return `http://localhost:${port}/api/auth/github/callback`;
  }

  private get frontendRedirectUrl(): string {
    const raw = this.config.get<string>('CORS_ORIGIN') || 'http://localhost:5173';
    return raw.split(',')[0].trim().replace(/\/+$/, '');
  }

  private get systemToken(): string {
    return this.config.get<string>('GITHUB_SYSTEM_TOKEN') || '';
  }

  private get webhookSecret(): string {
    return this.config.get<string>('GITHUB_WEBHOOK_SECRET') || '';
  }

  getAuthorizationUrl(req: Request, res: Response): void {
    const csrf = crypto.randomBytes(32).toString('hex');
    let userIdParam = typeof req.query.userId === 'string' ? req.query.userId : '';
    const rawToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    if (!userIdParam && rawToken) {
      try {
        const parts = rawToken.split('.');
        if (parts.length === 3) {
          const payload = safeJsonParse<{ sub?: string }>(Buffer.from(parts[1], 'base64url'));
          if (payload?.sub) userIdParam = String(payload.sub);
        }
      } catch (e) {
        this.logger.debug(`Could not parse optional token in getAuthorizationUrl: ${String(e)}`);
      }
    }

    const state = userIdParam ? `${csrf}:${userIdParam}` : csrf;

    const forwardedProtoHeader = req.headers['x-forwarded-proto'];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader?.split(',')[0];
    const isSecureRequest =
      req.secure || forwardedProto?.trim() === 'https' || process.env.NODE_ENV === 'production';

    const originParam = typeof req.query.origin === 'string' ? req.query.origin : '';
    if (originParam) {
      res.cookie('github_client_origin', originParam, {
        httpOnly: true,
        secure: isSecureRequest,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      });
    }

    res.cookie('github_oauth_state', csrf, {
      httpOnly: true,
      secure: isSecureRequest,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    const targetUrl = new URL('https://github.com/login/oauth/authorize');
    targetUrl.searchParams.set('client_id', this.clientId);
    targetUrl.searchParams.set('redirect_uri', this.callbackUrl);
    targetUrl.searchParams.set('scope', 'read:user');
    targetUrl.searchParams.set('state', state);

    res.redirect(targetUrl.toString());
  }

  async handleOAuthCallback(
    code: string,
    state: string,
    req: Request,
    res: Response,
    userId?: string,
  ): Promise<void> {
    const [csrfFromState, userIdFromState] = (state || '').split(':');
    const cookieState = (req.cookies as Record<string, string> | undefined)?.github_oauth_state;

    const clientOriginCookie = (req.cookies as Record<string, string> | undefined)
      ?.github_client_origin;
    const effectiveFrontendUrl = clientOriginCookie || this.frontendRedirectUrl;

    // Resilient state check: Allow if cookie matches OR if userIdFromState was provided in signed state
    if (cookieState && csrfFromState && csrfFromState !== cookieState && !userIdFromState) {
      this.logger.warn(`CSRF state mismatch during GitHub OAuth callback.`);
      res.clearCookie('github_oauth_state');
      res.clearCookie('github_client_origin');
      return res.redirect(`${effectiveFrontendUrl}/settings?error=csrf_state_mismatch`);
    }

    res.clearCookie('github_oauth_state');
    res.clearCookie('github_client_origin');

    try {
      const abortSignal = TraceContext.getAbortSignal();
      let tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        ...(abortSignal ? { signal: abortSignal } : {}),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.callbackUrl,
        }),
      });

      let tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };

      // Resilient fallback: if redirect_uri_mismatch, retry with port 5000 in case code was created with legacy URI
      if (!tokenData.access_token && tokenData.error === 'redirect_uri_mismatch') {
        tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code,
            redirect_uri: 'http://localhost:5000/api/auth/github/callback',
          }),
        });
        tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
      }

      const accessToken = tokenData.access_token;

      if (!accessToken) {
        throw new UnauthorizedException(
          tokenData.error
            ? `GitHub OAuth error: ${tokenData.error}`
            : 'Failed to obtain GitHub access token',
        );
      }

      const userRes = await fetch('https://api.github.com/user', {
        ...(abortSignal ? { signal: abortSignal } : {}),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'SocialNetwork-App',
        },
      });

      if (!userRes.ok) {
        throw new UnauthorizedException('Failed to fetch user profile from GitHub API');
      }

      const ghUser = (await userRes.json()) as {
        id?: number | string;
        login?: string;
        avatar_url?: string;
        bio?: string;
        public_repos?: number;
        followers?: number;
        following?: number;
      };
      const githubId = ghUser.id ? String(ghUser.id) : '';
      const githubUsername = ghUser.login || 'GitHubUser';

      let targetUserId = userId || userIdFromState;
      if (!targetUserId && githubId) {
        const existing = await this.githubRepo.findUserByGithubId(githubId);
        if (existing) targetUserId = existing.id;
      }

      // Fetch user repos and stars
      let repos: {
        name: string;
        description: string;
        stars: number;
        forks: number;
        language: string;
        url: string;
      }[] = [];
      let starsCount = 0;
      let forksCount = 0;
      try {
        const reposRes = await fetch(
          `https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos?sort=updated&per_page=12`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'User-Agent': 'SocialNetwork-App',
            },
          },
        );
        if (reposRes.ok) {
          const reposData = (await reposRes.json()) as {
            name?: string;
            description?: string | null;
            stargazers_count?: number;
            forks_count?: number;
            language?: string | null;
            html_url?: string;
          }[];
          if (Array.isArray(reposData)) {
            repos = reposData.map((r) => {
              const stars = r.stargazers_count ?? 0;
              const forks = r.forks_count ?? 0;
              starsCount += stars;
              forksCount += forks;
              return {
                name: r.name ?? '',
                description: r.description || 'No description provided.',
                stars,
                forks,
                language: r.language || 'TypeScript',
                url: r.html_url ?? '',
              };
            });
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Could not fetch GitHub repos for ${githubUsername}: ${errMsg}`);
      }

      const pinnedRepo = repos[0] || null;
      const ghAccountData = {
        username: githubUsername,
        avatarUrl: ghUser.avatar_url,
        bio: ghUser.bio || 'Open-source software developer & creator.',
        reposCount: typeof ghUser.public_repos === 'number' ? ghUser.public_repos : repos.length,
        followersCount: ghUser.followers ?? 0,
        followingCount: ghUser.following ?? 0,
        starsCount,
        forksCount,
        repos,
        pinnedRepo,
        mergedPrsCount: 0,
        verified: true,
        authenticatedAt: new Date().toISOString(),
      };

      if (targetUserId) {
        await this.githubRepo.updateUserGithub(targetUserId, {
          githubId,
          githubUsername,
        });

        // Upsert showcase connectedAccounts
        await this.githubRepo.updateShowcaseGithubAccount(targetUserId, ghAccountData);

        await this.redis.del(`user:${targetUserId}`);
        await this.redis.del(`showcase:user:${targetUserId}`);
        await this.redis.del(`integration:cache:github:${githubUsername.toLowerCase()}`);
        await this.syncUserGithubContributions(targetUserId);
      }

      return res.redirect(`${effectiveFrontendUrl}/settings?github=connected`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`GitHub OAuth Callback Exception: ${errMsg}`);
      return res.redirect(`${effectiveFrontendUrl}/settings?error=oauth_failed`);
    }
  }

  async unlinkGithub(userId: string): Promise<void> {
    const user = await this.githubRepo.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    await this.githubRepo.unlinkGithubAndBadges(userId, [
      'CONTRIBUTOR',
      'CONTRIBUTOR_BRONZE',
      'CONTRIBUTOR_SILVER',
      'CONTRIBUTOR_GOLD',
      'CONTRIBUTOR_PLATINUM',
      'CONTRIBUTOR_DIAMOND',
      'CONTRIBUTOR_RUBY',
      'CONTRIBUTOR_OPAL',
    ]);

    await this.redis.del(`user:${userId}`);
  }

  async syncUserGithubContributions(userId: string): Promise<{
    mergedPrsCount: number;
    githubUsername: string | null;
  }> {
    return this.redis.withLock(`lock:rewards:${userId}`, async () => {
      const user = await this.githubRepo.findUserById(userId);
      if (!user || !user.githubId) {
        return { mergedPrsCount: 0, githubUsername: null };
      }

      let currentGithubUsername = user.githubUsername || '';

      try {
        await this.circuitBreaker.execute(async () => {
          const headers: Record<string, string> = { 'User-Agent': 'SocialNetwork-App' };
          if (this.systemToken) {
            headers['Authorization'] = `token ${this.systemToken}`;
          }

          const abortSignal = TraceContext.getAbortSignal();
          const refreshRes = await fetch(`https://api.github.com/user/${user.githubId}`, {
            ...(abortSignal ? { signal: abortSignal } : {}),
            headers,
          });

          if (refreshRes.ok) {
            const ghData = (await refreshRes.json()) as { login?: string };
            if (ghData.login && ghData.login !== currentGithubUsername) {
              currentGithubUsername = ghData.login;
              await this.githubRepo.updateUserGithub(userId, {
                githubUsername: currentGithubUsername,
              });
            }
          }
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to refresh GitHub username for user ${userId}: ${errMsg}`);
      }

      if (!currentGithubUsername) {
        return { mergedPrsCount: 0, githubUsername: null };
      }

      let mergedPrsCount = user.mergedPrsCount || 0;
      try {
        mergedPrsCount = await this.circuitBreaker.execute(
          async () => {
            const abortSignal = TraceContext.getAbortSignal();
            const headers: Record<string, string> = {
              Accept: 'application/vnd.github+json',
              'User-Agent': 'SocialNetwork-App',
            };
            if (this.systemToken) {
              headers['Authorization'] = `token ${this.systemToken}`;
            }

            const queryUrl = `https://api.github.com/search/issues?q=repo:rakuzan-knu/social-network+type:pr+is:merged+author:${encodeURIComponent(
              currentGithubUsername,
            )}`;

            const searchRes = await fetch(queryUrl, {
              ...(abortSignal ? { signal: abortSignal } : {}),
              headers,
            });
            if (searchRes.ok) {
              const searchData = (await searchRes.json()) as { total_count?: number };
              if (typeof searchData.total_count === 'number') {
                return searchData.total_count;
              }
            } else {
              this.logger.warn(`GitHub Search API returned status ${searchRes.status}`);
            }
            return mergedPrsCount;
          },
          () => mergedPrsCount,
        );
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error querying GitHub Search API: ${errMsg}`);
      }

      const badgesToGrant: string[] = [];
      if (mergedPrsCount >= 1) {
        badgesToGrant.push('CONTRIBUTOR');
      }

      for (const tier of CONTRIBUTOR_TIERS_MAPPING) {
        if (mergedPrsCount >= tier.count) {
          badgesToGrant.push(tier.badgeId);
        }
      }

      const tierBadgesInOrder = [
        'CONTRIBUTOR_OPAL',
        'CONTRIBUTOR_RUBY',
        'CONTRIBUTOR_DIAMOND',
        'CONTRIBUTOR_PLATINUM',
        'CONTRIBUTOR_GOLD',
        'CONTRIBUTOR_SILVER',
        'CONTRIBUTOR_BRONZE',
      ];
      const highestEarnedBadge = tierBadgesInOrder.find((b) => badgesToGrant.includes(b));

      const currentUser = await this.githubRepo.findUserById(userId);

      const updateData: { mergedPrsCount: number; primaryBadge?: string } = { mergedPrsCount };
      if (
        highestEarnedBadge &&
        (!currentUser?.primaryBadge ||
          currentUser.primaryBadge.toUpperCase().startsWith('CONTRIBUTOR'))
      ) {
        updateData.primaryBadge = highestEarnedBadge;
      }

      await this.githubRepo.updateUserGithub(userId, updateData);

      if (badgesToGrant.length > 0) {
        await this.githubRepo.grantBadges(userId, badgesToGrant);
      }

      await this.redis.del(`user:${userId}`);

      return {
        mergedPrsCount,
        githubUsername: currentGithubUsername,
      };
    });
  }

  verifySignature(rawBody: string | Buffer, signatureHeader?: string): boolean {
    if (!signatureHeader) {
      return false;
    }

    if (!this.webhookSecret) {
      return process.env.NODE_ENV !== 'production';
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const expectedSignature = `sha256=${hmac.update(rawBody).digest('hex')}`;

    try {
      return timingSafeEqual(signatureHeader, expectedSignature);
    } catch {
      return false;
    }
  }

  async handleWebhookPayload(
    payload: Record<string, unknown>,
  ): Promise<{ handled: boolean; message: string }> {
    const action = payload.action;
    const pullRequest = payload.pull_request as
      { merged?: boolean; user?: { login?: string } } | undefined;
    const isMerged = pullRequest?.merged === true;
    const authorLogin = pullRequest?.user?.login;

    if (action === 'closed' && isMerged && authorLogin) {
      this.logger.log(`Received PR merge webhook for GitHub author: ${authorLogin}`);

      const user = await this.githubRepo.findUserByGithubUsername(authorLogin);

      if (user) {
        await this.syncUserGithubContributions(user.id);
        return { handled: true, message: `Synced PR count for user @${user.username}` };
      }
      return { handled: false, message: `No user linked with GitHub username @${authorLogin}` };
    }

    return { handled: false, message: 'Event ignored (not a merged PR)' };
  }
}
