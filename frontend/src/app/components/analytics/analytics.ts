import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AnalyticsService } from '../../services/analytics';
import { AuthService } from '../../services/auth';
import { SavingsService } from '../../services/savings';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css'
})
export class AnalyticsComponent implements OnInit {
  monthlySpending: any[] = [];
  topCategories: any[] = [];
  incomeVsExpense: any = null;
  portfolioValue: any = null;
  budgetAnalysis: any = null;
  savingsGoals: any[] = [];

  loading = true;
  activeSection = 'overview';

  selectedMonth = new Date().toISOString().slice(0, 7);
  selectedYear = new Date().getFullYear().toString();
  selectedMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');

  constructor(
    private analytics: AnalyticsService,
    private auth: AuthService,
    private savings: SavingsService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.activeSection = params.get('section') || 'overview';
      this.cdr.detectChanges();
    });

    // Defer one tick to let Angular complete initial change detection before firing HTTP calls
    setTimeout(() => this.loadAll(), 0);
  }

  loadAll() {
    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      monthly: this.analytics.getMonthlySpending(),
      categories: this.analytics.getTopCategories(),
      income: this.analytics.getIncomeVsExpense(),
      portfolio: this.analytics.getPortfolioValue(),
      goals: this.savings.getAll()
    }).subscribe({
      next: (res: any) => {
        this.monthlySpending = Array.isArray(res.monthly) ? res.monthly : [];

        this.topCategories = Array.isArray(res.categories)
          ? res.categories
          : res.categories?.data || [];

        this.incomeVsExpense = res.income;
        this.portfolioValue = res.portfolio;
        this.savingsGoals = Array.isArray(res.goals) ? res.goals : [];

        this.loading = false;
        this.cdr.detectChanges();

        this.loadBudgetAnalysis();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Called separately from loadAll so it can re-fire whenever the user changes the month filter
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
    }

    this.loadBudgetAnalysis();
  }

  get availableYears() {
    const currentYear = new Date().getFullYear();
    const years: string[] = [];

    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(y.toString());
    }

    return years;
  }

  get totalIncome() {
    return Number(this.incomeVsExpense?.total_income) || 0;
  }

  get totalExpense() {
    return Number(this.incomeVsExpense?.total_expense) || 0;
  }

  get netSavings() {
    return Number(this.incomeVsExpense?.net) || this.totalIncome - this.totalExpense;
  }

  get monthlyChartData() {
    return this.incomeVsExpense?.monthly || this.monthlySpending || [];
  }

  get monthlyMax() {
    const values = this.monthlyChartData.flatMap((m: any) => [
      Number(m.income) || 0,
      Number(m.expense || m.expenses) || 0,
      Math.abs(this.netForMonth(m))
    ]);

    return Math.max(...values, 1);
  }

  get averageIncome() {
    if (!this.monthlyChartData.length) return 0;

    return this.monthlyChartData.reduce((sum: number, m: any) => {
      return sum + (Number(m.income) || 0);
    }, 0) / this.monthlyChartData.length;
  }

  get averageExpense() {
    if (!this.monthlyChartData.length) return 0;

    return this.monthlyChartData.reduce((sum: number, m: any) => {
      return sum + (Number(m.expense || m.expenses) || 0);
    }, 0) / this.monthlyChartData.length;
  }

  get averageNet() {
    if (!this.monthlyChartData.length) return 0;

    return this.monthlyChartData.reduce((sum: number, m: any) => {
      return sum + this.netForMonth(m);
    }, 0) / this.monthlyChartData.length;
  }

  get bestMonth() {
    if (!this.monthlyChartData.length) return null;

    return [...this.monthlyChartData].sort((a: any, b: any) => {
      return this.netForMonth(b) - this.netForMonth(a);
    })[0];
  }

  get weakestMonth() {
    if (!this.monthlyChartData.length) return null;

    return [...this.monthlyChartData].sort((a: any, b: any) => {
      return this.netForMonth(a) - this.netForMonth(b);
    })[0];
  }

  get savingsRate() {
    if (!this.totalIncome) return 0;
    return Math.max(0, Math.min(100, (this.netSavings / this.totalIncome) * 100));
  }

  get spendingRate() {
    if (!this.totalIncome) return 0;
    return Math.max(0, Math.min(100, (this.totalExpense / this.totalIncome) * 100));
  }

  get totalCategorySpend() {
    return this.topCategories.reduce((sum: number, c: any) => {
      return sum + (Number(c.total) || 0);
    }, 0);
  }

  get categoryMax() {
    return Math.max(...this.topCategories.map((c: any) => Number(c.total) || 0), 1);
  }

  get strongestCategory() {
    return this.topCategories.length ? this.topCategories[0] : null;
  }

  get budgetLimit() {
    return Number(this.budgetAnalysis?.total_limit) || 0;
  }

  get budgetSpent() {
    return Number(this.budgetAnalysis?.total_spent) || 0;
  }

  get budgetRemaining() {
    return this.budgetLimit - this.budgetSpent;
  }

  get hasBudgetData() {
    return this.budgetLimit > 0 || (this.budgetAnalysis?.items || []).length > 0;
  }

  get budgetUsedPct() {
    if (!this.budgetLimit) return 0;
    return Math.min(100, (this.budgetSpent / this.budgetLimit) * 100);
  }

  get overBudgetCount() {
    return (this.budgetAnalysis?.items || []).filter((item: any) => {
      return Number(item.spent) > Number(item.limit);
    }).length;
  }

  get highestBudgetItem() {
    const items = this.budgetAnalysis?.items || [];

    if (!items.length) return null;

    return [...items].sort((a: any, b: any) => {
      return Number(b.pct_used || 0) - Number(a.pct_used || 0);
    })[0];
  }

  get budgetRiskLabel() {
    if (!this.hasBudgetData) return 'No data';
    if (this.overBudgetCount > 0 || this.budgetUsedPct >= 100) return 'High';
    if (this.budgetUsedPct >= 75) return 'Medium';
    return 'Low';
  }

  get budgetRiskClass() {
    if (!this.hasBudgetData) return 'risk-empty';
    if (this.overBudgetCount > 0 || this.budgetUsedPct >= 100) return 'risk-high';
    if (this.budgetUsedPct >= 75) return 'risk-medium';
    return 'risk-low';
  }

  get portfolioTotal() {
    return Number(this.portfolioValue?.total_value) || 0;
  }

  get portfolioInvested() {
    return Number(this.portfolioValue?.total_invested) || 0;
  }

  get portfolioProfitLoss() {
    return Number(this.portfolioValue?.total_pl) || 0;
  }

  get portfolioReturnPct() {
    return Number(this.portfolioValue?.total_return_pct) || 0;
  }

  get portfolioReturnWidth() {
    return Math.min(100, Math.abs(this.portfolioReturnPct));
  }

  get portfolioAssets() {
    return this.portfolioValue?.assets || [];
  }

  get investmentAssetCount() {
    return this.portfolioAssets.length;
  }

  get largestAsset() {
    if (!this.portfolioAssets.length) return null;

    return [...this.portfolioAssets].sort((a: any, b: any) => {
      return this.assetValue(b) - this.assetValue(a);
    })[0];
  }

  get bestAsset() {
    if (!this.portfolioAssets.length) return null;

    return [...this.portfolioAssets].sort((a: any, b: any) => {
      return Number(b.profit_loss || 0) - Number(a.profit_loss || 0);
    })[0];
  }

  get hasEnoughData(): boolean {
    return this.monthlyChartData.length > 0 || this.portfolioInvested > 0 || this.hasBudgetData || this.savingsGoals.length > 0;
  }

  get savingsGoalProgress(): number {
    if (!this.savingsGoals.length) return 0;
    const totalTarget = this.savingsGoals.reduce((s: number, g: any) => s + (Number(g.target_amount) || 0), 0);
    if (!totalTarget) return 0;
    const totalSaved = this.savingsGoals.reduce((s: number, g: any) => s + (Number(g.current_amount) || 0), 0);
    return Math.min(100, (totalSaved / totalTarget) * 100);
  }

  // Each component scores 0–25. Neutral (13) when no data — no arbitrary penalties.
  get healthSavingsPoints(): number {
    const hasCashflow = this.totalIncome > 0;
    const hasGoals = this.savingsGoals.length > 0;

    if (!hasCashflow && !hasGoals) return 13;

    // Goals only — score purely on goal progress
    if (!hasCashflow && hasGoals) {
      const pct = this.savingsGoalProgress;
      if (pct >= 100) return 25;
      if (pct >= 75) return 20;
      if (pct >= 50) return 15;
      if (pct >= 25) return 10;
      return 5;
    }

    // Cashflow only — score on savings rate
    if (hasCashflow && !hasGoals) {
      const rate = this.savingsRate;
      if (rate >= 20) return 25;
      if (rate >= 10) return 20;
      if (rate >= 5) return 12;
      if (rate > 0) return 6;
      return 0;
    }

    // Both — cashflow (15pts) + goals (10pts)
    const rate = this.savingsRate;
    const cashflowPts = rate >= 20 ? 15 : rate >= 10 ? 12 : rate >= 5 ? 7 : rate > 0 ? 3 : 0;
    const pct = this.savingsGoalProgress;
    const goalPts = pct >= 100 ? 10 : pct >= 75 ? 8 : pct >= 50 ? 6 : pct >= 25 ? 4 : 1;
    return Math.min(25, cashflowPts + goalPts);
  }

  get healthBudgetPoints(): number {
    if (!this.hasBudgetData) return 13;
    if (this.overBudgetCount === 0 && this.budgetUsedPct <= 75) return 25;
    if (this.overBudgetCount === 0) return 18;
    if (this.overBudgetCount === 1) return 10;
    return Math.max(0, 8 - (this.overBudgetCount - 2) * 2);
  }

  get healthInvestmentPoints(): number {
    if (!this.portfolioInvested) return 13;
    const ret = this.portfolioReturnPct;
    if (ret >= 10) return 25;
    if (ret >= 5) return 20;
    if (ret >= 0) return 15;
    if (ret >= -5) return 8;
    return 3;
  }

  get healthConsistencyPoints(): number {
    const data = this.monthlyChartData;
    if (!data.length) return 13;
    const positiveCount = data.filter((m: any) => this.netForMonth(m) >= 0).length;
    const ratio = positiveCount / data.length;
    if (ratio >= 1) return 25;
    if (ratio >= 0.75) return 20;
    if (ratio >= 0.5) return 12;
    if (ratio >= 0.25) return 6;
    return 2;
  }

  get financialHealthScore(): number {
    return Math.max(0, Math.min(100,
      this.healthSavingsPoints +
      this.healthBudgetPoints +
      this.healthInvestmentPoints +
      this.healthConsistencyPoints
    ));
  }

  get financialHealthLabel(): string {
    if (this.financialHealthScore >= 80) return 'Strong';
    if (this.financialHealthScore >= 60) return 'Stable';
    if (this.financialHealthScore >= 40) return 'Needs attention';
    return 'At risk';
  }

  get insightMessage(): string {
    if (this.netSavings < 0) return 'Expenses are currently higher than income.';
    if (this.hasBudgetData && this.overBudgetCount > 0) return `${this.overBudgetCount} budget category overrun this month.`;
    if (this.hasBudgetData && this.budgetUsedPct >= 90) return 'Budget usage is high this month.';
    if (this.savingsRate >= 20) return 'Savings rate is healthy — great discipline.';
    if (this.savingsRate >= 5) return 'Savings rate is modest — aim for 20%+.';
    if (this.portfolioReturnPct >= 5) return 'Portfolio performing well.';
    return 'Finances are stable, but savings can improve.';
  }

  netForMonth(month: any) {
    return (Number(month?.income) || 0) - (Number(month?.expense || month?.expenses) || 0);
  }

  monthLabel(month: any) {
    const m = String(month?.month || '').padStart(2, '0');
    const y = month?.year || '';
    return `${m}/${y}`;
  }

  shortMonthLabel(month: any) {
    const m = String(month?.month || '').padStart(2, '0');
    const y = String(month?.year || '').slice(-2);
    return `${m}/${y}`;
  }

  barHeight(value: number) {
    return Math.max(6, ((Number(value) || 0) / this.monthlyMax) * 100);
  }

  netBarHeight(month: any) {
    return Math.max(6, (Math.abs(this.netForMonth(month)) / this.monthlyMax) * 100);
  }

  categoryPercent(value: number) {
    return Math.max(4, ((Number(value) || 0) / this.categoryMax) * 100);
  }

  categoryShare(value: number) {
    if (!this.totalCategorySpend) return 0;
    return ((Number(value) || 0) / this.totalCategorySpend) * 100;
  }

  getProgressWidth(spent: number, limit: number) {
    if (!limit) return 0;
    return Math.min((Number(spent) / Number(limit)) * 100, 100);
  }

  getProgressColor(pct: number) {
    if (pct >= 100) return 'danger-fill';
    if (pct >= 75) return 'warning-fill';
    return 'success-fill';
  }

  assetValue(asset: any) {
    return Number(asset?.current_value || asset?.value || asset?.market_value || 0);
  }

  assetShare(asset: any) {
    if (!this.portfolioTotal) return 0;
    return (this.assetValue(asset) / this.portfolioTotal) * 100;
  }

  logout() {
    this.auth.logout();
  }

  trackByMonth(_index: number, item: any): string { return `${item.year}-${item.month}`; }
  trackByCategory(_index: number, item: any): string { return item.category; }
  trackByYear(_index: number, year: string): string { return year; }
  trackById(_index: number, item: any): string { return item.id; }
}