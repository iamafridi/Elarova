import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UploadedDocument, UploadedDocumentDocument } from '../../database/schemas/document.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { RagService } from '../rag/rag.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class DocumentService {
  private uploadPath = path.join(process.cwd(), 'elarova_rag', 'Data', 'user_uploads');

  constructor(
    @InjectModel(UploadedDocument.name) private documentModel: Model<UploadedDocumentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly ragService: RagService,
  ) {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async getOrCreateUser(sessionId: string): Promise<UserDocument> {
    let user = await this.userModel.findOne({ sessionId });
    if (!user) {
      user = await this.userModel.create({ sessionId });
    }
    return user;
  }

  async getDocuments(sessionId: string): Promise<UploadedDocumentDocument[]> {
    const user = await this.getOrCreateUser(sessionId);
    return this.documentModel.find({ userId: user._id }).sort({ createdAt: -1 }).exec();
  }

  async uploadDocument(sessionId: string, file: Express.Multer.File): Promise<UploadedDocumentDocument> {
    const user = await this.getOrCreateUser(sessionId);
    const namespace = `user_${sessionId}`;

    const userDir = path.join(this.uploadPath, sessionId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(userDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const document = await this.documentModel.create({
      userId: user._id,
      filename,
      originalName: file.originalname,
      filePath,
      pineconeNamespace: namespace,
      status: 'processing',
    });

    try {
      await this.ragService.uploadPdf(filePath, namespace);
      document.status = 'ready';
      await document.save();
    } catch (error) {
      document.status = 'error';
      await document.save();
      throw error;
    }

    return document;
  }

  async deleteDocument(sessionId: string, documentId: string): Promise<void> {
    const user = await this.getOrCreateUser(sessionId);
    const document = await this.documentModel.findOne({ _id: documentId, userId: user._id });
    
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await this.ragService.deleteDocument(document.pineconeNamespace);
    await this.documentModel.deleteOne({ _id: documentId });
  }
}
