import { Catch, ArgumentsHost, ExceptionFilter, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException)
export class WsValidationFilter implements ExceptionFilter {
  private readonly logger = new Logger(WsValidationFilter.name);

  catch(exception: WsException, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client = ctx.getClient<Socket>();

    const errorData: unknown = exception.getError();

    const errorMessage: string =
      typeof errorData === 'object' && errorData !== null && 'message' in errorData
        ? String((errorData as Record<string, unknown>).message)
        : typeof errorData === 'string'
          ? errorData
          : JSON.stringify(errorData);

    this.logger.warn(`WS Exception caught for client ${client.id}: ${errorMessage}`);

    const args: unknown[] = host.getArgs();

    const callback = args.find(
      (arg): arg is (...args: unknown[]) => void => typeof arg === 'function',
    );

    if (callback) {
      callback({ status: 'error', error: errorMessage });
    } else {
      client.emit('error', { status: 'error', error: errorMessage });
    }
  }
}
