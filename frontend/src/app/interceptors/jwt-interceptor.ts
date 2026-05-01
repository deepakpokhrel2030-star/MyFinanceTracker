import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Backend expects x-access-token, not the standard Authorization header
    req = req.clone({
      setHeaders: { 'x-access-token': token }
    });
  }
  return next(req);
};