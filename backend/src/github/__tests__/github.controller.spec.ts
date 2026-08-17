import type { Request, Response } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { GithubController } from '../github.controller';
import type { GithubService } from '../github.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('GithubController', () => {
  let controller: GithubController;
  let mockGithubService: {
    getAuthorizationUrl: jest.Mock;
    handleOAuthCallback: jest.Mock;
    unlinkGithub: jest.Mock;
    syncUserGithubContributions: jest.Mock;
    verifySignature: jest.Mock;
    handleWebhookPayload: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-1',
    email: 'user@test.com',
    username: 'user_1',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockGithubService = {
      getAuthorizationUrl: jest.fn(),
      handleOAuthCallback: jest.fn().mockResolvedValue(undefined),
      unlinkGithub: jest.fn().mockResolvedValue(undefined),
      syncUserGithubContributions: jest
        .fn()
        .mockResolvedValue({ mergedPrsCount: 3, githubUsername: 'octocat' }),
      verifySignature: jest.fn(),
      handleWebhookPayload: jest.fn().mockResolvedValue({ handled: true, message: 'Processed' }),
    };

    controller = new GithubController(mockGithubService as unknown as GithubService);
  });

  it('redirectToGithub and handleCallback delegate to GithubService', async () => {
    const req = {} as Request;
    const res = {} as Response;

    controller.redirectToGithub(req, res);
    expect(mockGithubService.getAuthorizationUrl).toHaveBeenCalledWith(req, res);

    await controller.handleCallback('code123', 'state123', req, res);
    expect(mockGithubService.handleOAuthCallback).toHaveBeenCalledWith(
      'code123',
      'state123',
      req,
      res,
    );
  });

  it('unlinkGithub and syncGithub delegate to GithubService', async () => {
    const unlinkRes = await controller.unlinkGithub(mockUser);
    expect(mockGithubService.unlinkGithub).toHaveBeenCalledWith('usr-1');
    expect(unlinkRes).toEqual({ success: true });

    const syncRes = await controller.syncGithub(mockUser);
    expect(mockGithubService.syncUserGithubContributions).toHaveBeenCalledWith('usr-1');
    expect(syncRes.mergedPrsCount).toBe(3);
  });

  it('handleWebhook validates HMAC signature and delegates payload', async () => {
    mockGithubService.verifySignature.mockReturnValueOnce(true);

    const body = { action: 'closed' };
    const res = await controller.handleWebhook('sha256=abc', body);

    expect(mockGithubService.verifySignature).toHaveBeenCalled();
    expect(mockGithubService.handleWebhookPayload).toHaveBeenCalledWith(body);
    expect(res.handled).toBe(true);
  });

  it('handleWebhook throws UnauthorizedException on invalid HMAC signature', async () => {
    mockGithubService.verifySignature.mockReturnValueOnce(false);

    await expect(controller.handleWebhook('sha256=invalid', {})).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
