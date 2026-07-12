import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WS_EVENTS } from '../events/ws-events';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
}

@WebSocketGateway({
  namespace: '/messenger',
  cors: { origin: '*', credentials: true },
})
export class MessengerGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(MessengerGateway.name);

  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
    private readonly convsService: ConversationsService,
  ) {}

  afterInit() {
    this.logger.log(`Messenger WebSocket Gateway initialised. Server status: ${!!this.server}`);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new WsException('Missing auth token');
      }

      const payload = await this.jwtService.verifyAsync<{ sub: string; type: string }>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'access') {
        throw new WsException('Invalid token type');
      }

      const userId = payload.sub;

      (client as AuthenticatedSocket).userId = userId;

      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)!.add(client.id);

      this.logger.log(
        `Client connected: ${client.id} (user: ${userId}). Total tabs: ${this.onlineUsers.get(userId)!.size}`,
      );
    } catch (err) {
      this.logger.warn(`Rejected connection: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client as AuthenticatedSocket).userId;
    if (!userId) return;

    const userSockets = this.onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.onlineUsers.delete(userId);
        this.server.emit(WS_EVENTS.USER_OFFLINE, { userId });
      }
    }

    this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
  }

  @SubscribeMessage(WS_EVENTS.JOIN_CONVERSATION)
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    try {
      await this.convsService.assertMember(payload.conversationId, client.userId);
      await client.join(payload.conversationId);
      this.logger.debug(`User ${client.userId} joined room ${payload.conversationId}`);
    } catch {
      throw new WsException('Not a member of this conversation');
    }
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_CONVERSATION)
  async handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    await client.leave(payload.conversationId);
  }

  @SubscribeMessage(WS_EVENTS.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    client.to(payload.conversationId).emit(WS_EVENTS.TYPING, {
      conversationId: payload.conversationId,
      userId: client.userId,
      isTyping: true,
    });
  }

  @SubscribeMessage(WS_EVENTS.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    client.to(payload.conversationId).emit(WS_EVENTS.TYPING, {
      conversationId: payload.conversationId,
      userId: client.userId,
      isTyping: false,
    });
  }

  @SubscribeMessage(WS_EVENTS.MARK_READ)
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string },
  ) {
    try {
      await this.messagesService.markRead(payload.conversationId, client.userId);
      this.server.to(payload.conversationId).emit(WS_EVENTS.MESSAGE_READ, {
        conversationId: payload.conversationId,
        userId: client.userId,
        readAt: new Date().toISOString(),
      });
    } catch {
      throw new WsException('Failed to mark messages as read');
    }
  }

  emitNewMessage(conversationId: string, message: unknown) {
    this.server.to(conversationId).emit(WS_EVENTS.NEW_MESSAGE, {
      conversationId,
      message,
    });
  }

  emitMessageEdited(conversationId: string, message: unknown) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGE_EDITED, {
      conversationId,
      message,
    });
  }

  emitMessageDeleted(conversationId: string, messageId: string, deletedForAll: boolean) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGE_DELETED, {
      conversationId,
      messageId,
      deletedForAll,
    });
  }

  emitReactionAdded(conversationId: string, message: unknown) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGE_REACTION_ADDED, {
      conversationId,
      message,
    });
  }

  emitReactionRemoved(conversationId: string, message: unknown) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGE_REACTION_REMOVED, {
      conversationId,
      message,
    });
  }

  emitMessagePinned(conversationId: string, messageId: string) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGE_PINNED, {
      conversationId,
      messageId,
    });
  }

  emitMessageUnpinned(conversationId: string, messageId: string) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGE_UNPINNED, {
      conversationId,
      messageId,
    });
  }

  emitConversationUpdated(conversationId: string, data: unknown) {
    this.server.to(conversationId).emit(WS_EVENTS.CONVERSATION_UPDATED, {
      conversationId,
      data,
    });
  }

  emitParticipantAdded(conversationId: string, participant: unknown) {
    this.server.to(conversationId).emit(WS_EVENTS.PARTICIPANT_ADDED, {
      conversationId,
      participant,
    });
  }

  emitParticipantLeft(conversationId: string, userId: string) {
    this.server.to(conversationId).emit(WS_EVENTS.PARTICIPANT_LEFT, {
      conversationId,
      userId,
    });
  }

  isOnline(userId: string): boolean {
    return (this.onlineUsers.get(userId)?.size ?? 0) > 0;
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return (client.handshake.auth?.token as string) ?? null;
  }
}
