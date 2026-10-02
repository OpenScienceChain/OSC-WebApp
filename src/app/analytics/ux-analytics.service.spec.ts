import { HttpClient, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UxAnalyticsService } from './ux-analytics.service';

describe('UxAnalyticsService withdrawal', () => {
  const choiceKey = 'osc-ux-analytics-choice-v1';
  const sessionUrl = '/api/v1/demo/analytics/session';
  const eventsUrl = '/api/v1/demo/analytics/events';
  let service: UxAnalyticsService;
  let http: HttpTestingController;

  function reload(): UxAnalyticsService {
    return new UxAnalyticsService(TestBed.inject(HttpClient));
  }

  beforeEach(() => {
    localStorage.removeItem(choiceKey);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UxAnalyticsService);
    http = TestBed.inject(HttpTestingController);
    service.accept(() => undefined);
    http.expectOne(sessionUrl).flush({ consented: true });
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem(choiceKey);
  });

  for (const failure of ['http-error', 'unconfirmed'] as const) {
    it(`persists withdrawal and allows retry after reload for ${failure}`, () => {
      service.revoke();
      const deletion = http.expectOne(sessionUrl);
      expect(deletion.request.method).toBe('DELETE');
      expect(deletion.request.withCredentials).toBeTrue();
      expect(JSON.parse(localStorage.getItem(choiceKey)!)).toEqual({
        choice: 'deletion-pending',
        expiresAt: null,
      });
      service.track('PAGE_VIEW', '/feedback');
      http.expectNone(eventsUrl);
      if (failure === 'http-error') {
        deletion.flush({}, { status: 503, statusText: 'Unavailable' });
      } else {
        deletion.flush({ deleted: false });
      }
      expect(service.deletionFailed()).toBeTrue();
      expect(service.error()).toContain('Please retry');

      service = reload();
      expect(service.choice()).toBe('deletion-pending');
      expect(service.deletionFailed()).toBeTrue();
      expect(service.error()).toContain('Please retry');
      const onAccepted = jasmine.createSpy('onAccepted');
      service.accept(onAccepted);
      service.track('PAGE_VIEW', '/feedback');
      http.expectNone(sessionUrl);
      http.expectNone(eventsUrl);
      expect(onAccepted).not.toHaveBeenCalled();
      expect(service.error()).toContain('Please retry');

      service.revoke();
      http.expectOne(sessionUrl).flush({ deleted: true });
      expect(service.choice()).toBe('rejected');
      expect(service.deletionFailed()).toBeFalse();
      expect(service.error()).toBe('');
      service = reload();
      service.track('PAGE_VIEW', '/feedback');
      http.expectNone(eventsUrl);
      service.accept(onAccepted);
      http.expectOne(sessionUrl).flush({ accepted: true });
      expect(onAccepted).toHaveBeenCalledTimes(1);
      service.track('PAGE_VIEW', '/feedback');
      http.expectOne(eventsUrl).flush({});
    });
  }

  it('restores pending deletion if reload interrupts the request', () => {
    service.revoke();
    const deletion = http.expectOne(sessionUrl);
    const restored = reload();
    expect(restored.deletionFailed()).toBeTrue();
    expect(restored.error()).toContain('Please retry');
    restored.accept(() => fail('Must not accept pending deletion'));
    restored.track('PAGE_VIEW', '/feedback');
    http.expectNone(sessionUrl);
    http.expectNone(eventsUrl);
    deletion.flush({ deleted: true });
  });

  it('does not expire pending deletion into a fresh consent prompt', () => {
    localStorage.setItem(
      choiceKey,
      JSON.stringify({ choice: 'deletion-pending', expiresAt: 1 }),
    );
    service = reload();
    expect(service.choice()).toBe('deletion-pending');
    service.track('PAGE_VIEW', '/feedback');
    http.expectNone(eventsUrl);
  });

  it('ignores a late event authorization failure while deletion is pending', () => {
    service.track('PAGE_VIEW', '/feedback');
    const event = http.expectOne(eventsUrl);
    service.revoke();
    http.expectOne(sessionUrl).flush({ deleted: false });
    event.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(reload().choice()).toBe('deletion-pending');
    expect(service.error()).toContain('Please retry');
  });

  it('persists a successful withdrawal without resuming tracking on reload', () => {
    service.revoke();
    http.expectOne(sessionUrl).flush({ deleted: true });
    service = reload();
    expect(service.choice()).toBe('rejected');
    expect(service.deletionFailed()).toBeFalse();
    service.track('PAGE_VIEW', '/feedback');
    http.expectNone(eventsUrl);
  });
});
