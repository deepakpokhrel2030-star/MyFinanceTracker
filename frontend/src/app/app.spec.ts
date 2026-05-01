import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { App } from './app';
import { AuthService } from './services/auth';

describe('App', () => {
  let currentUser$: BehaviorSubject<any>;
  let authMock: any;

  beforeEach(async () => {
    localStorage.clear();
    currentUser$ = new BehaviorSubject<any>(null);
    authMock = {
      currentUser$,
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
      isAdmin: jasmine.createSpy('isAdmin').and.returnValue(false),
      logout: jasmine.createSpy('logout')
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock }
      ]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loggedIn should be false when no token', () => {
    authMock.isLoggedIn.and.returnValue(false);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance.loggedIn).toBeFalse();
  });

  it('loggedIn should be true when user is present', () => {
    authMock.isLoggedIn.and.returnValue(true);
    currentUser$.next({ name: 'Test User' });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance.loggedIn).toBeTrue();
  });

  it('sidebarCollapsed starts as false', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.sidebarCollapsed).toBeFalse();
  });
});