import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvestmentService } from '../../services/investment';

type InvestmentMode = 'list' | 'add' | 'detail' | 'edit';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investments.html',
  styleUrl: './investments.css'
})
export class InvestmentsComponent implements OnInit {
  investments: any[] = [];
  allInvestments: any[] = [];
  selectedInvestment: any = null;

  mode: InvestmentMode = 'list';

  loading = true;
  submitting = false;
  error = '';
  success = '';

  selectedType = '';
  selectedSector = '';

  currentPage = 1;
  pageSize = 6;

  types = ['stock', 'crypto', 'fund', 'etf', 'bond', 'other'];

  form = this.getEmptyForm();
  editForm = this.getEmptyForm();

  constructor(
    private investmentService: InvestmentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    history.replaceState({ investmentMode: 'list' }, '', window.location.href);
    setTimeout(() => this.loadInvestments(), 0);
  }

  @HostListener('window:popstate', ['$event'])
  onBrowserBack(event: PopStateEvent) {
    const state = event.state;

    if (!state || state.investmentMode === 'list') {
      this.mode = 'list';
      this.selectedInvestment = null;
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.investmentMode === 'detail') {
      this.mode = 'detail';
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.investmentMode === 'edit') {
      this.mode = 'edit';
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.investmentMode === 'add') {
      this.mode = 'add';
      this.resetMessages();
      this.cdr.detectChanges();
    }
  }

