import { Controller, Post, Body, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  async getOrCreateSession(@Body('sessionId') sessionId: string) {
    const user = await this.authService.getOrCreateSession(sessionId);
    return {
      sessionId: user.sessionId,
      createdAt: (user as any).createdAt,
    };
  }
}
