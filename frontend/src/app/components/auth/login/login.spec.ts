import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login';
import { AuthService } from '../../../services/auth';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error if email or password is empty', () => {
    component.form.email = '';
    component.form.password = '';
    component.login();
    expect(component.error).toBe('Please enter your email and password');
    expect(component.loading).toBe(false);
  });

  it('should send login request when credentials are provided', async () => {
    component.form.email = 'test@example.com';
    component.form.password = 'password123';
    component.login();
    const req = httpMock.expectOne('http://localhost:5000/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ token: 'jwt', user: { name: 'Test' } });
    await fixture.whenStable();
    expect(component.loading).toBe(false);
  });

  it('should store token on successful login', async () => {
    component.form.email = 'test@example.com';
    component.form.password = 'password123';
    component.login();
    httpMock.expectOne('http://localhost:5000/auth/login').flush({
      token: 'my-token',
      user: { name: 'Test' }
    });
    await fixture.whenStable();
    expect(localStorage.getItem('token')).toBe('my-token');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show error on failed login', async () => {
    component.form.email = 'bad@example.com';
    component.form.password = 'wrong';
    component.login();
    httpMock.expectOne('http://localhost:5000/auth/login').flush(
      { error: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' }
    );
    await fixture.whenStable();
    expect(component.error).toBe('Invalid credentials');
    expect(component.loading).toBe(false);
  });
});