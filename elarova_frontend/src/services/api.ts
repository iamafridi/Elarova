import axios from 'axios';
import { Chat, Message, UploadedDocument } from '../types';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatApi = {
  getChats: async (sessionId: string): Promise<Chat[]> => {
    const response = await api.get(`/chats?sessionId=${sessionId}`);
    return response.data;
  },

  createChat: async (sessionId: string, title?: string): Promise<Chat> => {
    const response = await api.post(`/chats?sessionId=${sessionId}`, { title });
    return response.data;
  },

  getChat: async (sessionId: string, chatId: string): Promise<{ chat: Chat; messages: Message[] }> => {
    const response = await api.get(`/chats/${chatId}?sessionId=${sessionId}`);
    return response.data;
  },

  deleteChat: async (sessionId: string, chatId: string): Promise<void> => {
    await api.delete(`/chats/${chatId}?sessionId=${sessionId}`);
  },

  sendMessage: async (chatId: string, content: string, sessionId: string): Promise<{ userMessage: Message; assistantMessage: Message }> => {
    const response = await api.post('/messages', { chatId, content, sessionId });
    return response.data;
  },

  sendMessageStream: (chatId: string, content: string, sessionId: string, onChunk: (data: any) => void) => {
    return api.post('/messages/stream', { chatId, content, sessionId }, {
      responseType: 'stream',
    }).then((response) => {
      response.data.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        const lines = data.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            try {
              const parsed = JSON.parse(content);
              onChunk(parsed);
            } catch {
              // Handle raw string chunks
              if (content && content !== '[DONE]') {
                onChunk({ type: 'chunk', data: content });
              }
            }
          }
        }
      });
    });
  },
};

export const documentApi = {
  getDocuments: async (sessionId: string): Promise<UploadedDocument[]> => {
    const response = await api.get(`/documents?sessionId=${sessionId}`);
    return response.data;
  },

  uploadDocument: async (sessionId: string, file: File): Promise<UploadedDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/documents/upload?sessionId=${sessionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteDocument: async (sessionId: string, documentId: string): Promise<void> => {
    await api.delete(`/documents/${documentId}?sessionId=${sessionId}`);
  },
};

export const authApi = {
  getOrCreateSession: async (sessionId: string): Promise<{ sessionId: string }> => {
    const response = await api.post('/auth/session', { sessionId });
    return response.data;
  },
};

export default api;
