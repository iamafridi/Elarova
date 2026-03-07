import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RagService } from '../modules/rag/rag.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly ragService: RagService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-chat')
  handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; chatId: string },
  ) {
    client.join(`chat-${data.chatId}`);
    return { event: 'joined', data: { chatId: data.chatId } };
  }

  @SubscribeMessage('leave-chat')
  handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    client.leave(`chat-${data.chatId}`);
    return { event: 'left', data: { chatId: data.chatId } };
  }

  @SubscribeMessage('send-message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string; sessionId: string; chatId: string },
  ) {
    try {
      client.to(`chat-${data.chatId}`).emit('user-typing', { typing: true });

      const response = await this.ragService.chat(data.message, data.sessionId);

      client.to(`chat-${data.chatId}`).emit('user-typing', { typing: false });

      client.emit('message-response', {
        answer: response.answer,
        sources: response.sources,
      });

      return { success: true };
    } catch (error) {
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ) {
    client.to(`chat-${data.chatId}`).emit('user-typing', { typing: data.isTyping });
  }
}
