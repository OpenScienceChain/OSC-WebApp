import { TestBed } from '@angular/core/testing';
import { Route } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { guestModeMatch } from './guest-mode.match';

describe('guestModeMatch', () => {
  it('uses guest data only without an authenticated account', () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'isAuthenticated',
    ]);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: auth }],
    });
    auth.isAuthenticated.and.returnValue(false);
    expect(
      TestBed.runInInjectionContext(() => guestModeMatch({} as Route, [])),
    ).toBeTrue();
    auth.isAuthenticated.and.returnValue(true);
    expect(
      TestBed.runInInjectionContext(() => guestModeMatch({} as Route, [])),
    ).toBeFalse();
  });
});
