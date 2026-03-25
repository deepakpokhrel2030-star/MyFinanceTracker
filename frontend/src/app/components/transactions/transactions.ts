import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TransactionService } from '../../services/transaction';
import { AccountService } from '../../services/account';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './transactions.html'
})
export class TransactionsComponent implements OnInit {
  transactions: any[] = [];
  accounts: any[] = [];
  loading = false;
  showForm = false;
  submitting = false;
  error = '';
  success = '';
  totalItems = 0;
  currentPage = 1;
  pageSize = 10;
  editingTx: any = null;

  filters = {
    account_id: '',
    category: '',
    type: '',
    start: '',
    end: ''
  };

  form = {
    account_id: '',
    amount: 0,
    type: 'expense',
    category: '',
    merchant: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  };

  editForm = {
    account_id: '',
    amount: 0,
    type: 'expense',
    category: '',
    merchant: '',
    description: '',
    date: ''
  };

  categories = [
    'groceries', 'rent', 'transport', 'utilities', 'entertainment',
    'healthcare', 'education', 'shopping', 'dining', 'salary',
    'investment', 'savings', 'other'
  ];

  constructor(
    private transactionService: TransactionService,
    private accountService: AccountService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.loadAccounts();
    this.loadTransactions();
  }

  loadAccounts() {
    this.accountService.getAll().subscribe({
      next: (res: any) => this.accounts = res.items || res.data?.items || [],
      error: () => {}
    });
  }

  loadTransactions() {
    this.loading = true;
    const params = { ...this.filters, page: this.currentPage, size: this.pageSize };
    this.transactionService.getAll(params).subscribe({
      next: (res: any) => {
        this.transactions = res.items || res.data?.items || [];
        this.totalItems = res.total || res.data?.total || 0;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('transactions error:', err);
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadTransactions();
  }

  resetFilters() {
    this.filters = { account_id: '', category: '', type: '', start: '', end: '' };
    this.currentPage = 1;
    this.loadTransactions();
  }

  onSubmit() {
    this.submitting = true;
    this.error = '';
    const data = {
      ...this.form,
      amount: this.form.type === 'expense'
        ? -Math.abs(this.form.amount)
        : Math.abs(this.form.amount)
    };
    this.transactionService.create(data).subscribe({
      next: () => {
        this.success = 'Transaction added successfully!';
        this.showForm = false;
        this.resetForm();
        this.loadTransactions();
        this.submitting = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to add transaction';
        this.submitting = false;
      }
    });
  }

  startEdit(tx: any) {
    this.editingTx = tx;
    this.showForm = false;
    this.editForm = {
      account_id: tx.account_id,
      amount: Math.abs(tx.amount),
      type: tx.amount > 0 ? 'income' : 'expense',
      category: tx.category,
      merchant: tx.merchant || '',
      description: tx.description || '',
      date: tx.date?.split('T')[0] || ''
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onEdit() {
    if (!this.editingTx) return;
    this.submitting = true;
    this.error = '';
    const data = {
      ...this.editForm,
      amount: this.editForm.type === 'expense'
        ? -Math.abs(this.editForm.amount)
        : Math.abs(this.editForm.amount)
    };
    this.transactionService.update(this.editingTx.id, data).subscribe({
      next: () => {
        this.success = 'Transaction updated successfully!';
        this.editingTx = null;
        this.loadTransactions();
        this.submitting = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to update transaction';
        this.submitting = false;
      }
    });
  }

  deleteTransaction(id: string) {
    if (!confirm('Delete this transaction?')) return;
    this.transactionService.delete(id).subscribe({
      next: () => {
        this.success = 'Transaction deleted!';
        this.loadTransactions();
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete';
      }
    });
  }

  getAccountName(id: string) {
    return this.accounts.find((a: any) => a.id === id)?.name || 'Unknown';
  }

  get totalPages() {
    return Math.ceil(this.totalItems / this.pageSize) || 1;
  }

  prevPage() {
    if (this.currentPage > 1) { this.currentPage--; this.loadTransactions(); }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) { this.currentPage++; this.loadTransactions(); }
  }

  resetForm() {
    this.form = {
      account_id: '', amount: 0, type: 'expense',
      category: '', merchant: '', description: '',
      date: new Date().toISOString().split('T')[0]
    };
  }

  logout() { this.auth.logout(); }
}