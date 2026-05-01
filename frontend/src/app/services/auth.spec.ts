import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isLoggedIn() returns false when no token', () => {
    expect(service.isLoggedIn()).toBeFalsy();
  });

  it('isLoggedIn() returns true when token present', () => {
    localStorage.setItem('token', 'abc123');
    expect(service.isLoggedIn()).toBeTruthy();
  });

  it('isAdmin() returns false when user has no admin role', () => {
    service.currentUser$.next({ roles: ['user'] });
    expect(service.isAdmin()).toBeFalsy();
  });

  it('isAdmin() returns true when user has admin role', () => {
    service.currentUser$.next({ roles: ['admin'] });
    expect(service.isAdmin()).toBeTruthy();
  });

  it('logout() clears localStorage and sets currentUser$ to null', () => {
    localStorage.setItem('token', 'abc');
    service.currentUser$.next({ name: 'Test' });
    service.logout();
    httpMock.expectOne('http://localhost:5000/auth/logout').flush({});
    expect(localStorage.getItem('token')).toBeNull();
    expect(service.currentUser$.value).toBeNull();
  });

  it('getToken() returns null when nothing stored', () => {
    expect(service.getToken()).toBeNull();
  });

  it('getToken() returns stored token', () => {
    localStorage.setItem('token', 'mytoken');
    expect(service.getToken()).toBe('mytoken');
  });

  it('isAdmin() returns false when currentUser$ is null', () => {
    service.currentUser$.next(null);
    expect(service.isAdmin()).toBeFalsy();
  });

  it('isAdmin() returns false when roles array is empty', () => {
    service.currentUser$.next({ roles: [] });
    expect(service.isAdmin()).toBeFalsy();
  });

  it('constructor loads user from localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Alice', roles: ['user'] }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    const freshService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    expect(freshService.currentUser$.value?.name).toBe('Alice');
  });

  it('login() POSTs credentials and stores token', () => {
    service.login('test@example.com', 'pass').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com', password: 'pass' });
    req.flush({ access_token: 'tok123', user: { name: 'Test', roles: ['user'] } });
    expect(localStorage.getItem('token')).toBe('tok123');
  });

  it('login() handles data-wrapped response', () => {
    service.login('a@b.com', 'pw').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/auth/login');
    req.flush({ data: { access_token: 'wrapped-tok', user: { name: 'Bob', roles: ['admin'] } } });
    expect(localStorage.getItem('token')).toBe('wrapped-tok');
    expect(service.currentUser$.value?.name).toBe('Bob');
  });

  it('login() updates currentUser$', () => {
    service.login('x@y.com', 'pw').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/auth/login');
    req.flush({ access_token: 'tok', user: { name: 'Charlie', roles: ['user'] } });
    expect(service.currentUser$.value?.name).toBe('Charlie');
  });

  it('register() POSTs to /auth/register', () => {
    service.register('Dave', 'dave@example.com', 'pass123').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Dave', email: 'dave@example.com', password: 'pass123' });
    req.flush({});
  });

  it('logout() clears localStorage, nulls currentUser$ and navigates to /login', () => {
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate');
    localStorage.setItem('token', 'tok');
    service.currentUser$.next({ name: 'Test' });
    service.logout();
    httpMock.expectOne('http://localhost:5000/auth/logout').flush({});
    expect(localStorage.getItem('token')).toBeNull();
    expect(service.currentUser$.value).toBeNull();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });
});