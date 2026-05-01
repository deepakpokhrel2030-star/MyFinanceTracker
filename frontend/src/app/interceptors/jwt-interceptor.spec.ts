import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { jwtInterceptor } from './jwt-interceptor';

describe('jwtInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should not add x-access-token header when no token stored', () => {
    http.get('http://localhost:5000/test').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/test');
    expect(req.request.headers.has('x-access-token')).toBeFalsy();
    req.flush({});
  });

  it('should add x-access-token header when token is in localStorage', () => {
    localStorage.setItem('token', 'my-jwt-token');
    http.get('http://localhost:5000/test').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/test');
    expect(req.request.headers.get('x-access-token')).toBe('my-jwt-token');
    req.flush({});
  });

  it('should add x-access-token header for POST requests', () => {
    localStorage.setItem('token', 'post-token');
    http.post('http://localhost:5000/resource', {}).subscribe();
    const req = httpMock.expectOne('http://localhost:5000/resource');
    expect(req.request.headers.get('x-access-token')).toBe('post-token');
    req.flush({});
  });

  it('should add x-access-token header for DELETE requests', () => {
    localStorage.setItem('token', 'delete-token');
    http.delete('http://localhost:5000/resource/1').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/resource/1');
    expect(req.request.headers.get('x-access-token')).toBe('delete-token');
    req.flush({});
  });

  it('should not add x-access-token header after token is removed', () => {
    localStorage.setItem('token', 'temp-token');
    localStorage.removeItem('token');
    http.get('http://localhost:5000/protected').subscribe();
    const req = httpMock.expectOne('http://localhost:5000/protected');
    expect(req.request.headers.has('x-access-token')).toBeFalsy();
    req.flush({});
  });
});