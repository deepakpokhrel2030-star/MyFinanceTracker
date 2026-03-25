import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SavingsGoalService {
  private api = 'http://localhost:5000';
  constructor(private http: HttpClient) {}

  getAll()                      { return this.http.get<any>(`${this.api}/savings-goals/`); }
  create(data: any)             { return this.http.post<any>(`${this.api}/savings-goals/`, data); }
  update(id: string, data: any) { return this.http.put<any>(`${this.api}/savings-goals/${id}`, data); }
  delete(id: string)            { return this.http.delete(`${this.api}/savings-goals/${id}`); }
}