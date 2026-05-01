import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AnalyticsService } from '../../services/analytics';
import { AccountService } from '../../services/account';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  user: any = null;
  accounts: any[] = [];
  incomeVsExpense: any = null;
  topCategories: any[] = [];
  portfolioValue: any = null;
  loading = true;

  constructor(
    private auth: AuthService,
    private analytics: AnalyticsService,
    private accountService: AccountService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.user = this.auth.currentUser$.value;
    // Defer one tick to let Angular complete initial change detection before firing HTTP calls
    setTimeout(() => this.loadData(), 0);
  }

  loadData() {
    this.loading = true;
    this.cdr.detectChanges();

    // forkJoin fires all 5 requests in parallel so the dashboard loads in a single round trip
    forkJoin({
      accounts: this.accountService.getAll(),
      income: this.analytics.getIncomeVsExpense(),
      monthly: this.analytics.getMonthlySpending(),
      categories: this.analytics.getTopCategories(),
      portfolio: this.analytics.getPortfolioValue()
    }).subscribe({
      next: (res: any) => {
        this.accounts = Array.isArray(res.accounts) ? res.accounts : [];

        const incomeRaw = res.income?.data || res.income || {};
        const monthlyRaw = res.monthly?.data || res.monthly || [];

        const monthlyArray =
          incomeRaw?.monthly ||
          incomeRaw?.data ||
          monthlyRaw?.monthly ||
          monthlyRaw?.data ||
          monthlyRaw ||
          [];

        this.incomeVsExpense = {
          ...incomeRaw,
          monthly: Array.isArray(monthlyArray) ? monthlyArray : [],
          total_income:
            Number(incomeRaw?.total_income) ||
            this.sumMonthlyIncome(monthlyArray),
          total_expense:
            Number(incomeRaw?.total_expense) ||
            Number(incomeRaw?.total_expenses) ||
            this.sumMonthlyExpenses(monthlyArray),
          net:
            Number(incomeRaw?.net) ||
            this.sumMonthlyIncome(monthlyArray) - this.sumMonthlyExpenses(monthlyArray)
        };

        this.topCategories =
          res.categories?.data ||
          res.categories?.items ||
          res.categories ||
          [];

        this.portfolioValue =
          res.portfolio?.data ||
          res.portfolio ||
          {};

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  sumMonthlyIncome(data: any[]) {
    if (!Array.isArray(data)) return 0;

    return data.reduce(
      (sum: number, m: any) => sum + (Number(m.income) || 0),
      0
    );
  }

  sumMonthlyExpenses(data: any[]) {
    if (!Array.isArray(data)) return 0;

    return data.reduce(
      (sum: number, m: any) =>
        sum + (Number(m.expense) || Number(m.expenses) || 0),
      0
    );
  }

  get totalBalance() {
    return this.accounts.reduce(
      (sum: number, a: any) => sum + (Number(a.balance) || 0),
      0
    );
  }

  get totalIncome() {
    return Number(this.incomeVsExpense?.total_income) || 0;
  }

  get totalExpense() {
    return (
      Number(this.incomeVsExpense?.total_expense) ||
      Number(this.incomeVsExpense?.total_expenses) ||
      0
    );
  }

  get netCashflow() {
    return (
      Number(this.incomeVsExpense?.net) ||
      this.totalIncome - this.totalExpense
    );
  }

  get monthlyData() {
    const data =
      this.incomeVsExpense?.monthly ||
      this.incomeVsExpense?.data ||
      this.incomeVsExpense?.items ||
      [];

    return Array.isArray(data) ? data : [];
  }

  get monthlyMax() {
    const values = this.monthlyData.flatMap((m: any) => [
      Number(m.income) || 0,
      Number(m.expense) || Number(m.expenses) || 0,
      Math.abs(Number(m.net) || 0)
    ]);

    return Math.max(...values, 1);
  }

  get categoryMax() {
    return Math.max(
      ...this.topCategories.map((c: any) => Number(c.total) || 0),
      1
    );
  }

  get savingsRate() {
    if (!this.totalIncome) return 0;

    return Math.max(
      0,
      Math.min(100, (this.netCashflow / this.totalIncome) * 100)
    );
  }

  get accountMaxBalance() {
    return Math.max(
      ...this.accounts.map((a: any) => Math.abs(Number(a.balance) || 0)),
      1
    );
  }

  get portfolioProfitLoss() {
    return Number(this.portfolioValue?.total_pl) || 0;
  }

  get portfolioValueTotal() {
    return Number(this.portfolioValue?.total_value) || 0;
  }

  barHeight(value: number) {
    return Math.max(8, ((Number(value) || 0) / this.monthlyMax) * 100);
  }

  expenseValue(month: any) {
    return Number(month.expense) || Number(month.expenses) || 0;
  }

  monthLabel(month: any) {
    const m = String(month.month).padStart(2, '0');
    const y = String(month.year).slice(-2);
    return `${m}/${y}`;
  }

  categoryWidth(value: number) {
    return Math.max(6, ((Number(value) || 0) / this.categoryMax) * 100);
  }

  accountWidth(value: number) {
    return Math.max(
      6,
      (Math.abs(Number(value) || 0) / this.accountMaxBalance) * 100
    );
  }

  logout() {
    this.auth.logout();
  }

  trackById(_index: number, item: any): string { return item.id; }
  trackByCategory(_index: number, item: any): string { return item.category; }
  trackByMonth(_index: number, item: any): string { return `${item.year}-${item.month}`; }
}