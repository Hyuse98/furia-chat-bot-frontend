import {Component, OnInit} from '@angular/core';
import {ChatService} from '../service/chat/chat-service.service';
import {FormsModule} from '@angular/forms';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {AuthService} from '../../auth/services/auth.service';
import {LogoutButtonComponent} from '../../auth/components/logout-button/logout-button.component';

import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

interface ChatMessage {
  userId: string;
  message: string;
  type: 'USER_MESSAGE' | 'BOT_RESPONSE';
  isHtml?: boolean;
  timestamp?: number;
}

@Component({
  selector: 'app-chat',
  templateUrl: 'chat.component.html',
  imports: [
    FormsModule,
    NgClass,
    NgForOf,
    NgIf,
    LogoutButtonComponent
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
    private sanitizer: DomSanitizer
  ) {
  }

  ngOnInit(): void {
    this.checkAuthentication();
  }

  safeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
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

  private formatMessageContent(content: string): string {
    const lines = content.split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
      let processedLine = line;

      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      if (processedLine.startsWith('- ')) {
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        const listItem = processedLine.substring(2);
        html += `<li>${listItem}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        html += `<p>${processedLine}</p>`;
      }
    }

    if (inList) {
      html += '</ul>';
    }

    return html;
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
        userId: 'user',
        message: this.newMessage,
        type: 'USER_MESSAGE'
      };

      this.messages.push(userMessage);
      const currentMessage = this.newMessage;
      this.newMessage = '';

      this.chatService.sendMessage(userMessage).subscribe({
        next: (response: ChatMessage) => {
          this.loading = false;

          if (
            response.message.includes('<') && response.message.includes('>') ||
            response.message.includes('**') ||
            response.message.includes('•') ||
            response.message.includes('📅') ||
            response.message.includes('🏆') ||
            response.message.includes('help-container') // Detectar mensagem de ajuda
          ) {
            response.isHtml = true;
            if (!response.message.includes('<div class="help-container">')) {
              response.message = this.formatMessageContent(response.message);
            }
          }
          response.timestamp = Date.now();
          this.messages.push(response);
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (error: any) => {
          this.loading = false;
          console.error('Erro ao enviar mensagem:', error);

          // Adicionar mensagem de erro detalhada
          if (error.status === 403) {
            this.errorMessage = 'Acesso negado. Sua sessão pode ter expirado.';
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

  scrollToBottom(): void {
    const messagesContainer = document.querySelector('.chat-messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
}
