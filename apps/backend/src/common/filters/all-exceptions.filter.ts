import { Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

export interface ErrorResponseFormat {
  statusCode: number;
  errorCode: string;
  error?: string;
  message: string | string[];
  timestamp: string;
  path: string;
  traceId: string;
}

function isClientAbortError(exception: unknown): boolean {
  if (!exception) return false;
  if (typeof exception === 'string') {
    const lower = exception.toLowerCase();
    return lower === 'aborted' || lower.includes('premature close') || lower.includes('econnreset');
  }
  const err = exception as { message?: string; code?: string; name?: string; type?: string };
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  const code = typeof err.code === 'string' ? err.code.toUpperCase() : '';
  const name = typeof err.name === 'string' ? err.name : '';
  const type = typeof err.type === 'string' ? err.type.toLowerCase() : '';

  return (
    message === 'aborted' ||
    message.includes('request aborted') ||
    message.includes('client abort') ||
    message.includes('premature close') ||
    code === 'ECONNRESET' ||
    code === 'ECONNABORTED' ||
    code === 'ERR_STREAM_PREMATURE_CLOSE' ||
    code === 'ERR_HTTP2_STREAM_CANCEL' ||
    code === 'FST_ERR_PROMISE_NOT_FULLFILLED' ||
    name === 'AbortError' ||
    type === 'aborted'
  );
}

const STATUS_CODE_TO_ERROR_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.GONE]: 'GONE',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
  [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
  [HttpStatus.GATEWAY_TIMEOUT]: 'GATEWAY_TIMEOUT',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    if (!httpAdapter) {
      this.logger.error('HttpAdapter is not initialized');
      return;
    }

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const path = String(httpAdapter.getRequestUrl(request));
    const rawTraceId =
      request?.traceId ||
      request?.correlationId ||
      request?.headers?.['x-trace-id'] ||
      request?.headers?.['x-correlation-id'] ||
      request?.headers?.['x-request-id'] ||
      randomUUID();
    const traceId = Array.isArray(rawTraceId) ? rawTraceId[0] || randomUUID() : String(rawTraceId);

    const rawRes = response as unknown as {
      raw?: {
        destroyed?: boolean;
        headersSent?: boolean;
        writableEnded?: boolean;
        socket?: { destroyed?: boolean; writable?: boolean };
      };
      sent?: boolean;
      headersSent?: boolean;
      writableEnded?: boolean;
      destroyed?: boolean;
    };

    const headersAlreadySent = Boolean(
      (typeof httpAdapter.isHeadersSent === 'function' && httpAdapter.isHeadersSent(response)) ||
      rawRes?.headersSent ||
      rawRes?.sent ||
      rawRes?.writableEnded ||
      rawRes?.raw?.headersSent ||
      rawRes?.raw?.writableEnded,
    );

    if (headersAlreadySent) {
      this.logger.debug(
        `[${request?.method || 'UNKNOWN'}] ${path} [traceId: ${traceId}] - Headers already sent; skipping exception reply.`,
      );
      return;
    }

    if (isClientAbortError(exception)) {
      this.logger.debug(
        `[${request?.method || 'UNKNOWN'}] ${path} [traceId: ${traceId}] - Client connection aborted or closed prematurely.`,
      );
      return;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    let httpStatus = Number(HttpStatus.INTERNAL_SERVER_ERROR);
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage: string | string[] = 'An unexpected error occurred';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      errorName = exception.name;
      errorCode = STATUS_CODE_TO_ERROR_CODE[httpStatus] || 'HTTP_ERROR';

      const res = exception.getResponse();

      if (typeof res === 'string') {
        errorMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;

        if (typeof resObj.errorCode === 'string' && resObj.errorCode.trim()) {
          errorCode = resObj.errorCode.trim();
        } else if (typeof resObj.error === 'string' && resObj.error.trim()) {
          errorCode = resObj.error.trim().toUpperCase().replace(/\s+/g, '_');
        }

        if (typeof resObj.message === 'string') {
          errorMessage = resObj.message;
        } else if (Array.isArray(resObj.message)) {
          errorMessage = resObj.message.filter((msg): msg is string => typeof msg === 'string');
        } else {
          errorMessage = exception.message;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Map known database errors without exposing SQL/schema internals
      if (exception.code === 'P2002') {
        httpStatus = HttpStatus.CONFLICT;
        errorCode = 'CONFLICT';
        errorMessage = 'Resource already exists';
        errorName = 'ConflictError';
      } else if (exception.code === 'P2025') {
        httpStatus = HttpStatus.NOT_FOUND;
        errorCode = 'NOT_FOUND';
        errorMessage = 'Resource not found';
        errorName = 'NotFoundError';
      } else if (exception.code === 'P2003') {
        httpStatus = HttpStatus.BAD_REQUEST;
        errorCode = 'BAD_REQUEST';
        errorMessage = 'Invalid relation reference';
        errorName = 'BadRequestError';
      } else {
        httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        errorCode = 'INTERNAL_SERVER_ERROR';
        errorMessage = 'An unexpected database error occurred';
        errorName = 'DatabaseError';
      }
    } else if (
      exception instanceof Prisma.PrismaClientValidationError ||
      exception instanceof Prisma.PrismaClientUnknownRequestError ||
      exception instanceof Prisma.PrismaClientRustPanicError ||
      exception instanceof Prisma.PrismaClientInitializationError
    ) {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';
      errorMessage = 'An unexpected database error occurred';
      errorName = 'DatabaseError';
    } else if (exception instanceof Error) {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';
      errorMessage = isProduction ? 'An unexpected error occurred' : exception.message;
      errorName = 'InternalServerError';
    }

    if (errorCode === 'SERVICE_DEGRADED' || errorCode === 'SERVICE_CRITICAL') {
      this.logger.warn(
        `[${request.method}] ${path} [traceId: ${traceId}] - Status: ${httpStatus} - Load Shed: ${errorCode}`,
      );
    } else if (httpStatus >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `[${request.method}] ${path} [traceId: ${traceId}] - Status: ${httpStatus} - Error: ${errorCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${path} [traceId: ${traceId}] - Status: ${httpStatus} - Code: ${errorCode}`,
      );
    }

    const responseBody: ErrorResponseFormat = {
      statusCode: httpStatus,
      errorCode,
      error: errorName,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path,
      traceId,
    };

    try {
      httpAdapter.reply(response, responseBody, httpStatus);
    } catch (replyError) {
      this.logger.debug(
        `[${request.method}] ${path} [traceId: ${traceId}] - Failed to send error reply: ${replyError instanceof Error ? replyError.message : String(replyError)}`,
      );
    }
  }
}
