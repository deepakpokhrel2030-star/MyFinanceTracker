import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private api = 'http://localhost:5000';
  constructor(private http: HttpClient) {}

  getMonthlySpending() {
    return this.http.get<any>(`${this.api}/analytics/spending/monthly`).pipe(
      map((res: any) => {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.data)) return res.data.data;
        return [];
      })
    );
  }

  getTopCategories() {
    return this.http.get<any>(`${this.api}/analytics/top-categories`).pipe(
      map((res: any) => {
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.data)) return res.data.data;
        return [];
      })
    );
  }

  getIncomeVsExpense() {
    return this.http.get<any>(`${this.api}/analytics/income-vs-expense`).pipe(
      map((res: any) => res.data || res)
    );
  }

  getPortfolioValue() {
    return this.http.get<any>(`${this.api}/analytics/portfolio-value`).pipe(
      map((res: any) => res.data || res)
    );
  }

  getBudgetAnalysis(month: string) {
    return this.http.get<any>(`${this.api}/analytics/budgets/${month}`).pipe(
      map((res: any) => res.data || res)
    );
  }
}