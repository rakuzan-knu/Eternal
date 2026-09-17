import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CircuitBreaker } from '../common/resilience/circuit-breaker';

export interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);
  private readonly secretKey: string | undefined;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY');
    this.circuitBreaker = new CircuitBreaker({
      name: 'Cloudflare-Turnstile',
      failureThreshold: 3,
      resetTimeoutMs: 15_000,
      halfOpenSuccessThreshold: 2,
      onStateChange: (from, to) => {
        this.logger.warn(`Turnstile CircuitBreaker transitioned from ${from} to ${to}`);
      },
    });
  }

  /**
   * Verifies the Cloudflare Turnstile token.
   * If TURNSTILE_SECRET_KEY is not configured (e.g. in development/tests),
   * verification passes transparently.
   */
  async verifyToken(token?: string, ip?: string): Promise<boolean> {
    if (!this.secretKey) {
      return true;
    }

    if (!token || typeof token !== 'string' || !token.trim()) {
      this.logger.warn('Turnstile verification rejected: missing token');
      throw new ForbiddenException('Captcha verification required');
    }

    return this.circuitBreaker.execute(
      async () => {
        const params = new URLSearchParams();
        params.append('secret', this.secretKey!);
        params.append('response', token.trim());
        if (ip) {
          params.append('remoteip', ip);
        }

        const response = await axios.post<TurnstileVerifyResponse>(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 4000,
          },
        );

        if (response.data?.success) {
          return true;
        }

        this.logger.warn(
          `Cloudflare Turnstile verification failed: ${JSON.stringify(response.data?.['error-codes'] ?? response.data)}`,
        );
        throw new ForbiddenException('Bot verification failed. Please try again.');
      },
      (fallbackErr?: unknown) => {
        if (fallbackErr instanceof ForbiddenException) {
          throw fallbackErr;
        }
        this.logger.error(
          `Cloudflare Turnstile API network error: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
        );
        throw new ForbiddenException('Security challenge failed. Please try again.');
      },
    );
  }
}
