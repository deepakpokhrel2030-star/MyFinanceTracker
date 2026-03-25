import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class InvestmentService {
  private api = 'http://localhost:5000';
  constructor(private http: HttpClient) {}

  getAll()                      { return this.http.get<any>(`${this.api}/investments/`); }
  getAnalytics()                { return this.http.get<any>(`${this.api}/investments/analytics/`); }
  create(data: any)             { return this.http.post<any>(`${this.api}/investments/`, data); }
  update(id: string, data: any) { return this.http.put<any>(`${this.api}/investments/${id}`, data); }
  delete(id: string)            { return this.http.delete(`${this.api}/investments/${id}`); }
}