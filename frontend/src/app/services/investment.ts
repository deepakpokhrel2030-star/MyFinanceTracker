import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InvestmentService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(filters: any = {}) {
    let params = new HttpParams();

    // Skip null/undefined/empty values so they don't appear as blank query params
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<any>(`${this.api}/investments/`, { params }).pipe(
      // investments key is the primary expected wrapper; falls back to generic shapes
      map((res: any) => {
        if (!res) return [];
        return res.investments || res.items || res.data?.items || res.data || (Array.isArray(res) ? res : []);
      })
    );
  }

  create(data: any) {
    return this.http.post<any>(`${this.api}/investments/`, data);
  }

  update(id: string, data: any) {
    return this.http.put<any>(`${this.api}/investments/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/investments/${id}`);
  }
}