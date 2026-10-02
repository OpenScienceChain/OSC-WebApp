import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css'],
})
export class SignInComponent {
  signInForm: FormGroup;
  showForgotMessage = false;
  isLoading = false;
  invalidCredentials = false;
  sessionExpired = false;
  private readonly returnUrl: string;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
  ) {
    this.signInForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
    this.sessionExpired =
      this.route.snapshot.queryParamMap.get('reason') === 'expired';
    this.returnUrl = this.safeReturnUrl(
      this.route.snapshot.queryParamMap.get('returnUrl'),
    );
  }

  onSubmit(): void {
    this.signInForm.markAllAsTouched();

    if (this.signInForm.invalid) {
      this.toastr.warning('Please fill in all required fields', 'Form Invalid');
      return;
    }

    this.isLoading = true;
    this.invalidCredentials = false;
    const { username, password } = this.signInForm.value;

    this.authService.login(username, password).subscribe({
      next: () => {
        this.toastr.success('Successfully signed in!', 'Welcome');
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.invalidCredentials = true;
        this.toastr.error(
          error.error?.message ?? 'Invalid credentials',
          'Login Failed',
        );
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  onForgotCredentials(): void {
    this.showForgotMessage = true;
    this.toastr.info(
      'Please contact support for assistance',
      'Password Recovery',
    );
  }

  private safeReturnUrl(value: string | null): string {
    if (
      value?.startsWith('/') &&
      !value.startsWith('//') &&
      !value.startsWith('/auth/sign-in')
    ) {
      return value;
    }
    return '/';
  }
}
