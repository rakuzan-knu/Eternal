import {
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AllExceptionsFilter } from '../all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockHttpAdapter: {
    getRequestUrl: jest.Mock<string, [Request]>;
    reply: jest.Mock<void, [Response, unknown, number]>;
  };
  let mockHttpAdapterHost: HttpAdapterHost;
  let mockHost: ArgumentsHost;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    mockHttpAdapter = {
      getRequestUrl: jest.fn<string, [Request]>().mockReturnValue('/api/test-path'),
      reply: jest.fn<void, [Response, unknown, number]>(),
    };

    mockHttpAdapterHost = {
      httpAdapter: mockHttpAdapter as unknown as HttpAdapterHost['httpAdapter'],
    } as unknown as HttpAdapterHost;

    mockRequest = {
      method: 'POST',
      url: '/api/test-path',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getNext: jest.fn(),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };

    filter = new AllExceptionsFilter(mockHttpAdapterHost);
  });

  it('handles standard HttpException with string response message', () => {
    const notFoundException = new NotFoundException('Resource was not found');

    filter.catch(notFoundException, mockHost);

    expect(mockHttpAdapter.reply).toHaveBeenCalledTimes(1);
    const [responseArg, bodyArg, statusArg] = mockHttpAdapter.reply.mock.calls[0];

    expect(responseArg).toBe(mockResponse);
    expect(statusArg).toBe(HttpStatus.NOT_FOUND);
    expect(bodyArg).toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'NotFoundException',
      message: 'Resource was not found',
      path: '/api/test-path',
    });
    expect(typeof (bodyArg as { timestamp: string }).timestamp).toBe('string');
  });

  it('handles HttpException with structured object response and string message', () => {
    const customException = new BadRequestException({
      message: 'Field validation error',
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(customException, mockHost);

    expect(mockHttpAdapter.reply).toHaveBeenCalledTimes(1);
    const [, bodyArg, statusArg] = mockHttpAdapter.reply.mock.calls[0];

    expect(statusArg).toBe(HttpStatus.BAD_REQUEST);
    expect(bodyArg).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'BadRequestException',
      message: 'Field validation error',
      path: '/api/test-path',
    });
  });

  it('handles HttpException with structured array messages', () => {
    const validationException = new BadRequestException({
      message: ['Email is invalid', 'Password too short'],
      error: 'Bad Request',
    });

    filter.catch(validationException, mockHost);

    const [, bodyArg, statusArg] = mockHttpAdapter.reply.mock.calls[0];
    expect(statusArg).toBe(HttpStatus.BAD_REQUEST);
    expect(bodyArg).toMatchObject({
      statusCode: 400,
      message: ['Email is invalid', 'Password too short'],
      path: '/api/test-path',
    });
  });

  it('handles HttpException with empty object response fallback to exception.message', () => {
    const exception = new HttpException({}, HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost);

    const [, bodyArg, statusArg] = mockHttpAdapter.reply.mock.calls[0];
    expect(statusArg).toBe(HttpStatus.FORBIDDEN);
    expect(bodyArg).toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
      message: exception.message,
    });
  });

  it('handles 500 InternalServerErrorException and logs error', () => {
    const internalException = new InternalServerErrorException('Database failure');

    filter.catch(internalException, mockHost);

    const [, bodyArg, statusArg] = mockHttpAdapter.reply.mock.calls[0];
    expect(statusArg).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(bodyArg).toMatchObject({
      statusCode: 500,
      error: 'InternalServerErrorException',
      message: 'Database failure',
    });
  });

  it('handles generic unhandled Error in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      const error = new Error('Unexpected runtime crash');
      filter.catch(error, mockHost);

      const [, bodyArg, statusArg] = mockHttpAdapter.reply.mock.calls[0];
      expect(statusArg).toBe(500);
      expect(bodyArg).toMatchObject({
        statusCode: 500,
        error: 'InternalServerError',
        message: 'Unexpected runtime crash',
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('handles generic unhandled Error in production with generic message', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const error = new Error('Sensitive internal database stack trace');
      filter.catch(error, mockHost);

      const [, bodyArg, statusArg] = mockHttpAdapter.reply.mock.calls[0];
      expect(statusArg).toBe(500);
      expect(bodyArg).toMatchObject({
        statusCode: 500,
        error: 'InternalServerError',
        message: 'Internal server error',
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('handles unknown non-Error thrown objects', () => {
    filter.catch('string-error', mockHost);

    const [, bodyArg, statusArg] = mockHttpAdapter.reply.mock.calls[0];
    expect(statusArg).toBe(500);
    expect(bodyArg).toMatchObject({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'Internal server error',
    });
  });

  it('safely returns when httpAdapter is null or undefined', () => {
    const uninitializedHost = {
      httpAdapter: null,
    } as unknown as HttpAdapterHost;
    const uninitializedFilter = new AllExceptionsFilter(uninitializedHost);

    expect(() => {
      uninitializedFilter.catch(new Error('Test error'), mockHost);
    }).not.toThrow();
  });
});
