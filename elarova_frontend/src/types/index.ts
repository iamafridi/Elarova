export interface Message {
  _id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: string[];
  createdAt: string;
}

export interface Chat {
  _id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedDocument {
  _id: string;
  userId: string;
  filename: string;
  originalName: string;
  filePath: string;
  pineconeNamespace: string;
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
}
