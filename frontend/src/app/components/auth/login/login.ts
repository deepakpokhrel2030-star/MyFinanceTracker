import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
  
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit() {
    this.error = '';

    if (!this.email) {
      this.error = 'Please enter your email address';
      this.cdr.detectChanges();
      return;
    }
    if (!this.email.includes('@')) {
      this.error = 'Please enter a valid email address';
      this.cdr.detectChanges();
      return;
    }
    if (!this.password) {
      this.error = 'Please enter your password';
      this.cdr.detectChanges();
      return;
    }
    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        window.location.href = '/dashboard';
      },
      error: (err: any) => {
        const status = err.status;
        if (status === 401) {
          this.error = 'Incorrect email or password. Please try again.';
        } else if (status === 403) {
          this.error = 'Your account has been deactivated. Contact support.';
        } else if (status === 0) {
          this.error = 'Cannot connect to server. Make sure the backend is running.';
        } else {
          this.error = err.error?.error || 'Login failed. Please try again.';
        }
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}