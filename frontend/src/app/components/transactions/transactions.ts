import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction';
import { AccountService } from '../../services/account';

type TransactionMode = 'list' | 'add' | 'detail' | 'edit';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css'
})
export class TransactionsComponent implements OnInit {
  transactions: any[] = [];
  accounts: any[] = [];
  selectedTransaction: any = null;

  mode: TransactionMode = 'list';

  loading = true;
  submitting = false;
  error = '';
  success = '';

  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  pageSize = 6;

  categories = [
    'salary',
    'freelance',
    'food',
    'transport',
    'shopping',
    'bills',
    'rent',
    'entertainment',
    'health',
    'education',
    'travel',
    'investment',
    'savings',
    'other'
  ];

  filters = {
    search: '',
    account_id: '',
    type: '',
    category: '',
    start: '',
    end: ''
  };

  form = this.getEmptyForm();
  editForm = this.getEmptyForm();

  constructor(
    private transactionService: TransactionService,
    private accountService: AccountService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Push history state so the browser back button can navigate between add/detail/edit views
    history.replaceState({ transactionMode: 'list' }, '', window.location.href);

    setTimeout(() => {
      this.loadAccounts();
      this.loadTransactions();
    }, 0);
  }

  @HostListener('window:popstate', ['$event'])
  onBrowserBack(event: PopStateEvent) {
    const state = event.state;

    if (!state || state.transactionMode === 'list') {
      this.mode = 'list';
      this.selectedTransaction = null;
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.transactionMode === 'detail') {
      this.mode = 'detail';
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.transactionMode === 'edit') {
      this.mode = 'edit';
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.transactionMode === 'add') {
      this.mode = 'add';
      this.resetMessages();
      this.cdr.detectChanges();
    }
  }

