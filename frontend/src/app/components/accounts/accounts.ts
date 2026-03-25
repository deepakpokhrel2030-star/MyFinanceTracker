import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountService } from '../../services/account';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './accounts.html'
})
export class AccountsComponent implements OnInit {
  accounts: any[] = [];
  loading = true;
  showAddForm = false;
  editingAccount: any = null;
  submitting = false;
  error = '';
  success = '';

  form = {
    name: '',
    account_type: 'checking',
    balance: 0,
    currency: 'GBP',
    bank_name: ''
  };

  editForm = {
    name: '',
    bank_name: '',
    currency: 'GBP',
    balance: 0
  };

  constructor(
    private accountService: AccountService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.loadAccounts();
  }

  loadAccounts() {
    this.loading = true;
    this.accountService.getAll().subscribe({
      next: (res) => {
        this.accounts = res.data?.items || res.items || [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onAdd() {
    this.submitting = true;
    this.error = '';
    this.accountService.create(this.form).subscribe({
      next: () => {
        this.success = 'Account created successfully!';
        this.showAddForm = false;
        this.resetForm();
        this.loadAccounts();
        this.submitting = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to create account';
        this.submitting = false;
      }
    });
  }

  startEdit(acc: any) {
    this.editingAccount = acc;
    this.editForm = {
      name: acc.name,
      bank_name: acc.bank_name || '',
      currency: acc.currency,
      balance: acc.balance
    };
  }

  onEdit() {
    if (!this.editingAccount) return;
    this.submitting = true;
    this.error = '';
    this.accountService.update(this.editingAccount.id, this.editForm).subscribe({
      next: () => {
        this.success = 'Account updated successfully!';
        this.editingAccount = null;
        this.loadAccounts();
        this.submitting = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to update account';
        this.submitting = false;
      }
    });
  }

  deleteAccount(id: string) {
    if (!confirm('Are you sure? This will also delete all transactions for this account.')) return;
    this.accountService.delete(id).subscribe({
      next: () => {
        this.success = 'Account deleted successfully!';
        this.loadAccounts();
        setTimeout(() => this.success = '', 3000);
      },
      error: (err) => {
        this.error = err.error?.error || 'Failed to delete account';
      }
    });
  }

  get totalBalance() {
    return this.accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  }

  resetForm() {
    this.form = { name: '', account_type: 'checking', balance: 0, currency: 'GBP', bank_name: '' };
  }

  logout() { this.auth.logout(); }
}