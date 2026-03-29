import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.html'
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  success = '';
  loading = false;

  nameError = '';
  emailError = '';
  passwordError = '';
  confirmError = '';

  constructor(private auth: AuthService, private router: Router) {}

  validateForm(): boolean {
    this.nameError     = '';
    this.emailError    = '';
    this.passwordError = '';
    this.confirmError  = '';
    let valid = true;

    if (!this.name.trim()) {
      this.nameError = 'Full name is required';
      valid = false;
    }
    if (!this.email) {
      this.emailError = 'Email address is required';
      valid = false;
    } else if (!this.email.includes('@')) {
      this.emailError = 'Please enter a valid email address';
      valid = false;
    }
    if (!this.password) {
      this.passwordError = 'Password is required';
      valid = false;
    } else if (this.password.length < 6) {
      this.passwordError = 'Password must be at least 6 characters';
      valid = false;
    }
    if (!this.confirmPassword) {
      this.confirmError = 'Please confirm your password';
      valid = false;
    } else if (this.password !== this.confirmPassword) {
      this.confirmError = 'Passwords do not match';
      valid = false;
    }

    return valid;
  }

  onSubmit() {
    this.error = '';
    if (!this.validateForm()) return;

    this.loading = true;
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => {
        this.success = 'Account created successfully! Redirecting to login...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err: any) => {
        const status = err.status;
        if (status === 409) {
          this.emailError = 'This email is already registered. Try logging in instead.';
        } else if (status === 0) {
          this.error = 'Cannot connect to server. Make sure the backend is running.';
        } else {
          this.error = err.error?.error || 'Registration failed. Please try again.';
        }
        this.loading = false;
      }
    });
  }
}