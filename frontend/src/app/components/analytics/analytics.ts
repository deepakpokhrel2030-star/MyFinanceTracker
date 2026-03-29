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
  loading = false;
  selectedMonth = new Date().toISOString().slice(0, 7);
  budgetAnalysis: any = null;

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
        this.monthlySpending  = res.monthly?.data  || res.monthly  || [];
        this.topCategories    = res.categories      || [];
        this.incomeVsExpense  = res.income;
        this.portfolioValue   = res.portfolio;
        this.loading          = false;
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
    this.analytics.getBudgetAnalysis(this.selectedMonth).subscribe({
      next: (res: any) => {
        this.budgetAnalysis = res;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  onMonthChange() {
    this.loadBudgetAnalysis();
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