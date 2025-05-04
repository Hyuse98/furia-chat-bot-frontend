import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { AuthService } from '../../../auth/services/auth.service';

interface ChatMessage {
  userId: string;
  message: string;
  type: 'USER_MESSAGE' | 'BOT_RESPONSE';
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private api = 'http://localhost:8080/api/chat';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  sendMessage(message: ChatMessage): Observable<ChatMessage> {
    console.log('Enviando mensagem:', message);

    const token = this.authService.getToken();

    if (!token) {
      console.error('Tentativa de enviar mensagem sem token de autenticação');
      return throwError(() => new Error('Usuário não autenticado'));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    console.log('Cabeçalhos para requisição de chat:', headers);

    return this.http.post<ChatMessage>(this.api, message, { headers }).pipe(
      retry(1),
      catchError(error => {
        console.error('Erro ao enviar mensagem:', error);

        if (error.status === 403) {
          console.error('Erro 403 Forbidden. Detalhes:', error.error);
          console.error('Token utilizado:', token.substring(0, 15) + '...');
        }

        return throwError(() => error);
      })
    );
  }
}
