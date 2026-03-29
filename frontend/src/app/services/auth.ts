import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = 'http://localhost:5000';
  currentUser$ = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient, private router: Router) {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      this.currentUser$.next(parsed);
    }
  }

  login(email: string, password: string) {
    return this.http.post<any>(`${this.api}/auth/login`, { email, password }).pipe(
      tap(res => {
        const token = res.data?.access_token || res.access_token;
        const user  = res.data?.user         || res.user;
        if (token) localStorage.setItem('token', token);
        if (user)  localStorage.setItem('user', JSON.stringify(user));
        this.currentUser$.next(user);
      })
    );
  }

  register(name: string, email: string, password: string) {
    return this.http.post(`${this.api}/auth/register`, { name, email, password });
  }

  logout() {
    this.http.post(`${this.api}/auth/logout`, {}).subscribe();
    localStorage.clear();
    this.currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  getToken()   { return localStorage.getItem('token'); }
  isLoggedIn() { return !!this.getToken(); }
  isAdmin()    { return this.currentUser$.value?.roles?.includes('admin'); }
}