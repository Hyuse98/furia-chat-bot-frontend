import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpInterceptor,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();

    // Adicionar logs para debug (temporário)
    console.log('Interceptando requisição para:', request.url);
    console.log('Token existe?', !!token);

    if (token) {
      // Verificar se o token ainda é válido
      if (!this.authService.isTokenValid(token)) {
        console.log('Token expirado ou inválido - fazendo logout');
        this.authService.logout();
        return throwError(() => new Error('Token expirado ou inválido'));
      }

      // Experimente diferentes formatos de cabeçalho de autorização
      // Alguns backends esperam exatamente "Bearer " (com espaço)
      // Outros podem esperar apenas o token sem o prefixo
      const authRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          // Adicione outros cabeçalhos que possam ser necessários
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Cabeçalhos enviados:', authRequest.headers);

      return next.handle(authRequest).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erro na requisição:', error);

          // Se receber erro 401 (Unauthorized) ou 403 (Forbidden), pode ser problema com o token
          if (error.status === 401) {
            console.log('Erro 401: Token inválido ou expirado');
            this.authService.logout();
          } else if (error.status === 403) {
            console.log('Erro 403: Permissão negada mesmo com token');
            // Não fazer logout automático em caso de 403
            // Pode ser que o usuário apenas não tenha permissão para esta ação específica
          }

          return throwError(() => error);
        })
      );
    }

    // Adicione cabeçalhos básicos mesmo sem token
    const basicRequest = request.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return next.handle(basicRequest);
  }
}
