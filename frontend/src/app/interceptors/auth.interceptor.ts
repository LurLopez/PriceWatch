import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { getApiBaseUrl } from '../config/api.config';
import { AuthService } from '../services/auth.service';

/**
 * Añade el token JWT a las llamadas a la API y centraliza el manejo de 401.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const apiBaseUrl = getApiBaseUrl();
  const isApiRequest = request.url.startsWith(apiBaseUrl) || request.url.startsWith('/api');

  const authenticatedRequest =
    token && isApiRequest
      ? request.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        authService.logoutLocal();
        const currentUrl = router.url;
        if (!currentUrl.startsWith('/login')) {
          void router.navigate(['/login'], {
            queryParams: { returnUrl: currentUrl },
          });
        }
      }

      return throwError(() => error);
    }),
  );
};
