import { Component, OnInit } from '@angular/core';
import { ChatService } from '../service/chat/chat-service.service';
import { FormsModule } from '@angular/forms';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';
import { Router } from '@angular/router';

interface ChatMessage {
  userId: string;
  message: string;
  type: 'USER_MESSAGE' | 'BOT_RESPONSE';
}

@Component({
  selector: 'app-chat',
  templateUrl: 'chat.component.html',
  imports: [
    FormsModule,
    NgClass,
    NgForOf,
    NgIf
  ],
  styleUrls: ['chat.component.scss']
})
export class ChatComponent implements OnInit {
  username: string | null = null;
  newMessage = '';
  messages: ChatMessage[] = [];
  loading = false;
  errorMessage: string | null = null;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.checkAuthentication();
  }

  private checkAuthentication(): void {
    if (!this.authService.isAuthenticated()) {
      console.warn('Usuário não autenticado. Redirecionando para login...');
      this.authService.logout();
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.username = currentUser.username;
      console.log('Usuário autenticado:', this.username);

      // Exibir informações do token para debug
      const token = this.authService.getToken();
      if (token) {
        console.log('Token em uso:', token.substring(0, 15) + '...');
      }
    } else {
      console.warn('Não foi possível obter informações do usuário.');
      this.username = 'usuário';
    }
  }

  sendMessage(): void {
    if (this.newMessage.trim() && this.username) {
      // Verificar autenticação antes de enviar
      if (!this.authService.isAuthenticated()) {
        this.errorMessage = 'Sessão expirada. Faça login novamente.';
        setTimeout(() => this.authService.logout(), 2000);
        return;
      }

      this.loading = true;
      this.errorMessage = null;

      const userMessage: ChatMessage = {
        userId: this.username,
        message: this.newMessage,
        type: 'USER_MESSAGE'
      };

      this.messages.push(userMessage);
      const currentMessage = this.newMessage;
      this.newMessage = '';

      this.chatService.sendMessage(userMessage).subscribe({
        next: (response: ChatMessage) => {
          this.loading = false;
          this.messages.push(response);
        },
        error: (error: any) => {
          this.loading = false;
          console.error('Erro ao enviar mensagem:', error);

          // Adicionar mensagem de erro detalhada
          if (error.status === 403) {
            this.errorMessage = 'Acesso negado. Sua sessão pode ter expirado.';

            // Tentar novamente com reautenticação
            this.tryReauthentication(userMessage);
          } else if (error.status === 401) {
            this.errorMessage = 'Não autorizado. Faça login novamente.';
            setTimeout(() => this.authService.logout(), 2000);
          } else {
            this.errorMessage = 'Erro ao enviar mensagem. Tente novamente.';
          }

          const errorResponseMessage: ChatMessage = {
            userId: 'sistema',
            message: this.errorMessage,
            type: 'BOT_RESPONSE'
          };
          this.messages.push(errorResponseMessage);
        }
      });
    } else if (!this.username) {
      this.errorMessage = 'Nome de usuário não encontrado. Faça login novamente.';
      setTimeout(() => this.authService.logout(), 2000);
    }
  }

  // Método para tentar enviar novamente após erro 403
  private tryReauthentication(message: ChatMessage): void {
    console.log('Tentando manualmente obter dados de autenticação...');

    // Exibir token atual para depuração
    const token = this.authService.getToken();
    if (token) {
      try {
        // Tentar decodificar manualmente o token
        const userData = this.authService.getUserDataFromToken(token);
        console.log('Dados do usuário no token:', userData);

        // Verificar se há campos específicos que o backend pode estar esperando
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const header = JSON.parse(atob(tokenParts[0]));
          console.log('Cabeçalho do token:', header);
        }
      } catch (e) {
        console.error('Erro ao analisar token:', e);
      }
    }
  }
}
