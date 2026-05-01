import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
  encapsulation: ViewEncapsulation.None  // Allows admin CSS to style dynamically rendered inner content
})
export class AdminComponent implements OnInit {
  users: any[] = [];

  loading = false;
  detailsLoading = false;
  submitting = false;

  error = '';
  success = '';

  selectedUser: any = null;
  editingUser: any = null;

  showCreateForm = false;

  page = 1;
  pageSize = 10;
  searchTerm = '';

  detailTab = 'transactions';
  detailPage = 1;
  detailPageSize = 10;

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
    private cdr: ChangeDetectorRef,
    private location: Location
  ) {}

  ngOnInit() {
    this.loadUsers();

    window.onpopstate = () => {
      if (this.selectedUser) {
        this.selectedUser = null;
        this.editingUser = null;
        this.location.go('/admin');
        this.cdr.detectChanges();
      }
    };
  }

  loadUsers() {
    this.loading = true;
    this.error = '';

    this.http.get<any>(`${environment.apiUrl}/users/`).subscribe({
      next: (res: any) => {
        this.users = res.data?.items || res.items || res.data || res || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to load users';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get activeUsersCount() {
    return this.users.filter(user => user.is_active).length;
  }

  get inactiveUsersCount() {
    return this.users.filter(user => !user.is_active).length;
  }

  get adminUsersCount() {
    return this.users.filter(user => (user.roles || []).includes('admin')).length;
  }

  get filteredUsers() {
    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      return this.users;
    }

    return this.users.filter(user =>
      (user.name || '').toLowerCase().includes(term) ||
      (user.email || '').toLowerCase().includes(term) ||
      (user.phone || '').toLowerCase().includes(term) ||
      (user.roles || []).join(' ').toLowerCase().includes(term)
    );
  }

  onSearchChange() {
    this.page = 1;
  }

  get pagedUsers() {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
    }
  }

  previousPage() {
    if (this.page > 1) {
      this.page--;
    }
  }

  viewUser(user: any) {
    // Update URL for deep-link appearance without triggering a full Angular route reload
    this.location.go('/admin/user/' + user.id);

    this.selectedUser = user;
    this.editingUser = null;
    this.showCreateForm = false;
    this.detailsLoading = true;
    this.error = '';

    this.detailTab = 'transactions';
    this.detailPage = 1;

    this.http.get<any>(`${environment.apiUrl}/users/${user.id}`).subscribe({
      next: (res: any) => {
        const userData = res.data?.user || res.user || res.data || res;

        this.selectedUser = {
          ...userData,
          transactions: userData.transactions || userData.recent_transactions || [],
          accounts: userData.accounts || [],
          savings: userData.savings || userData.savings_goals || userData.goals || [],
          investments: userData.investments || [],
          budgets: userData.budgets || []
        };

        this.detailsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.detailsLoading = false;
        this.error = 'Could not load full user details';
        this.cdr.detectChanges();
      }
    });
  }

  backToUsers() {
    this.location.go('/admin');
    this.selectedUser = null;
    this.editingUser = null;
    this.detailTab = 'transactions';
    this.detailPage = 1;
    this.cdr.detectChanges();
  }

  setDetailTab(tab: string) {
    this.detailTab = tab;
    this.detailPage = 1;
  }

  get currentDetailItems() {
    if (!this.selectedUser) {
      return [];
    }

    if (this.detailTab === 'transactions') {
      return this.selectedUser.transactions || [];
    }

    if (this.detailTab === 'savings') {
      return this.selectedUser.savings || [];
    }

    if (this.detailTab === 'accounts') {
      return this.selectedUser.accounts || [];
    }

    if (this.detailTab === 'investments') {
      return this.selectedUser.investments || [];
    }

    return [];
  }

  get pagedDetailItems() {
    const start = (this.detailPage - 1) * this.detailPageSize;
    return this.currentDetailItems.slice(start, start + this.detailPageSize);
  }

  get detailTotalPages() {
    return Math.ceil(this.currentDetailItems.length / this.detailPageSize) || 1;
  }

  nextDetailPage() {
    if (this.detailPage < this.detailTotalPages) {
      this.detailPage++;
    }
  }

  previousDetailPage() {
    if (this.detailPage > 1) {
      this.detailPage--;
    }
  }

  onCreateUser() {
    this.submitting = true;
    this.success = '';
    this.error = '';

    const data = {
      name: this.createForm.name,
      email: this.createForm.email,
      password: this.createForm.password,
      roles: [this.createForm.roles]
    };

    this.http.post<any>(`${environment.apiUrl}/users/`, data).subscribe({
      next: () => {
        this.success = 'User created successfully!';
        this.showCreateForm = false;

        this.createForm = {
          name: '',
          email: '',
          password: '',
          roles: 'user'
        };

        this.page = 1;
        this.loadUsers();
        this.submitting = false;

        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to create user';
        this.submitting = false;
      }
    });
  }

  startEdit(user: any) {
    this.editingUser = user;
    this.showCreateForm = false;
    this.success = '';
    this.error = '';

    this.editForm = {
      name: user.name || '',
      phone: user.phone || ''
    };
  }

  onEdit() {
    if (!this.editingUser) {
      return;
    }

    this.submitting = true;
    this.success = '';
    this.error = '';

    this.http.put<any>(`${environment.apiUrl}/users/${this.editingUser.id}`, this.editForm).subscribe({
      next: () => {
        this.success = 'User updated successfully!';
        this.editingUser = null;

        if (this.selectedUser) {
          this.viewUser(this.selectedUser);
        }

        this.loadUsers();
        this.submitting = false;

        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to update user';
        this.submitting = false;
      }
    });
  }

  cancelEdit() {
    this.editingUser = null;
  }

  deleteUser(id: string) {
    if (!confirm('Delete this user and all their data?')) {
      return;
    }

    this.success = '';
    this.error = '';

    this.http.delete(`${environment.apiUrl}/users/${id}`).subscribe({
      next: () => {
        this.success = 'User deleted!';
        this.selectedUser = null;
        this.editingUser = null;
        this.location.go('/admin');
        this.loadUsers();

        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete user';
      }
    });
  }
}