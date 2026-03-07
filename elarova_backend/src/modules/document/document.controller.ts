import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  async getDocuments(@Query('sessionId') sessionId: string) {
    return this.documentService.getDocuments(sessionId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './temp',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadDocument(
    @Query('sessionId') sessionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentService.uploadDocument(sessionId, file);
  }

  @Delete(':id')
  async deleteDocument(
    @Query('sessionId') sessionId: string,
    @Param('id') documentId: string,
  ) {
    await this.documentService.deleteDocument(sessionId, documentId);
    return { success: true };
  }
}
