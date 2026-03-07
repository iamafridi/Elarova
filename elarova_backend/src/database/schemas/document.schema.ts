import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UploadedDocumentDocument = UploadedDocument & Document;

@Schema({ timestamps: true })
export class UploadedDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({ required: true })
  pineconeNamespace: string;

  @Prop({ required: true, enum: ['processing', 'ready', 'error'], default: 'processing' })
  status: string;
}

export const UploadedDocumentSchema = SchemaFactory.createForClass(UploadedDocument);
