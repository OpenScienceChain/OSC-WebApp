import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { setRuntimeConfig } from '../config/runtime-config';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { DemoSession } from './demo.models';
import { DemoService } from './demo.service';
import { ToastrService } from 'ngx-toastr';

describe('DemoService', () => {
  let service: DemoService;
  let http: HttpTestingController;

  const session: DemoSession = {
    csrfToken: 'csrf-token',
    contributorAlias: 'guest-1234abcd',
    organization: 'neuroscience-gateway',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    setRuntimeConfig({ API_BASE_URL: '/api/v1', DEMO_MODE: true });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            getToken: () => 'normal-product-token',
            expireSession: jasmine.createSpy('expireSession'),
          },
        },
        {
          provide: ToastrService,
          useValue: { error: jasmine.createSpy('error') },
        },
      ],
    });
    service = TestBed.inject(DemoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    setRuntimeConfig({ API_BASE_URL: '', DEMO_MODE: false });
  });

  it('creates a cookie-only session and persists only browser session metadata', () => {
    service.createSession('neuroscience-gateway').subscribe((value) => {
      expect(value).toEqual(session);
      expect(service.session).toEqual(session);
    });

    const request = http.expectOne('/api/v1/demo/session');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      organization: 'neuroscience-gateway',
    });
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush(session);
    expect(sessionStorage.getItem('osc-usrse26-demo-session')).not.toContain(
      'normal-product-token',
    );
  });

  it('sends only the bounded artifact contract with CSRF and correlation headers', () => {
    service.createSession('neuroscience-gateway').subscribe();
    http.expectOne('/api/v1/demo/session').flush(session);

    const body = {
      requestId: '11111111-1111-4111-8111-111111111111',
      fingerprint: 'a'.repeat(64),
      sizeBytes: 42,
      extension: 'txt',
      researchContext: 'RESEARCH_DATASET' as const,
    };
    service.createArtifact(body).subscribe();
    const request = http.expectOne('/api/v1/demo/artifacts');
    expect(request.request.body).toEqual(body);
    expect(request.request.body.originalFilename).toBeUndefined();
    expect(request.request.body.fileContents).toBeUndefined();
    expect(request.request.headers.get('X-Demo-CSRF')).toBe('csrf-token');
    expect(request.request.headers.get('X-Correlation-Id')).toBe(
      body.requestId,
    );
    expect(request.request.headers.has('Authorization')).toBeFalse();
    expect(request.request.withCredentials).toBeTrue();
    request.flush({});
  });

  it('supports public organization filters without a guest capability', () => {
    service.listArtifacts('citizen-science').subscribe();
    const artifacts = http.expectOne(
      '/api/v1/demo/artifacts?organization=citizen-science',
    );
    expect(artifacts.request.headers.has('Authorization')).toBeFalse();
    artifacts.flush([]);

    service.listWorkflows().subscribe();
    http.expectOne('/api/v1/demo/workflows').flush([]);
  });

  it('requests workflow history with the cookie capability only', () => {
    service.createSession('neuroscience-gateway').subscribe();
    http.expectOne('/api/v1/demo/session').flush(session);

    service
      .getWorkflowHistory('22222222-2222-4222-8222-222222222222')
      .subscribe();
    const request = http.expectOne(
      '/api/v1/demo/workflows/22222222-2222-4222-8222-222222222222/history',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.headers.has('Authorization')).toBeFalse();
    expect(request.request.headers.has('X-Correlation-Id')).toBeTrue();
    request.flush({ assetType: 'workflow', items: [], total: 0 });
  });

  it('drops expired session metadata before a mutation', () => {
    sessionStorage.setItem(
      'osc-usrse26-demo-session',
      JSON.stringify({ ...session, expiresAt: new Date(0).toISOString() }),
    );
    const expiredService = new DemoService(TestBed.inject(HttpClient));
    expect(expiredService.session).toBeNull();
    expect(sessionStorage.getItem('osc-usrse26-demo-session')).toBeNull();
  });
});
