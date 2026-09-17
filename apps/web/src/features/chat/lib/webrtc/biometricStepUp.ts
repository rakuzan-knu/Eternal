/**
 * Biometric Step-Up Authentication (WebAuthn / Passkeys)
 *
 * Prompts user for TouchID / FaceID / Windows Hello hardware biometric assertion
 * before sensitive in-call actions (Call Recording, Host Transfer, Screen Sharing).
 * Issues and locally caches cryptographic scoped execution tokens.
 */

import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { apiClient } from '@/shared/api/httpClient';

export type StepUpAction = 'RECORD_CALL' | 'TRANSFER_ADMIN' | 'SENSITIVE_SHARE';

export interface StepUpChallengeResponse {
  challenge: string;
  rpId: string;
  timeout: number;
  userVerification: 'required' | 'preferred';
  action: StepUpAction;
  callId: string;
}

export interface StepUpTokenResponse {
  verified: boolean;
  scopedToken: string;
  expiresInSec: number;
  action: StepUpAction;
  callId: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

/**
 * Checks if hardware biometric / WebAuthn platform authenticator is supported
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) {
    return false;
  }

  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Executes biometric step-up authentication and returns a scoped execution token.
 * If a valid unexpired token for (callId, action) already exists, returns it directly.
 */
export async function performBiometricStepUp(
  callId: string,
  action: StepUpAction,
): Promise<string> {
  const cacheKey = `${callId}:${action}`;
  const existing = tokenCache.get(cacheKey);
  if (existing && existing.expiresAt > Date.now() + 10_000) {
    return existing.token;
  }

  // 1. Fetch challenge from backend
  const challengeRes = await apiClient.post<StepUpChallengeResponse>('/calls/step-up/challenge', {
    callId,
    action,
  });

  const { challenge, rpId, timeout, userVerification } = challengeRes.data;

  // 2. Trigger native TouchID / FaceID / Windows Hello prompt
  const optionsJSON: PublicKeyCredentialRequestOptionsJSON = {
    challenge,
    rpId: rpId || window.location.hostname,
    timeout: timeout || 60_000,
    userVerification: userVerification || 'required',
  };

  const assertionResponse = await startAuthentication({ optionsJSON });

  // 3. Verify assertion on backend and retrieve scoped execution token
  const verifyRes = await apiClient.post<StepUpTokenResponse>('/calls/step-up/verify', {
    callId,
    action,
    challenge,
    assertionResponse,
  });

  if (!verifyRes.data?.verified || !verifyRes.data?.scopedToken) {
    throw new Error('Biometric verification failed');
  }

  const { scopedToken, expiresInSec } = verifyRes.data;
  tokenCache.set(cacheKey, {
    token: scopedToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  });

  return scopedToken;
}

/**
 * Invalidate cached step-up tokens (e.g. when call ends)
 */
export function clearStepUpTokens(callId?: string): void {
  if (!callId) {
    tokenCache.clear();
    return;
  }

  for (const key of tokenCache.keys()) {
    if (key.startsWith(`${callId}:`)) {
      tokenCache.delete(key);
    }
  }
}
