import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html'
})
export class AdminComponent implements OnInit {
  users: any[] = [];
  transactions: any[] = [];
  analytics: any = null;
  loading = false;
  activeTab = 'users';
  error = '';
  success = '';
  editingUser: any = null;
  showCreateForm = false;
  submitting = false;

  createForm = {
    name: '',
    email: '',
    password: '',
    roles: 'user'
  };

  editForm = {
    name: '',
    phone: ''
  };

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    setTimeout(() => {
      this.loadUsers();
      this.loadAnalytics();
    }, 0);
  }

  loadUsers() {
    this.loading = true;
    this.cdr.detectChanges();
    this.http.get<any>('http://localhost:5000/users/').subscribe({
      next: (res: any) => {
        this.users   = res.data?.items || res.items || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTransactions() {
    this.loading = true;
    this.cdr.detectChanges();
    this.http.get<any>('http://localhost:5000/users/admin/transactions').subscribe({
      next: (res: any) => {
        this.transactions = res.data?.items || res.items || [];
        this.loading      = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadAnalytics() {
    this.http.get<any>('http://localhost:5000/users/admin/analytics').subscribe({
      next: (res: any) => {
        this.analytics = res.data || res;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'transactions' && this.transactions.length === 0) {
      this.loadTransactions();
    }
  }

  onCreateUser() {
    this.submitting = true;
    this.error = '';
    const data = {
      name:     this.createForm.name,
      email:    this.createForm.email,
      password: this.createForm.password,
      roles:    [this.createForm.roles]
    };
    this.http.post<any>('http://localhost:5000/users/', data).subscribe({
      next: () => {
        this.success        = 'User created successfully!';
        this.showCreateForm = false;
        this.createForm     = { name: '', email: '', password: '', roles: 'user' };
        this.loadUsers();
        this.submitting = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error      = err.error?.error || 'Failed to create user';
        this.submitting = false;
      }
    });
  }

  startEdit(user: any) {
    this.editingUser    = user;
    this.showCreateForm = false;
    this.editForm       = {
      name:  user.name  || '',
      phone: user.phone || ''
    };
  }

  onEdit() {
    if (!this.editingUser) return;
    this.submitting = true;
    this.error = '';
    this.http.put<any>(`http://localhost:5000/users/${this.editingUser.id}`, this.editForm).subscribe({
      next: () => {
        this.success     = 'User updated successfully!';
        this.editingUser = null;
        this.loadUsers();
        this.submitting  = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error      = err.error?.error || 'Failed to update user';
        this.submitting = false;
      }
    });
  }

  deleteUser(id: string) {
    if (!confirm('Delete this user and all their data?')) return;
    this.http.delete(`http://localhost:5000/users/${id}`).subscribe({
      next: () => {
        this.success = 'User deleted!';
        this.loadUsers();
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete user';
      }
    });
  }

  logout() { this.auth.logout(); }
}