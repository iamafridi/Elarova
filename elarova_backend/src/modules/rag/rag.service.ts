import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Observable } from 'rxjs';
import * as FormData from 'form-data';
import * as fs from 'fs';

@Injectable()
export class RagService {
  private ragApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.ragApiUrl = this.configService.get<string>('RAG_API_URL') || 'http://localhost:8080';
  }

  async chat(message: string, sessionId?: string): Promise<{ answer: string; sources: string[] }> {
    const namespace = sessionId ? `user_${sessionId}` : undefined;
    
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.ragApiUrl}/get`,
        { msg: message, namespace },
      );
      
      const data = response.data;
      const sources: string[] = [];
      
      const sourcesMatch = data.match(/Sources:([\s\S]*?)$/);
      if (sourcesMatch) {
        const sourcesText = sourcesMatch[1];
        const sourceLines = sourcesText.split('<br>').filter((s: string) => s.trim());
        sources.push(...sourceLines);
      }
      
      const answer = data.replace(/<br><br>---<br><strong>Sources:<\/strong><br>[\s\S]*$/, '').replace(/<br>/g, '\n');
      
      return { answer: answer.trim(), sources };
    } catch (error) {
      console.error('RAG chat error:', error);
      throw error;
    }
  }

  async chatStream(message: string, sessionId?: string): Promise<Observable<string>> {
    const namespace = sessionId ? `user_${sessionId}` : undefined;
    
    const formData = new FormData();
    formData.append('msg', message);
    if (namespace) {
      formData.append('namespace', namespace);
    }

    return new Observable((observer) => {
      const chunks: string[] = [];
      
      this.httpService.axiosRef.post(
        `${this.ragApiUrl}/get-stream`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          responseType: 'stream',
        },
      ).then((response) => {
        response.data.on('data', (chunk: Buffer) => {
          const data = chunk.toString();
          const lines = data.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const content = line.slice(6);
              if (content === '[DONE]') {
                observer.complete();
                return;
              }
              if (content) {
                chunks.push(content);
                observer.next(content);
              }
            }
          }
        });

        response.data.on('end', () => {
          observer.complete();
        });

        response.data.on('error', (err: Error) => {
          observer.error(err);
        });
      }).catch((error) => {
        observer.error(error);
      });
    });
  }

  async uploadPdf(filePath: string, namespace: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('namespace', namespace);

    try {
      const response = await this.httpService.axiosRef.post(
        `${this.ragApiUrl}/upload-pdf`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('PDF upload error:', error);
      throw error;
    }
  }

  async deleteDocument(namespace: string): Promise<any> {
    try {
      const response = await this.httpService.axiosRef.delete(
        `${this.ragApiUrl}/delete-document`,
        { data: { namespace } },
      );
      return response.data;
    } catch (error) {
      console.error('Document delete error:', error);
      throw error;
    }
  }
}
