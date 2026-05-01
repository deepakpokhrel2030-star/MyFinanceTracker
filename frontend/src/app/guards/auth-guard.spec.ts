import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

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
  });

  afterEach(() => localStorage.clear());

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('returns true when user is logged in', () => {
    localStorage.setItem('token', 'valid-token');
    const result = executeGuard({} as any, {} as any);
    expect(result).toBeTruthy();
  });

  it('redirects to /login when user is not logged in', () => {
    const router = TestBed.inject(Router);
    const result = executeGuard({} as any, {} as any);
    expect(result).not.toBe(true);
    const urlTree = result as ReturnType<typeof router.createUrlTree>;
    expect(urlTree.toString()).toBe('/login');
  });

  it('returns true after logging in (token added)', () => {
    localStorage.setItem('token', 'second-token');
    const result = executeGuard({} as any, {} as any);
    expect(result).toBeTruthy();
  });

  it('redirects to /login after token is removed', () => {
    localStorage.setItem('token', 'temp');
    localStorage.removeItem('token');
    const router = TestBed.inject(Router);
    const result = executeGuard({} as any, {} as any);
    expect(result).not.toBe(true);
    const urlTree = result as ReturnType<typeof router.createUrlTree>;
    expect(urlTree.toString()).toBe('/login');
  });
});