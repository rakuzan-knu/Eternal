import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma';

export interface BotRenderOptions {
  userAgent?: string;
  path: string;
}

@Injectable()
export class SeoBotMiddlewareService {
  private readonly logger = new Logger(SeoBotMiddlewareService.name);
  private readonly BASE_URL = process.env.BASE_URL || 'https://eternalnet.vercel.app';
  private readonly CDN_BASE_URL = process.env.CDN_BASE_URL || 'https://eternalnet.vercel.app';
  private readonly SITE_NAME = 'Eternal';

  constructor(private readonly prisma: PrismaService) {}

  isSearchBot(userAgent?: string): boolean {
    if (!userAgent) return false;
    return /Googlebot|Google-Extended|bingbot|Yandex|YandexBot|Applebot|Applebot-Extended|Baiduspider|DuckDuckBot|PerplexityBot|ClaudeBot|Claude-Web|GPTBot|ChatGPT-User/i.test(
      userAgent,
    );
  }

  resolveCdnMedia(
    pathOrUrl?: string | null,
    fallback: string = `${this.BASE_URL}/images/shared/EternalBanner.png`,
  ): string {
    if (!pathOrUrl || typeof pathOrUrl !== 'string' || pathOrUrl.trim() === '') {
      return fallback;
    }
    const clean = pathOrUrl.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.startsWith('//')) return `https:${clean}`;
    if (clean.startsWith('/images/') || clean.startsWith('/icons/') || clean === '/favicon.svg') {
      return `${this.BASE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`;
    }
    return `${this.CDN_BASE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`;
  }

  async renderDynamicMetaHtml(baseHtml: string, options: BotRenderOptions): Promise<string> {
    const { userAgent, path } = options;
    const isSearchBot = this.isSearchBot(userAgent);

    // 1. Check if route is a user profile: /@username or /profile/username
    const profileMatch = path.match(/^\/(?:@|profile\/)([a-zA-Z0-9_.-]+)/);
    if (profileMatch) {
      const username = profileMatch[1];
      const user = await this.prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          avatar: true,
          banner: true,
          isVerified: true,
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException(`User @${username} not found`);
      }

      const displayName = user.displayName || `@${user.username}`;
      const title = `${displayName} (@${user.username}) • ${this.SITE_NAME}`;
      const bio =
        user.bio ||
        `Connect with @${user.username} on Eternal. Share posts, photos, and chat in real-time.`;
      const avatar = this.resolveCdnMedia(user.avatar, `${this.BASE_URL}/favicon.svg`);
      const canonical = `${this.BASE_URL}/@${user.username}`;

      let html = baseHtml
        .replace(/<title>.*?<\/title>/i, `<title>${title}</title>`)
        .replace(
          /<meta\s+name=["']description["'].*?>/i,
          `<meta name="description" content="${bio}" />`,
        )
        .replace(
          /<link\s+rel=["']canonical["'].*?>/i,
          `<link rel="canonical" href="${canonical}" />`,
        )
        .replace(
          /<meta\s+property=["']og:title["'].*?>/i,
          `<meta property="og:title" content="${title}" />`,
        )
        .replace(
          /<meta\s+property=["']og:description["'].*?>/i,
          `<meta property="og:description" content="${bio}" />`,
        )
        .replace(
          /<meta\s+property=["']og:image["'].*?>/i,
          `<meta property="og:image" content="${avatar}" />`,
        )
        .replace(
          /<meta\s+property=["']og:url["'].*?>/i,
          `<meta property="og:url" content="${canonical}" />`,
        )
        .replace(
          /<meta\s+property=["']og:type["'].*?>/i,
          `<meta property="og:type" content="profile" />`,
        )
        .replace(
          /<meta\s+name=["']twitter:title["'].*?>/i,
          `<meta name="twitter:title" content="${title}" />`,
        )
        .replace(
          /<meta\s+name=["']twitter:description["'].*?>/i,
          `<meta name="twitter:description" content="${bio}" />`,
        )
        .replace(
          /<meta\s+name=["']twitter:image["'].*?>/i,
          `<meta name="twitter:image" content="${avatar}" />`,
        );

      // For search bots: inject anti-cloaking 1:1 semantic HTML body into <div id="root">
      if (isSearchBot) {
        const postsCount = user._count?.posts || 0;
        const followersCount = user._count?.followers || 0;
        const followingCount = user._count?.following || 0;

        const semanticBody = `
          <main style="max-width: 700px; margin: 40px auto; padding: 20px; font-family: system-ui, sans-serif; color: #ffffff; background: #070709;">
            <header style="display: flex; align-items: center; gap: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 24px;">
              <img src="${avatar}" alt="${displayName}" style="width: 96px; height: 96px; border-radius: 50%; object-fit: cover;" />
              <div>
                <h1 style="font-size: 24px; font-weight: 800; margin: 0;">${displayName} ${user.isVerified ? '<span style="color: #a855f7;">✓ Verified</span>' : ''}</h1>
                <p style="font-size: 15px; color: #a1a1aa; margin: 4px 0 0 0;">@${user.username}</p>
                <div style="display: flex; gap: 16px; margin-top: 12px; font-size: 14px; color: #d4d4d8;">
                  <span><strong>${postsCount}</strong> posts</span>
                  <span><strong>${followersCount}</strong> followers</span>
                  <span><strong>${followingCount}</strong> following</span>
                </div>
              </div>
            </header>
            <section style="margin-top: 20px;">
              <p style="font-size: 16px; line-height: 1.5; color: #e4e4e7;">${bio}</p>
            </section>
          </main>
        `;
        html = html.replace('<div id="root"></div>', `<div id="root">${semanticBody}</div>`);
      }

      return html;
    }

    // 2. Check if route is a post: /post/:id or /p/:id
    const postMatch = path.match(/^\/(?:post|p)\/([a-zA-Z0-9_-]+)/);
    if (postMatch) {
      const postId = postMatch[1];
      const post = await this.prisma.post.findFirst({
        where: {
          id: postId,
        },
        include: {
          author: {
            select: {
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true,
            },
          },
          media: {
            take: 1,
            select: {
              url: true,
            },
          },
        },
      });

      if (!post) {
        throw new NotFoundException(`Post ${postId} not found`);
      }

      const authorName = post.author?.displayName || `@${post.author?.username || 'user'}`;
      const postContent = post.content || `Post by ${authorName} on Eternal`;
      const title = `${authorName} on Eternal: "${postContent.slice(0, 60)}${postContent.length > 60 ? '...' : ''}"`;
      const description = postContent.slice(0, 160);
      const postMediaUrl = post.media?.[0]?.url;
      const ogImage = this.resolveCdnMedia(
        postMediaUrl || post.author?.avatar,
        `${this.BASE_URL}/images/shared/EternalBanner.png`,
      );
      const canonical = `${this.BASE_URL}/post/${post.id}`;

      let html = baseHtml
        .replace(/<title>.*?<\/title>/i, `<title>${title}</title>`)
        .replace(
          /<meta\s+name=["']description["'].*?>/i,
          `<meta name="description" content="${description}" />`,
        )
        .replace(
          /<link\s+rel=["']canonical["'].*?>/i,
          `<link rel="canonical" href="${canonical}" />`,
        )
        .replace(
          /<meta\s+property=["']og:title["'].*?>/i,
          `<meta property="og:title" content="${title}" />`,
        )
        .replace(
          /<meta\s+property=["']og:description["'].*?>/i,
          `<meta property="og:description" content="${description}" />`,
        )
        .replace(
          /<meta\s+property=["']og:image["'].*?>/i,
          `<meta property="og:image" content="${ogImage}" />`,
        )
        .replace(
          /<meta\s+property=["']og:url["'].*?>/i,
          `<meta property="og:url" content="${canonical}" />`,
        )
        .replace(
          /<meta\s+property=["']og:type["'].*?>/i,
          `<meta property="og:type" content="article" />`,
        )
        .replace(
          /<meta\s+name=["']twitter:title["'].*?>/i,
          `<meta name="twitter:title" content="${title}" />`,
        )
        .replace(
          /<meta\s+name=["']twitter:description["'].*?>/i,
          `<meta name="twitter:description" content="${description}" />`,
        )
        .replace(
          /<meta\s+name=["']twitter:image["'].*?>/i,
          `<meta name="twitter:image" content="${ogImage}" />`,
        );

      if (isSearchBot) {
        const semanticBody = `
          <article style="max-width: 650px; margin: 40px auto; padding: 20px; font-family: system-ui, sans-serif; color: #ffffff; background: #070709; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;">
            <header style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
              <img src="${this.resolveCdnMedia(post.author?.avatar)}" alt="${authorName}" style="width: 48px; height: 48px; border-radius: 50%;" />
              <div>
                <h1 style="font-size: 18px; font-weight: 700; margin: 0;">${authorName} ${post.author?.isVerified ? '<span style="color: #a855f7;">✓</span>' : ''}</h1>
                <p style="font-size: 13px; color: #a1a1aa; margin: 0;">@${post.author?.username}</p>
              </div>
            </header>
            <div style="font-size: 16px; line-height: 1.6; color: #f4f4f5; margin-bottom: 16px;">
              ${post.content || ''}
            </div>
            ${postMediaUrl ? `<img src="${this.resolveCdnMedia(postMediaUrl)}" alt="Post attachment" style="width: 100%; border-radius: 12px; margin-bottom: 16px;" />` : ''}
            <footer style="font-size: 13px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px;">
              <time datetime="${post.createdAt.toISOString()}">${post.createdAt.toUTCString()}</time>
            </footer>
          </article>
        `;
        html = html.replace('<div id="root"></div>', `<div id="root">${semanticBody}</div>`);
      }

      return html;
    }

    return baseHtml;
  }
}
