import {
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ToastrService } from 'ngx-toastr';

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const toastr = inject(ToastrService);
  const router = inject(Router);

  // Only attach token and handle 401 for our own API
  const apiBaseUrl = (window as any).__RUNTIME_CONFIG__?.['API_BASE_URL'] as
    string | undefined;
  const isInternalRequest =
    !request.url.startsWith('http') ||
    request.url.startsWith(window.location.origin) ||
    request.url.startsWith('/api/') ||
    (!!apiBaseUrl && request.url.startsWith(apiBaseUrl));
  const isGuestRequest =
    isInternalRequest &&
    /\/demo(?:\/|$)/.test(
      new URL(request.url, window.location.origin).pathname,
    );

  if (isInternalRequest && !isGuestRequest) {
    const token = authService.getToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        isInternalRequest &&
        !isGuestRequest &&
        !request.url.endsWith('/logout')
      ) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.navigate(['/auth/sign-in']);
        toastr.error(
          'Session expired. Please sign in again.',
          'Authentication Error',
        );
      }
      return throwError(() => error);
    }),
  );
};