  loadInvestments() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.investmentService.getAll().subscribe({
      next: (res: any) => {
        this.allInvestments = Array.isArray(res) ? res : [];
        this.applyLocalFilters(false);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load investments';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Filtering is done client-side — the API doesn't support reliable filter params for investments
  applyLocalFilters(resetPage = true) {
    let filtered = [...this.allInvestments];

    if (this.selectedType) {
      filtered = filtered.filter(
        (i: any) => String(i.type || '').toLowerCase() === this.selectedType.toLowerCase()
      );
    }

    if (this.selectedSector) {
      filtered = filtered.filter(
        (i: any) => String(i.sector || '').toLowerCase() === this.selectedSector.toLowerCase()
      );
    }

    this.investments = filtered;

    if (resetPage) {
      this.currentPage = 1;
    }
  }

  get availableSectors() {
    return Array.from(
      new Set(
        this.allInvestments
          .map((i: any) => i.sector)
          .filter((sector: any) => sector && String(sector).trim() !== '')
      )
    );
  }

  get pagedInvestments() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.investments.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.investments.length / this.pageSize));
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  applyFilters() {
    this.applyLocalFilters(true);
  }

  resetFilters() {
    this.selectedType = '';
    this.selectedSector = '';
    this.applyLocalFilters(true);
  }

  showList() {
    this.mode = 'list';
    this.selectedInvestment = null;
    this.resetMessages();
    history.pushState({ investmentMode: 'list' }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showAdd() {
    this.mode = 'add';
    this.selectedInvestment = null;
    this.resetForm();
    this.resetMessages();
    history.pushState({ investmentMode: 'add' }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showDetail(investment: any) {
    this.selectedInvestment = investment;
    this.mode = 'detail';
    this.resetMessages();
    history.pushState({ investmentMode: 'detail', id: investment.id }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showEdit(investment: any, event?: Event) {
    if (event) event.stopPropagation();

    this.selectedInvestment = investment;

    this.editForm = {
      type: investment.type || 'stock',
      symbol: investment.symbol || '',
      name: investment.name || '',
      quantity: Number(investment.quantity) || 0,
      purchase_price: Number(investment.purchase_price) || 0,
      current_price: Number(investment.current_price) || 0,
      currency: investment.currency || 'GBP',
      broker: investment.broker || '',
      sector: investment.sector || ''
    };

    this.mode = 'edit';
    this.resetMessages();
    history.pushState({ investmentMode: 'edit', id: investment.id }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  createInvestment() {
    if (!this.form.symbol.trim()) {
      this.error = 'Symbol is required';
      return;
    }

    if (!this.form.name.trim()) {
      this.error = 'Investment name is required';
      return;
    }

    if (!this.form.quantity || Number(this.form.quantity) <= 0) {
      this.error = 'Quantity must be greater than 0';
      return;
    }

    this.submitting = true;
    this.resetMessages();

    this.investmentService.create(this.form).subscribe({
      next: () => {
        this.success = 'Investment created successfully';
        this.submitting = false;
        this.mode = 'list';
        this.selectedInvestment = null;
        this.resetForm();
        history.replaceState({ investmentMode: 'list' }, '', window.location.href);
        this.loadInvestments();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to create investment';
        this.submitting = false;
      }
    });
  }

  updateInvestment() {
    if (!this.selectedInvestment) return;

    if (!this.editForm.symbol.trim()) {
      this.error = 'Symbol is required';
      return;
    }

    if (!this.editForm.name.trim()) {
      this.error = 'Investment name is required';
      return;
    }

    if (!this.editForm.quantity || Number(this.editForm.quantity) <= 0) {
      this.error = 'Quantity must be greater than 0';
      return;
    }

    this.submitting = true;
    this.resetMessages();

    const payload = { ...this.editForm };

    this.investmentService.update(this.selectedInvestment.id, payload).subscribe({
      next: (res: any) => {
        this.success = 'Investment updated successfully';
        this.submitting = false;

        const updatedInvestment =
          res?.investment ||
          res?.data?.investment ||
          res?.data ||
          payload;

        this.selectedInvestment = {
          ...this.selectedInvestment,
          ...updatedInvestment,
          id: this.selectedInvestment.id
        };

        this.mode = 'detail';

        history.replaceState(
          { investmentMode: 'detail', id: this.selectedInvestment.id },
          '',
          window.location.href
        );

        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to update investment';
        this.submitting = false;
      }
    });
  }

  deleteInvestment(investment: any, event?: Event) {
    if (event) event.stopPropagation();

    if (!confirm(`Delete ${investment.symbol}?`)) return;

    this.investmentService.delete(investment.id).subscribe({
      next: () => {
        this.success = 'Investment deleted successfully';

        if (this.selectedInvestment?.id === investment.id) {
          this.selectedInvestment = null;
          this.mode = 'list';
          history.replaceState({ investmentMode: 'list' }, '', window.location.href);
        }

        this.loadInvestments();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete investment';
      }
    });
  }

  getEmptyForm() {
    return {
      type: 'stock',
      symbol: '',
      name: '',
      quantity: 0,
      purchase_price: 0,
      current_price: 0,
      currency: 'GBP',
      broker: '',
      sector: ''
    };
  }

  resetForm() {
    this.form = this.getEmptyForm();
  }

  resetMessages() {
    this.error = '';
    this.success = '';
  }

  get totalInvested() {
    return this.investments.reduce((sum: number, i: any) => sum + this.investedValue(i), 0);
  }

  get totalCurrentValue() {
    return this.investments.reduce((sum: number, i: any) => sum + this.currentValue(i), 0);
  }

  get totalProfitLoss() {
    return this.totalCurrentValue - this.totalInvested;
  }

  get totalReturnPct() {
    if (!this.totalInvested) return 0;
    return (this.totalProfitLoss / this.totalInvested) * 100;
  }

  get winnersCount() {
    return this.investments.filter((i: any) => this.profitLoss(i) >= 0).length;
  }

  get losersCount() {
    return this.investments.filter((i: any) => this.profitLoss(i) < 0).length;
  }

  get maxCurrentValue() {
    return Math.max(...this.investments.map((i: any) => this.currentValue(i)), 1);
  }

  investedValue(i: any) {
    return Number(i.invested_value) || ((Number(i.quantity) || 0) * (Number(i.purchase_price) || 0));
  }

  currentValue(i: any) {
    return Number(i.current_value) || ((Number(i.quantity) || 0) * (Number(i.current_price) || 0));
  }

  profitLoss(i: any) {
    if (i.profit_loss !== undefined && i.profit_loss !== null) {
      return Number(i.profit_loss) || 0;
    }

    return this.currentValue(i) - this.investedValue(i);
  }

  returnPct(i: any) {
    if (i.return_pct !== undefined && i.return_pct !== null) {
      return Number(i.return_pct) || 0;
    }

    const invested = this.investedValue(i);
    if (!invested) return 0;

    return (this.profitLoss(i) / invested) * 100;
  }

  investmentWidth(i: any) {
    return Math.max(8, (this.currentValue(i) / this.maxCurrentValue) * 100);
  }

  getInvestmentIcon(type: string) {
    if (type === 'crypto') return 'bi-currency-bitcoin';
    if (type === 'fund') return 'bi-pie-chart';
    if (type === 'etf') return 'bi-bar-chart';
    if (type === 'bond') return 'bi-file-earmark-text';

    return 'bi-graph-up-arrow';
  }
}