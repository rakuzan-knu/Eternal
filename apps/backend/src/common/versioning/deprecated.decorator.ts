import { SetMetadata, applyDecorators } from '@nestjs/common';

export const DEPRECATED_ENDPOINT_KEY = 'API_VERSIONING:DEPRECATED_ENDPOINT';

export interface DeprecatedEndpointOptions {
  /**
   * Sunset date or ISO string when this endpoint/version will be completely disabled (RFC 8594).
   * Rendered as RFC 1123 / IMF-fixdate HTTP-date (e.g. 'Wed, 11 Nov 2026 00:00:00 GMT').
   */
  sunsetDate?: string | Date;

  /**
   * Deprecation date or timestamp or boolean flag (per IETF Deprecation header draft).
   * E.g. Date instance, '@1767225600', or true.
   */
  deprecationDate?: string | Date | boolean;

  /**
   * Successor endpoint path or version to use as alternative (e.g. '/v2/posts').
   * Sets RFC 8288 Link header: `<successor>; rel="successor-version"`.
   */
  successor?: string;

  /**
   * URL to human-readable deprecation notes or migration guide.
   * Sets RFC 8288 Link header: `<docUrl>; rel="deprecation"`.
   */
  docUrl?: string;

  /**
   * Custom advisory deprecation notice or migration instructions.
   * Sets 'X-API-Deprecation-Notice' response header.
   */
  message?: string;

  /**
   * Whether to raise monitoring alerts if mobile clients (iOS / Android) call this endpoint.
   * Defaults to true.
   */
  alertOnMobile?: boolean;

  /**
   * Minimum client app version required. If mobile client version is lower, alert is raised.
   * E.g. '2.4.0'.
   */
  minSupportedClientVersion?: string;
}

/**
 * Decorator to mark an API route or Controller as deprecated under RFC 8594 policy.
 */
export function DeprecatedEndpoint(
  options: DeprecatedEndpointOptions = {},
): MethodDecorator & ClassDecorator {
  return SetMetadata(DEPRECATED_ENDPOINT_KEY, options);
}

/**
 * Convenience decorator specifying sunset date per RFC 8594.
 */
export function Sunset(
  sunsetDate: string | Date,
  options: Omit<DeprecatedEndpointOptions, 'sunsetDate'> = {},
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(DEPRECATED_ENDPOINT_KEY, {
      ...options,
      sunsetDate,
      deprecationDate: options.deprecationDate ?? true,
    }),
  );
}
