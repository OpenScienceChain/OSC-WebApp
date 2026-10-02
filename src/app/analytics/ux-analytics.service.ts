import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

export type AnalyticsChoice = 'undecided' | 'accepted' | 'rejected';
export type AnalyticsEventType =
  | 'PAGE_VIEW'
  | 'CATALOG_SEARCH'
  | 'CATALOG_FILTER'
  | 'RECORD_VIEW'
  | 'HISTORY_VIEW'
  | 'CONTRIBUTE_CLICK'
  | 'FORM_START'
  | 'VALIDATION_ERROR'
  | 'SUBMISSION_ATTEMPT'
  | 'ARTIFACT_SUBMITTED'
  | 'WORKFLOW_SUBMITTED'
  | 'AUTH_ACTION';

const CHOICE_KEY = 'osc-ux-analytics-choice-v1';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const ROUTES = new Set([
  '/',
  '/feedback',
  '/interactive-demo',
  '/research-example',
  '/list-artifacts',
  '/list-workflows',
  '/contribute',
  '/create-workflow',
  '/auth/sign-in',
  '/auth/team-sign-in',
  '/artifacts/:id',
  '/artifacts/:id/history',
  '/artifacts/:id/history/:txId',
  '/update-artifact/:id',
  '/workflows/:id',
  '/workflows/:id/history',
  '/update-workflow/:id',
]);

@Injectable({ providedIn: 'root' })
export class UxAnalyticsService {
  readonly choice = signal<AnalyticsChoice>(this.readChoice());
  readonly busy = signal(false);
  readonly error = signal('');
  readonly deletionFailed = signal(false);
  private trackingAllowed = this.choice() === 'accepted';

  constructor(private readonly http: HttpClient) {}

  accept(onAccepted: () => void): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.http
      .post<{ accepted?: boolean; consented?: boolean }>(
        this.url('/session'),
        {},
        { withCredentials: true },
      )
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          if (result.consented !== true && result.accepted !== true) {
            this.error.set('Analytics could not be enabled. Please try again.');
            return;
          }
          this.saveChoice('accepted');
          this.trackingAllowed = true;
          onAccepted();
        },
        error: () => {
          this.busy.set(false);
          this.error.set('Analytics could not be enabled. Please try again.');
        },
      });
  }

  reject(): void {
    if (this.busy() || this.choice() !== 'undecided') return;
    this.trackingAllowed = false;
    this.saveChoice('rejected');
    void fetch(this.url('/reject'), {
      method: 'POST',
      credentials: 'omit',
    }).catch(() => undefined);
  }

  revoke(): void {
    if (this.busy() || this.choice() !== 'accepted') return;
    this.trackingAllowed = false;
    this.busy.set(true);
    this.error.set('');
    this.http
      .delete<{ deleted?: boolean }>(this.url('/session'), {
        withCredentials: true,
      })
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          if (result.deleted !== true) {
            this.deletionFailed.set(true);
            this.error.set('Deletion was not confirmed. Please retry.');
            return;
          }
          this.deletionFailed.set(false);
          this.saveChoice('rejected');
        },
        error: () => {
          this.busy.set(false);
          this.deletionFailed.set(true);
          this.error.set('Deletion was not confirmed. Please retry.');
        },
      });
  }

  track(eventType: AnalyticsEventType, route: string): void {
    if (!this.trackingAllowed || !ROUTES.has(route)) return;
    this.http
      .post(
        this.url('/events'),
        {
          eventType,
          route,
          deviceCategory: this.deviceCategory(),
        },
        { withCredentials: true },
      )
      .subscribe({
        error: (error) => {
          if (error.status === 401 || error.status === 403) {
            this.trackingAllowed = false;
            this.clearChoice();
          }
        },
      });
  }

  routeTemplate(url: string): string | null {
    const path = url.split(/[?#]/, 1)[0];
    if (ROUTES.has(path)) return path;
    const segments = path.split('/').filter(Boolean);
    if (segments.length < 2) return null;
    if (['artifacts', 'workflows'].includes(segments[0])) {
      segments[1] = ':id';
      if (segments[2] === 'history' && segments[3]) segments[3] = ':txId';
    } else if (['update-artifact', 'update-workflow'].includes(segments[0])) {
      segments[1] = ':id';
    }
    const template = `/${segments.join('/')}`;
    return ROUTES.has(template) ? template : null;
  }

  private deviceCategory(): 'DESKTOP' | 'TABLET' | 'MOBILE' | 'SMALL_MOBILE' {
    const width = typeof window === 'undefined' ? 1440 : window.innerWidth;
    if (width <= 320) return 'SMALL_MOBILE';
    if (width < 600) return 'MOBILE';
    if (width < 1024) return 'TABLET';
    return 'DESKTOP';
  }

  private url(path: string): string {
    return `/api/v1/demo/analytics${path}`;
  }

  private saveChoice(choice: Exclude<AnalyticsChoice, 'undecided'>): void {
    this.choice.set(choice);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        CHOICE_KEY,
        JSON.stringify({
          choice,
          expiresAt: Date.now() + THIRTY_DAYS,
        }),
      );
    }
  }

  private clearChoice(): void {
    this.choice.set('undecided');
    if (typeof localStorage !== 'undefined')
      localStorage.removeItem(CHOICE_KEY);
  }

  private readChoice(): AnalyticsChoice {
    if (typeof localStorage === 'undefined') return 'undecided';
    try {
      const value = JSON.parse(localStorage.getItem(CHOICE_KEY) || 'null');
      if (
        value?.expiresAt > Date.now() &&
        (value.choice === 'accepted' || value.choice === 'rejected')
      ) {
        return value.choice;
      }
    } catch {
      // Malformed local preference is treated as no choice.
    }
    localStorage.removeItem(CHOICE_KEY);
    return 'undecided';
  }
}
