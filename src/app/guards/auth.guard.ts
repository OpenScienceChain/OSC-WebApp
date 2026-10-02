import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ToastrService } from 'ngx-toastr';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  if (authService.isAuthenticated()) {
    return true;
  }

  toastr.info('Please sign in to access this page', 'Authentication Required');
  router.navigate(['/auth/sign-in'], {
    queryParams: { reason: 'required', returnUrl: state.url },
  });
  return false;
};
