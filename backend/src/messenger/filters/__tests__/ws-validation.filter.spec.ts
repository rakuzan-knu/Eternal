import { WsException } from '@nestjs/websockets';
import type { ArgumentsHost } from '@nestjs/common';
import { WsValidationFilter } from '../ws-validation.filter';

describe('WsValidationFilter', () => {
  let filter: WsValidationFilter;
  let mockEmit: jest.Mock;

  beforeEach(() => {
    mockEmit = jest.fn();
    filter = new WsValidationFilter();
  });

  function createMockWsHost(args: unknown[]): ArgumentsHost {
    const mockSocket = {
      id: 'socket-client-123',
      emit: mockEmit,
    };

    return {
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockSocket),
        getData: jest.fn().mockReturnValue({}),
        getPattern: jest.fn().mockReturnValue(''),
      }),
      getArgs: jest.fn().mockReturnValue(args),
      getType: jest.fn().mockReturnValue('ws'),
      getArgByIndex: jest.fn(),
      switchToHttp: jest.fn(),
      switchToRpc: jest.fn(),
    };
  }

  it('emits error event to client when no ack callback is present in arguments', () => {
    const host = createMockWsHost([{}, {}]);
    const exception = new WsException('Invalid message payload');

    filter.catch(exception, host);

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('error', {
      status: 'error',
      error: 'Invalid message payload',
    });
  });

  it('invokes ack callback function when provided in arguments', () => {
    const mockAckCallback = jest.fn();
    const host = createMockWsHost([{ payload: 'data' }, mockAckCallback]);
    const exception = new WsException('Unauthorized action');

    filter.catch(exception, host);

    expect(mockAckCallback).toHaveBeenCalledTimes(1);
    expect(mockAckCallback).toHaveBeenCalledWith({
      status: 'error',
      error: 'Unauthorized action',
    });
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('formats object exception data containing message property', () => {
    const host = createMockWsHost([]);
    const exception = new WsException({ message: 'Detailed validation failed', code: 400 });

    filter.catch(exception, host);

    expect(mockEmit).toHaveBeenCalledWith('error', {
      status: 'error',
      error: 'Detailed validation failed',
    });
  });

  it('formats non-message object error data via JSON.stringify', () => {
    const host = createMockWsHost([]);
    const exception = new WsException({ errorType: 'UNKNOWN_ERROR', code: 999 });

    filter.catch(exception, host);

    expect(mockEmit).toHaveBeenCalledWith('error', {
      status: 'error',
      error: JSON.stringify({ errorType: 'UNKNOWN_ERROR', code: 999 }),
    });
  });
});
