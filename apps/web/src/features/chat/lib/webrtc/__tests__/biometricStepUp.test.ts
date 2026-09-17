import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  performBiometricStepUp,
  isBiometricsAvailable,
  clearStepUpTokens,
} from '../biometricStepUp';
import { apiClient } from '@/shared/api/httpClient';
import * as simpleWebAuthn from '@simplewebauthn/browser';

vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: vi.fn(),
  browserSupportsWebAuthn: vi.fn(),
}));

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('biometricStepUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStepUpTokens();
  });

  it('checks platform authenticator availability', async () => {
    vi.mocked(simpleWebAuthn.browserSupportsWebAuthn).mockReturnValue(true);
    // When PublicKeyCredential exists
    (window as unknown as Record<string, unknown>).PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
    };

    const available = await isBiometricsAvailable();
    expect(available).toBe(true);
  });

  it('executes full challenge -> assertion -> verify flow and caches execution token', async () => {
    vi.mocked(apiClient.post).mockImplementation((url: string) => {
      if (url === '/calls/step-up/challenge') {
        return Promise.resolve({
          data: {
            challenge: 'test-challenge-1234567890',
            rpId: 'localhost',
            timeout: 60000,
            userVerification: 'required',
            action: 'RECORD_CALL',
            callId: 'call-xyz',
          },
        });
      }
      if (url === '/calls/step-up/verify') {
        return Promise.resolve({
          data: {
            verified: true,
            scopedToken: 'scoped.jwt.token.abc',
            expiresInSec: 300,
            action: 'RECORD_CALL',
            callId: 'call-xyz',
          },
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    vi.mocked(simpleWebAuthn.startAuthentication).mockResolvedValue({
      id: 'cred-1',
      rawId: 'cred-1',
      response: {
        clientDataJSON: 'client-data',
        authenticatorData: 'auth-data',
        signature: 'sig-data',
      },
      type: 'public-key',
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    });

    const token1 = await performBiometricStepUp('call-xyz', 'RECORD_CALL');
    expect(token1).toBe('scoped.jwt.token.abc');
    expect(apiClient.post).toHaveBeenCalledTimes(2);

    // Second call within expiry should use cache and not re-prompt
    const token2 = await performBiometricStepUp('call-xyz', 'RECORD_CALL');
    expect(token2).toBe('scoped.jwt.token.abc');
    expect(apiClient.post).toHaveBeenCalledTimes(2);

    // After clearing tokens, should prompt again
    clearStepUpTokens('call-xyz');
    const token3 = await performBiometricStepUp('call-xyz', 'RECORD_CALL');
    expect(token3).toBe('scoped.jwt.token.abc');
    expect(apiClient.post).toHaveBeenCalledTimes(4);
  });
});
