import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../services/budget';

type BudgetMode = 'list' | 'add' | 'detail' | 'edit';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budgets.html',
  styleUrl: './budgets.css'
})
export class BudgetsComponent implements OnInit {
  budgets: any[] = [];
  selectedBudget: any = null;

  mode: BudgetMode = 'list';

  loading = true;
  submitting = false;
  error = '';
  success = '';

  selectedMonth = '';
  selectedCategory = '';

  currentPage = 1;
  pageSize = 6;

  categories = [
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

  form = this.getEmptyForm();
  editForm = this.getEmptyForm();

  constructor(
    private budgetService: BudgetService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    history.replaceState({ budgetMode: 'list' }, '', window.location.href);
    // Defer one tick to let Angular complete initial change detection before firing HTTP calls
    setTimeout(() => this.loadBudgets(), 0);
  }

  @HostListener('window:popstate', ['$event'])
  onBrowserBack(event: PopStateEvent) {
    const state = event.state;

    if (!state || state.budgetMode === 'list') {
      this.mode = 'list';
      this.selectedBudget = null;
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.budgetMode === 'detail') {
      this.mode = 'detail';
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.budgetMode === 'edit') {
      this.mode = 'edit';
      this.resetMessages();
      this.cdr.detectChanges();
      return;
    }

    if (state.budgetMode === 'add') {
      this.mode = 'add';
      this.resetMessages();
      this.cdr.detectChanges();
    }
  }

  loadBudgets() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.budgetService.getAll({
      month: this.selectedMonth,
      category: this.selectedCategory
    }).subscribe({
      next: (res: any) => {
        this.budgets = Array.isArray(res) ? res : [];
        this.currentPage = 1;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load budgets';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Pagination is done client-side since all budgets for the filter are loaded at once
  get pagedBudgets() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.budgets.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.budgets.length / this.pageSize));
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
    this.currentPage = 1;
    this.loadBudgets();
  }

  resetFilters() {
    this.selectedMonth = '';
    this.selectedCategory = '';
    this.currentPage = 1;
    this.loadBudgets();
  }

  showList() {
    this.mode = 'list';
    this.selectedBudget = null;
    this.resetMessages();
    history.pushState({ budgetMode: 'list' }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showAdd() {
    this.mode = 'add';
    this.selectedBudget = null;
    this.resetForm();
    this.resetMessages();
    history.pushState({ budgetMode: 'add' }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showDetail(budget: any) {
    this.selectedBudget = budget;
    this.mode = 'detail';
    this.resetMessages();
    history.pushState({ budgetMode: 'detail', id: budget.id }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showEdit(budget: any, event?: Event) {
    if (event) event.stopPropagation();

    this.selectedBudget = budget;

    this.editForm = {
      category: budget.category || '',
      limit: Number(budget.limit) || 0,
      month: budget.month || new Date().toISOString().slice(0, 7)
    };

    this.mode = 'edit';
    this.resetMessages();
    history.pushState({ budgetMode: 'edit', id: budget.id }, '', window.location.href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  createBudget() {
    if (!this.form.category) {
      this.error = 'Please select a category';
      return;
    }

    if (!this.form.limit || Number(this.form.limit) <= 0) {
      this.error = 'Budget limit must be greater than 0';
      return;
    }

    this.submitting = true;
    this.resetMessages();

    this.budgetService.create(this.form).subscribe({
      next: () => {
        this.success = 'Budget created successfully';
        this.submitting = false;
        this.mode = 'list';
        this.selectedBudget = null;
        this.resetForm();
        history.replaceState({ budgetMode: 'list' }, '', window.location.href);
        this.loadBudgets();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to create budget';
        this.submitting = false;
      }
    });
  }

  updateBudget() {
    if (!this.selectedBudget) return;

    if (!this.editForm.category) {
      this.error = 'Please select a category';
      return;
    }

    if (!this.editForm.limit || Number(this.editForm.limit) <= 0) {
      this.error = 'Budget limit must be greater than 0';
      return;
    }

    this.submitting = true;
    this.resetMessages();

    const payload = { ...this.editForm };

    this.budgetService.update(this.selectedBudget.id, payload).subscribe({
      next: (res: any) => {
        this.success = 'Budget updated successfully';
        this.submitting = false;

        const updatedBudget =
          res?.budget ||
          res?.data?.budget ||
          res?.data ||
          payload;

        this.selectedBudget = {
          ...this.selectedBudget,
          ...updatedBudget,
          id: this.selectedBudget.id
        };

        this.mode = 'detail';

        history.replaceState(
          { budgetMode: 'detail', id: this.selectedBudget.id },
          '',
          window.location.href
        );

        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to update budget';
        this.submitting = false;
      }
    });
  }

  deleteBudget(budget: any, event?: Event) {
    if (event) event.stopPropagation();

    if (!confirm(`Delete ${budget.category} budget?`)) return;

    this.budgetService.delete(budget.id).subscribe({
      next: () => {
        this.success = 'Budget deleted successfully';

        if (this.selectedBudget?.id === budget.id) {
          this.selectedBudget = null;
          this.mode = 'list';
          history.replaceState({ budgetMode: 'list' }, '', window.location.href);
        }

        this.loadBudgets();
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete budget';
      }
    });
  }

  getEmptyForm() {
    return {
      category: '',
      limit: 0,
      month: new Date().toISOString().slice(0, 7)
    };
  }

  resetForm() {
    this.form = this.getEmptyForm();
  }

  resetMessages() {
    this.error = '';
    this.success = '';
  }

  get totalBudget() {
    return this.budgets.reduce((sum: number, b: any) => sum + (Number(b.limit) || 0), 0);
  }

  get averageBudget() {
    return this.budgets.length ? this.totalBudget / this.budgets.length : 0;
  }

  get highestBudget() {
    return this.budgets.reduce((max: any, b: any) => {
      if (!max) return b;
      return Number(b.limit) > Number(max.limit) ? b : max;
    }, null);
  }

  get maxBudgetLimit() {
    return Math.max(...this.budgets.map((b: any) => Number(b.limit) || 0), 1);
  }

  budgetWidth(limit: number) {
    return Math.max(8, ((Number(limit) || 0) / this.maxBudgetLimit) * 100);
  }

  getBudgetIcon(category: string) {
    if (category === 'food') return 'bi-basket';
    if (category === 'transport') return 'bi-car-front';
    if (category === 'shopping') return 'bi-bag';
    if (category === 'bills') return 'bi-receipt';
    if (category === 'rent') return 'bi-house';
    if (category === 'entertainment') return 'bi-controller';
    if (category === 'health') return 'bi-heart-pulse';
    if (category === 'travel') return 'bi-airplane';
    if (category === 'education') return 'bi-mortarboard';
    if (category === 'savings') return 'bi-piggy-bank';
    if (category === 'investment') return 'bi-graph-up-arrow';

    return 'bi-wallet2';
  }
}