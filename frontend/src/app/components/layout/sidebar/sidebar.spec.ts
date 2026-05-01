import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { SidebarComponent } from './sidebar';
import { AuthService } from '../../../services/auth';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let authService: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts not collapsed', () => {
    expect(component.collapsed).toBeFalsy();
  });

  it('toggleSidebar() flips collapsed state', () => {
    component.toggleSidebar();
    expect(component.collapsed).toBeTruthy();
    component.toggleSidebar();
    expect(component.collapsed).toBeFalsy();
  });

  it('isAdmin() returns false when not admin', () => {
    authService.currentUser$.next({ roles: ['user'] });
    expect(component.isAdmin()).toBeFalsy();
  });

  it('isAdmin() returns true when admin', () => {
    authService.currentUser$.next({ roles: ['admin'] });
    expect(component.isAdmin()).toBeTruthy();
  });

  it('navItems has at least 7 routes', () => {
    expect(component.navItems.length).toBeGreaterThanOrEqual(7);
  });

  it('logout() performs POST to /auth/logout and clears state', () => {
    localStorage.setItem('token', 'fake-token');
    authService.currentUser$.next({ name: 'User' });
    component.logout();
    const req = httpMock.expectOne('http://localhost:5000/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({});
    expect(localStorage.getItem('token')).toBeNull();
    expect(authService.currentUser$.value).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});