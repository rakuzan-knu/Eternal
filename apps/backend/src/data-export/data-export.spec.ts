import {
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { MessageBodyService } from '../common/cassandra/message-body.service';
import { MessageBodyRepository } from '../common/cassandra/message-body.repository';
import { PrismaService } from '../common/prisma/prisma.service';
import { DataExportCursor } from './data-export.cursor';
import { DataExportRepository, ownVisibleMessagesWhere } from './data-export.repository';
import { DATA_EXPORT_MAX_PAGE_BYTES, DataExportService } from './data-export.service';

const owner = 'owner-id';
const snapshot = new Date('2026-11-05T12:00:00.000Z');
const firstDate = new Date('2026-11-04T12:00:00.000Z');

it('keeps backend and client export wire contracts identical', () => {
  const backend = readFileSync(resolve(__dirname, '../common/contracts/data-export.ts'), 'utf8');
  const shared = readFileSync(
    resolve(__dirname, '../../../../packages/shared/contracts/src/data-export.ts'),
    'utf8',
  );
  expect(backend.replace(/\r\n/g, '\n')).toBe(shared.replace(/\r\n/g, '\n'));
});

function cursors(secret: string | undefined = 'test-export-signing-secret') {
  return new DataExportCursor(new ConfigService({ JWT_ACCESS_SECRET: secret }));
}

describe('data export continuation authorization', () => {
  it('binds every continuation to owner, service and section', () => {
    const cursor = cursors();
    const token = cursor.encode(owner, 'core', 'posts', snapshot, {
      id: 'post-1',
      createdAt: firstDate,
    });
    expect(cursor.decode(token, owner, 'core', 'posts', snapshot)).toEqual({
      snapshot,
      after: { id: 'post-1', createdAt: firstDate },
    });
    expect(() => cursor.decode(token, 'another-user', 'core', 'posts', snapshot)).toThrow(
      BadRequestException,
    );
    expect(() => cursor.decode(token, owner, 'messenger', 'messages', snapshot)).toThrow(
      BadRequestException,
    );
    expect(() => cursor.decode(token, owner, 'core', 'comments', snapshot)).toThrow(
      BadRequestException,
    );
  });

  it('rejects tampering, expiry and future snapshots', () => {
    const cursor = cursors();
    const token = cursor.encode(owner, 'core', 'posts', snapshot, {
      id: 'post-1',
      createdAt: firstDate,
    });
    const pieces = token.split('.');
    const altered = Buffer.from(
      JSON.stringify({ userId: 'another-user', section: 'posts' }),
    ).toString('base64url');
    expect(() =>
      cursor.decode(`${altered}.${pieces[1]}`, owner, 'core', 'posts', snapshot),
    ).toThrow(BadRequestException);
    expect(() =>
      cursor.decode(token, owner, 'core', 'posts', new Date(snapshot.getTime() + 3_600_001)),
    ).toThrow(BadRequestException);
    expect(() =>
      cursor.decode(token, owner, 'core', 'posts', new Date(snapshot.getTime() - 1)),
    ).toThrow(BadRequestException);
  });

  it('fails closed without a production signing secret', () => {
    const cursor = new DataExportCursor(new ConfigService({ JWT_ACCESS_SECRET: '' }));
    expect(() =>
      cursor.encode(owner, 'core', 'posts', snapshot, { id: 'post-1', createdAt: firstDate }),
    ).toThrow(ServiceUnavailableException);
  });
});

describe('data export pages', () => {
  async function setup() {
    const auth = { verifyPassword: vi.fn().mockResolvedValue(true) };
    const repository = {
      account: vi.fn().mockResolvedValue({ id: owner, email: 'owner@example.test' }),
      profile: vi.fn().mockResolvedValue({ id: owner, bio: 'My profile' }),
      settings: vi.fn().mockResolvedValue({ id: owner, autoDeletePeriod: 'OFF' }),
      posts: vi.fn().mockResolvedValue([]),
      comments: vi.fn().mockResolvedValue([]),
      messages: vi.fn().mockResolvedValue([]),
    };
    const module = await Test.createTestingModule({
      providers: [
        DataExportService,
        { provide: AuthService, useValue: auth },
        { provide: DataExportRepository, useValue: repository },
        { provide: DataExportCursor, useValue: cursors() },
      ],
    }).compile();
    return { service: module.get(DataExportService), auth, repository };
  }

  it('checks the current password on every page before reading any export data', async () => {
    const { service, auth, repository } = await setup();
    auth.verifyPassword.mockResolvedValue(false);
    await expect(
      service.core(owner, { password: 'incorrect', section: 'account', limit: 50 }),
    ).rejects.toThrow(UnauthorizedException);
    expect(repository.account).not.toHaveBeenCalled();
    expect(auth.verifyPassword).toHaveBeenCalledWith(owner, 'incorrect');
  });

  it('returns explicit empty results and exclusions without claiming a full legal export', async () => {
    const { service } = await setup();
    const page = await service.core(owner, { password: 'correct', section: 'posts', limit: 50 });
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
    expect(page.limitations.join(' ')).toContain('not a complete response');
    expect(page.limitations.join(' ')).toContain('stored ciphertext');
    expect(JSON.stringify(page)).not.toContain('correct');
  });

  it('rejects a forged foreign cursor before querying while independently verifying password', async () => {
    const { service, auth, repository } = await setup();
    const foreign = cursors().encode('another-user', 'core', 'posts', new Date(), {
      id: 'post-1',
      createdAt: firstDate,
    });
    await expect(
      service.core(owner, { password: 'correct', section: 'posts', limit: 50, cursor: foreign }),
    ).rejects.toThrow(BadRequestException);
    expect(auth.verifyPassword).toHaveBeenCalledWith(owner, 'correct');
    expect(repository.posts).not.toHaveBeenCalled();
  });

  it('continues from the last returned record when the byte budget shortens a page', async () => {
    const { service, repository, auth } = await setup();
    repository.posts.mockResolvedValue([
      { id: 'post-1', createdAt: firstDate, item: { id: 'post-1', text: 'a'.repeat(140_000) } },
      { id: 'post-2', createdAt: firstDate, item: { id: 'post-2', text: 'b'.repeat(140_000) } },
    ]);
    const first = await service.core(owner, {
      password: 'correct',
      section: 'posts',
      limit: 50,
    });
    expect(first.items.map((item) => item.id)).toEqual(['post-1']);
    expect(Buffer.byteLength(JSON.stringify(first))).toBeLessThanOrEqual(
      DATA_EXPORT_MAX_PAGE_BYTES,
    );
    expect(first.nextCursor).toBeTypeOf('string');
    if (!first.nextCursor) throw new Error('Expected a continuation');
    repository.posts.mockResolvedValue([
      { id: 'post-2', createdAt: firstDate, item: { id: 'post-2', text: 'b'.repeat(140_000) } },
    ]);
    const second = await service.core(owner, {
      password: 'correct',
      section: 'posts',
      limit: 50,
      cursor: first.nextCursor,
    });
    expect(second.items.map((item) => item.id)).toEqual(['post-2']);
    expect(second.nextCursor).toBeNull();
    expect(repository.posts).toHaveBeenLastCalledWith(
      owner,
      expect.objectContaining({ after: { id: 'post-1', createdAt: firstDate } }),
      51,
    );
    expect(auth.verifyPassword).toHaveBeenCalledTimes(2);
  });

  it('fails rather than dropping an oversized record or unavailable archived body', async () => {
    const { service, repository } = await setup();
    repository.posts.mockResolvedValue([
      { id: 'huge', createdAt: firstDate, item: { text: 'x'.repeat(DATA_EXPORT_MAX_PAGE_BYTES) } },
    ]);
    await expect(
      service.core(owner, { password: 'correct', section: 'posts', limit: 50 }),
    ).rejects.toThrow(PayloadTooLargeException);
    repository.messages.mockRejectedValue(new ServiceUnavailableException('History unavailable'));
    await expect(
      service.messenger(owner, { password: 'correct', section: 'messages', limit: 50 }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

describe('data export repository privacy boundary', () => {
  async function setup() {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      post: { findMany: vi.fn().mockResolvedValue([]) },
      comment: { findMany: vi.fn().mockResolvedValue([]) },
      message: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const hydrate = vi.fn(async <T>(rows: T): Promise<T> => rows);
    const module = await Test.createTestingModule({
      providers: [
        DataExportRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: MessageBodyService, useValue: { hydrate } },
      ],
    }).compile();
    return { repository: module.get(DataExportRepository), prisma, hydrate };
  }

  it('always scopes authored content independently of the validated continuation', async () => {
    const { repository, prisma } = await setup();
    const position = { snapshot, after: { id: 'foreign-post', createdAt: firstDate } };
    await repository.posts(owner, position, 51);
    await repository.comments(owner, position, 51);
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ authorId: owner }) }),
    );
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: owner, isDeleted: false }),
      }),
    );
  });

  it('selects account fields instead of returning password, provider or session secrets', async () => {
    const { repository, prisma } = await setup();
    await repository.account(owner);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: owner },
      select: {
        id: true,
        email: true,
        username: true,
        birthDate: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await repository.profile(owner);
    const profileSelection = JSON.stringify(prisma.user.findUnique.mock.calls.at(-1));
    expect(profileSelection).not.toMatch(/password|connectedAccounts|prekey|sessions|pushDevices/i);
  });

  it('requires own undeleted messages and current conversation and private-channel access', () => {
    const where = ownVisibleMessagesWhere(owner);
    expect(where).toMatchObject({
      senderId: owner,
      deletedForAll: false,
      deletedAt: null,
      deletedFor: { none: { userId: owner } },
      conversation: {
        participants: { some: { userId: owner, leftAt: null } },
        OR: [
          { communityChannel: { is: null } },
          {
            communityChannel: {
              is: {
                community: { members: { some: { userId: owner, state: 'ACTIVE' } } },
                OR: [
                  { isPrivate: false },
                  { allowedUserIds: { has: owner } },
                  { community: { ownerId: owner } },
                  {
                    community: {
                      members: { some: { userId: owner, state: 'ACTIVE', role: 'ADMIN' } },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    });
  });

  it('hydrates only selected visible rows and emits no internal revision or attachment locator', async () => {
    const { repository, prisma, hydrate } = await setup();
    const archived: { body: string | null } = { body: null };
    const rows = [
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        ...archived,
        bodyArchived: true,
        bodyRevision: 5n,
        messageType: 'TEXT',
        editedAt: null,
        createdAt: firstDate,
        attachments: [
          {
            id: 'attachment-1',
            type: 'FILE',
            fileName: 'own.txt',
            mimeType: 'text/plain',
            size: 12,
          },
        ],
      },
    ];
    prisma.message.findMany.mockResolvedValue(rows);
    hydrate.mockImplementation(async <T>(value: T): Promise<T> => {
      rows[0]!.body = 'archived content';
      return value;
    });
    const records = await repository.messages(owner, { snapshot }, 51);
    expect(hydrate).toHaveBeenCalledWith(rows);
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [ownVisibleMessagesWhere(owner), { createdAt: { lte: snapshot } }] },
        select: expect.objectContaining({
          attachments: {
            select: { id: true, type: true, fileName: true, mimeType: true, size: true },
          },
        }),
      }),
    );
    const result = JSON.stringify(records.map((record) => record.item));
    expect(result).toContain('archived content');
    expect(result).not.toMatch(/bodyRevision|bodyArchived|thumbnailUrl|storageKey|bucket|url/i);
  });
});

describe('data export archived message hydration', () => {
  it('exports stored encrypted content and refuses a stale archived revision', async () => {
    const stored = { body: null as string | null };
    const rows = [
      {
        id: 'message-1',
        conversationId: 'conversation-1',
        ...stored,
        bodyArchived: true,
        bodyRevision: 5n,
        messageType: 'TEXT',
        editedAt: null,
        createdAt: firstDate,
        attachments: [],
      },
    ];
    const read = vi.fn().mockResolvedValue({ revision: 5n, body: 'ciphertext:v1:example' });
    const prisma = { message: { findMany: vi.fn().mockResolvedValue(rows) } };
    const module = await Test.createTestingModule({
      providers: [
        DataExportRepository,
        MessageBodyService,
        { provide: PrismaService, useValue: prisma },
        { provide: MessageBodyRepository, useValue: { read } },
      ],
    }).compile();
    const repository = module.get(DataExportRepository);
    const page = await repository.messages(owner, { snapshot }, 51);
    expect(page[0]?.item.body).toBe('ciphertext:v1:example');
    expect(read).toHaveBeenCalledWith('message-1');
    const row = rows[0];
    if (!row) throw new Error('Missing fixture');
    row.body = null;
    read.mockResolvedValue({ revision: 4n, body: 'stale content' });
    await expect(repository.messages(owner, { snapshot }, 51)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
