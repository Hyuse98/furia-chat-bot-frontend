import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  register() {
    if (this.password !== this.confirmPassword) {
      this.error = 'Senhas não coincidem';
      return;
    }
    this.auth.register({ username: this.username, email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => this.error = err.error.message || 'Erro ao registrar'
    });
  }
}