  loadAccounts() {
    this.accountService.getAll().subscribe({
      next: (res: any) => {
        this.accounts = Array.isArray(res) ? res : [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  loadTransactions() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    const query = {
      ...this.filters,
      page: this.currentPage,
      limit: this.pageSize
    };

    this.transactionService.getAll(query).subscribe({
      next: (res: any) => {
        this.transactions = res.items || [];
        this.totalItems = res.total || this.transactions.length;
        this.currentPage = res.page || this.currentPage;
        this.totalPages = res.pages || Math.max(1, Math.ceil(this.totalItems / this.pageSize));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load transactions';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get pagedTransactions() {
    return this.transactions.slice(0, this.pageSize);
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadTransactions();
  }

  resetFilters() {
    this.filters = {
      search: '',
      account_id: '',
      type: '',
      category: '',
      start: '',
      end: ''
    };

    this.currentPage = 1;
    this.loadTransactions();
  }

  nextPage() {
    if (this.currentPage >= this.totalPages) return;

    this.currentPage++;
    this.loadTransactions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevPage() {
    if (this.currentPage <= 1) return;

    this.currentPage--;
    this.loadTransactions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showList() {
    this.mode = 'list';
    this.selectedTransaction = null;
    this.resetMessages();
    history.pushState({ transactionMode: 'list' }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showAdd() {
    this.mode = 'add';
    this.selectedTransaction = null;
    this.resetForm();
    this.resetMessages();
    history.pushState({ transactionMode: 'add' }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showDetail(tx: any) {
    this.selectedTransaction = tx;
    this.mode = 'detail';
    this.resetMessages();
    history.pushState({ transactionMode: 'detail', id: tx.id }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showEdit(tx: any, event?: Event) {
    if (event) event.stopPropagation();

    this.selectedTransaction = tx;

    this.editForm = {
      account_id: tx.account_id || '',
      type: tx.type || (Number(tx.amount) >= 0 ? 'income' : 'expense'),
      amount: Math.abs(Number(tx.amount) || 0),
      category: tx.category || '',
      merchant: tx.merchant || '',
      description: tx.description || '',
      date: tx.date ? String(tx.date).slice(0, 10) : new Date().toISOString().slice(0, 10)
    };

    this.mode = 'edit';
    this.resetMessages();
    history.pushState({ transactionMode: 'edit', id: tx.id }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  createTransaction() {
    if (!this.form.account_id) {
      this.error = 'Please select an account';
      return;
    }

    if (!this.form.amount || Number(this.form.amount) <= 0) {
      this.error = 'Amount must be greater than 0';
      return;
    }

    this.submitting = true;
    this.resetMessages();

    this.transactionService.create(this.buildPayload(this.form)).subscribe({
      next: () => {
        this.success = 'Transaction created successfully';
        this.submitting = false;
        this.mode = 'list';
        this.selectedTransaction = null;
        this.resetForm();
        this.currentPage = 1;
        history.replaceState({ transactionMode: 'list' }, '', window.location.href);
        this.loadTransactions();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to create transaction';
        this.submitting = false;
      }
    });
  }

  updateTransaction() {
    if (!this.selectedTransaction) return;

    if (!this.editForm.account_id) {
      this.error = 'Please select an account';
      return;
    }

    if (!this.editForm.amount || Number(this.editForm.amount) <= 0) {
      this.error = 'Amount must be greater than 0';
      return;
    }

    this.submitting = true;
    this.resetMessages();

    const payload = this.buildPayload(this.editForm);

    this.transactionService.update(this.selectedTransaction.id, payload).subscribe({
      next: (res: any) => {
        this.success = 'Transaction updated successfully';
        this.submitting = false;

        const updatedTx =
          res?.transaction ||
          res?.data?.transaction ||
          res?.data ||
          payload;

        this.selectedTransaction = {
          ...this.selectedTransaction,
          ...updatedTx,
          id: this.selectedTransaction.id
        };

        this.mode = 'detail';

        history.replaceState(
          { transactionMode: 'detail', id: this.selectedTransaction.id },
          '',
          window.location.href
        );

        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to update transaction';
        this.submitting = false;
      }
    });
  }

  deleteTransaction(tx: any, event?: Event) {
    if (event) event.stopPropagation();

    if (!confirm('Delete this transaction?')) return;

    this.transactionService.delete(tx.id).subscribe({
      next: () => {
        this.success = 'Transaction deleted successfully';

        if (this.selectedTransaction?.id === tx.id) {
          this.selectedTransaction = null;
          this.mode = 'list';
          history.replaceState({ transactionMode: 'list' }, '', window.location.href);
        }

        this.loadTransactions();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete transaction';
      }
    });
  }

  buildPayload(data: any) {
    const amount = Number(data.amount) || 0;

    // Expenses are stored as negative values; income as positive
    return {
      ...data,
      amount: data.type === 'expense' ? -Math.abs(amount) : Math.abs(amount)
    };
  }

  getEmptyForm() {
    return {
      account_id: '',
      type: 'expense',
      amount: 0,
      category: '',
      merchant: '',
      description: '',
      date: new Date().toISOString().slice(0, 10)
    };
  }

  resetForm() {
    this.form = this.getEmptyForm();
  }

  resetMessages() {
    this.error = '';
    this.success = '';
  }

  getAccountName(accountId: string) {
    return this.accounts.find((a: any) => a.id === accountId)?.name || 'Unknown account';
  }

  get incomeTotal() {
    return this.transactions
      .filter((t: any) => Number(t.amount) > 0)
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  }

  get expenseTotal() {
    return Math.abs(
      this.transactions
        .filter((t: any) => Number(t.amount) < 0)
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    );
  }

  get netTotal() {
    return this.incomeTotal - this.expenseTotal;
  }

  getTransactionType(tx: any) {
    return Number(tx.amount) >= 0 ? 'income' : 'expense';
  }

  getTransactionIcon(tx: any) {
    return Number(tx.amount) >= 0 ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle';
  }

  abs(value: number) {
    return Math.abs(Number(value) || 0);
  }

  trackById(_index: number, item: any): string { return item.id; }
  trackByValue(_index: number, item: string): string { return item; }
}