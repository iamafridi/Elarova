import { Controller, Post, Body, Param, Get, Res } from '@nestjs/common';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Response } from 'express';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto & { sessionId?: string },
  ) {
    return this.messageService.sendMessage(sendMessageDto.sessionId || '', sendMessageDto);
  }

  @Post('stream')
  async sendMessageStream(
    @Body() body: SendMessageDto & { sessionId?: string },
    @Res() res: Response,
  ) {
    const { chatId, content, sessionId } = body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const userMessage = await this.messageService.createUserMessage(chatId, content);
      res.write(`data: ${JSON.stringify({ type: 'user_message', data: userMessage })}\n\n`);

      const stream = await this.messageService.sendMessageStream(sessionId || '', chatId, content, (assistantMessage) => {
        res.write(`data: ${JSON.stringify({ type: 'assistant_message', data: assistantMessage })}\n\n`);
      });

      stream.subscribe({
        next: () => {},
        error: (err) => {
          res.write(`data: ${JSON.stringify({ type: 'error', data: err.message })}\n\n`);
          res.end();
        },
        complete: () => {
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          res.end();
        },
      });
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
      res.end();
    }
  }

  @Get('chat/:chatId')
  async getMessages(@Param('chatId') chatId: string) {
    return this.messageService.getMessages(chatId);
  }
}
