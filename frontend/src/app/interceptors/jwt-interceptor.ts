import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  console.log('interceptor token:', token);
  console.log('request url:', req.url);
  if (token) {
    req = req.clone({
      setHeaders: { 'x-access-token': token }
    });
  }
  return next(req);
};