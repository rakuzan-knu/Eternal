export interface ClientInfo {
  clientType: 'ios' | 'android' | 'web' | 'desktop' | 'unknown';
  isMobile: boolean;
  clientVersion?: string | undefined;
  apiVersion?: string | undefined;
  userAgent: string;
}

/**
 * Extracts mobile/web client type and application version from request headers.
 */
export function extractClientInfo(
  headers: Record<string, string | string[] | undefined>,
): ClientInfo {
  const rawUserAgent = headers['user-agent'];
  const userAgent = Array.isArray(rawUserAgent) ? rawUserAgent[0] || '' : rawUserAgent || '';

  // Explicit headers first
  const rawAppVersion = headers['x-app-version'] || headers['x-client-version'];
  let clientVersion = Array.isArray(rawAppVersion) ? rawAppVersion[0] : rawAppVersion;

  const rawPlatform = headers['x-platform'] || headers['sec-ch-ua-platform'];
  const platformHeader = (
    Array.isArray(rawPlatform) ? rawPlatform[0] : rawPlatform || ''
  ).toLowerCase();

  const rawApiVersion = headers['x-api-version'] || headers['api-version'];
  const apiVersion = Array.isArray(rawApiVersion) ? rawApiVersion[0] : rawApiVersion;

  let clientType: ClientInfo['clientType'] = 'unknown';

  if (
    platformHeader.includes('ios') ||
    platformHeader.includes('iphone') ||
    platformHeader.includes('ipad')
  ) {
    clientType = 'ios';
  } else if (platformHeader.includes('android')) {
    clientType = 'android';
  }

  const uaLower = userAgent.toLowerCase();

  if (clientType === 'unknown') {
    if (
      uaLower.includes('socialnetwork-ios') ||
      uaLower.includes('iphone') ||
      uaLower.includes('ipad') ||
      uaLower.includes('cfnetwork') ||
      uaLower.includes('darwin')
    ) {
      clientType = 'ios';
    } else if (
      uaLower.includes('socialnetwork-android') ||
      uaLower.includes('android') ||
      uaLower.includes('okhttp')
    ) {
      clientType = 'android';
    } else if (
      uaLower.includes('mozilla') ||
      uaLower.includes('chrome') ||
      uaLower.includes('safari') ||
      uaLower.includes('firefox') ||
      uaLower.includes('edge')
    ) {
      clientType = 'web';
    } else if (
      uaLower.includes('electron') ||
      uaLower.includes('postman') ||
      uaLower.includes('insomnia')
    ) {
      clientType = 'desktop';
    }
  }

  // Attempt to parse version from User-Agent if not provided in custom header
  if (!clientVersion && userAgent) {
    // E.g. SocialNetwork-iOS/1.4.2 or AppName/2.1.0 or okhttp/4.9.3
    const match = userAgent.match(
      /(?:SocialNetwork-[a-zA-Z]+|AppName|SocialNetwork|App)\/([0-9]+\.[0-9]+(?:\.[0-9]+)?)/i,
    );
    if (match?.[1]) {
      clientVersion = match[1];
    }
  }

  const isMobile = clientType === 'ios' || clientType === 'android';

  return {
    clientType,
    isMobile,
    clientVersion: clientVersion || undefined,
    apiVersion: apiVersion || undefined,
    userAgent,
  };
}

/**
 * Returns true if version A is strictly lower than version B (simple semver compare).
 */
export function isVersionOlder(currentVersion?: string, minVersion?: string): boolean {
  if (!currentVersion || !minVersion) return false;

  const parseParts = (v: string) =>
    v
      .replace(/^v/i, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const [majA = 0, minA = 0, patchA = 0] = parseParts(currentVersion);
  const [majB = 0, minB = 0, patchB = 0] = parseParts(minVersion);

  if (majA !== majB) return majA < majB;
  if (minA !== minB) return minA < minB;
  return patchA < patchB;
}
