import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any>(`${this.api}/accounts/`).pipe(
      map((res: any) => {
        if (!res) return [];
        const accounts = res.accounts || res.items || res.data?.items || res.data || (Array.isArray(res) ? res : null) || [];

        return Array.isArray(accounts)
          ? accounts.map((account: any) => ({
              ...account,
              account_type: account.account_type || account.type || 'checking'
            }))
          : [];
      })
    );
  }

  create(data: any) {
    return this.http.post<any>(`${this.api}/accounts/`, this.normalizePayload(data));
  }

  update(id: string, data: any) {
    return this.http.put<any>(`${this.api}/accounts/${id}`, this.normalizePayload(data));
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/accounts/${id}`);
  }

  private normalizePayload(data: any) {
    const accountType = data.account_type || data.type || 'checking';

    // Send both fields because the backend accepts either account_type or type
    return {
      ...data,
      account_type: accountType,
      type: accountType,
      balance: Number(data.balance) || 0
    };
  }
}