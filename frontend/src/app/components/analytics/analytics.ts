import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../services/analytics';
import { AuthService } from '../../services/auth';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics.html'
})
export class AnalyticsComponent implements OnInit {
  monthlySpending: any[] = [];
  topCategories: any[] = [];
  incomeVsExpense: any = null;
  portfolioValue: any = null;
  budgetAnalysis: any = null;
  loading = false;
  selectedMonth = new Date().toISOString().slice(0, 7);
  selectedYear = new Date().getFullYear().toString();
  selectedMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');

  constructor(
    private analytics: AnalyticsService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    setTimeout(() => this.loadAll(), 0);
  }

  loadAll() {
    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      monthly:    this.analytics.getMonthlySpending(),
      categories: this.analytics.getTopCategories(),
      income:     this.analytics.getIncomeVsExpense(),
      portfolio:  this.analytics.getPortfolioValue()
    }).subscribe({
      next: (res: any) => {
        this.monthlySpending = Array.isArray(res.monthly)    ? res.monthly    : [];
        this.topCategories   = Array.isArray(res.categories) ? res.categories : [];
        this.incomeVsExpense = res.income;
        this.portfolioValue  = res.portfolio;
        this.loading         = false;
        this.cdr.detectChanges();
        this.loadBudgetAnalysis();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadBudgetAnalysis() {
    if (!this.selectedMonth) return;
    this.analytics.getBudgetAnalysis(this.selectedMonth).subscribe({
      next: (res: any) => {
        this.budgetAnalysis = res;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  onYearMonthChange() {
    if (this.selectedYear && this.selectedMonthNum) {
      this.selectedMonth = `${this.selectedYear}-${this.selectedMonthNum}`;
    } else if (this.selectedYear) {
      this.selectedMonth = `${this.selectedYear}-01`;
    } else {
      this.selectedMonth = new Date().toISOString().slice(0, 7);
    }
    this.loadBudgetAnalysis();
  }

  get availableYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(y.toString());
    }
    return years;
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

  logout() { this.auth.logout(); }
}