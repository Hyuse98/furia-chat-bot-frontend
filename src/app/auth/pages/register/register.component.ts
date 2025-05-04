import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/chat']);
    }
  }

  register(): void {
    if (!this.username || !this.email || !this.password || !this.confirmPassword) {
      this.error = 'Preencha todos os campos';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Senhas não coincidem';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'A senha deve ter pelo menos 6 caracteres';
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.error = 'Email inválido';
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.register({
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/chat']);
      },
      error: err => {
        this.loading = false;
        if (err.error && err.error.message) {
          this.error = err.error.message;
        } else if (err.status === 409) {
          this.error = 'Nome de usuário ou email já existe';
        } else {
          this.error = 'Erro ao registrar. Tente novamente mais tarde.';
        }
      }
    });
  }
}
