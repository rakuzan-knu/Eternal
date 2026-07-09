import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/messenger',
  cors: { origin: '*', credentials: true },
})
export class MessengerGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly logger = new Logger(MessengerGateway.name);

  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(
    // private readonly jwtService: JwtService,
    // private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('Messenger WebSocket Gateway initialised');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  isOnline(userId: string): boolean {
    return (this.onlineUsers.get(userId)?.size ?? 0) > 0;
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }
}
