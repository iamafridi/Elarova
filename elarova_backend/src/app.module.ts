import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './modules/chat/chat.module';
import { MessageModule } from './modules/message/message.module';
import { DocumentModule } from './modules/document/document.module';
import { RagModule } from './modules/rag/rag.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatGateway } from './gateways/chat.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/elarova'),
    AuthModule,
    ChatModule,
    MessageModule,
    DocumentModule,
    RagModule,
  ],
  providers: [ChatGateway],
})
export class AppModule {}
