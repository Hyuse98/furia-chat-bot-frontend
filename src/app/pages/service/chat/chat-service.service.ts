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

    // Garantir que o token está incluído diretamente nesta requisição
    const token = this.authService.getToken();

    if (!token) {
      console.error('Tentativa de enviar mensagem sem token de autenticação');
      return throwError(() => new Error('Usuário não autenticado'));
    }

    // Adicione cabeçalhos específicos para esta requisição
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    console.log('Cabeçalhos para requisição de chat:', headers);

    return this.http.post<ChatMessage>(this.api, message, { headers }).pipe(
      retry(1), // Tenta a requisição novamente uma vez em caso de falha
      catchError(error => {
        console.error('Erro ao enviar mensagem:', error);

        // Adicione mais detalhes ao log para depurar
        if (error.status === 403) {
          console.error('Erro 403 Forbidden. Detalhes:', error.error);
          console.error('Token utilizado:', token.substring(0, 15) + '...');
        }

        return throwError(() => error);
      })
    );
  }

  // Adicione um método para recuperar mensagens anteriores se necessário
  getMessages(): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(this.api).pipe(
      catchError(error => {
        console.error('Erro ao buscar mensagens:', error);
        return throwError(() => error);
      })
    );
  }
}
