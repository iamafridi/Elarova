import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { UploadedDocument, UploadedDocumentSchema } from '../../database/schemas/document.schema';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UploadedDocument.name, schema: UploadedDocumentSchema },
      { name: User.name, schema: UserSchema },
    ]),
    RagModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
