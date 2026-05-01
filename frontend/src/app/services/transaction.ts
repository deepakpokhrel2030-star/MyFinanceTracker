import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll(filters: any = {}) {
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<any>(`${this.api}/transactions/`, { params }).pipe(
      map((res: any) => {
        if (!res) return { items: [], total: 0, page: 1, pages: 0 };

        // Backend returns a plain array when no pagination params are sent
        if (Array.isArray(res)) {
          const page = Number(filters.page) || 1;
          const limit = Number(filters.limit) || 10;

          const start = (page - 1) * limit;
          const end = start + limit;

          const sliced = res.slice(start, end);

          return {
            items: sliced,
            total: res.length,
            page,
            pages: Math.ceil(res.length / limit)
          };
        }

        const allItems =
          res.items ||
          res.transactions ||
          res.data?.items ||
          res.data ||
          [];

        return {
          items: allItems,
          total: res.total || res.count || allItems.length,
          page: res.page || Number(filters.page) || 1,
          pages: res.pages || res.total_pages || Math.ceil((res.total || allItems.length) / (Number(filters.limit) || 10))
        };
      })
    );
  }

  create(data: any) {
    return this.http.post<any>(`${this.api}/transactions/`, data);
  }

  update(id: string, data: any) {
    return this.http.put<any>(`${this.api}/transactions/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/transactions/${id}`);
  }
}