import { Catch, ArgumentsHost, ExceptionFilter, Logger, HttpException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsValidationFilter implements ExceptionFilter {
  private readonly logger = new Logger(WsValidationFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client = ctx.getClient<Socket>();

    let errorMessage = 'Internal server error';

    if (exception instanceof WsException) {
      const errorData: unknown = exception.getError();
      errorMessage =
        typeof errorData === 'object' && errorData !== null && 'message' in errorData
          ? String((errorData as Record<string, unknown>).message)
          : typeof errorData === 'string'
            ? errorData
            : JSON.stringify(errorData);
    } else if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      errorMessage =
        typeof resp === 'object' && resp !== null && 'message' in resp
          ? Array.isArray((resp as Record<string, unknown>).message)
            ? (resp as { message: string[] }).message.join(', ')
            : String((resp as Record<string, unknown>).message)
          : exception.message;
    } else if (exception instanceof Error) {
      errorMessage =
        process.env.NODE_ENV === 'production' ? 'Internal server error' : exception.message;
    }

    this.logger.warn(`WS Exception caught for client ${client?.id}: ${errorMessage}`);

    const args: unknown[] = host.getArgs();

    const callback = args.find(
      (arg): arg is (...args: unknown[]) => void => typeof arg === 'function',
    );

    if (callback) {
      callback({ status: 'error', error: errorMessage });
    } else if (client?.emit) {
      client.emit('error', { status: 'error', error: errorMessage });
    }
  }
}
