import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth/auth.service';

// Mock services
const mockToastr = {
  success: jasmine.createSpy('success'),
  error: jasmine.createSpy('error'),
  warning: jasmine.createSpy('warning'),
  info: jasmine.createSpy('info'),
};

const mockAuthService = {
  logout: jasmine.createSpy('logout').and.returnValue(of({})),
  isAuthenticated$: of(false),
  getToken: jasmine.createSpy('getToken').and.returnValue('mock-token'),
};

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;
  let location: Location;
  let routerEventsSubject: Subject<any>;
  let urlSpy: jasmine.Spy<any>;
  let authService: AuthService;
  let toastrService: ToastrService;

  beforeEach(async () => {
    routerEventsSubject = new Subject<any>();

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([]),
        NgbModule,
        HttpClientTestingModule,
        AppComponent,
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ToastrService, useValue: mockToastr },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    authService = TestBed.inject(AuthService);
    toastrService = TestBed.inject(ToastrService);

    // Mock para router.events
    Object.defineProperty(router, 'events', {
      get: () => routerEventsSubject.asObservable(),
    });

    // Configurar la URL actual para las pruebas
    urlSpy = spyOnProperty(router, 'url', 'get').and.returnValue('/');

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should have a navbar', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('nav')).toBeTruthy();
  });

  it('should display the logo', () => {
    const compiled = fixture.nativeElement;
    const logo = compiled.querySelector('img');
    expect(logo).toBeTruthy();
    expect(logo.src).toContain('assets/images/osc-logo-white-transparent.png');
    expect(logo.alt).toBe('Open Science Chain');
  });

  it('should expose the primary product navigation', () => {
    const compiled = fixture.nativeElement;
    const navigation = compiled.querySelector(
      'nav[aria-label="Primary navigation"]',
    );
    expect(navigation).toBeTruthy();
    expect(navigation.textContent).toContain('Artifacts');
    expect(navigation.textContent).toContain('Workflows');
    expect(navigation.textContent).toContain('Contribute');
    expect(navigation.textContent).toContain('Sign in');
  });

  it('should provide a skip link to routed content', () => {
    const compiled = fixture.nativeElement;
    const skipLink = compiled.querySelector('.skip-link');
    expect(skipLink.getAttribute('href')).toBe('#app-main');
  });

  it('should render routed page content through a router outlet', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  // Pruebas para los métodos no cubiertos
  describe('Navigation and Initialization', () => {
    it('should subscribe to navigation events in ngOnInit', () => {
      // Espiar el método updateBackButtonVisibility
      spyOn<any>(component, 'updateBackButtonVisibility');

      // Llamar a ngOnInit de nuevo para asegurarnos de que se ejecuta
      component.ngOnInit();

      // Simular un evento de navegación
      routerEventsSubject.next(new NavigationEnd(1, '/', '/'));

      // Verificar que se llamó al método updateBackButtonVisibility
      expect(component['updateBackButtonVisibility']).toHaveBeenCalled();
    });
  });

  describe('Navigation Methods', () => {
    it('should navigate to home when going back from auth route', () => {
      urlSpy.and.returnValue('/auth/sign-in');
      spyOn(router, 'navigate');
      component.goBack();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should use location.back() for non-auth routes', () => {
      urlSpy.and.returnValue('/home');
      spyOn(location, 'back');
      component.goBack();
      expect(location.back).toHaveBeenCalled();
    });

    it('should handle successful logout', () => {
      spyOn(router, 'navigate');
      component.logout();
      expect(authService.logout).toHaveBeenCalled();
      expect(toastrService.success).toHaveBeenCalledWith(
        'Successfully signed out',
        'Goodbye!',
      );
    });

    it('should handle logout error gracefully', () => {
      const error = new Error('Logout failed');
      // Configurar temporalmente para que devuelva un error
      (authService.logout as jasmine.Spy).and.returnValue(
        throwError(() => error),
      );
      spyOn(console, 'error');

      component.logout();

      expect(console.error).toHaveBeenCalledWith('Logout error:', error);
      expect(toastrService.success).toHaveBeenCalledWith(
        'Successfully signed out',
        'Goodbye!',
      );

      // Restaurar la implementación original después de la prueba
      (authService.logout as jasmine.Spy).and.returnValue(of({}));
    });
  });

  describe('Contribute Navigation', () => {
    it('should expose contribution options as a disclosure', () => {
      component.toggleContributeMenu();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const trigger =
        compiled.querySelector<HTMLButtonElement>('.contribute-button');
      const options = compiled.querySelector('#contribute-options');

      expect(trigger?.getAttribute('aria-controls')).toBe('contribute-options');
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
      expect(options).toBeTruthy();
      expect(compiled.querySelector('[role="menu"]')).toBeNull();
      expect(compiled.querySelector('[role="menuitem"]')).toBeNull();
    });

    it('should close contribution options with Escape and restore focus', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const trigger =
        compiled.querySelector<HTMLButtonElement>('.contribute-button');
      const focusSpy = spyOn(trigger!, 'focus');

      component.toggleContributeMenu();
      fixture.detectChanges();
      expect(component.contributeMenuOpen).toBeTrue();

      component.onEscape();
      fixture.detectChanges();

      expect(component.contributeMenuOpen).toBeFalse();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should close mobile navigation with Escape and restore toggle focus', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const trigger =
        compiled.querySelector<HTMLButtonElement>('.navigation-toggle');
      const focusSpy = spyOn(trigger!, 'focus');
      component.mobileNavigationOpen = true;

      component.onEscape();
      fixture.detectChanges();

      expect(component.mobileNavigationOpen).toBeFalse();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should navigate unsigned visitors to the bounded contribution form', () => {
      component.isAuthenticated = false;
      spyOn(router, 'navigate');

      component.onContributeClick('artifact');

      expect(router.navigate).toHaveBeenCalledWith(['/contribute']);
    });

    it('should navigate to contribute page when authenticated for artifact', () => {
      component.isAuthenticated = true;
      spyOn(router, 'navigate');

      component.onContributeClick('artifact');

      expect(router.navigate).toHaveBeenCalledWith(['/contribute']);
    });

    it('should navigate to create-workflow page when authenticated for workflow', () => {
      component.isAuthenticated = true;
      spyOn(router, 'navigate');

      component.onContributeClick('workflow');

      expect(router.navigate).toHaveBeenCalledWith(['/create-workflow']);
    });
  });

  describe('Error Handling', () => {
    it('should handle logo loading error', () => {
      // Espiar console.error
      spyOn(console, 'error');

      // Llamar al método onLogoError
      component.onLogoError();

      // Verificar que logoError se estableció a true
      expect(component.logoError).toBeTrue();

      // Verificar que se registró el error
      expect(console.error).toHaveBeenCalledWith('Error loading logo image');
    });
  });
});
