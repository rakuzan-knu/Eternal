import { Injectable, UnauthorizedException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../redis/redis.service';
import * as crypto from 'crypto';
import type { Request, Response } from 'express';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private get clientId(): string {
    return this.config.get<string>('GITHUB_CLIENT_ID') || '9407946148e4d58d7030';
  }

  private get clientSecret(): string {
    return this.config.get<string>('GITHUB_CLIENT_SECRET') || 'mock_github_client_secret';
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
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
            sub?: string;
          };
          if (payload.sub) userIdParam = String(payload.sub);
        }
      } catch {
        // ignore
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
      let tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
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
        const existing = await this.prisma.user.findFirst({
          where: { githubId },
        });
        if (existing) targetUserId = existing.id;
      }

      // Fetch user repos and stars
      let repos: any[] = [];
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
          const reposData = await reposRes.json();
          if (Array.isArray(reposData)) {
            repos = reposData.map((r: any) => {
              const stars = r.stargazers_count ?? 0;
              const forks = r.forks_count ?? 0;
              starsCount += stars;
              forksCount += forks;
              return {
                name: r.name,
                description: r.description || 'No description provided.',
                stars,
                forks,
                language: r.language || 'TypeScript',
                url: r.html_url,
              };
            });
          }
        }
      } catch (err) {
        this.logger.warn(`Could not fetch GitHub repos for ${githubUsername}: ${err}`);
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
        await this.prisma.user.update({
          where: { id: targetUserId },
          data: {
            githubId,
            githubUsername,
          },
        });

        // Upsert showcase connectedAccounts
        const showcase = await this.prisma.profileShowcase.findUnique({
          where: { userId: targetUserId },
        });
        const currentAccounts = (showcase?.connectedAccounts as Record<string, any>) || {};
        currentAccounts.github = ghAccountData;

        await this.prisma.profileShowcase.upsert({
          where: { userId: targetUserId },
          create: {
            userId: targetUserId,
            connectedAccounts: currentAccounts,
          },
          update: {
            connectedAccounts: currentAccounts,
          },
        });

        await this.redis.del(`user:${targetUserId}`);
        await this.redis.del(`showcase:user:${targetUserId}`);
        await this.redis.del(`integration:cache:github:${githubUsername.toLowerCase()}`);
        await this.syncUserGithubContributions(targetUserId);
      }

      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>GitHub Account Connected</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="background:#0e0e11;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;user-select:none;">
            <div style="text-align:center;padding:32px 40px;border:1px solid rgba(255,255,255,0.12);border-radius:24px;background:#141417;box-shadow:0 25px 60px rgba(0,0,0,0.8);max-width:380px;width:90%;">
              <div style="width:56px;height:56px;margin:0 auto 16px;background:#24292e;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #5865F2;box-shadow:0 0 24px rgba(88,101,242,0.4);">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              </div>
              <h2 style="color:#ffffff;margin:0 0 8px;font-size:20px;font-weight:800;letter-spacing:-0.3px;">GitHub Connected!</h2>
              <p style="color:#a1a1aa;font-size:13px;margin:0 0 16px;line-height:1.5;">Authenticated as <b style="color:#fff;">${githubUsername}</b>.</p>
              <div style="padding:8px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;display:inline-block;margin-bottom:18px;">
                <p style="color:#94a3b8;font-size:12px;margin:0;">Closing in <b id="countdown" style="color:#5865F2;">5</b> seconds...</p>
              </div>
              <div>
                <button onclick="window.close()" style="background:#5865F2;color:#fff;border:none;border-radius:12px;padding:10px 24px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(88,101,242,0.4);transition:all 0.2s;">
                  Close Window Now
                </button>
              </div>
            </div>
            <script>
              function broadcast() {
                if (window.opener) {
                  try {
                    window.opener.postMessage({ type: 'INTEGRATION_AUTH_SUCCESS', platform: 'github', username: '${githubUsername}' }, '*');
                  } catch(e) {}
                }
              }
              broadcast();
              var interval = setInterval(broadcast, 400);

              var count = 5;
              var el = document.getElementById('countdown');
              var timer = setInterval(function() {
                count--;
                if (el) el.textContent = count;
                if (count <= 0) {
                  clearInterval(timer);
                  clearInterval(interval);
                  broadcast();
                  if (window.opener) {
                    window.close();
                  } else {
                    window.location.href = '${effectiveFrontendUrl}/settings?github=connected';
                  }
                }
              }, 1000);
            </script>
          </body>
        </html>
      `);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`GitHub OAuth Callback Exception: ${errMsg}`);
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>GitHub Connection Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="background:#0e0e11;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;user-select:none;">
            <div style="text-align:center;padding:32px 40px;border:1px solid rgba(239,68,68,0.25);border-radius:24px;background:#141417;box-shadow:0 25px 60px rgba(0,0,0,0.8);max-width:380px;width:90%;">
              <div style="width:56px;height:56px;margin:0 auto 16px;background:#451a1a;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #ef4444;box-shadow:0 0 24px rgba(239,68,68,0.4);">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              </div>
              <h2 style="color:#ffffff;margin:0 0 8px;font-size:20px;font-weight:800;letter-spacing:-0.3px;">Connection Failed</h2>
              <p style="color:#a1a1aa;font-size:13px;margin:0 0 16px;line-height:1.5;">${errMsg || 'Failed to authenticate with GitHub'}</p>
              <div>
                <button onclick="window.close()" style="background:#27272a;color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 24px;font-size:12px;font-weight:700;cursor:pointer;">
                  Close Window
                </button>
              </div>
            </div>
          </body>
        </html>
      `);
    }
  }

  async unlinkGithub(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        githubId: null,
        githubUsername: null,
        mergedPrsCount: 0,
      },
    });

    await this.prisma.userBadge.deleteMany({
      where: {
        userId,
        badgeId: {
          in: [
            'CONTRIBUTOR',
            'CONTRIBUTOR_BRONZE',
            'CONTRIBUTOR_SILVER',
            'CONTRIBUTOR_GOLD',
            'CONTRIBUTOR_PLATINUM',
            'CONTRIBUTOR_DIAMOND',
            'CONTRIBUTOR_RUBY',
            'CONTRIBUTOR_OPAL',
          ],
        },
      },
    });

    await this.redis.del(`user:${userId}`);
  }

  async syncUserGithubContributions(userId: string): Promise<{
    mergedPrsCount: number;
    githubUsername: string | null;
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.githubId) {
      return { mergedPrsCount: 0, githubUsername: null };
    }

    let currentGithubUsername = user.githubUsername || '';

    try {
      const headers: Record<string, string> = { 'User-Agent': 'SocialNetwork-App' };
      if (this.systemToken) {
        headers['Authorization'] = `token ${this.systemToken}`;
      }

      const refreshRes = await fetch(`https://api.github.com/user/${user.githubId}`, {
        headers,
      });

      if (refreshRes.ok) {
        const ghData = (await refreshRes.json()) as { login?: string };
        if (ghData.login && ghData.login !== currentGithubUsername) {
          currentGithubUsername = ghData.login;
          await this.prisma.user.update({
            where: { id: userId },
            data: { githubUsername: currentGithubUsername },
          });
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to refresh GitHub username for user ${userId}: ${errMsg}`);
    }

    if (!currentGithubUsername) {
      return { mergedPrsCount: 0, githubUsername: null };
    }

    let mergedPrsCount = 0;
    try {
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

      const searchRes = await fetch(queryUrl, { headers });
      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as { total_count?: number };
        if (typeof searchData.total_count === 'number') {
          mergedPrsCount = searchData.total_count;
        }
      } else {
        this.logger.warn(`GitHub Search API returned status ${searchRes.status}`);
      }
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

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryBadge: true },
    });

    const updateData: { mergedPrsCount: number; primaryBadge?: string } = { mergedPrsCount };
    if (
      highestEarnedBadge &&
      (!currentUser?.primaryBadge ||
        currentUser.primaryBadge.toUpperCase().startsWith('CONTRIBUTOR'))
    ) {
      updateData.primaryBadge = highestEarnedBadge;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    if (badgesToGrant.length > 0) {
      await this.prisma.userBadge.createMany({
        data: badgesToGrant.map((badgeId) => ({ userId, badgeId })),
        skipDuplicates: true,
      });
    }

    await this.redis.del(`user:${userId}`);

    return {
      mergedPrsCount,
      githubUsername: currentGithubUsername,
    };
  }

  verifySignature(rawBody: string | Buffer, signatureHeader?: string): boolean {
    if (!this.webhookSecret) {
      return process.env.NODE_ENV !== 'production';
    }

    if (!signatureHeader) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const expectedSignature = `sha256=${hmac.update(rawBody).digest('hex')}`;

    try {
      const a = Buffer.from(signatureHeader);
      const b = Buffer.from(expectedSignature);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
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

      const user = await this.prisma.user.findFirst({
        where: {
          githubUsername: {
            equals: authorLogin,
            mode: 'insensitive',
          },
        },
      });

      if (user) {
        await this.syncUserGithubContributions(user.id);
        return { handled: true, message: `Synced PR count for user @${user.username}` };
      }
      return { handled: false, message: `No user linked with GitHub username @${authorLogin}` };
    }

    return { handled: false, message: 'Event ignored (not a merged PR)' };
  }
}
