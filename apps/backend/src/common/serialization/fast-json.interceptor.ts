import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FastJsonService, type SchemaKey } from './fast-json.service';

export const FAST_SERIALIZER_KEY = 'FAST_SERIALIZER_KEY';

/**
 * Decorator to apply fast-json-stringify to a controller or route handler.
 */
export const UseFastSerializer = (schemaKey: SchemaKey) =>
  SetMetadata(FAST_SERIALIZER_KEY, schemaKey);

@Injectable()
export class FastJsonInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly fastJsonService: FastJsonService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const schemaKey = this.reflector.getAllAndOverride<SchemaKey | undefined>(FAST_SERIALIZER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!schemaKey) {
      return next.handle();
    }

    const serializer = this.fastJsonService.getSerializer(schemaKey);

    return next.handle().pipe(
      map((data) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (data === null || data === undefined) return data;
        const res = context
          .switchToHttp()
          .getResponse<{ header?: (k: string, v: string) => void }>();
        if (typeof res?.header === 'function') {
          res.header('content-type', 'application/json; charset=utf-8');
        }
        return serializer(data);
      }),
    );
  }
}
