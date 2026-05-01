import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../services/account';

type AccountMode = 'list' | 'add' | 'detail' | 'edit';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts.html',
  styleUrl: './accounts.css'
})
export class AccountsComponent implements OnInit {
  accounts: any[] = [];
  selectedAccount: any = null;

  mode: AccountMode = 'list';

  loading = true;
  submitting = false;
  error = '';
  success = '';

  form = this.getEmptyForm();
  editForm = this.getEmptyForm();

  constructor(
    private accountService: AccountService,
    private cdr: ChangeDetectorRef,
    private location: Location
  ) {}

  ngOnInit() {
    history.replaceState({ pageMode: 'list' }, '');
    // Defer one tick to let Angular complete initial change detection before firing HTTP calls
    setTimeout(() => this.loadAccounts(), 0);
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: any) {
    const state = event.state;

    if (!state || !state.pageMode || state.pageMode === 'list') {
      this.mode = 'list';
      this.selectedAccount = null;
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    this.mode = state.pageMode;

    if (state.selectedId) {
      this.selectedAccount = this.accounts.find((a: any) => a.id === state.selectedId) || null;

      if (this.selectedAccount && state.pageMode === 'edit') {
        this.editForm = {
          name: this.selectedAccount.name || '',
          account_type: this.selectedAccount.account_type || this.selectedAccount.type || 'checking',
          balance: Number(this.selectedAccount.balance) || 0,
          currency: this.selectedAccount.currency || 'GBP',
          bank_name: this.selectedAccount.bank_name || ''
        };
      }
    } else {
      this.selectedAccount = null;
    }

    this.resetMessages();
    this.cdr.detectChanges();
  }

  pushState(mode: AccountMode) {
    history.pushState(
      {
        pageMode: mode,
        selectedId: this.selectedAccount?.id || null
      },
      ''
    );
  }

  loadAccounts() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.accountService.getAll().subscribe({
      next: (res: any) => {
        this.accounts = Array.isArray(res) ? res : [];

        // Re-sync selectedAccount reference so the detail view reflects the latest data
        if (this.selectedAccount) {
          this.selectedAccount =
            this.accounts.find((a: any) => a.id === this.selectedAccount.id) || null;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load accounts';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  showList() {
    this.mode = 'list';
    this.selectedAccount = null;
    history.pushState({ pageMode: 'list' }, '');
    this.resetMessages();
  }

  showAdd() {
    this.mode = 'add';
    this.selectedAccount = null;
    this.resetForm();
    this.pushState('add');
    this.resetMessages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showDetail(account: any) {
    this.selectedAccount = account;
    this.mode = 'detail';
    this.pushState('detail');
    this.resetMessages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showEdit(account: any, event?: Event) {
    if (event) event.stopPropagation();

    this.selectedAccount = account;

    this.editForm = {
      name: account.name || '',
      account_type: account.account_type || account.type || 'checking',
      balance: Number(account.balance) || 0,
      currency: account.currency || 'GBP',
      bank_name: account.bank_name || ''
    };

    this.mode = 'edit';
    this.pushState('edit');
    this.resetMessages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  createAccount() {
    if (!this.form.name.trim()) {
      this.error = 'Account name is required';
      return;
    }

    this.submitting = true;
    this.resetMessages();

    this.accountService.create(this.buildPayload(this.form)).subscribe({
      next: () => {
        this.success = 'Account created successfully';
        this.submitting = false;
        this.mode = 'list';
        this.resetForm();
        history.pushState({ pageMode: 'list' }, '');
        this.loadAccounts();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to create account';
        this.submitting = false;
      }
    });
  }

  updateAccount() {
    if (!this.selectedAccount) return;

    if (!this.editForm.name.trim()) {
      this.error = 'Account name is required';
      return;
    }

    this.submitting = true;
    this.resetMessages();

    this.accountService.update(
      this.selectedAccount.id,
      this.buildPayload(this.editForm)
    ).subscribe({
      next: () => {
        this.success = 'Account updated successfully';
        this.submitting = false;

        this.selectedAccount = {
          ...this.selectedAccount,
          ...this.buildPayload(this.editForm)
        };

        this.mode = 'detail';
        history.pushState(
          {
            pageMode: 'detail',
            selectedId: this.selectedAccount.id
          },
          ''
        );

        this.loadAccounts();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to update account';
        this.submitting = false;
      }
    });
  }

  deleteAccount(account: any, event?: Event) {
    if (event) event.stopPropagation();

    if (!confirm(`Delete ${account.name}?`)) return;

    this.accountService.delete(account.id).subscribe({
      next: () => {
        this.success = 'Account deleted successfully';

        if (this.selectedAccount?.id === account.id) {
          this.selectedAccount = null;
          this.mode = 'list';
          history.pushState({ pageMode: 'list' }, '');
        }

        this.loadAccounts();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete account';
      }
    });
  }

  buildPayload(data: any) {
    return {
      name: data.name,
      account_type: data.account_type,
      balance: Number(data.balance) || 0,
      currency: data.currency,
      bank_name: data.bank_name
    };
  }

  getEmptyForm() {
    return {
      name: '',
      account_type: 'checking',
      balance: 0,
      currency: 'GBP',
      bank_name: ''
    };
  }

  resetForm() {
    this.form = this.getEmptyForm();
  }

  resetMessages() {
    this.error = '';
    this.success = '';
  }

  get totalBalance() {
    return this.accounts.reduce((sum: number, a: any) => sum + (Number(a.balance) || 0), 0);
  }

  get positiveAccounts() {
    return this.accounts.filter((a: any) => (Number(a.balance) || 0) >= 0).length;
  }

  get negativeAccounts() {
    return this.accounts.filter((a: any) => (Number(a.balance) || 0) < 0).length;
  }

  get accountMaxBalance() {
    return Math.max(...this.accounts.map((a: any) => Math.abs(Number(a.balance) || 0)), 1);
  }

  accountWidth(balance: number) {
    return Math.max(6, (Math.abs(Number(balance) || 0) / this.accountMaxBalance) * 100);
  }

  selectedAccountPercent() {
    if (!this.selectedAccount) return 0;
    return this.accountWidth(this.selectedAccount.balance);
  }

  getAccountIcon(type: string) {
    const value = String(type || '').toLowerCase();

    if (value === 'savings') return 'bi-piggy-bank';
    if (value === 'credit') return 'bi-credit-card-2-front';
    if (value === 'cash') return 'bi-cash-stack';
    return 'bi-bank';
  }

  trackById(_index: number, item: any): string { return item.id; }
}