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
    private accountService: AccountService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.user = this.auth.currentUser$.value;
    setTimeout(() => this.loadData(), 0);
  }

  loadData() {
    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      accounts:   this.accountService.getAll(),
      income:     this.analytics.getIncomeVsExpense(),
      categories: this.analytics.getTopCategories(),
      portfolio:  this.analytics.getPortfolioValue()
    }).subscribe({
      next: (res: any) => {
        this.accounts        = res.accounts   || [];
        this.incomeVsExpense = res.income;
        this.topCategories   = res.categories || [];
        this.portfolioValue  = res.portfolio;
        this.loading         = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get totalBalance() {
    return this.accounts.reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
  }

  logout() { this.auth.logout(); }
}