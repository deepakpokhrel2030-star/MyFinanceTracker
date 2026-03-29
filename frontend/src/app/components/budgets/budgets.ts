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
  analysis: any = null;
  loading = false;
  showForm = false;
  editingBudget: any = null;
  submitting = false;
  error = '';
  success = '';
  selectedMonth = new Date().toISOString().slice(0, 7);

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
    setTimeout(() => {
      this.loadBudgets();
      this.loadAnalysis();
    }, 0);
  }

  loadBudgets() {
    this.loading = true;
    this.cdr.detectChanges();
    this.budgetService.getAll(this.selectedMonth).subscribe({
      next: (res: any) => {
        this.budgets = res || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadAnalysis() {
    this.analytics.getBudgetAnalysis(this.selectedMonth).subscribe({
      next: (res: any) => {
        this.analysis = res;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  onMonthChange() {
    this.loadBudgets();
    this.loadAnalysis();
  }

  onSubmit() {
    this.submitting = true;
    this.error = '';
    const data = { ...this.form, month: this.selectedMonth };
    this.budgetService.create(data).subscribe({
      next: () => {
        this.success  = 'Budget saved successfully!';
        this.showForm = false;
        this.resetForm();
        this.loadBudgets();
        this.loadAnalysis();
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
      category: b.category,
      limit:    b.limit,
      month:    b.month
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
        this.loadAnalysis();
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
        this.loadAnalysis();
        setTimeout(() => this.success = '', 3000);
      },
      error: (err: any) => {
        this.error = err.error?.error || 'Failed to delete budget';
      }
    });
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

  resetForm() {
    this.form = { category: '', limit: 0, month: this.selectedMonth };
  }

  logout() { this.auth.logout(); }
}