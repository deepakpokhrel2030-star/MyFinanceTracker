import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private api = 'http://localhost:5000';
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any>(`${this.api}/accounts/`).pipe(
      map((res: any) => res.items || res.data?.items || [])
    );
    }
  create(data: any)             { return this.http.post<any>(`${this.api}/accounts/`, data); }
  update(id: string, data: any) { return this.http.put<any>(`${this.api}/accounts/${id}`, data); }
  delete(id: string)            { return this.http.delete(`${this.api}/accounts/${id}`); }
}