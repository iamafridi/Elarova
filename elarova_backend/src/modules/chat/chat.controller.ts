import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';

@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async createChat(
    @Query('sessionId') sessionId: string,
    @Body() createChatDto: CreateChatDto,
  ) {
    return this.chatService.createChat(sessionId, createChatDto);
  }

  @Get()
  async getChats(@Query('sessionId') sessionId: string) {
    return this.chatService.getChats(sessionId);
  }

  @Get(':id')
  async getChat(
    @Query('sessionId') sessionId: string,
    @Param('id') chatId: string,
  ) {
    return this.chatService.getChatWithMessages(sessionId, chatId);
  }

  @Delete(':id')
  async deleteChat(
    @Query('sessionId') sessionId: string,
    @Param('id') chatId: string,
  ) {
    await this.chatService.deleteChat(sessionId, chatId);
    return { success: true };
  }

  @Patch(':id/title')
  async updateTitle(
    @Query('sessionId') sessionId: string,
    @Param('id') chatId: string,
    @Body('title') title: string,
  ) {
    return this.chatService.updateChatTitle(sessionId, chatId, title);
  }
}
