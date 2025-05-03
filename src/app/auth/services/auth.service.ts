import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface JwtResponse {
  token: string;
  type?: string;
  expiresIn?: number;
}

export interface UserInfo {
  id?: string;
  username: string;
  email?: string;
  roles?: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = 'http://localhost:8080/api/auth';
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Adicione um flag para ajudar a debugar problemas de token
  private tokenDebugging = true;

  constructor(private http: HttpClient, private router: Router) {
    // Verifica se já existe um token no localStorage ao iniciar o serviço
    this.checkToken();
  }

  /**
   * Verifica se existe um token no localStorage e extrai as informações do usuário
   */
  private checkToken(): void {
    const token = this.getToken();
    if (token) {
      try {
        // Verificar se o token ainda é válido
        if (this.isTokenValid(token)) {
          const userData = this.getUserDataFromToken(token);
          this.currentUserSubject.next(userData);

          if (this.tokenDebugging) {
            console.log('Token válido encontrado:', token.substring(0, 15) + '...');
            console.log('Dados do usuário recuperados:', userData);
          }
        } else {
          console.warn('Token expirado ou inválido encontrado no localStorage');
          this.logout();
        }
      } catch (error) {
        console.error('Erro ao processar token:', error);
        this.logout(); // Se o token for inválido, faz logout
      }
    }
  }

  /**
   * Verifica se o token JWT é válido (não expirado)
   */
  isTokenValid(token: string): boolean {
    try {
      const expiry = this.getTokenExpiration(token);
      if (!expiry) return true; // Se não tem campo exp, assumimos que é válido

      const isValid = expiry > Date.now() / 1000;

      if (this.tokenDebugging) {
        console.log('Verificando validade do token:');
        console.log('- Tempo de expiração:', new Date(expiry * 1000).toLocaleString());
        console.log('- Agora:', new Date().toLocaleString());
        console.log('- Token válido?', isValid);
      }

      return isValid;
    } catch (error) {
      console.error('Erro ao verificar validade do token:', error);
      return false;
    }
  }

  /**
   * Registra um novo usuário
   */
  register(payload: RegisterPayload): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.api}/register`, payload).pipe(
      tap(res => {
        console.log('Resposta do registro:', res);
        this.handleAuthSuccess(res);
      }),
      catchError(error => {
        console.error('Erro no registro:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Realiza o login do usuário
   */
  login(payload: LoginPayload): Observable<JwtResponse> {
    // Adicione cabeçalhos específicos para debug, se necessário
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<JwtResponse>(`${this.api}/login`, payload, { headers }).pipe(
      tap(res => {
        console.log('Resposta do login:', res);
        this.handleAuthSuccess(res);
      }),
      catchError(error => {
        console.error('Erro no login:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Processa o resultado bem-sucedido de autenticação
   */
  private handleAuthSuccess(response: JwtResponse): void {
    if (response && response.token) {
      console.log('Token recebido do servidor:', response.token.substring(0, 15) + '...');

      // Armazenar o token original sem modificações
      localStorage.setItem('token', response.token);

      // Extrai informações do usuário do token
      try {
        const userData = this.getUserDataFromToken(response.token);
        console.log('Dados do usuário extraídos do token:', userData);
        this.currentUserSubject.next(userData);
      } catch (error) {
        console.error('Erro ao extrair dados do usuário do token:', error);
      }
    } else {
      console.warn('Resposta da autenticação não contém token:', response);
    }
  }

  /**
   * Extrai informações do usuário do token JWT
   */
  getUserDataFromToken(token: string): UserInfo {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);

      if (this.tokenDebugging) {
        console.log('Payload do token decodificado:', payload);
      }

      return {
        id: payload.id || payload.userId || payload.sub,
        username: payload.sub || payload.username || 'usuário',
        email: payload.email,
        roles: payload.roles || payload.authorities || []
      };
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      throw new Error('Token inválido');
    }
  }

  /**
   * Encerra a sessão do usuário
   */
  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Recupera o token armazenado
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token ? this.isTokenValid(token) : false;
  }

  /**
   * Obtém a data de expiração do token
   */
  private getTokenExpiration(token: string): number | null {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      return payload.exp || null;
    } catch {
      return null;
    }
  }

  /**
   * Obtém o usuário atual
   */
  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }
}
