import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  loading = false;
  error = '';

  form = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  register() {
    this.error = '';

    if (!this.form.name || !this.form.email || !this.form.password || !this.form.confirmPassword) {
      this.error = 'Please complete all required fields';
      return;
    }

    if (this.form.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }

    if (this.form.password !== this.form.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const payload = {
      name: this.form.name,
      email: this.form.email,
      password: this.form.password
    };

    this.http.post<any>('http://localhost:5000/auth/register', payload).subscribe({
      next: () => {
        this.loading = false;

        // Pass registered=true so the login page shows a success message
        this.router.navigate(['/login'], {
          queryParams: {
            registered: 'true'
          }
        });
      },
      error: (err: any) => {
        this.error = err.error?.error || err.error?.message || 'Registration failed. Please try again.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}