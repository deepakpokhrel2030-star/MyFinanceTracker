import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private api = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getMonthlySpending() {
    return this.http.get<any>(`${this.api}/analytics/spending/monthly`).pipe(
      map((res: any) => {
        if (!res) return [];
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
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.data)) return res.data.data;
        return [];
      })
    );
  }

  getIncomeVsExpense() {
    // res?.data ?? res — unwraps the data envelope if present, otherwise returns the raw response
    return this.http.get<any>(`${this.api}/analytics/income-vs-expense`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  getPortfolioValue() {
    return this.http.get<any>(`${this.api}/analytics/portfolio-value`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }

  getBudgetAnalysis(month: string) {
    // month is passed as a path param (e.g. 2026-04) to scope results to that month
    return this.http.get<any>(`${this.api}/analytics/budgets/${month}`).pipe(
      map((res: any) => res?.data ?? res)
    );
  }
}