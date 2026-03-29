import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  user: any = null;
  loading = false;
  submitting = false;
  error = '';
  success = '';
  showPasswordForm = false;

  form = {
    name: '',
    phone: '',
    address: {
      street: '',
      city: '',
      postcode: '',
      country: ''
    }
  };

  passwordForm = {
    password: '',
    confirmPassword: ''
  };

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    setTimeout(() => this.loadProfile(), 0);
  }

  loadProfile() {
    this.loading = true;
    this.cdr.detectChanges();
    this.http.get<any>('http://localhost:5000/auth/me').subscribe({
      next: (res: any) => {
        this.user = res.data?.user || res.user || res;
        this.form = {
          name:  this.user?.name  || '',
          phone: this.user?.phone || '',
          address: {
            street:   this.user?.address?.street   || '',
            city:     this.user?.address?.city     || '',
            postcode: this.user?.address?.postcode || '',
            country:  this.user?.address?.country  || ''
          }
        };
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onUpdate() {
    this.submitting = true;
    this.error = '';
    this.http.put<any>('http://localhost:5000/auth/me', this.form).subscribe({
      next: () => {
        this.success = 'Profile updated successfully!';
        this.submitting = false;
        this.auth.currentUser$.next({ ...this.auth.currentUser$.value, name: this.form.name });
        localStorage.setItem('user', JSON.stringify({ ...this.auth.currentUser$.value }));
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error      = err.error?.error || 'Failed to update profile';
        this.submitting = false;
      }
    });
  }

  onChangePassword() {
    if (this.passwordForm.password !== this.passwordForm.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }
    if (this.passwordForm.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }
    this.submitting = true;
    this.error = '';
    this.http.put<any>('http://localhost:5000/auth/me', {
      password: this.passwordForm.password
    }).subscribe({
      next: () => {
        this.success          = 'Password changed successfully!';
        this.showPasswordForm = false;
        this.passwordForm     = { password: '', confirmPassword: '' };
        this.submitting       = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error      = err.error?.error || 'Failed to change password';
        this.submitting = false;
      }
    });
  }

  logout() { this.auth.logout(); }
}