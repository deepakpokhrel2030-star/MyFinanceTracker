import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../services/budget';
import { AnalyticsService } from '../../services/analytics';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budgets.html'
})
export class BudgetsComponent implements OnInit {
  budgets: any[] = [];
  filteredBudgets: any[] = [];
  analysis: any = null;
  loading = false;
  showForm = false;
  editingBudget: any = null;
  submitting = false;
  error = '';
  success = '';
  selectedMonth = '';
  selectedYear = '';
  selectedMonthNum = '';

  form = {
    category: '',
    limit: 0,
    month: new Date().toISOString().slice(0, 7)
  };

  editForm = {
    category: '',
    limit: 0,
    month: ''
  };

  categories = [
    'groceries', 'rent', 'transport', 'utilities', 'entertainment',
    'healthcare', 'education', 'shopping', 'dining', 'other'
  ];

  constructor(
    private budgetService: BudgetService,
    private analytics: AnalyticsService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    setTimeout(() => this.loadBudgets(), 0);
  }

  loadBudgets() {
    this.loading = true;
    this.cdr.detectChanges();
    this.budgetService.getAll().subscribe({
      next: (res: any) => {
        this.budgets         = res || [];
        this.filteredBudgets = res || [];
        this.loading         = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onMonthChange() {
    if (this.selectedMonth) {
      this.filteredBudgets = this.budgets.filter(b => b.month === this.selectedMonth);
      this.loadAnalysis();
    } else {
      this.filteredBudgets = this.budgets;
      this.analysis        = null;
    }
    this.cdr.detectChanges();
  }

  onYearMonthChange() {
    if (this.selectedYear && this.selectedMonthNum) {
      this.selectedMonth = `${this.selectedYear}-${this.selectedMonthNum}`;
      this.filteredBudgets = this.budgets.filter(b => b.month === this.selectedMonth);
      this.loadAnalysis();
    } else if (this.selectedYear) {
      this.selectedMonth   = '';
      this.filteredBudgets = this.budgets.filter(b =>
        b.month?.startsWith(this.selectedYear)
      );
      this.analysis = null;
    } else if (this.selectedMonthNum) {
      this.selectedMonth   = '';
      this.filteredBudgets = this.budgets.filter(b =>
        b.month?.endsWith(`-${this.selectedMonthNum}`)
      );
      this.analysis = null;
    } else {
      this.selectedMonth   = '';
      this.filteredBudgets = this.budgets;
      this.analysis        = null;
    }
    this.cdr.detectChanges();
  }

  loadAnalysis() {
    if (!this.selectedMonth) return;
    this.analytics.getBudgetAnalysis(this.selectedMonth).subscribe({
      next: (res: any) => {
        this.analysis = res;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  onSubmit() {
    this.submitting = true;
    this.error = '';
    this.budgetService.create(this.form).subscribe({
      next: () => {
        this.success  = 'Budget saved successfully!';
        this.showForm = false;
        this.resetForm();
        this.loadBudgets();
        this.submitting = false;
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error      = err.error?.error || 'Failed to save budget';
        this.submitting = false;
      }
    });
  }

  startEdit(b: any) {
  this.editingBudget = b;
  this.showForm      = false;
  this.editForm      = {
    category: b.category || '',
    limit:    b.limit    || 0,
    month:    b.month    || ''
  };
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

onEdit() {
  if (!this.editingBudget) return;
  this.submitting = true;
  this.error = '';
  this.budgetService.update(this.editingBudget.id, this.editForm).subscribe({
    next: () => {
      this.success       = 'Budget updated successfully!';
      this.editingBudget = null;
      this.loadBudgets();
      this.submitting = false;
      setTimeout(() => this.success = '', 3000);
    },
    error: (err: any) => {
      this.error      = err.error?.error || 'Failed to update budget';
      this.submitting = false;
    }
  });
}

  deleteBudget(id: string) {
    if (!confirm('Delete this budget?')) return;
    this.budgetService.delete(id).subscribe({
      next: () => {
        this.success = 'Budget deleted!';
        this.loadBudgets();
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete budget';
      }
    });
  }

  clearFilter() {
    this.selectedMonth    = '';
    this.selectedYear     = '';
    this.selectedMonthNum = '';
    this.filteredBudgets  = this.budgets;
    this.analysis         = null;
    this.cdr.detectChanges();
  }

  getProgressWidth(spent: number, limit: number) {
    if (!limit) return 0;
    return Math.min((spent / limit) * 100, 100);
  }

  getProgressColor(pct: number) {
    if (pct >= 100) return 'bg-danger';
    if (pct >= 75)  return 'bg-warning';
    return 'bg-success';
  }

  get uniqueMonths() {
    return [...new Set(this.budgets.map(b => b.month))].sort().reverse();
  }

  get availableYears() {
    const years = [...new Set(this.budgets.map((b: any) => b.month?.split('-')[0]))];
    return years.sort().reverse();
  }

  resetForm() {
    this.form = { category: '', limit: 0, month: new Date().toISOString().slice(0, 7) };
  }

  logout() { this.auth.logout(); }
}