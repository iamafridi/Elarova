import { Controller, Post, Body, Res, Sse } from '@nestjs/common';
import { RagService } from './rag.service';
import { Response } from 'express';
import { Observable, map } from 'rxjs';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('chat')
  async chat(@Body() body: { message: string; sessionId?: string }) {
    return this.ragService.chat(body.message, body.sessionId);
  }

  @Post('chat/stream')
  async chatStream(
    @Body() body: { message: string; sessionId?: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this.ragService.chatStream(body.message, body.sessionId);
    
    stream.subscribe({
      next: (chunk) => {
        res.write(`data: ${chunk}\n\n`);
      },
      error: (err) => {
        res.write(`data: [ERROR] ${err.message}\n\n`);
        res.end();
      },
      complete: () => {
        res.write('data: [DONE]\n\n');
        res.end();
      },
    });
  }
}
