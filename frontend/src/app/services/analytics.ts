import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private api = 'http://localhost:5000';
  constructor(private http: HttpClient) {}

  getMonthlySpending()             { return this.http.get<any>(`${this.api}/analytics/spending/monthly`); }
  getTopCategories()               { return this.http.get<any>(`${this.api}/analytics/top-categories`); }
  getIncomeVsExpense()             { return this.http.get<any>(`${this.api}/analytics/income-vs-expense`); }
  getPortfolioValue()              { return this.http.get<any>(`${this.api}/analytics/portfolio-value`); }
  getBudgetAnalysis(month: string) { return this.http.get<any>(`${this.api}/analytics/budgets/${month}`); }
}