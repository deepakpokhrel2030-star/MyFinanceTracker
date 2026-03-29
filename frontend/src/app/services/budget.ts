import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private api = 'http://localhost:5000';
  constructor(private http: HttpClient) {}

  getAll(month?: string) {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    return this.http.get<any>(`${this.api}/budgets/`, { params }).pipe(
      map((res: any) => res.items || res.data?.items || [])
    );
  }
  create(data: any)             { return this.http.post<any>(`${this.api}/budgets/`, data); }
  update(id: string, data: any) { return this.http.put<any>(`${this.api}/budgets/${id}`, data); }
  delete(id: string)            { return this.http.delete(`${this.api}/budgets/${id}`); }
}