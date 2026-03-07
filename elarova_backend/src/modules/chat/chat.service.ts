import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat, ChatDocument } from '../../database/schemas/chat.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Message, MessageDocument } from '../../database/schemas/message.schema';
import { CreateChatDto } from './dto/create-chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async getOrCreateUser(sessionId: string): Promise<UserDocument> {
    let user = await this.userModel.findOne({ sessionId });
    if (!user) {
      user = await this.userModel.create({ sessionId });
    }
    return user;
  }

  async createChat(sessionId: string, createChatDto: CreateChatDto): Promise<ChatDocument> {
    const user = await this.getOrCreateUser(sessionId);
    const chat = await this.chatModel.create({
      userId: user._id,
      title: createChatDto.title || 'New Chat',
    });
    return chat;
  }

  async getChats(sessionId: string): Promise<ChatDocument[]> {
    const user = await this.getOrCreateUser(sessionId);
    return this.chatModel
      .find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getChatById(sessionId: string, chatId: string): Promise<ChatDocument> {
    const user = await this.getOrCreateUser(sessionId);
    const chat = await this.chatModel.findOne({ _id: chatId, userId: user._id });
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    return chat;
  }

  async getChatWithMessages(sessionId: string, chatId: string): Promise<{ chat: ChatDocument; messages: MessageDocument[] }> {
    const chat = await this.getChatById(sessionId, chatId);
    const messages = await this.messageModel
      .find({ chatId: chat._id })
      .sort({ createdAt: 1 })
      .exec();
    return { chat, messages };
  }

  async deleteChat(sessionId: string, chatId: string): Promise<void> {
    const chat = await this.getChatById(sessionId, chatId);
    await this.messageModel.deleteMany({ chatId: chat._id });
    await this.chatModel.deleteOne({ _id: chat._id });
  }

  async updateChatTitle(sessionId: string, chatId: string, title: string): Promise<ChatDocument> {
    const chat = await this.getChatById(sessionId, chatId);
    chat.title = title;
    await chat.save();
    return chat;
  }
}
