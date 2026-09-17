import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TurnstileService } from '../turnstile.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TurnstileService', () => {
  let service: TurnstileService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes silently when TURNSTILE_SECRET_KEY is not configured', async () => {
    configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<ConfigService>;

    service = new TurnstileService(configService);
    const result = await service.verifyToken(undefined, '127.0.0.1');

    expect(result).toBe(true);
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when secret is configured but token is missing', async () => {
    configService = {
      get: jest.fn().mockReturnValue('dummy-secret-key'),
    } as unknown as jest.Mocked<ConfigService>;

    service = new TurnstileService(configService);

    await expect(service.verifyToken('', '127.0.0.1')).rejects.toThrow(ForbiddenException);
    await expect(service.verifyToken(undefined, '127.0.0.1')).rejects.toThrow(ForbiddenException);
  });

  it('verifies token successfully when Cloudflare returns success: true', async () => {
    configService = {
      get: jest.fn().mockReturnValue('dummy-secret-key'),
    } as unknown as jest.Mocked<ConfigService>;

    mockedAxios.post.mockResolvedValueOnce({
      data: { success: true },
    });

    service = new TurnstileService(configService);
    const result = await service.verifyToken('valid-token', '1.2.3.4');

    expect(result).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.stringContaining('response=valid-token'),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );
  });

  it('throws ForbiddenException when Cloudflare returns success: false', async () => {
    configService = {
      get: jest.fn().mockReturnValue('dummy-secret-key'),
    } as unknown as jest.Mocked<ConfigService>;

    mockedAxios.post.mockResolvedValueOnce({
      data: { success: false, 'error-codes': ['invalid-input-response'] },
    });

    service = new TurnstileService(configService);

    await expect(service.verifyToken('invalid-token', '1.2.3.4')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('handles network error gracefully and throws ForbiddenException', async () => {
    configService = {
      get: jest.fn().mockReturnValue('dummy-secret-key'),
    } as unknown as jest.Mocked<ConfigService>;

    mockedAxios.post.mockRejectedValueOnce(new Error('Network timeout'));

    service = new TurnstileService(configService);

    await expect(service.verifyToken('token-under-timeout', '1.2.3.4')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
