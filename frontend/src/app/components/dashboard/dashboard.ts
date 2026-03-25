import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AnalyticsService } from '../../services/analytics';
import { AccountService } from '../../services/account';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html'
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
    private accountService: AccountService
  ) {}

  ngOnInit() {
    this.user = this.auth.currentUser$.value;
    this.loadData();
  }

  loadData() {
    this.loading = true;

    this.accountService.getAll().subscribe({
      next: (res) => this.accounts = res.data?.items || res.items || [],
      error: () => {}
    });

    this.analytics.getIncomeVsExpense().subscribe({
      next: (res) => this.incomeVsExpense = res.data || res,
      error: () => {}
    });

    this.analytics.getTopCategories().subscribe({
      next: (res) => this.topCategories = res.data?.data || res.data || [],
      error: () => {}
    });

    this.analytics.getPortfolioValue().subscribe({
      next: (res) => {
        this.portfolioValue = res.data || res;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get totalBalance() {
    return this.accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  }

  logout() {
    this.auth.logout();
  }
}