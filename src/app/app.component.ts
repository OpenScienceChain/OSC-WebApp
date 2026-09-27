import { CommonModule, Location } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth/auth.service';
import { getRuntimeConfig } from './config/runtime-config';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  readonly mockPreview = getRuntimeConfig()?.MOCK_PREVIEW === true;
  isAuthenticated = false;
  showBackButton = false;
  mobileNavigationOpen = false;
  contributeMenuOpen = false;
  title = 'Open Science Chain';
  logoError = false;

  private readonly routesWithBackButton = ['/auth/sign-in'];

  constructor(
    public router: Router,
    private readonly location: Location,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService,
  ) {
    this.authService.isAuthenticated$.subscribe(
      (isAuthenticated) => (this.isAuthenticated = isAuthenticated),
    );
  }

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateBackButtonVisibility();
        this.closeNavigation();
      });

    this.updateBackButtonVisibility();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeNavigation();
  }

  private updateBackButtonVisibility(): void {
    const currentUrl = this.router.url;
    this.showBackButton = this.routesWithBackButton.some((route) =>
      currentUrl.startsWith(route),
    );
  }

  isAuthRoute(): boolean {
    return this.router.url.startsWith('/auth');
  }

  goBack(): void {
    if (this.router.url.includes('/auth/')) {
      this.router.navigate(['/']);
    } else {
      this.location.back();
    }
  }

  toggleMobileNavigation(): void {
    this.mobileNavigationOpen = !this.mobileNavigationOpen;
    if (!this.mobileNavigationOpen) {
      this.contributeMenuOpen = false;
    }
  }

  toggleContributeMenu(): void {
    this.contributeMenuOpen = !this.contributeMenuOpen;
  }

  closeNavigation(): void {
    this.mobileNavigationOpen = false;
    this.contributeMenuOpen = false;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.closeNavigation();
        this.toastr.success('Successfully signed out', 'Goodbye!');
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.closeNavigation();
        this.toastr.success('Successfully signed out', 'Goodbye!');
      },
    });
  }

  onContributeClick(type: 'artifact' | 'workflow'): void {
    this.closeNavigation();
    if (!this.isAuthenticated) {
      this.router.navigate([
        type === 'workflow' ? '/create-workflow' : '/contribute',
      ]);
      return;
    }

    const route = type === 'workflow' ? '/create-workflow' : '/contribute';
    this.router.navigate([route]);
  }

  onLogoError(): void {
    this.logoError = true;
    console.error('Error loading logo image');
  }
}
