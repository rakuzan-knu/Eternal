import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { DEPRECATED_ENDPOINT_KEY, DeprecatedEndpointOptions } from './deprecated.decorator';
import { extractClientInfo, isVersionOlder } from './client-info.util';
import { MetricsService } from '../../metrics/metrics.service';
import { AlertingService } from '../resilience/alerting.service';

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DeprecationInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly metricsService?: MetricsService,
    @Optional() private readonly alertingService?: AlertingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const handler = context.getHandler();
    const classRef = context.getClass();

    const options =
      this.reflector.get<DeprecatedEndpointOptions>(DEPRECATED_ENDPOINT_KEY, handler) ||
      this.reflector.get<DeprecatedEndpointOptions>(DEPRECATED_ENDPOINT_KEY, classRef);

    const http = context.switchToHttp();
    const req = http.getRequest<{
      method?: string;
      url?: string;
      originalUrl?: string;
      route?: { path?: string };
      raw?: { url?: string; method?: string };
      headers: Record<string, string | string[] | undefined>;
    }>();
    const res = http.getResponse<{
      setHeader?: (name: string, value: string | string[]) => void;
      header?: (name: string, value: string | string[]) => void;
      getHeader?: (name: string) => string | string[] | undefined;
    }>();

    if (options && res) {
      this.applyDeprecationHeaders(res, options);
      this.trackAndAlertDeprecatedAccess(req, options);
    }

    return next.handle();
  }

  private applyDeprecationHeaders(
    res: {
      setHeader?: (name: string, value: string | string[]) => void;
      header?: (name: string, value: string | string[]) => void;
      getHeader?: (name: string) => string | string[] | undefined;
    },
    options: DeprecatedEndpointOptions,
  ): void {
    const setHeader = (name: string, value: string) => {
      if (typeof res.setHeader === 'function') {
        res.setHeader(name, value);
      } else if (typeof res.header === 'function') {
        res.header(name, value);
      }
    };

    // 1. Deprecation Header (RFC draft)
    let deprecationVal = 'true';
    if (options.deprecationDate !== undefined) {
      if (typeof options.deprecationDate === 'boolean') {
        deprecationVal = options.deprecationDate ? 'true' : 'false';
      } else if (
        typeof options.deprecationDate === 'string' &&
        options.deprecationDate.startsWith('@')
      ) {
        deprecationVal = options.deprecationDate;
      } else {
        const d = new Date(options.deprecationDate);
        if (!isNaN(d.getTime())) {
          deprecationVal = `@${Math.floor(d.getTime() / 1000)}`;
        }
      }
    }
    setHeader('Deprecation', deprecationVal);

    // 2. Sunset Header (RFC 8594 - HTTP-date in IMF-fixdate format)
    let sunsetHttpDate: string | undefined;
    if (options.sunsetDate) {
      const d = new Date(options.sunsetDate);
      if (!isNaN(d.getTime())) {
        sunsetHttpDate = d.toUTCString();
        setHeader('Sunset', sunsetHttpDate);
      }
    }

    // 3. Link Header (RFC 8288)
    const links: string[] = [];
    if (options.docUrl) {
      links.push(`<${options.docUrl}>; rel="deprecation"; type="text/html"`);
      if (sunsetHttpDate) {
        links.push(`<${options.docUrl}>; rel="sunset"; type="text/html"`);
      }
    }
    if (options.successor) {
      links.push(`<${options.successor}>; rel="successor-version"`);
    }

    if (links.length > 0) {
      setHeader('Link', links.join(', '));
    }

    // 4. Advisory Headers
    if (options.message) {
      setHeader('X-API-Deprecation-Notice', options.message);
    }
    if (options.successor) {
      setHeader('X-API-Replacement', options.successor);
    }
  }

  private trackAndAlertDeprecatedAccess(
    req: {
      method?: string;
      url?: string;
      originalUrl?: string;
      route?: { path?: string };
      raw?: { url?: string; method?: string };
      headers: Record<string, string | string[] | undefined>;
    },
    options: DeprecatedEndpointOptions,
  ): void {
    const route = req.route?.path || req.originalUrl || req.url || req.raw?.url || 'unknown';
    const method = req.method || req.raw?.method || 'GET';
    const clientInfo = extractClientInfo(req.headers);

    let sunsetFormatted: string | undefined;
    if (options.sunsetDate) {
      const d = new Date(options.sunsetDate);
      if (!isNaN(d.getTime())) {
        sunsetFormatted = d.toISOString();
      }
    }

    // Record Prometheus metric
    if (this.metricsService?.recordDeprecatedApiRequest) {
      this.metricsService.recordDeprecatedApiRequest({
        method,
        route,
        apiVersion: clientInfo.apiVersion,
        clientType: clientInfo.clientType,
        clientVersion: clientInfo.clientVersion,
        isMobile: clientInfo.isMobile,
      });
    }

    // Check if mobile client is using deprecated API
    const alertOnMobile = options.alertOnMobile !== false;
    const isOutdated = options.minSupportedClientVersion
      ? isVersionOlder(clientInfo.clientVersion, options.minSupportedClientVersion)
      : true;

    if (clientInfo.isMobile && alertOnMobile && isOutdated) {
      if (this.alertingService?.sendDeprecatedApiUsageAlert) {
        void this.alertingService.sendDeprecatedApiUsageAlert({
          route,
          method,
          apiVersion: clientInfo.apiVersion,
          clientType: clientInfo.clientType,
          clientVersion: clientInfo.clientVersion,
          userAgent: clientInfo.userAgent,
          sunsetDate: sunsetFormatted,
          successor: options.successor,
          isOutdatedMobile: true,
        });
      }
    }
  }
}
