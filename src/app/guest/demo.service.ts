import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { getApiBaseUrl } from '../services/api-base-url';
import {
  DemoArtifact,
  DemoAccountCredentials,
  DemoArtifactHistory,
  DemoArtifactRequest,
  DemoArtifactEditRequest,
  DemoCatalogArtifact,
  DemoCatalogWorkflow,
  DemoCounters,
  DemoFeedbackRequest,
  DemoOrganizationSlug,
  DemoSession,
  DemoStatus,
  DemoWorkflow,
  DemoWorkflowEditRequest,
  DemoWorkflowRequest,
} from './demo.models';

const SESSION_STORAGE_KEY = 'osc-usrse26-demo-session';
const ACCOUNT_STORAGE_KEY = 'osc-usrse26-account-session';

@Injectable({ providedIn: 'root' })
export class DemoService {
  private currentSession: DemoSession | null = this.readSession();
  private readonly sessionSubject = new BehaviorSubject<DemoSession | null>(
    this.currentSession,
  );
  readonly sessionChanges$ = this.sessionSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key !== ACCOUNT_STORAGE_KEY) return;
        this.currentSession = this.parseSession(event.newValue, true);
        this.sessionSubject.next(this.currentSession);
      });
    }
  }

  get session(): DemoSession | null {
    if (
      this.currentSession &&
      new Date(this.currentSession.expiresAt).getTime() <= Date.now()
    ) {
      this.clearSession();
    }
    return this.currentSession;
  }

  getStatus(): Observable<DemoStatus> {
    return this.http.get<DemoStatus>(this.url('/status'), {
      withCredentials: true,
    });
  }

  getCounters(): Observable<DemoCounters> {
    return this.http.get<DemoCounters>(this.url('/counters'), {
      withCredentials: true,
    });
  }

  listArtifacts(
    organization?: DemoOrganizationSlug,
  ): Observable<DemoCatalogArtifact[]> {
    const params = organization
      ? new HttpParams().set('organization', organization)
      : undefined;
    return this.http.get<DemoCatalogArtifact[]>(this.url('/artifacts'), {
      params,
      withCredentials: true,
    });
  }

  listWorkflows(
    organization?: DemoOrganizationSlug,
  ): Observable<DemoCatalogWorkflow[]> {
    const params = organization
      ? new HttpParams().set('organization', organization)
      : undefined;
    return this.http.get<DemoCatalogWorkflow[]>(this.url('/workflows'), {
      params,
      withCredentials: true,
    });
  }

  createSession(organization: DemoOrganizationSlug): Observable<DemoSession> {
    return this.http
      .post<DemoSession>(
        this.url('/session'),
        { organization },
        { withCredentials: true },
      )
      .pipe(tap((session) => this.storeSession(session)));
  }

  registerAccount(
    credentials: DemoAccountCredentials,
  ): Observable<DemoSession> {
    return this.http
      .post<DemoSession>(this.url('/account/register'), credentials, {
        withCredentials: true,
      })
      .pipe(tap((session) => this.storeSession(session)));
  }

  signInAccount(credentials: DemoAccountCredentials): Observable<DemoSession> {
    return this.http
      .post<DemoSession>(this.url('/account/sign-in'), credentials, {
        withCredentials: true,
      })
      .pipe(tap((session) => this.storeSession(session)));
  }

  signOutAccount(): Observable<{ signedOut: boolean }> {
    return this.http
      .post<{ signedOut: boolean }>(
        this.url('/account/sign-out'),
        {},
        this.mutation(),
      )
      .pipe(tap(() => this.clearSession()));
  }

  refreshSession(): Observable<DemoSession> {
    return this.http
      .post<DemoSession>(this.url('/session/refresh'), {}, this.mutation())
      .pipe(tap((session) => this.storeSession(session)));
  }

  createArtifact(request: DemoArtifactRequest): Observable<DemoArtifact> {
    return this.http.post<DemoArtifact>(
      this.url('/artifacts'),
      request,
      this.mutation(request.requestId),
    );
  }

  updateArtifact(
    id: string,
    request: DemoArtifactEditRequest,
  ): Observable<DemoArtifact> {
    return this.http.patch<DemoArtifact>(
      this.url(`/artifacts/${id}`),
      request,
      this.mutation(request.requestId),
    );
  }

  getArtifact(id: string): Observable<DemoArtifact> {
    return this.http.get<DemoArtifact>(this.url(`/artifacts/${id}`), {
      withCredentials: true,
    });
  }

  getMyArtifacts(): Observable<DemoArtifact[]> {
    return this.http.get<DemoArtifact[]>(this.url('/mine/artifacts'), {
      headers: this.sessionHeaders(),
      withCredentials: true,
    });
  }

  getPublicArtifact(id: string): Observable<DemoCatalogArtifact> {
    return this.http.get<DemoCatalogArtifact>(
      this.url(`/public/artifacts/${id}`),
      { withCredentials: true },
    );
  }

  getPublicArtifactHistory(id: string): Observable<DemoArtifactHistory> {
    return this.http.get<DemoArtifactHistory>(
      this.url(`/public/artifacts/${id}/history`),
      { withCredentials: true },
    );
  }

  getArtifactHistory(id: string): Observable<DemoArtifactHistory> {
    return this.http.get<DemoArtifactHistory>(
      this.url(`/artifacts/${id}/history`),
      {
        headers: new HttpHeaders({ 'X-Correlation-Id': crypto.randomUUID() }),
        withCredentials: true,
      },
    );
  }

  createWorkflow(request: DemoWorkflowRequest): Observable<DemoWorkflow> {
    return this.http.post<DemoWorkflow>(
      this.url('/workflows'),
      request,
      this.mutation(request.requestId),
    );
  }

  updateWorkflow(
    id: string,
    request: DemoWorkflowEditRequest,
  ): Observable<DemoWorkflow> {
    return this.http.patch<DemoWorkflow>(
      this.url(`/workflows/${id}`),
      request,
      this.mutation(request.requestId),
    );
  }

  getWorkflow(id: string): Observable<DemoWorkflow> {
    return this.http.get<DemoWorkflow>(this.url(`/workflows/${id}`), {
      withCredentials: true,
    });
  }

  getMyWorkflows(): Observable<DemoWorkflow[]> {
    return this.http.get<DemoWorkflow[]>(this.url('/mine/workflows'), {
      headers: this.sessionHeaders(),
      withCredentials: true,
    });
  }

  getPublicWorkflow(id: string): Observable<DemoCatalogWorkflow> {
    return this.http.get<DemoCatalogWorkflow>(
      this.url(`/public/workflows/${id}`),
      { withCredentials: true },
    );
  }

  getPublicWorkflowHistory(id: string): Observable<DemoArtifactHistory> {
    return this.http.get<DemoArtifactHistory>(
      this.url(`/public/workflows/${id}/history`),
      { withCredentials: true },
    );
  }

  getWorkflowHistory(id: string): Observable<DemoArtifactHistory> {
    return this.http.get<DemoArtifactHistory>(
      this.url(`/workflows/${id}/history`),
      {
        headers: new HttpHeaders({ 'X-Correlation-Id': crypto.randomUUID() }),
        withCredentials: true,
      },
    );
  }

  recordEvent(
    eventName: 'STATUS_VIEWED' | 'SURVEY_SHOWN',
  ): Observable<{ accepted: boolean }> {
    return this.http.post<{ accepted: boolean }>(
      this.url('/events'),
      { eventName },
      this.mutation(),
    );
  }

  submitFeedback(
    request: DemoFeedbackRequest,
  ): Observable<{ accepted: boolean }> {
    return this.http.post<{ accepted: boolean }>(
      this.url('/feedback'),
      request,
      this.mutation(),
    );
  }

  clearSession(): void {
    this.currentSession = null;
    this.sessionSubject.next(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    }
  }

  private url(path: string): string {
    return `${getApiBaseUrl().replace(/\/$/, '')}/demo${path}`;
  }

  private mutation(correlationId?: string): {
    headers: HttpHeaders;
    withCredentials: true;
  } {
    const session = this.session;
    let headers = new HttpHeaders({
      'X-Demo-CSRF': session?.csrfToken || '',
    });
    if (correlationId) {
      headers = headers.set('X-Correlation-Id', correlationId);
    }
    return { headers, withCredentials: true };
  }

  private sessionHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Demo-CSRF': this.session?.csrfToken || '',
    });
  }

  private storeSession(session: DemoSession): void {
    this.currentSession = session;
    this.sessionSubject.next(session);
    if (typeof sessionStorage !== 'undefined') {
      if (session.accountUsername) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
    }
    if (typeof localStorage !== 'undefined') {
      if (session.accountUsername) {
        localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      }
    }
  }

  private readSession(): DemoSession | null {
    if (typeof localStorage !== 'undefined') {
      const account = this.parseSession(
        localStorage.getItem(ACCOUNT_STORAGE_KEY),
        true,
      );
      if (account) return account;
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    }
    if (typeof sessionStorage !== 'undefined') {
      const legacy = this.parseSession(
        sessionStorage.getItem(SESSION_STORAGE_KEY),
      );
      if (legacy?.accountUsername) {
        localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(legacy));
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return legacy;
      }
      if (legacy) return legacy;
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return null;
  }

  private parseSession(
    raw: string | null,
    accountOnly = false,
  ): DemoSession | null {
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as DemoSession;
      return session.csrfToken &&
        (!accountOnly || session.accountUsername) &&
        new Date(session.expiresAt).getTime() > Date.now()
        ? session
        : null;
    } catch {
      return null;
    }
  }
}
