import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { RegisterPayload, LoginPayload, JwtResponse } from '../models/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private api = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  register(payload: RegisterPayload): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.api}/register`, payload).pipe(
      tap(res => localStorage.setItem('token', res.token))
    );
  }

  login(payload: LoginPayload): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.api}/login`, payload).pipe(
      tap(res => localStorage.setItem('token', res.token))
    );
  }

  logout() {
    localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}
