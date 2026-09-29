import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DemoOrganizationSlug, DemoStatus } from '../../guest/demo.models';
import { DemoService } from '../../guest/demo.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contributor-auth.component.html',
  styleUrls: [
    '../sign-in/sign-in.component.css',
    './contributor-auth.component.css',
  ],
})
export class ContributorAuthComponent implements OnInit {
  mode: 'sign-in' | 'register' = 'sign-in';
  organization: DemoOrganizationSlug = 'neuroscience-gateway';
  username = '';
  pin = '';
  status?: DemoStatus;
  submitted = false;
  busy = false;
  error = '';

  constructor(
    public readonly demo: DemoService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.demo.getStatus().subscribe({
      next: (status) => (this.status = status),
      error: () =>
        (this.error = 'Contributor access is temporarily unavailable.'),
    });
  }

  get valid(): boolean {
    return (
      /^[a-zA-Z][a-zA-Z0-9_-]{2,23}$/.test(this.username.trim()) &&
      /^\d{4,6}$/.test(this.pin)
    );
  }

  setMode(mode: 'sign-in' | 'register'): void {
    this.mode = mode;
    this.submitted = false;
    this.error = '';
    this.pin = '';
  }

  submit(): void {
    this.submitted = true;
    this.error = '';
    if (!this.valid || this.busy || this.status?.state !== 'OPEN') return;
    this.busy = true;
    const credentials = {
      organization: this.organization,
      username: this.username.trim(),
      pin: this.pin,
    };
    const operation =
      this.mode === 'register'
        ? this.demo.registerAccount(credentials)
        : this.demo.signInAccount(credentials);
    operation.subscribe({
      next: () => {
        this.pin = '';
        this.busy = false;
        this.router.navigate(['/']);
      },
      error: (response) => {
        this.busy = false;
        this.pin = '';
        this.error =
          response.status === 409
            ? 'That username is already in use for this organization.'
            : response.status === 429
              ? 'Too many attempts. Please try again in 15 minutes.'
              : response.status === 401
                ? 'Username or PIN not recognized.'
                : 'Contributor access is unavailable. Please try again.';
      },
    });
  }
}
