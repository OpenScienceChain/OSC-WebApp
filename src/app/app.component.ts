import { CommonModule, Location } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth/auth.service';
import { getRuntimeConfig } from './config/runtime-config';
import { DemoService } from './guest/demo.service';
import {
  AnalyticsEventType,
  UxAnalyticsService,
} from './analytics/ux-analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  @ViewChild('navigationToggle')
  private navigationToggle?: ElementRef<HTMLButtonElement>;

  @ViewChild('contributeButton')
  private contributeButton?: ElementRef<HTMLButtonElement>;

  readonly mockPreview = getRuntimeConfig()?.MOCK_PREVIEW === true;
  isAuthenticated = false;
  contributorSignedIn = false;
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
    private readonly demo: DemoService,
    private readonly toastr: ToastrService,
    public readonly analytics: UxAnalyticsService,
  ) {
    this.authService.isAuthenticated$.subscribe(
      (isAuthenticated) => (this.isAuthenticated = isAuthenticated),
    );
    this.demo.sessionChanges$.subscribe(
      (session) => (this.contributorSignedIn = !!session?.accountUsername),
    );
  }

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateBackButtonVisibility();
        this.closeNavigation();
        this.trackRoute((event as NavigationEnd).urlAfterRedirects);
      });

    this.updateBackButtonVisibility();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.contributeMenuOpen) {
      this.contributeMenuOpen = false;
      this.contributeButton?.nativeElement.focus();
      return;
    }

    if (this.mobileNavigationOpen) {
      this.mobileNavigationOpen = false;
      this.navigationToggle?.nativeElement.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  onTrackedClick(event: MouseEvent): void {
    const element =
      event.target instanceof Element
        ? event.target.closest('[data-ux-click]')
        : null;
    const eventType = element?.getAttribute('data-ux-click');
    if (eventType === 'CONTRIBUTE_CLICK' || eventType === 'AUTH_ACTION') {
      this.trackAction(eventType);
    }
  }

  @HostListener('document:change', ['$event'])
  onTrackedChange(event: Event): void {
    const element =
      event.target instanceof Element
        ? event.target.closest('[data-ux-change]')
        : null;
    const eventType = element?.getAttribute('data-ux-change');
    if (eventType === 'CATALOG_SEARCH' || eventType === 'CATALOG_FILTER') {
      this.trackAction(eventType);
    }
  }

  @HostListener('document:submit', ['$event'])
  onTrackedSubmit(event: Event): void {
    const element =
      event.target instanceof Element
        ? event.target.closest('[data-ux-submit]')
        : null;
    const eventType = element?.getAttribute('data-ux-submit');
    if (eventType === 'CATALOG_SEARCH' || eventType === 'SUBMISSION_ATTEMPT') {
      this.trackAction(eventType);
    }
  }

  acceptAnalytics(): void {
    this.analytics.accept(() => this.trackRoute(this.router.url));
  }

  private trackRoute(url: string): void {
    const route = this.analytics.routeTemplate(url);
    if (!route) return;
    this.analytics.track('PAGE_VIEW', route);
    if (route.includes('/history')) {
      this.analytics.track('HISTORY_VIEW', route);
    } else if (route === '/artifacts/:id' || route === '/workflows/:id') {
      this.analytics.track('RECORD_VIEW', route);
    }
  }

  private trackAction(eventType: AnalyticsEventType): void {
    const route = this.analytics.routeTemplate(this.router.url);
    if (route) this.analytics.track(eventType, route);
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

  isDemoExperience(): boolean {
    return (
      this.router.url.startsWith('/demo') ||
      getRuntimeConfig()?.DEMO_MODE === true
    );
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
    if (this.contributorSignedIn) {
      this.demo.signOutAccount().subscribe({
        next: () => this.closeNavigation(),
        error: () => {
          this.demo.clearSession();
          this.closeNavigation();
        },
      });
      return;
    }
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
