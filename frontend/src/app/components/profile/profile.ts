import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {
  user: any = null;

  loading = false;
  submitting = false;
  error = '';
  success = '';

  editMode = false;
  passwordMode = false;

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
    this.error = '';
    this.cdr.detectChanges();

    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (res: any) => {
        this.user = res.data?.user || res.user || res;

        this.form = {
          name: this.user?.name || '',
          phone: this.user?.phone || '',
          address: {
            street: this.user?.address?.street || '',
            city: this.user?.address?.city || '',
            postcode: this.user?.address?.postcode || '',
            country: this.user?.address?.country || ''
          }
        };

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to load profile';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get initials() {
    return (this.user?.name || 'User')
      .split(' ')
      .map((part: string) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  get roleText() {
    if (Array.isArray(this.user?.roles)) return this.user.roles.join(', ');
    return this.user?.role || 'User';
  }

  startEdit() {
    this.editMode = true;
    this.passwordMode = false;
    this.error = '';
    this.success = '';
  }

  cancelEdit() {
    this.editMode = false;
    this.loadProfile();
  }

  onUpdate() {
    this.submitting = true;
    this.error = '';
    this.success = '';
    this.cdr.detectChanges();

    const payload = {
      name: this.form.name,
      phone: this.form.phone,
      address: this.form.address
    };

    this.http.put<any>(`${environment.apiUrl}/auth/me`, payload).subscribe({
      next: (res: any) => {
        this.success = 'Profile updated successfully!';
        this.submitting = false;
        this.editMode = false;

        const updatedUser = res.data?.user || res.user || {
          ...this.user,
          ...payload
        };

        this.user = updatedUser;

        // Sync currentUser$ and localStorage so the sidebar name updates immediately
        const current = this.auth.currentUser$.value || {};
        const updated = {
          ...current,
          ...updatedUser,
          name: this.form.name
        };

        this.auth.currentUser$.next(updated);
        localStorage.setItem('user', JSON.stringify(updated));

        this.loadProfile();
        this.cdr.detectChanges();

        setTimeout(() => {
          this.success = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to update profile';
        this.submitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  openPasswordChange() {
    this.passwordMode = true;
    this.editMode = false;
    this.error = '';
    this.success = '';
    this.passwordForm = {
      password: '',
      confirmPassword: ''
    };
  }

  cancelPasswordChange() {
    this.passwordMode = false;
    this.passwordForm = {
      password: '',
      confirmPassword: ''
    };
  }

  onChangePassword() {
    if (this.passwordForm.password !== this.passwordForm.confirmPassword) {
      this.error = 'Passwords do not match';
      this.cdr.detectChanges();
      return;
    }

    if (this.passwordForm.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      this.cdr.detectChanges();
      return;
    }

    this.submitting = true;
    this.error = '';
    this.cdr.detectChanges();

    this.http.put<any>(`${environment.apiUrl}/auth/me`, {
      password: this.passwordForm.password
    }).subscribe({
      next: () => {
        this.success = 'Password changed successfully!';
        this.passwordMode = false;
        this.passwordForm = {
          password: '',
          confirmPassword: ''
        };
        this.submitting = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.success = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to change password';
        this.submitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  logout() {
    this.auth.logout();
  }
}