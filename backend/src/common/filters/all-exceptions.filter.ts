import { Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { Request, Response } from 'express';

interface ErrorResponseFormat {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

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

    const internalServerErrorStatus = Number(HttpStatus.INTERNAL_SERVER_ERROR);

    const httpStatus =
      exception instanceof HttpException ? exception.getStatus() : internalServerErrorStatus;

    const isProduction = process.env.NODE_ENV === 'production';
    const path = String(httpAdapter.getRequestUrl(request));

    if (httpStatus >= internalServerErrorStatus) {
      this.logger.error(
        `[${request.method}] ${path} - Status: ${httpStatus}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${request.method}] ${path} - Status: ${httpStatus}`);
    }

    let errorMessage: string | string[] = 'Internal server error';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      errorName = exception.name;
      const res = exception.getResponse();

      if (typeof res === 'string') {
        errorMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;

        if (typeof resObj.message === 'string') {
          errorMessage = resObj.message;
        } else if (Array.isArray(resObj.message)) {
          errorMessage = resObj.message.filter((msg): msg is string => typeof msg === 'string');
        } else {
          errorMessage = exception.message;
        }
      }
    } else if (exception instanceof Error) {
      errorMessage = isProduction ? 'Internal server error' : exception.message;
    }

    const responseBody: ErrorResponseFormat = {
      statusCode: httpStatus,
      error: errorName,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path,
    };

    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
