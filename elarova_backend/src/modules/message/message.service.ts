import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../../database/schemas/message.schema';
import { Chat, ChatDocument } from '../../database/schemas/chat.schema';
import { RagService } from '../rag/rag.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Observable } from 'rxjs';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    private readonly ragService: RagService,
  ) {}

  async sendMessage(sessionId: string, sendMessageDto: SendMessageDto) {
    const { chatId, content } = sendMessageDto;

    const chat = await this.chatModel.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const userMessage = await this.messageModel.create({
      chatId: new Types.ObjectId(chatId),
      role: 'user',
      content,
      sources: [],
    });

    const response = await this.ragService.chat(content, sessionId);

    const assistantMessage = await this.messageModel.create({
      chatId: new Types.ObjectId(chatId),
      role: 'assistant',
      content: response.answer,
      sources: response.sources,
    });

    if (chat.title === 'New Chat') {
      chat.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await chat.save();
    }

    return {
      userMessage,
      assistantMessage,
    };
  }

  async createUserMessage(chatId: string, content: string): Promise<MessageDocument> {
    return this.messageModel.create({
      chatId: new Types.ObjectId(chatId),
      role: 'user',
      content,
      sources: [],
    });
  }

  async sendMessageStream(
    sessionId: string,
    chatId: string,
    content: string,
    onChunk?: (message: MessageDocument) => void,
  ): Promise<Observable<string>> {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.title === 'New Chat') {
      chat.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await chat.save();
    }

    const sources: string[] = [];
    let fullAnswer = '';

    return new Observable((observer) => {
      let assistantMessage: MessageDocument | null = null;

      (async () => {
        const stream = await this.ragService.chatStream(content, sessionId);
        
        stream.subscribe({
          next: (chunk) => {
          fullAnswer += chunk;
          observer.next(chunk);

          if (!assistantMessage) {
            this.messageModel.create({
              chatId: new Types.ObjectId(chatId),
              role: 'assistant',
              content: fullAnswer,
              sources: [],
            }).then((msg) => {
              assistantMessage = msg;
              if (onChunk) onChunk(msg);
            });
          } else {
            this.messageModel.findByIdAndUpdate(assistantMessage._id, { content: fullAnswer }).exec();
            if (onChunk) onChunk(assistantMessage);
          }
        },
        error: (err) => {
          observer.error(err);
        },
        complete: async () => {
          if (assistantMessage) {
            const sourcesMatch = fullAnswer.match(/Sources:([\s\S]*?)$/);
            if (sourcesMatch) {
              const sourcesText = sourcesMatch[1];
              const sourceLines = sourcesText.split('<br>').filter((s: string) => s.trim());
              sources.push(...sourceLines);
            }
            await this.messageModel.findByIdAndUpdate(assistantMessage._id, { sources });
          }
          observer.complete();
        },
      });
      })();
    });
  }

  async getMessages(chatId: string): Promise<MessageDocument[]> {
    return this.messageModel
      .find({ chatId: new Types.ObjectId(chatId) })
      .sort({ createdAt: 1 })
      .exec();
  }
}
