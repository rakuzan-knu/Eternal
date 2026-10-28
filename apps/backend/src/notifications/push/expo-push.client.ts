import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PushData } from '@common/contracts';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data: PushData;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  threadId?: string;
  priority?: 'default' | 'high';
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface ExpoSendResult {
  invalidTokens: string[];
  failed: number;
}

const ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;
const TIMEOUT_MS = 10_000;

@Injectable()
export class ExpoPushClient {
  private readonly logger = new Logger(ExpoPushClient.name);

  constructor(private readonly config: ConfigService) {}

  enabled(): boolean {
    return process.env.NODE_ENV !== 'test' && this.config.get<string>('PUSH_ENABLED') !== 'false';
  }

  async send(messages: ExpoPushMessage[]): Promise<ExpoSendResult> {
    const result: ExpoSendResult = { invalidTokens: [], failed: 0 };
    if (!messages.length || !this.enabled()) return result;
    const accessToken = this.config.get<string>('EXPO_ACCESS_TOKEN');
    for (let start = 0; start < messages.length; start += CHUNK) {
      const chunk = messages.slice(start, start + CHUNK);
      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(chunk),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) {
          result.failed += chunk.length;
          this.logger.warn(`Expo push request failed with status ${response.status}`);
          continue;
        }
        const payload = (await response.json()) as { data?: ExpoTicket[] };
        (payload.data ?? []).forEach((ticket, index) => {
          if (ticket.status === 'ok') return;
          result.failed += 1;
          const token = chunk[index]?.to;
          if (ticket.details?.error === 'DeviceNotRegistered' && token)
            result.invalidTokens.push(token);
        });
      } catch (err) {
        result.failed += chunk.length;
        this.logger.warn(`Expo push request error: ${(err as Error).message}`);
      }
    }
    return result;
  }
}
