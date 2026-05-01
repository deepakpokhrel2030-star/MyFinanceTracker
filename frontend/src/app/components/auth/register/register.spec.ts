import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterComponent } from './register';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows error if required fields are missing', () => {
    component.form = { name: '', email: '', password: '', confirmPassword: '' };
    component.register();
    expect(component.error).toBe('Please complete all required fields');
    expect(component.loading).toBe(false);
  });

  it('shows error if password is less than 6 characters', () => {
    component.form = { name: 'Alice', email: 'a@b.com', password: '123', confirmPassword: '123' };
    component.register();
    expect(component.error).toBe('Password must be at least 6 characters');
    expect(component.loading).toBe(false);
  });

  it('shows error if passwords do not match', () => {
    component.form = { name: 'Alice', email: 'a@b.com', password: 'password1', confirmPassword: 'password2' };
    component.register();
    expect(component.error).toBe('Passwords do not match');
    expect(component.loading).toBe(false);
  });

  it('redirects to login page with registered=true after successful registration', async () => {
    component.form = { name: 'Alice', email: 'a@b.com', password: 'password1', confirmPassword: 'password1' };
    component.register();
    const req = httpMock.expectOne('http://localhost:5000/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush({});
    await fixture.whenStable();
    expect(component.loading).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { registered: 'true' } });
  });

  it('shows error message on registration failure', async () => {
    component.form = { name: 'Alice', email: 'a@b.com', password: 'password1', confirmPassword: 'password1' };
    component.register();
    const req = httpMock.expectOne('http://localhost:5000/auth/register');
    req.flush({ error: 'Email already exists' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(component.error).toBe('Email already exists');
    expect(component.loading).toBe(false);
  });
});