import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CoreDataExportRequest,
  DataExportPage,
  DataExportRequest,
  DataExportServiceRole,
  MessengerDataExportRequest,
} from '@common/contracts';
import { AuthService } from '../auth/auth.service';
import { DataExportCursor } from './data-export.cursor';
import { DataExportRepository } from './data-export.repository';
import type { ExportRecord } from './data-export.repository';

export const DATA_EXPORT_MAX_PAGE_BYTES = 256 * 1024;

export const DATA_EXPORT_LIMITATIONS = [
  'This download contains only the selected account, profile, settings, authored post/comment text, and eligible sent-message fields. It is not a complete response to every legal data-access request.',
  'Media files, media URLs, raw profile-style JSON, showcase/integration data, stories, reels, music libraries, relationships, reactions, polls, purchases, sessions, device data, reports and internal moderation/security records are not included.',
  'Private keys, authentication secrets and other people\u2019s message content are not included. Encrypted messages remain stored ciphertext; the server cannot decrypt them for this download.',
  'Messages deleted for everyone or for you, and conversations or private channels you can no longer access, are excluded. Attachment entries contain metadata only.',
  'Each section is read separately. Newer records are excluded by that section\u2019s start time; edits, deletions and access changes between pages can affect the result. Continuation cursors expire after one hour.',
] as const;

@Injectable()
export class DataExportService {
  constructor(
    private readonly auth: AuthService,
    private readonly repository: DataExportRepository,
    private readonly cursors: DataExportCursor,
  ) {}

  core(userId: string, request: CoreDataExportRequest): Promise<DataExportPage> {
    return this.exportPage(userId, 'core', request);
  }

  messenger(userId: string, request: MessengerDataExportRequest): Promise<DataExportPage> {
    return this.exportPage(userId, 'messenger', request);
  }

  private async exportPage(
    userId: string,
    service: DataExportServiceRole,
    request: DataExportRequest,
  ): Promise<DataExportPage> {
    if (!(await this.auth.verifyPassword(userId, request.password)))
      throw new UnauthorizedException('Incorrect password');
    const now = new Date();
    const base: DataExportPage = {
      schemaVersion: 1,
      service,
      section: request.section,
      exportedAt: now.toISOString(),
      items: [],
      nextCursor: null,
      limitations: [...DATA_EXPORT_LIMITATIONS],
    };
    if (
      request.section === 'account' ||
      request.section === 'profile' ||
      request.section === 'settings'
    ) {
      if (request.cursor) throw new BadRequestException('This section has no continuation cursor');
      const item = await this.repository[request.section](userId);
      if (!item) throw new UnauthorizedException('User no longer exists');
      const page = { ...base, items: [item] };
      this.assertByteBudget(page);
      return page;
    }
    const position = this.cursors.decode(request.cursor, userId, service, request.section, now);
    const records = await this.repository[request.section](userId, position, request.limit + 1);
    const selected: ExportRecord[] = [];
    for (const record of records.slice(0, request.limit)) {
      selected.push(record);
      const last = selected.at(-1);
      if (!last) break;
      const hasMore = records.length > selected.length;
      const page: DataExportPage = {
        ...base,
        items: selected.map((entry) => entry.item),
        nextCursor: hasMore
          ? this.cursors.encode(userId, service, request.section, position.snapshot, last)
          : null,
      };
      if (this.byteSize(page) > DATA_EXPORT_MAX_PAGE_BYTES) {
        selected.pop();
        if (!selected.length) throw new PayloadTooLargeException('An export record is too large');
        break;
      }
    }
    const last = selected.at(-1);
    const page: DataExportPage = {
      ...base,
      items: selected.map((record) => record.item),
      nextCursor:
        last && records.length > selected.length
          ? this.cursors.encode(userId, service, request.section, position.snapshot, last)
          : null,
    };
    this.assertByteBudget(page);
    return page;
  }

  private byteSize(page: DataExportPage): number {
    return Buffer.byteLength(JSON.stringify(page), 'utf8');
  }

  private assertByteBudget(page: DataExportPage): void {
    if (this.byteSize(page) > DATA_EXPORT_MAX_PAGE_BYTES)
      throw new PayloadTooLargeException('An export record is too large');
  }
}
