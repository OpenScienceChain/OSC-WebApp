import { CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const guestModeMatch: CanMatchFn = () =>
  !inject(AuthService).isAuthenticated();
