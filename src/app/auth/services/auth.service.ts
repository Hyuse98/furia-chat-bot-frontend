import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject, Observable, throwError} from 'rxjs';
import {catchError, tap} from 'rxjs/operators';
import {Router} from '@angular/router';

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

  constructor(private http: HttpClient, private router: Router) {
    this.checkToken();
  }

  private checkToken(): void {
    const token = this.getToken();
    if (token) {
      try {
        if (this.isTokenValid(token)) {
          const userData = this.getUserDataFromToken(token);
          this.currentUserSubject.next(userData);
        } else {
          console.warn('Token expirado ou inválido encontrado no localStorage');
          this.logout();
        }
      } catch (error) {
        this.logout();
      }
    }
  }

  isTokenValid(token: string): boolean {
    try {
      const expiry = this.getTokenExpiration(token);
      if (!expiry) return true;

      return expiry > Date.now() / 1000;
    } catch (error) {
      console.error('Erro ao verificar validade do token:', error);
      return false;
    }
  }

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

  login(payload: LoginPayload): Observable<JwtResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<JwtResponse>(`${this.api}/login`, payload, { headers }).pipe(
      tap(res => {
        this.handleAuthSuccess(res);
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  private handleAuthSuccess(response: JwtResponse): void {
    if (response && response.token) {
      localStorage.setItem('token', response.token);
      try {
        const userData = this.getUserDataFromToken(response.token);
        this.currentUserSubject.next(userData);
      } catch (error) {
        console.error('Erro ao extrair dados do usuário do token:', error);
      }
    } else {
      console.warn('Resposta da autenticação não contém token:', response);
    }
  }
  getUserDataFromToken(token: string): UserInfo {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);

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

  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token ? this.isTokenValid(token) : false;
  }

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

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }
}
