import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth.service';
import { SignInComponent } from './sign-in.component';

describe('SignInComponent', () => {
  let component: SignInComponent;
  let fixture: ComponentFixture<SignInComponent>;
  let router: Router;

  const authService = {
    login: jasmine.createSpy('login').and.returnValue(of({})),
    isAuthenticated$: of(false),
  };

  const toastr = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    warning: jasmine.createSpy('warning'),
    info: jasmine.createSpy('info'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignInComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ToastrService, useValue: toastr },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    authService.login.calls.reset();
    Object.values(toastr).forEach((spy) => spy.calls.reset());
    fixture.detectChanges();
  });

  it('should create with an invalid empty form', () => {
    expect(component).toBeTruthy();
    expect(component.signInForm.invalid).toBeTrue();
  });

  it('should render persistent labels and autocomplete metadata', () => {
    const username = fixture.debugElement.query(
      By.css('#username'),
    ).nativeElement;
    const password = fixture.debugElement.query(
      By.css('#password'),
    ).nativeElement;

    expect(
      fixture.nativeElement.querySelector('label[for="username"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('label[for="password"]'),
    ).toBeTruthy();
    expect(username.autocomplete).toBe('username');
    expect(password.autocomplete).toBe('current-password');
  });

  it('should use the official OSC logo', () => {
    const logo = fixture.nativeElement.querySelector('.logo');
    expect(logo.src).toContain('assets/images/osc-logo-color-official.png');
    expect(logo.alt).toBe('Open Science Chain');
  });

  it('credits the sign-in photograph', () => {
    const credit = fixture.nativeElement.querySelector('.photo-credit a');
    expect(credit.textContent).toContain('Adam Bezer');
    expect(credit.href).toBe(
      'https://unsplash.com/photos/a-scientist-is-working-in-a-laboratory-TOZsuh0MWJw',
    );
  });

  it('should expose errors through aria-describedby after invalid submission', () => {
    component.onSubmit();
    fixture.detectChanges();

    const username = fixture.nativeElement.querySelector('#username');
    const password = fixture.nativeElement.querySelector('#password');
    expect(username.getAttribute('aria-invalid')).toBe('true');
    expect(username.getAttribute('aria-describedby')).toBe('username-error');
    expect(password.getAttribute('aria-describedby')).toBe('password-error');
    expect(toastr.warning).toHaveBeenCalled();
  });

  it('should keep submit disabled until both fields are valid', () => {
    const submit = (): HTMLButtonElement =>
      fixture.nativeElement.querySelector('button[type="submit"]');
    expect(submit().disabled).toBeTrue();

    component.signInForm.setValue({
      username: 'researcher',
      password: 'correct-horse-battery-staple',
    });
    fixture.detectChanges();
    expect(submit().disabled).toBeFalse();
  });

  it('should log in and return to the landing page', () => {
    spyOn(router, 'navigate');
    component.signInForm.setValue({
      username: 'researcher',
      password: 'valid-password',
    });

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith(
      'researcher',
      'valid-password',
    );
    expect(toastr.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(component.isLoading).toBeFalse();
  });

  it('should announce invalid credentials', () => {
    authService.login.and.returnValue(
      throwError(() => ({ error: { message: 'Invalid credentials' } })),
    );
    component.signInForm.setValue({
      username: 'researcher',
      password: 'wrong-password',
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.invalidCredentials).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(toastr.error).toHaveBeenCalled();
    authService.login.and.returnValue(of({}));
  });

  it('should provide a recovery status message', () => {
    component.onForgotCredentials();
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status.textContent).toContain('Open Science Chain administrator');
    expect(toastr.info).toHaveBeenCalled();
  });
});
