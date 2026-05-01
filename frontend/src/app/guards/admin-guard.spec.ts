import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { adminGuard } from './admin-guard';
import { AuthService } from '../services/auth';

describe('adminGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

  let authService: AuthService;

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
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('returns true when user has admin role', () => {
    authService.currentUser$.next({ roles: ['admin'] });
    const result = executeGuard({} as any, {} as any);
    expect(result).toBeTruthy();
  });

  it('redirects to /dashboard when user is not admin', () => {
    const router = TestBed.inject(Router);
    authService.currentUser$.next({ roles: ['user'] });
    const result = executeGuard({} as any, {} as any);
    expect(result).not.toBe(true);
    const urlTree = result as ReturnType<typeof router.createUrlTree>;
    expect(urlTree.toString()).toBe('/dashboard');
  });

  it('redirects to /dashboard when currentUser$ is null', () => {
    const router = TestBed.inject(Router);
    authService.currentUser$.next(null);
    const result = executeGuard({} as any, {} as any);
    expect(result).not.toBe(true);
    const urlTree = result as ReturnType<typeof router.createUrlTree>;
    expect(urlTree.toString()).toBe('/dashboard');
  });

  it('redirects to /dashboard when user has no roles property', () => {
    const router = TestBed.inject(Router);
    authService.currentUser$.next({ name: 'NoRoles' });
    const result = executeGuard({} as any, {} as any);
    expect(result).not.toBe(true);
    const urlTree = result as ReturnType<typeof router.createUrlTree>;
    expect(urlTree.toString()).toBe('/dashboard');
  });

  it('returns true when user has admin among multiple roles', () => {
    authService.currentUser$.next({ roles: ['user', 'admin', 'moderator'] });
    const result = executeGuard({} as any, {} as any);
    expect(result).toBeTruthy();
  });
});