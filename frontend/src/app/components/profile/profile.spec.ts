import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ProfileComponent } from './profile';
import { AuthService } from '../../services/auth';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function init() {
    fixture.detectChanges();
    tick(0);
    httpMock.expectOne('http://localhost:5000/auth/me').flush({
      user: { name: 'Test User', email: 'test@test.com', roles: ['user'] }
    });
    tick();
  }

  it('should create', fakeAsync(() => {
    init();
    expect(component).toBeTruthy();
  }));

  it('initials returns first letters of name', fakeAsync(() => {
    init();
    component.user = { name: 'John Doe' };
    expect(component.initials).toBe('JD');
  }));

  it('initials caps at 2 characters', fakeAsync(() => {
    init();
    component.user = { name: 'John Michael Doe' };
    expect(component.initials).toBe('JM');
  }));

  it('roleText returns roles joined when array', fakeAsync(() => {
    init();
    component.user = { roles: ['admin', 'user'] };
    expect(component.roleText).toBe('admin, user');
  }));

  it('roleText returns User as fallback', fakeAsync(() => {
    init();
    component.user = {};
    expect(component.roleText).toBe('User');
  }));

  it('startEdit() sets editMode to true', fakeAsync(() => {
    init();
    component.startEdit();
    expect(component.editMode).toBeTrue();
    expect(component.passwordMode).toBeFalse();
  }));

  it('cancelEdit() sets editMode to false', fakeAsync(() => {
    init();
    component.editMode = true;
    component.cancelEdit();
    tick(0);
    httpMock.expectOne('http://localhost:5000/auth/me').flush({ user: {} });
    tick();
    expect(component.editMode).toBeFalse();
  }));

  it('openPasswordChange() sets passwordMode to true', fakeAsync(() => {
    init();
    component.openPasswordChange();
    expect(component.passwordMode).toBeTrue();
    expect(component.editMode).toBeFalse();
  }));

  it('onChangePassword() shows error if passwords do not match', fakeAsync(() => {
    init();
    component.passwordForm.password = 'abc123';
    component.passwordForm.confirmPassword = 'xyz999';
    component.onChangePassword();
    expect(component.error).toBe('Passwords do not match');
  }));

  it('onChangePassword() shows error if password less than 6 chars', fakeAsync(() => {
    init();
    component.passwordForm.password = '123';
    component.passwordForm.confirmPassword = '123';
    component.onChangePassword();
    expect(component.error).toBe('Password must be at least 6 characters');
  }));

  it('onUpdate() successful PUT', fakeAsync(() => {
    init();
    component.form = {
      name: 'New Name',
      phone: '123456789',
      address: {
        street: '123 St',
        city: 'City',
        postcode: '123',
        country: 'UK'
      }
    };
    component.onUpdate();
    const req = httpMock.expectOne('http://localhost:5000/auth/me');
    expect(req.request.method).toBe('PUT');
    req.flush({ user: { name: 'New Name', email: 'test@test.com' } });
    httpMock.expectOne('http://localhost:5000/auth/me').flush({ user: {} });
    tick();
    expect(component.success).toBe('Profile updated successfully!');
    expect(component.editMode).toBeFalse();
  }));

  it('onChangePassword() successful PUT', fakeAsync(() => {
    init();
    component.passwordForm = {
      password: 'newpassword',
      confirmPassword: 'newpassword'
    };
    component.onChangePassword();
    const req = httpMock.expectOne('http://localhost:5000/auth/me');
    expect(req.request.method).toBe('PUT');
    req.flush({});
    tick();
    expect(component.success).toBe('Password changed successfully!');
    expect(component.passwordMode).toBeFalse();
  }));

  it('logout() performs POST and clears state', fakeAsync(() => {
    init();
    localStorage.setItem('token', 'abc');
    authService.currentUser$.next({ name: 'User' });
    component.logout();
    const req = httpMock.expectOne('http://localhost:5000/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({});
    expect(localStorage.getItem('token')).toBeNull();
    expect(authService.currentUser$.value).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  }));
});