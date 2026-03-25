import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private api = 'http://localhost:5000';
  constructor(private http: HttpClient) {}

  getAll(filters: any = {}) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params = params.set(k, String(v)); });
    return this.http.get<any>(`${this.api}/transactions/`, { params });
  }
  create(data: any)             { return this.http.post<any>(`${this.api}/transactions/`, data); }
  update(id: string, data: any) { return this.http.put<any>(`${this.api}/transactions/${id}`, data); }
  delete(id: string)            { return this.http.delete(`${this.api}/transactions/${id}`); }
}