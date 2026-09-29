import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { setRuntimeConfig } from '../config/runtime-config';
import { ShowcaseService } from './showcase.service';

describe('ShowcaseService', () => {
  let service: ShowcaseService;
  let http: HttpTestingController;

  beforeEach(() => {
    setRuntimeConfig({ API_BASE_URL: '/api/v1' });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ShowcaseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the public research example without credentials', () => {
    service.catalog().subscribe();
    const request = http.expectOne('/api/v1/showcase');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({
      organization: 'Magnetic Arch Plasma Showcase',
      artifacts: [],
      workflows: [],
    });
  });

  it('reads the Fabric history for a selected artifact', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    service.history('artifacts', id).subscribe();
    const request = http.expectOne(`/api/v1/showcase/artifacts/${id}/history`);
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], count: 0, hasMore: false });
  });
});
